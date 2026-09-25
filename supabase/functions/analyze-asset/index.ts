import { admin, cors, isUuid, json } from "../_shared/hub.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

type Beat = { start: number; end: number; label: string; detail: string; emotion: string; dialogue: string; visual_event: string; opportunity: string };

export function parseJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model returned no JSON.");
  return JSON.parse(raw.slice(start, end + 1));
}

export function normalizeBeats(input: unknown, duration: number): Beat[] {
  const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const s = (v: unknown) => String(v ?? "").trim().slice(0, 600);
  return (Array.isArray(input) ? input : []).slice(0, 30).map((b: any) => {
    const start = Math.max(0, Math.min(max, Number(b?.start) || 0));
    const end = Math.max(start, Math.min(max, Number(b?.end) || start));
    return { start, end, label: s(b?.label), detail: s(b?.detail), emotion: s(b?.emotion), dialogue: s(b?.dialogue), visual_event: s(b?.visual_event), opportunity: s(b?.opportunity) };
  }).filter((b) => b.label || b.detail).sort((a, b) => a.start - b.start);
}

async function readSseText(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const d = t.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try { out += JSON.parse(d).choices?.[0]?.delta?.content || ""; } catch { /* partial */ }
    }
  }
  return out;
}

async function runGemini(analysisId: string, asset: any) {
  const db = admin();
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("AI is not configured.");
    const { data: signed, error } = await db.storage.from("hub-media").createSignedUrl(asset.storage_path, 1800);
    if (error || !signed) throw new Error("Could not open the video.");
    const duration = Number(asset.duration_seconds) || 0;
    const prompt = `Watch this video${duration ? ` (${duration.toFixed(1)} seconds long)` : ""} and return ONLY a JSON object:
{"summary": string, "beats": [{"start": number, "end": number, "label": string, "detail": string, "emotion": string, "dialogue": string, "visual_event": string, "opportunity": string}]}
Rules: times are numeric seconds; cover the full timeline with non-overlapping beats in order; "dialogue" is only words actually spoken (empty string if none) — never invent dialogue; "opportunity" is an editing idea for that moment. Valid JSON only.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash", stream: true, response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "video_url", video_url: { url: signed.signedUrl } }] }],
      }),
    });
    if (res.status === 402) throw new Error("AI credits are used up. Add credits and try again.");
    if (res.status === 429) throw new Error("AI is busy right now. Try again in a minute.");
    if (!res.ok) throw new Error(`AI request failed (${res.status}).`);
    const parsed = parseJsonObject(await readSseText(res));
    const beats = normalizeBeats(parsed.beats, duration);
    const summary = String(parsed.summary || "").trim().slice(0, 4000);
    await db.from("asset_analyses").update({ status: "complete", summary, report: { summary, beats }, error_message: null }).eq("id", analysisId);
  } catch (e) {
    console.error("[analyze-asset]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Analysis failed." }).eq("id", analysisId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const assetId = String(body?.assetId || "");
  const tool = String(body?.tool || "gemini-video");
  if (!isUuid(assetId)) return json({ error: "Missing or invalid assetId." }, 400);
  const db = admin();
  const { data: asset } = await db.from("assets").select("*").eq("id", assetId).maybeSingle();
  if (!asset) return json({ error: "Asset not found." }, 404);

  // ---- assembly-transcript: insert path ready, provider not wired yet ----
  if (tool === "assembly-transcript") {
    return json({ error: "Transcripts are not implemented yet." }, 501);
  }

  await expireStale(db);
  const isImage = asset.kind === "image";
  const useTool = isImage ? "gemini-image" : tool;
  if (useTool !== "gemini-video" && useTool !== "gemini-image") return json({ error: "Unknown tool." }, 400);
  if (!["video", "image"].includes(asset.kind) || !asset.storage_path) return json({ error: "Only uploaded videos or images can be analysed." }, 400);
  const { data: row, error } = await db.from("asset_analyses")
    .insert({ asset_id: asset.id, group_id: asset.group_id, tool: useTool, status: "running" }).select().single();
  if (error || !row) return json({ error: "Could not start analysis." }, 500);
  EdgeRuntime.waitUntil(isImage ? runImage(row.id, asset) : runGemini(row.id, asset));
  return json({ analysis: row }, 202);
});
