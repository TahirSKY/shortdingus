// Background video builder. Writes the video file one part per invocation (non-streaming, so it stays
// far under the function's CPU limit), saves progress in editor_builds, then calls itself for the next part.
import { createOpenAI } from "npm:@ai-sdk/openai@4.0.83";
import { generateText } from "npm:ai@7.0.126";
import { admin, cors, json } from "../_shared/hub.ts";
import { GATEWAY, MODEL, clip, knowledge, loadContext, saveVersion } from "../_shared/editor-context.ts";

const MAX_PARTS = 8;
const STALE_MS = 4 * 60 * 1000;
const END = "// @@END_OF_FILE";

async function conversation(db: any, projectId: string) {
  const { data } = await db.from("editor_messages").select("role, ui_message").eq("project_id", projectId).order("created_at", { ascending: false }).limit(16);
  return (data || []).reverse().map((r: any) => {
    const text = (r.ui_message?.parts || []).filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n").trim();
    return text ? `${r.role.toUpperCase()}: ${clip(text, 4000)}` : "";
  }).filter(Boolean).join("\n\n");
}

function stripFences(t: string) {
  return t.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n?```\s*$/i, "");
}

function errorText(e: any) {
  const status = e?.statusCode ?? e?.status;
  if (status === 402) return "AI credits are used up. Add credits in Settings → Plans & credits, then press Continue.";
  if (status === 429) return "The AI is busy right now. Wait a minute, then press Continue.";
  if (status === 403) return `The AI request was refused: ${clip(e?.responseBody || e?.message, 200)}`;
  return `Build stopped: ${clip(e?.message || String(e), 240)}`;
}

async function runPart(buildId: string) {
  const db = admin();
  const { data: build } = await db.from("editor_builds").select("*").eq("id", buildId).single();
  if (!build || build.status !== "running") return;
  const ctx = await loadContext(db, build.project_id);
  if (!ctx) return;
  const part = build.part + 1;
  try {
    const key = Deno.env.get("LOVABLE_API_KEY")!;
    const provider = createOpenAI({ baseURL: GATEWAY, apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    const soFar = build.code as string;
    const system = `You are the in-house video editor for the "${ctx.hub.title}" hub, writing the Remotion code for the project "${ctx.project.name}". You write high-quality, competitive short-form video code: polished motion, every visual timed to the voiceover words, nothing that feels like a slideshow.

You are writing ONE complete single-file video, in parts. Each reply is the next part of the file, raw code only (no markdown fences, no commentary). Parts are joined with a newline, so continue exactly where the file so far ends — never repeat code already written, never restart. Write roughly 200-350 lines per part, ending at a clean boundary (end of a constant, component or function). When the file is complete, the last line of your reply must be exactly: ${END}
${part === 1 ? `This is part 1. Start with the REMOTION_CONFIG comment, then a short /* BUILD OUTLINE */ comment listing the sections of the file in order, then begin writing.` : `This is part ${part}. Follow the BUILD OUTLINE at the top of the file.`}
Do not cut quality or detail to finish sooner — use as many parts as the video needs (at most ${MAX_PARTS}).

${knowledge(ctx)}`;
    const prompt = `CONVERSATION WITH THE USER (the approved proposal is in here)
${await conversation(db, build.project_id)}

BUILD BRIEF FROM THE EDITOR
${build.brief}

${soFar ? `FILE SO FAR (${soFar.split("\n").length} lines, parts 1-${build.part}):\n${soFar}\n\nWrite part ${part}, continuing exactly from the last line above.` : "Write part 1."}`;
    const { text } = await generateText({
      model: provider.responses(MODEL),
      system,
      prompt,
      maxOutputTokens: 24000,
      providerOptions: { openai: { reasoningEffort: "medium", store: false } },
    });
    let chunk = stripFences(text).replace(/\s+$/, "");
    const finished = chunk.includes(END) || part >= MAX_PARTS;
    chunk = chunk.replace(END, "").replace(/\s+$/, "");
    const code = soFar ? `${soFar}\n${chunk}` : chunk;
    const lines = code.split("\n").length;
    if (!finished) {
      await db.from("editor_builds").update({ code, part, lines }).eq("id", buildId);
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/editor-build`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({ buildId, expect: part }),
      });
      return;
    }
    const saved = await saveVersion(db, ctx, code, build.summary || "Full build", { allowMissing: true });
    if ("error" in saved) throw new Error(saved.error);
    await db.from("editor_builds").update({
      code, part, lines, status: "done", version: saved.version,
      error: saved.missing.length ? `Saved, but these file ids don't exist: ${saved.missing.join(", ")}. Ask the editor to fix them before rendering.` : null,
    }).eq("id", buildId);
  } catch (e) {
    console.error("[editor-build]", e);
    await db.from("editor_builds").update({ status: "failed", error: errorText(e) }).eq("id", buildId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const buildId = String(body?.buildId || "");
  if (!/^[0-9a-f-]{36}$/i.test(buildId)) return json({ error: "buildId is required." }, 400);
  const db = admin();
  const { data: build } = await db.from("editor_builds").select("id, status, part, updated_at").eq("id", buildId).maybeSingle();
  if (!build) return json({ error: "Build not found." }, 404);

  if (body.resume) {
    // Continue only a build that really stopped: failed, or no progress for a few minutes.
    const stale = Date.now() - new Date(build.updated_at).getTime() > STALE_MS;
    if (build.status === "done") return json({ error: "This build already finished." }, 409);
    if (build.status === "running" && !stale) return json({ ok: true, note: "Still building." }, 202);
    await db.from("editor_builds").update({ status: "running", error: null }).eq("id", buildId);
  } else if (build.status !== "running" || Number(body.expect ?? build.part) !== build.part) {
    return json({ ok: true, note: "Nothing to do." }, 200);
  } else {
    await db.from("editor_builds").update({ updated_at: new Date().toISOString() }).eq("id", buildId);
  }

  (globalThis as any).EdgeRuntime?.waitUntil?.(runPart(buildId));
  return json({ ok: true, buildId }, 202);
});
