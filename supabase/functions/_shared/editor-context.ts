// Shared context for the editor agent (chat) and the background video builder.
import { createOpenAI } from "npm:@ai-sdk/openai@4.0.83";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.62";
import { assetUrl } from "./hub.ts";
import { CLIP_CAMERA_CODE } from "./clip-camera.ts";

export const MODEL = "openai/gpt-6-astra";
export const GATEWAY = "https://ai.gateway.lovable.dev/v1";
// Models the user may pick in the editor. OpenAI ones run on Responses, Google ones on chat completions.
export const EDITOR_MODELS = [
  "openai/gpt-6-astra", "openai/gpt-6-sol", "openai/gpt-6-luna",
  "openai/gpt-5.6-terra", "openai/gpt-5.6-luna",
  "google/gemini-3.1-pro-preview", "google/gemini-3.8-flash",
];
export const pickModel = (m: unknown) => (typeof m === "string" && EDITOR_MODELS.includes(m) ? m : MODEL);

// Returns the model plus its provider options. cacheKey keeps repeat requests on the same prompt cache.
export function editorModel(id: string, key: string, cacheKey: string, fetchFn?: typeof fetch) {
  const headers = { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" };
  if (id.startsWith("openai/")) {
    const provider = createOpenAI({ baseURL: GATEWAY, apiKey: key, headers, fetch: fetchFn });
    return {
      model: provider.responses(id),
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"], promptCacheKey: cacheKey } } as any,
    };
  }
  const provider = createOpenAICompatible({ name: "lovable", baseURL: GATEWAY, apiKey: key, headers, fetch: fetchFn });
  return { model: provider.chatModel(id), providerOptions: { lovable: { reasoningEffort: "medium" } } as any };
}
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
    db.from("assets").select("id, kind, name, role, tags, duration_seconds, meta, mime_type, group_id, inline_content").in("group_id", hubIds).is("project_id", null).order("created_at"),
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
    } else if (x.tool === "gemini-reaction" || x.tool === "gemini-edit-style") {
      if (full) lines.push(`  ${x.tool}: ${JSON.stringify(x.report)}`);
      else lines.push(`  ${x.tool}: ${clip(x.summary, 350)}${x.tool === "gemini-edit-style" ? ` | ${clip(JSON.stringify({ style_notes: x.report?.style_notes, popins: (x.report?.edit_events || []).filter((e: any) => e.type === "character_popin") }), 2500)}` : ""}`);
    } else lines.push(`  ${x.tool}: ${clip(x.summary, 350)}${x.report?.beats?.length ? ` beats: ${clip(x.report.beats.map((b: any) => `${b.start}-${b.end} ${b.label}`).join("; "), 400)}` : ""}`);
  }
  return lines.join("\n");
}

export function latestCode(files: any[]) {
  return [...files].reverse().find((a) => a.kind === "code" && a.inline_content) || null;
}

export const projectFiles = (ctx: EditorContext) => ctx.files.filter((a: any) => a.kind !== "code").map((a: any) => describe(a, ctx.analyses, true)).join("\n") || "(none)";

/** For clip projects: the source video, its segments, and the words + face track inside those segments only. */
export function clipSection(ctx: EditorContext) {
  const c = ctx.project.plan?.clip;
  if (!c?.source_asset_id || !Array.isArray(c.segments)) return "";
  const src = ctx.library.find((a: any) => a.id === c.source_asset_id);
  const an = ctx.analyses.filter((x: any) => x.asset_id === c.source_asset_id);
  const words = an.find((x: any) => x.tool === "assembly-transcript")?.report?.words || [];
  const frames = an.find((x: any) => x.tool === "gemini-frames")?.report?.frames || [];
  const cam = c.camera?.keys?.length ? c.camera : null;
  let offset = 0;
  const parts = c.segments.map((s: any, i: number) => {
    const w = words.filter((x: any) => x.end > s.in && x.start < s.out).map((x: any) => [x.w, +x.start.toFixed(2), +x.end.toFixed(2), x.speaker || ""]);
    const head = `SEGMENT ${i + 1} (${s.purpose || ""}): source ${s.in}s-${s.out}s, plays at clip time ${offset.toFixed(2)}s`;
    offset += s.out - s.in;
    if (cam) return `${head}\n  words [w, source_start, source_end, speaker]: ${JSON.stringify(w)}`;
    const f = frames.filter((x: any) => x.t >= s.in - 2 && x.t <= s.out + 2).map((x: any) => ({ t: x.t, layout: x.layout, people: x.people }));
    return `${head}\n  words [w, source_start, source_end, speaker]: ${JSON.stringify(w)}\n  rough snapshot layout (approximate, do not crop from it): ${JSON.stringify(f)}`;
  });
  const aspect = (Number(src?.meta?.width) || 16) / (Number(src?.meta?.height) || 9);
  const framing = cam
    ? `CAMERA FRAMING (from real face tracking — mandatory):
Paste this helper verbatim and render the footage ONLY through it: <ClipCamera src={SOURCE} segments={SEGMENTS} camera={CAMERA} srcAspect={${aspect.toFixed(4)}} zoom={punch} />. Never write your own crop/transform maths for the source video. For punch-ins pass zoom (1 to 1.25) driven by interpolate/spring. Put captions, hook, overlays and SFX on top of it.
Speakers → tracked faces: ${JSON.stringify(cam.speakers || {})}. Modes: s=follow one speaker, p=split screen (two people trading lines), w=wide (no reliable face).
const SEGMENTS = ${JSON.stringify(c.segments.map((s: any) => ({ in: s.in, out: s.out })))};
const CAMERA = ${JSON.stringify(cam.keys)};
${CLIP_CAMERA_CODE}`
    : `No face tracking for this clip yet: tell the user to press "Track faces" on the project page. Until then frame it wide (whole source frame letterboxed in 9:16); never guess crops.`;
  return `
CLIP FROM A LONG SOURCE (follow the clip-editing skill)
Source: ${src?.name || c.source_asset_id} | id ${c.source_asset_id} | url ${assetUrl(c.source_asset_id)} | ${src?.meta?.width || "?"}x${src?.meta?.height || "?"}
Hook: ${c.hook_text || ""} | Why: ${c.why || ""} | Framing hint: ${c.layout_hint || ""}
Total clip length: ${offset.toFixed(2)}s. Keep the source audio.
${parts.join("\n")}
${framing}
`;
}

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
PLAN: ${clip({ ...(project.plan || {}), clip: undefined }, 2000)}
${clipSection(ctx)}
PROJECT FILES
${projectFiles(ctx)}

STYLE REFERENCES (saved looks from past videos; load one with read_style_reference only when the user names it or agrees to your suggestion. Borrow fonts, colors, textures, image treatment and motion feel — never copy structure, timings or text.)
${library.filter((a: any) => a.role === "style-reference").map((a: any) => `- ${a.name} | id ${a.id} | ${clip(a.meta?.summary || "", 160)}`).join("\n") || "(none)"}

CHARACTERS (reusable code — copy the component into the video as-is and drive it with props; never redraw it)
${library.filter((a: any) => a.role === "character" && a.inline_content).map((a: any) => `--- ${a.name} | id ${a.id}\n${a.inline_content}`).join("\n") || "(none)"}

HUB + SHARED LIBRARY
${library.filter((a: any) => a.role !== "style-reference" && a.role !== "character").map((a: any) => describe(a, ctx.analyses, false)).join("\n") || "(none)"}`;
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
