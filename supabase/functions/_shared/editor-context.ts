// Shared context for the editor agent (chat) and the background video builder.
import { assetUrl } from "./hub.ts";

export const MODEL = "openai/gpt-6-astra";
export const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export const clip = (s: unknown, n: number) => { const t = typeof s === "string" ? s : JSON.stringify(s ?? ""); return t.length > n ? t.slice(0, n) + "…" : t; };

export async function loadContext(db: any, projectId: string) {
  const { data: project } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (!project) return null;
  const { data: hub } = await db.from("asset_groups").select("*").eq("id", project.group_id).single();
  const { data: shared } = await db.from("asset_groups").select("id").eq("slug", "shared-library").maybeSingle();
  const hubIds = [hub.id, ...(shared && shared.id !== hub.id ? [shared.id] : [])];
  const [{ data: skills }, { data: library }, { data: files }, { data: analyses }, { data: builds }] = await Promise.all([
    db.from("skills").select("id, slug, name, description, body, group_id").or(`group_id.is.null,group_id.eq.${hub.id}`).order("name"),
    db.from("assets").select("id, kind, name, role, tags, duration_seconds, meta, mime_type, group_id").in("group_id", hubIds).is("project_id", null).order("created_at"),
    db.from("assets").select("id, kind, name, role, tags, duration_seconds, meta, mime_type, inline_content, created_at").eq("project_id", project.id).order("created_at"),
    db.from("asset_analyses").select("asset_id, tool, summary, report").in("group_id", hubIds).eq("status", "complete"),
    db.from("editor_builds").select("id, status, part, lines, error, version, updated_at").eq("project_id", project.id).order("created_at", { ascending: false }).limit(1),
  ]);
  return { project, hub, skills: skills || [], library: library || [], files: files || [], analyses: analyses || [], build: builds?.[0] || null };
}
export type EditorContext = NonNullable<Awaited<ReturnType<typeof loadContext>>>;

export function describe(a: any, analyses: any[], full: boolean) {
  const an = analyses.filter((x) => x.asset_id === a.id);
  const lines = [`- ${a.name} | id ${a.id} | ${a.kind}${a.role ? ` role=${a.role}` : ""}${a.tags?.length ? ` tags=${a.tags.join(",")}` : ""}${a.duration_seconds ? ` ${Number(a.duration_seconds).toFixed(1)}s` : ""} | url ${assetUrl(a.id)}`];
  const m = a.meta || {};
  if (m.peak_time != null) lines.push(`  sound: peak ${m.peak_time}s, trim ${m.trim_start ?? 0}-${m.trim_end ?? "end"}`);
  if (a.inline_content) lines.push(full ? `  content:\n${a.inline_content}` : `  content: ${clip(a.inline_content, 300)}`);
  let wordsShown = false;
  for (const x of an) {
    if (x.tool === "assembly-transcript" || x.tool === "gemini-words") {
      const words = x.report?.words;
      if (full && words?.length && !wordsShown) {
        wordsShown = true;
        lines.push(`  transcript (${x.tool}) full text: ${x.report?.text || x.summary || ""}`);
        lines.push(`  transcript words [w,start_s,end_s]: ${JSON.stringify(words.map((w: any) => [w.w ?? w.text, w.start, w.end]))}`);
        if (x.report?.cuts?.length) lines.push(`  suggested cuts: ${JSON.stringify(x.report.cuts)}`);
      } else if (!full || !wordsShown) lines.push(`  transcript: ${clip(x.report?.text || x.summary, 300)}`);
    } else lines.push(`  ${x.tool}: ${clip(x.summary, 350)}${x.report?.beats?.length ? ` beats: ${clip(x.report.beats.map((b: any) => `${b.start}-${b.end} ${b.label}`).join("; "), 400)}` : ""}`);
  }
  return lines.join("\n");
}

export function latestCode(files: any[]) {
  return [...files].reverse().find((a) => a.kind === "code" && a.inline_content) || null;
}

export const projectFiles = (ctx: EditorContext) => ctx.files.filter((a: any) => a.kind !== "code").map((a: any) => describe(a, ctx.analyses, true)).join("\n") || "(none)";

/** Everything the agent and the builder need to know about the hub and project. */
export function knowledge(ctx: EditorContext) {
  const { project, hub, skills, library } = ctx;
  const chosen = skills.find((s: any) => s.id === project.skill_id) || skills.find((s: any) => s.slug === hub.slug);
  return `REMOTION RULES (renders fail otherwise)
- Single file, no local imports. Start with /* REMOTION_CONFIG { "fps": 30, "durationInFrames": N, "width": 1080, "height": 1920 } */ (1920x1080 for horizontal). Use plain numbers there.
- Export a default component; never name a component MyVideo.
- Use asset URLs exactly as listed below (copy ids exactly). Never Unsplash. Mute mascot clips: <OffthreadVideo src={...} muted />.
- Never use backdropFilter. Keep filter: blur small and rare.
- Readable code: clear constant names (VOICE, MASCOT_MOMENTS, ...), one idea per line.
- Time everything to the voiceover word timings (seconds × fps).

HUB STYLE GUIDE
${clip(hub.style_guide || "(none)", 4000)}

MAIN SKILL${chosen ? ` (${chosen.name})\n${clip(chosen.body, 9000)}` : ": none"}

OTHER SKILLS: ${skills.filter((s: any) => s !== chosen).map((s: any) => `${s.slug} — ${clip(s.description, 120)}`).join(" | ")}

PROJECT NOTES
${clip(project.notes || "(none)", 2000)}
PLAN: ${clip(project.plan || {}, 2000)}

PROJECT FILES
${projectFiles(ctx)}

HUB + SHARED LIBRARY
${library.map((a: any) => describe(a, ctx.analyses, false)).join("\n") || "(none)"}`;
}

/** Save code as a new project code version after checking every referenced file id exists. */
export async function saveVersion(db: any, ctx: EditorContext, code: string, summary: string, opts: { allowMissing?: boolean } = {}) {
  const ids = [...new Set(code.match(UUID) || [])].map((s) => s.toLowerCase());
  let missing: string[] = [];
  if (ids.length) {
    const { data } = await db.from("assets").select("id, storage_path, inline_content").in("id", ids);
    const ok = new Set((data || []).filter((a: any) => a.storage_path || a.inline_content).map((a: any) => a.id));
    missing = ids.filter((i) => !ok.has(i));
    if (missing.length && !opts.allowMissing) return { error: `Not saved: these file ids don't exist: ${missing.join(", ")}. Copy ids exactly from the file list.` };
  }
  const { data: prev } = await db.from("assets").select("meta").eq("project_id", ctx.project.id).eq("kind", "code").order("created_at", { ascending: false }).limit(1);
  const version = (Number(prev?.[0]?.meta?.version) || 0) + 1;
  const { data, error } = await db.from("assets").insert({
    group_id: ctx.hub.id, project_id: ctx.project.id, kind: "code", role: "code", name: `editor-v${version}.tsx`, inline_content: code,
    mime_type: "text/plain", size_bytes: new TextEncoder().encode(code).byteLength,
    meta: { version, summary: summary.slice(0, 300), source: "editor", ...(missing.length ? { missing_ids: missing } : {}) },
  }).select("id").single();
  if (error) return { error: `Could not save: ${error.message}` };
  return { saved: true as const, version, id: data.id, lines: code.split("\n").length, summary, missing };
}
