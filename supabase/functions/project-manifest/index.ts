import { admin, assetUrl, cors, json } from "../_shared/hub.ts";

const SHARED_HUB = "shared-library";
const BASE = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

const fileOut = (a: any, analyses: any[]) => ({
  id: a.id, kind: a.kind, role: a.role, tags: a.tags, name: a.name, url: assetUrl(a.id), mime_type: a.mime_type,
  duration_seconds: a.duration_seconds === null ? null : Number(a.duration_seconds), meta: a.meta,
  ...(a.inline_content ? { inline_content: a.inline_content } : {}),
  analyses: analyses.filter((x) => x.asset_id === a.id).map((x) => ({ tool: x.tool, summary: x.summary, report: x.report })),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const q = new URL(req.url).searchParams;
  const slug = (q.get("slug") || q.get("hub") || "").trim().toLowerCase();
  const projectSlug = (q.get("project") || "").trim().toLowerCase();
  if (!slug) return json({ error: "Missing slug (the hub)." }, 400);
  const db = admin();
  const { data: hub } = await db.from("asset_groups").select("*").eq("slug", slug).maybeSingle();
  if (!hub) return json({ error: `No hub "${slug}".` }, 404);
  const { data: shared } = await db.from("asset_groups").select("*").eq("slug", SHARED_HUB).maybeSingle();

  let project: any = null;
  if (projectSlug) {
    const { data } = await db.from("projects").select("*").eq("group_id", hub.id).eq("slug", projectSlug).maybeSingle();
    if (!data) return json({ error: `No project "${projectSlug}" in hub "${slug}".` }, 404);
    project = data;
  }
  const hubIds = [hub.id, ...(shared && shared.id !== hub.id ? [shared.id] : [])];
  const [{ data: skills }, { data: library }, { data: projFiles }, { data: analyses }, { data: projects }] = await Promise.all([
    db.from("skills").select("*").or(`group_id.is.null,group_id.eq.${hub.id}`).order("name"),
    db.from("assets").select("*").in("group_id", hubIds).is("project_id", null).order("created_at"),
    project ? db.from("assets").select("*").eq("project_id", project.id).order("created_at") : Promise.resolve({ data: [] }),
    db.from("asset_analyses").select("asset_id, tool, summary, report").in("group_id", hubIds).eq("status", "complete"),
    db.from("projects").select("slug, name, stage, updated_at").eq("group_id", hub.id).order("updated_at", { ascending: false }),
  ]);
  const an = analyses || [];
  const chosen = project?.skill_id ? (skills || []).find((s: any) => s.id === project.skill_id) : null;

  return json({
    read_first: [
      "1. Follow `skills` — start with project.skill (if set) and always `retention-structure`, then `final-check` before rendering.",
      "2. Obey `style_guide` (hub first, then shared).",
      "3. Reuse `library` items (search by role/tags/analyses) before generating anything new.",
      "4. Save every file for this video into the project: add `project=<project slug>` and a `role` when writing.",
      "5. Keep `project.plan` updated via project-update (six parts: hook, setup, quiz, reveal, twist, loop).",
    ],
    hub: { slug: hub.slug, title: hub.title, notes: hub.notes, style_guide: hub.style_guide },
    shared_style_guide: shared && shared.id !== hub.id ? shared.style_guide : undefined,
    project: project ? { slug: project.slug, name: project.name, stage: project.stage, notes: project.notes, plan: project.plan, skill: chosen?.slug || null } : null,
    projects: projects || [],
    skills: (skills || []).map((s: any) => ({ slug: s.slug, name: s.name, scope: s.group_id ? "hub" : "shared", description: s.description, body: s.body })),
    library: (library || []).map((a: any) => fileOut(a, an)),
    project_files: (projFiles || []).map((a: any) => fileOut(a, an)),
    endpoints: {
      create: `${BASE()}/agent-create  (GET/POST: token, slug=${hub.slug}${project ? `, project=${project.slug}` : ""}, kind, role, tags, prompt|inlineContent|sourceUrl)`,
      ingest: `${BASE()}/asset-ingest  (POST JSON, same fields)`,
      update_project: `${BASE()}/project-update  (POST JSON: token, slug, project, stage?, plan?, notes?, name?, skill?)`,
      word_timing: `${BASE()}/analyze-asset  (POST JSON: assetId, tool: "gemini-words") — words, caption_lines, cuts`,
      render: `${BASE()}/render-video then ${BASE()}/check-render-progress (poll every 10s)`,
    },
    generated_at: new Date().toISOString(),
  });
});
