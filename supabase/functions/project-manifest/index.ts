import { admin, assetUrl, cors, json } from "../_shared/hub.ts";
import { clipSection } from "../_shared/editor-context.ts";

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
      "This is a toolbox, not a template. Agree the idea, length, structure and pacing with the user — nothing here is a fixed rule.",
      "`skills` are references you can draw on (project.skill is the user's suggested starting point; `retention-structure` holds optional story ideas; `final-check` has practical pre-render checks).",
      "`style_guide` (hub, then shared) describes the look and voice the user likes.",
      "`library` holds reusable sounds, music, clips and images (search by role/tags/analyses).",
      "Voiceover files (role=voice) carry an `assembly-transcript` analysis: words [{w,start,end}] in seconds, caption_lines and suggested cuts.",
      "Clip projects (project.plan.clip): read `clip_brief` — source URL, segments, the words inside them with timings/speakers, the face-tracking CAMERA and the ClipCamera helper to paste. Framing is the base layer; the creative edit on top is your job (see the clip-editing skill).",
      "Long code: if you can't write files back, give the user the full single-file composition in chat to paste into the app's Playground (see AGENT_ACCESS.md → Render rules).",
      "Save files for this video into the project (`project=<project slug>`, plus a `role`). `project.plan` is free-form notes — use any shape.",
    ],
    hub: { slug: hub.slug, title: hub.title, notes: hub.notes, style_guide: hub.style_guide },
    shared_style_guide: shared && shared.id !== hub.id ? shared.style_guide : undefined,
    project: project ? { slug: project.slug, name: project.name, stage: project.stage, notes: project.notes, plan: project.plan, skill: chosen?.slug || null } : null,
    clip_brief: project?.plan?.clip ? clipSection({ project, library: library || [], analyses: an } as any) : undefined,
    projects: projects || [],
    skills: (skills || []).map((s: any) => ({ slug: s.slug, name: s.name, scope: s.group_id ? "hub" : "shared", description: s.description, body: s.body })),
    library: (library || []).map((a: any) => fileOut(a, an)),
    mascot_clips: {
      vertical: (library || []).filter((a: any) => a.role === "mascot" && (a.tags || []).includes("vertical")).map((a: any) => ({ id: a.id, name: a.name, url: assetUrl(a.id), duration_seconds: a.duration_seconds })),
      horizontal: (library || []).filter((a: any) => a.role === "mascot" && (a.tags || []).includes("horizontal")).map((a: any) => ({ id: a.id, name: a.name, url: assetUrl(a.id), duration_seconds: a.duration_seconds })),
    },
    project_files: (projFiles || []).map((a: any) => fileOut(a, an)),
    endpoints: {
      create: `${BASE()}/agent-create  (GET/POST: token, slug=${hub.slug}${project ? `, project=${project.slug}` : ""}, kind, role, tags, prompt|inlineContent|sourceUrl)`,
      ingest: `${BASE()}/asset-ingest  (POST JSON, same fields)`,
      update_project: `${BASE()}/project-update  (POST JSON: token, slug, project, stage?, plan?, notes?, name?, skill?)`,
      word_timing: `${BASE()}/analyze-asset  (POST JSON: assetId, tool: "gemini-words") — words, caption_lines, cuts`,
      footage_search: `${BASE()}/footage-search  (GET/POST: token, q, type=video|photo, orientation=portrait|landscape) — Pexels stock; save picks via create with sourceUrl, role=stock`,
      meme_search: `${BASE()}/meme-search  (GET/POST: token, q, type=gifs|stickers) — GIPHY; save mp4_url via create with sourceUrl, role=meme`,
      render: `${BASE()}/render-video then ${BASE()}/check-render-progress (poll every 10s)`,
    },
    generated_at: new Date().toISOString(),
  });
});
