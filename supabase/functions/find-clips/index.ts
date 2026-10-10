// Reads a whole long source (transcript + snapshot layout) in one pass and proposes short-form clips.
// Clips are virtual: lists of time ranges in the original file, snapped to word edges.
import { admin, cors, isUuid, json } from "../_shared/hub.ts";
import { pickModel } from "../_shared/editor-context.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["clips"],
  properties: {
    clips: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["title", "hook_text", "why", "score", "category", "segments", "layout_hint"],
        properties: {
          title: { type: "string" }, hook_text: { type: "string" }, why: { type: "string" },
          score: { type: "integer" }, category: { type: "string" }, layout_hint: { type: "string" },
          segments: { type: "array", items: { type: "object", additionalProperties: false, required: ["in", "out", "purpose"], properties: { in: { type: "number" }, out: { type: "number" }, purpose: { type: "string" } } } },
        },
      },
    },
  },
};

function transcriptText(report: any) {
  const utt = report?.utterances || [];
  if (utt.length) return utt.map((u: any) => `[${u.start.toFixed(1)}-${u.end.toFixed(1)} ${u.speaker}] ${u.text}`).join("\n");
  const words = report?.words || [];
  const out: string[] = [];
  let line: any[] = [];
  for (const w of words) {
    line.push(w);
    if (/[.?!]$/.test(w.w) || line.length > 40) { out.push(`[${line[0].start.toFixed(1)}-${w.end.toFixed(1)}] ${line.map((x) => x.w).join(" ")}`); line = []; }
  }
  if (line.length) out.push(`[${line[0].start.toFixed(1)}-${line[line.length - 1].end.toFixed(1)}] ${line.map((x) => x.w).join(" ")}`);
  return out.join("\n");
}

function layoutText(frames: any[]) {
  // Collapse consecutive snapshots with the same layout/people into spans.
  const spans: string[] = [];
  let cur: any = null;
  for (const f of frames) {
    const sig = `${f.layout}|${(f.people || []).map((p: any) => p.id).sort().join(",")}`;
    if (cur && cur.sig === sig) { cur.end = f.t; if (f.note) cur.notes.push(f.note); continue; }
    if (cur) spans.push(`${cur.start.toFixed(0)}-${cur.end.toFixed(0)}s ${cur.sig}${cur.notes.length ? ` (${cur.notes.slice(0, 3).join("; ")})` : ""}`);
    cur = { sig, start: f.t, end: f.t, notes: f.note ? [f.note] : [] };
  }
  if (cur) spans.push(`${cur.start.toFixed(0)}-${cur.end.toFixed(0)}s ${cur.sig}`);
  return spans.join("\n");
}

function snap(words: any[], t: number, edge: "in" | "out") {
  if (!words.length) return t;
  let best = words[0], d = Infinity;
  for (const w of words) { const v = edge === "in" ? w.start : w.end; const dd = Math.abs(v - t); if (dd < d) { d = dd; best = w; } }
  return d < 2 ? (edge === "in" ? Math.max(0, best.start - 0.08) : best.end + 0.12) : t;
}

async function callModel(model: string, system: string, user: string) {
  const or = model.startsWith("openrouter/");
  const key = Deno.env.get(or ? "OPENROUTER_API_KEY" : "LOVABLE_API_KEY") || "";
  const headers: Record<string, string> = or
    ? { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Title": "ShortDingus" }
    : { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" };
  const openai = model.startsWith("openai/");
  const res = await fetch(or ? "https://openrouter.ai/api/v1/chat/completions" : `${GATEWAY}/${openai ? "responses" : "chat/completions"}`, {
    method: "POST", headers,
    body: JSON.stringify(openai
      ? { model, stream: true, store: false, reasoning: { effort: "low" }, input: [{ role: "system", content: system }, { role: "user", content: user }], text: { format: { type: "json_schema", name: "clips", strict: true, schema: SCHEMA } } }
      : or
        ? { model: model.slice("openrouter/".length), stream: true, reasoning: { effort: "low" }, response_format: { type: "json_schema", json_schema: { name: "clips", strict: true, schema: SCHEMA } }, messages: [{ role: "system", content: system }, { role: "user", content: `${user}\n\nReturn ONLY JSON matching: ${JSON.stringify(SCHEMA)}` }] }
        : { model, stream: true, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: `${user}\n\nReturn ONLY JSON matching: ${JSON.stringify(SCHEMA)}` }] }),
  });
  if (res.status === 402) throw new Error(or ? "Your OpenRouter balance is empty. Top it up and try again." : "AI credits are used up. Add credits and try again.");
  if (res.status === 429) throw new Error("AI is busy right now. Try again in a minute.");
  if (!res.ok) throw new Error(`AI request failed on ${model} (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const reader = res.body!.getReader(); const dec = new TextDecoder();
  let buf = "", out = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim(); if (!t.startsWith("data:")) continue;
      const d = t.slice(5).trim(); if (!d || d === "[DONE]") continue;
      try { const j = JSON.parse(d); out += openai ? (j.type === "response.output_text.delta" ? j.delta || "" : "") : j.choices?.[0]?.delta?.content || ""; } catch { /* partial */ }
    }
  }
  const s = out.indexOf("{"), e = out.lastIndexOf("}");
  if (s < 0) throw new Error("The model returned no clips.");
  return JSON.parse(out.slice(s, e + 1));
}

async function run(rowId: string, asset: any, model: string, instructions: string) {
  const db = admin();
  try {
    const { data: an } = await db.from("asset_analyses").select("tool, report").eq("asset_id", asset.id).eq("status", "complete").order("created_at", { ascending: false });
    const tr = (an || []).find((a: any) => a.tool === "assembly-transcript");
    if (!tr?.report?.words?.length) throw new Error("No transcript yet — wait for transcription to finish.");
    const fr = (an || []).find((a: any) => a.tool === "gemini-frames");
    const { data: skill } = await db.from("skills").select("body").eq("slug", "clip-finder").is("group_id", null).maybeSingle();
    const dur = Number(asset.duration_seconds) || tr.report.words[tr.report.words.length - 1].end;
    const system = `You are a top short-form clipper. You read an ENTIRE long video at once and pick the moments that will perform as vertical shorts.\n\n${skill?.body || ""}`;
    const user = `SOURCE: "${asset.name}", ${fmt(dur)} long.
${instructions ? `USER INSTRUCTIONS (follow these first):\n${instructions}\n` : ""}
TRANSCRIPT ([start-end seconds speaker] text):
${transcriptText(tr.report)}

VISUAL LAYOUT OVER TIME (from snapshots: layout|people ids):
${fr ? layoutText(fr.report?.frames || []) : "(not available)"}

Return 8-25 clips, best first. Each clip: segments in PLAY ORDER with absolute seconds in the source (one segment for a straight clip; add a separate hook segment from anywhere in the video when it makes a stronger opening). Typical total 20-75s unless the moment needs otherwise. score 0-100 = honest viral potential. category e.g. hot-take, story, advice, funny, clash, reveal. layout_hint = how to frame it (e.g. "follow speaker B", "split screen A/B", "wide then punch in"). hook_text = the on-screen hook line.`;
    const out = await callModel(model, system, user);
    const words = tr.report.words;
    const clips = (out.clips || []).map((c: any) => ({
      ...c, score: Math.max(0, Math.min(100, Math.round(Number(c.score) || 0))),
      segments: (c.segments || []).map((s: any) => ({ purpose: String(s.purpose || ""), in: +snap(words, Math.max(0, Number(s.in) || 0), "in").toFixed(2), out: +snap(words, Math.min(dur, Number(s.out) || 0), "out").toFixed(2) })).filter((s: any) => s.out - s.in > 0.4),
    })).filter((c: any) => c.segments.length).sort((a: any, b: any) => b.score - a.score);
    if (!clips.length) throw new Error("No usable clips came back. Try again or add instructions.");
    await db.from("asset_analyses").update({ status: "complete", summary: `${clips.length} clips found (${model}).`, report: { clips, model, instructions }, error_message: null }).eq("id", rowId);
  } catch (e) {
    console.error("[find-clips]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Clip finding failed." }).eq("id", rowId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const assetId = String(body?.assetId || "");
  if (!isUuid(assetId)) return json({ error: "Missing or invalid assetId." }, 400);
  const instructions = typeof body?.instructions === "string" ? body.instructions.slice(0, 4000) : "";
  const model = pickModel(body?.model);
  const db = admin();
  const { data: asset } = await db.from("assets").select("*").eq("id", assetId).maybeSingle();
  if (!asset || asset.kind !== "video") return json({ error: "Video not found." }, 404);
  const { data: row, error } = await db.from("asset_analyses").insert({ asset_id: asset.id, group_id: asset.group_id, tool: "clip-finder", status: "running" }).select().single();
  if (error || !row) return json({ error: "Could not start clip finding." }, 500);
  EdgeRuntime.waitUntil(run(row.id, asset, model, instructions));
  return json({ analysis: row }, 202);
});
