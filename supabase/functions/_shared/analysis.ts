import { admin } from "./hub.ts";


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

export async function runGemini(analysisId: string, asset: any) {
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

export async function expireStale(db: any) {
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  await db.from("asset_analyses").update({ status: "error", error_message: "Analysis timed out. Run it again." })
    .in("status", ["running", "pending"]).lt("created_at", cutoff);
}

export async function runImage(analysisId: string, asset: any) {
  const db = admin();
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("AI is not configured.");
    const { data: signed, error } = await db.storage.from("hub-media").createSignedUrl(asset.storage_path, 1800);
    if (error || !signed) throw new Error("Could not open the image.");
    const prompt = `Describe this image for a video editor who cannot see it. Return ONLY a JSON object: {"summary": string (one or two sentences), "detail": string (subjects, setting, composition, colors, mood, any visible text, and how it could be used in a vertical short video)}. Valid JSON only.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash", stream: true, response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: signed.signedUrl } }] }],
      }),
    });
    if (res.status === 402) throw new Error("AI credits are used up. Add credits and try again.");
    if (res.status === 429) throw new Error("AI is busy right now. Try again in a minute.");
    if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const parsed = parseJsonObject(await readSseText(res));
    const summary = String(parsed.summary || "").trim().slice(0, 2000);
    const detail = String(parsed.detail || "").trim().slice(0, 6000);
    if (!summary) throw new Error("The model returned no description.");
    await db.from("asset_analyses").update({ status: "complete", summary, report: { summary, detail }, error_message: null }).eq("id", analysisId);
  } catch (e) {
    console.error("[analyze-asset:image]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Analysis failed." }).eq("id", analysisId);
  }
}


/** Start an analysis row for an image/video asset and return the background job promise (or null). */
export async function startAnalysis(asset: any): Promise<Promise<void> | null> {
  if (!asset?.storage_path || !["image", "video"].includes(asset.kind)) return null;
  const db = admin();
  await expireStale(db);
  const tool = asset.kind === "image" ? "gemini-image" : "gemini-video";
  const { data: row, error } = await db.from("asset_analyses")
    .insert({ asset_id: asset.id, group_id: asset.group_id, tool, status: "running" }).select().single();
  if (error || !row) { console.error("[auto-analysis] insert failed", error); return null; }
  return asset.kind === "image" ? runImage(row.id, asset) : runGemini(row.id, asset);
}
