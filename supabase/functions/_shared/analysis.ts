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
  // Long AssemblyAI jobs (with a saved transcript_id) get 3 hours; they are finished by resumeAssembly.
  await db.from("asset_analyses").update({ status: "error", error_message: "Analysis timed out. Run it again." })
    .in("status", ["running", "pending"]).lt("created_at", cutoff).is("report->>transcript_id", null);
  await db.from("asset_analyses").update({ status: "error", error_message: "Transcription timed out. Run it again." })
    .in("status", ["running", "pending"]).lt("created_at", new Date(Date.now() - 3 * 3600_000).toISOString());
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


const FILLERS = new Set(["um", "uh", "erm", "ah", "hmm", "like", "basically", "actually", "literally"]);

/** Word-by-word timing for voice/video: words, caption-ready lines and cut suggestions. */
export async function runWords(analysisId: string, asset: any) {
  const db = admin();
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("AI is not configured.");
    const { data: signed, error } = await db.storage.from("hub-media").createSignedUrl(asset.storage_path, 1800);
    if (error || !signed) throw new Error("Could not open the file.");
    let media: Record<string, unknown>;
    if (asset.kind === "video") media = { type: "video_url", video_url: { url: signed.signedUrl } };
    else {
      const r = await fetch(signed.signedUrl);
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const fmt = String(asset.mime_type || "").includes("wav") ? "wav" : "mp3";
      media = { type: "input_audio", input_audio: { data: btoa(bin), format: fmt } };
    }
    const prompt = `Transcribe every spoken word with timing. Return ONLY JSON: {"text": string, "words": [{"w": string, "start": number, "end": number}]}. Times in seconds, in order, one entry per word including filler words (um, uh). If nothing is spoken return {"text":"","words":[]}.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "google/gemini-3.8-flash", stream: true, response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, media] }] }),
    });
    if (res.status === 402) throw new Error("AI credits are used up. Add credits and try again.");
    if (res.status === 429) throw new Error("AI is busy right now. Try again in a minute.");
    if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const parsed = parseJsonObject(await readSseText(res));
    const words = (Array.isArray(parsed.words) ? parsed.words : []).map((x: any) => ({ w: String(x?.w ?? "").trim(), start: Math.max(0, Number(x?.start) || 0), end: Math.max(0, Number(x?.end) || 0) }))
      .filter((x: any) => x.w).map((x: any) => ({ ...x, end: Math.max(x.start, x.end) })).sort((a: any, b: any) => a.start - b.start);
    const cuts: { start: number; end: number; reason: string }[] = [];
    for (let i = 0; i < words.length; i++) {
      const bare = words[i].w.toLowerCase().replace(/[^a-z]/g, "");
      if (["um", "uh", "erm", "ah", "hmm"].includes(bare)) cuts.push({ start: words[i].start, end: words[i].end, reason: `filler "${words[i].w}"` });
      if (i > 0 && words[i].start - words[i - 1].end > 0.6) cuts.push({ start: words[i - 1].end + 0.1, end: words[i].start - 0.1, reason: "silence" });
    }
    const lines: { text: string; start: number; end: number }[] = [];
    let cur: any[] = [];
    for (const w of words) { cur.push(w); if (cur.length >= 4 || /[.!?,]$/.test(w.w)) { lines.push({ text: cur.map((c) => c.w).join(" "), start: cur[0].start, end: cur[cur.length - 1].end }); cur = []; } }
    if (cur.length) lines.push({ text: cur.map((c) => c.w).join(" "), start: cur[0].start, end: cur[cur.length - 1].end });
    const text = String(parsed.text || words.map((x: any) => x.w).join(" ")).slice(0, 20000);
    const summary = words.length ? `${words.length} words, ${cuts.length} suggested cuts.` : "No speech found.";
    await db.from("asset_analyses").update({ status: "complete", summary, report: { text, words, caption_lines: lines, cuts, fillers_checked: [...FILLERS] }, error_message: null }).eq("id", analysisId);
  } catch (e) {
    console.error("[analyze-asset:words]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Transcription failed." }).eq("id", analysisId);
  }
}

function wordExtras(words: { w: string; start: number; end: number }[]) {
  const cuts: { start: number; end: number; reason: string }[] = [];
  for (let i = 0; i < words.length; i++) {
    const bare = words[i].w.toLowerCase().replace(/[^a-z]/g, "");
    if (["um", "uh", "erm", "ah", "hmm"].includes(bare)) cuts.push({ start: words[i].start, end: words[i].end, reason: `filler "${words[i].w}"` });
    if (i > 0 && words[i].start - words[i - 1].end > 0.6) cuts.push({ start: +(words[i - 1].end + 0.1).toFixed(3), end: +(words[i].start - 0.1).toFixed(3), reason: "silence" });
  }
  const lines: { text: string; start: number; end: number }[] = [];
  let cur: typeof words = [];
  for (const w of words) { cur.push(w); if (cur.length >= 4 || /[.!?,]$/.test(w.w)) { lines.push({ text: cur.map((c) => c.w).join(" "), start: cur[0].start, end: cur[cur.length - 1].end }); cur = []; } }
  if (cur.length) lines.push({ text: cur.map((c) => c.w).join(" "), start: cur[0].start, end: cur[cur.length - 1].end });
  return { cuts, caption_lines: lines };
}

/** AssemblyAI word-level transcript (times in seconds). */
async function finishAssembly(db: any, analysisId: string, t: any) {
  const words = (t.words || []).map((x: any) => ({ w: String(x.text), start: x.start / 1000, end: x.end / 1000, ...(x.speaker ? { speaker: x.speaker } : {}) }));
  const utterances = (t.utterances || []).map((u: any) => ({ speaker: u.speaker, text: u.text, start: u.start / 1000, end: u.end / 1000 }));
  const extras = wordExtras(words);
  const summary = words.length ? `${words.length} words, ${extras.cuts.length} suggested cuts.` : "No speech found.";
  await db.from("asset_analyses").update({ status: "complete", summary, report: { text: t.text || "", words, utterances, ...extras, provider: "assemblyai", transcript_id: t.id }, error_message: null }).eq("id", analysisId);
}

/** Check a long-running AssemblyAI job once (used for long source videos that outlive the first background run). */
export async function resumeAssembly(analysisId: string) {
  const db = admin();
  const { data: row } = await db.from("asset_analyses").select("id, status, report").eq("id", analysisId).maybeSingle();
  const tid = row?.report?.transcript_id;
  if (!row || row.status !== "running" || !tid) return row?.status || "missing";
  const key = Deno.env.get("ASSEMBLYAI_API_KEY");
  const r = await fetch(`https://api.assemblyai.com/v2/transcript/${tid}`, { headers: { authorization: key || "" } });
  const t = await r.json().catch(() => ({}));
  if (t.status === "completed") { await finishAssembly(db, analysisId, t); return "complete"; }
  if (t.status === "error") { await db.from("asset_analyses").update({ status: "error", error_message: `AssemblyAI: ${String(t.error).slice(0, 200)}` }).eq("id", analysisId); return "error"; }
  return "running";
}

export async function runAssembly(analysisId: string, asset: any) {
  const db = admin();
  try {
    const key = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!key) throw new Error("AssemblyAI is not configured.");
    const { data: signed, error } = await db.storage.from("hub-media").createSignedUrl(asset.storage_path, 6 * 3600);
    if (error || !signed) throw new Error("Could not open the file.");
    const start = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST", headers: { authorization: key, "content-type": "application/json" },
      body: JSON.stringify({ audio_url: signed.signedUrl, speech_model: "universal", disfluencies: true, punctuate: true, format_text: true, speaker_labels: true }),
    });
    const job = await start.json().catch(() => ({}));
    if (!start.ok || !job.id) throw new Error(`AssemblyAI refused the file (${start.status}): ${String(job.error || "").slice(0, 200)}`);
    // Save the job id so long videos can be finished later by resumeAssembly.
    await db.from("asset_analyses").update({ report: { transcript_id: job.id, provider: "assemblyai" } }).eq("id", analysisId);
    let t: any = job;
    const deadline = Date.now() + 5 * 60_000;
    while (t.status !== "completed" && t.status !== "error") {
      if (Date.now() > deadline) return; // still running; resumeAssembly finishes it
      await new Promise((r) => setTimeout(r, 4000));
      const r = await fetch(`https://api.assemblyai.com/v2/transcript/${job.id}`, { headers: { authorization: key } });
      t = await r.json();
    }
    if (t.status === "error") throw new Error(`AssemblyAI: ${String(t.error).slice(0, 200)}`);
    await finishAssembly(db, analysisId, t);
  } catch (e) {
    console.error("[analyze-asset:assembly]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Transcription failed." }).eq("id", analysisId);
  }
}

/** Faces + layout from browser-made contact sheets (meta.frames.sheets), so long sources never go through the 20 MB video path. */
export async function runFrames(analysisId: string, asset: any) {
  const db = admin();
  try {
    const sheets: { path: string; times: number[]; cols: number }[] = asset.meta?.frames?.sheets || [];
    if (!sheets.length) throw new Error("No snapshots yet. Re-open the source page to make them.");
    const BATCH = 4;
    const batches: typeof sheets[] = [];
    for (let i = 0; i < sheets.length; i += BATCH) batches.push(sheets.slice(i, i + BATCH));
    const frames: any[] = [], notes: string[] = [];
    const runBatch = async (b: typeof sheets) => {
      const urls: string[] = [];
      for (const s of b) { const { data } = await db.storage.from("hub-media").createSignedUrl(s.path, 1800); if (data) urls.push(data.signedUrl); }
      const order = b.map((s, i) => `Image ${i + 1}: grid of ${s.cols} columns, read left-to-right then top-to-bottom; cell times (seconds) = ${JSON.stringify(s.times)}`).join("\n");
      const prompt = `These are snapshot grids from a long video (podcast/talk/stream) for a vertical-shorts editor who must crop it to 9:16.
${order}
For EVERY cell return one entry. Return ONLY JSON: {"frames":[{"t":number,"layout":"single"|"two_shot"|"wide_group"|"screen"|"broll"|"other","people":[{"id":string,"x":number,"y":number,"w":number,"h":number}],"note":string}],"summary":string}
x,y,w,h = face box as fractions 0-1 of THAT cell (x,y = top-left). Keep the same "id" (e.g. "left_man_glasses") for the same person across cells. "note" = anything visually notable (gesture, laugh, prop, on-screen text), else "". Valid JSON only.`;
      const key = Deno.env.get("LOVABLE_API_KEY");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": key || "", "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({ model: "google/gemini-3.8-flash", stream: true, response_format: { type: "json_object" },
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...urls.map((url) => ({ type: "image_url", image_url: { url } }))] }] }),
      });
      if (res.status === 402) throw new Error("AI credits are used up. Add credits and try again.");
      if (!res.ok) throw new Error(`AI request failed (${res.status}).`);
      const d = parseJsonObject(await readSseText(res));
      for (const f of d.frames || []) frames.push({ t: Number(f.t) || 0, layout: String(f.layout || "other"), people: (f.people || []).slice(0, 6).map((p: any) => ({ id: String(p.id || "?"), x: +Number(p.x).toFixed(3), y: +Number(p.y).toFixed(3), w: +Number(p.w).toFixed(3), h: +Number(p.h).toFixed(3) })), ...(f.note ? { note: String(f.note).slice(0, 200) } : {}) });
      if (d.summary) notes.push(String(d.summary).slice(0, 400));
    };
    for (let i = 0; i < batches.length; i += 4) await Promise.all(batches.slice(i, i + 4).map(runBatch));
    frames.sort((a, b) => a.t - b.t);
    const layouts: Record<string, number> = {};
    for (const f of frames) layouts[f.layout] = (layouts[f.layout] || 0) + 1;
    const summary = `${frames.length} snapshots read. Layouts: ${Object.entries(layouts).map(([k, v]) => `${k} ${v}`).join(", ")}. ${notes.slice(0, 3).join(" ")}`.slice(0, 2000);
    await db.from("asset_analyses").update({ status: "complete", summary, report: { summary, frames, shots: asset.meta?.frames?.shots || [], interval: asset.meta?.frames?.interval } , error_message: null }).eq("id", analysisId);
  } catch (e) {
    console.error("[analyze-asset:frames]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Snapshot analysis failed." }).eq("id", analysisId);
  }
}

// Every video gets a transcript (AssemblyAI returns empty words when there is no speech); audio unless it's sfx/music.
const isVoice = (a: any) => a.kind === "audio" ? !["sfx", "music"].includes(a.role) : a.kind === "video";

const REACTION_MODELS = ["google/gemini-3.1-pro-preview", "google/gemini-3.8-flash"];
const WINDOW = 120; // seconds per analysis chunk so long videos are fully covered

async function geminiJson(prompt: string, url: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("AI is not configured.");
  let last = "";
  for (const model of REACTION_MODELS) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model, stream: true, response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "video_url", video_url: { url } }] }] }),
    });
    if (res.status === 402) throw new Error("AI credits are used up. Add credits and try again.");
    if (res.status === 403) throw new Error(`AI access denied (403): ${(await res.text()).slice(0, 200)}`);
    if (!res.ok) { last = `AI request failed on ${model} (${res.status}).`; continue; }
    try { return { model, data: parseJsonObject(await readSseText(res)) }; } catch (e) { last = `${model}: ${(e as Error).message}`; }
  }
  throw new Error(last || "AI request failed.");
}

/** Deep analysis for reaction hubs: dense timeline + reaction moments, or an edit-style report for reference clips. */
export async function runReaction(analysisId: string, asset: any, tool: "gemini-reaction" | "gemini-edit-style") {
  const db = admin();
  try {
    const { data: signed, error } = await db.storage.from("hub-media").createSignedUrl(asset.storage_path, 3600);
    if (error || !signed) throw new Error("Could not open the video.");
    if (Number(asset.size_bytes) > 20_000_000) throw new Error(`This video is ${(Number(asset.size_bytes) / 1048576).toFixed(0)} MB; the AI can only watch videos under about 19 MB. Re-export it smaller (e.g. 480p) and upload again.`);
    const duration = Number(asset.duration_seconds) || 0;
    const windows: [number, number][] = [];
    if (duration > WINDOW * 1.25) for (let s = 0; s < duration; s += WINDOW) windows.push([s, Math.min(duration, s + WINDOW)]);
    else windows.push([0, duration || 0]);
    const timeline: any[] = [], moments: any[] = [], edits: any[] = [], notes: string[] = [];
    let model = "";
    for (const [a, b] of windows) {
      const range = windows.length > 1 ? `Only cover ${a.toFixed(0)}s to ${b.toFixed(0)}s of this ${duration.toFixed(0)}s video (absolute times). ` : (duration ? `The video is ${duration.toFixed(1)}s long. ` : "");
      const prompt = tool === "gemini-reaction"
        ? `${range}You are logging a source video for a reaction-video editor who cannot see it. Be exhaustive and precise. Return ONLY JSON:
{"summary": string, "timeline": [{"start": number, "end": number, "shot": string, "on_screen": string, "action": string, "expression": string, "text_on_screen": string, "audio": string, "speech": string}], "reaction_moments": [{"time": number, "end": number, "what": string, "why": "sus"|"cringe"|"funny"|"shocking"|"dumb"|"wholesome"|"other", "suggested_reaction": string, "intensity": 1|2|3}]}
Rules: a new timeline entry at every cut or notable change (aim for every 1-3 seconds); "speech" only words actually spoken; "suggested_reaction" can be silent (side-eye, stare, freeze + zoom, mute) or a roast idea. Times in seconds. Valid JSON only.`
        : `${range}This is a reference reaction video from another channel. Analyse HOW it is edited, not the story. Return ONLY JSON:
{"summary": string, "edit_events": [{"time": number, "end": number, "type": "character_popin"|"zoom"|"freeze"|"sfx"|"caption"|"meme_overlay"|"cut"|"music"|"other", "detail": string}], "style_notes": [string]}
Include every character appearance (position, size, how it enters/leaves, what it does, mouth movement), every zoom/freeze, audible SFX, caption style. Times in seconds. Valid JSON only.`;
      const r = await geminiJson(prompt, signed.signedUrl);
      model = r.model;
      const d = r.data;
      if (d.summary) notes.push(String(d.summary).slice(0, 1500));
      for (const x of d.timeline || []) timeline.push(x);
      for (const x of d.reaction_moments || []) moments.push(x);
      for (const x of d.edit_events || []) edits.push(x);
      for (const x of d.style_notes || []) notes.push(`style: ${String(x).slice(0, 400)}`);
    }
    const byTime = (k: string) => (p: any, q: any) => (Number(p[k]) || 0) - (Number(q[k]) || 0);
    timeline.sort(byTime("start")); moments.sort(byTime("time")); edits.sort(byTime("time"));
    const summary = notes.filter((n) => !n.startsWith("style:")).join(" ").slice(0, 4000) || notes.join(" ").slice(0, 4000);
    const report = tool === "gemini-reaction"
      ? { summary, timeline: timeline.slice(0, 600), reaction_moments: moments.slice(0, 200), model, windows }
      : { summary, edit_events: edits.slice(0, 600), style_notes: notes.filter((n) => n.startsWith("style:")).map((n) => n.slice(7)), popin_count: edits.filter((e) => e.type === "character_popin").length, model, windows };
    await db.from("asset_analyses").update({ status: "complete", summary, report, error_message: null }).eq("id", analysisId);
  } catch (e) {
    console.error("[analyze-asset:reaction]", e);
    await db.from("asset_analyses").update({ status: "error", error_message: (e as Error).message?.slice(0, 300) || "Analysis failed." }).eq("id", analysisId);
  }
}

/** Which video analysis a new asset gets, based on its hub's analysis mode and tags. */
export async function videoTool(db: any, asset: any): Promise<"gemini-video" | "gemini-reaction" | "gemini-edit-style"> {
  if (asset.role === "reference" || (asset.tags || []).includes("reference")) return "gemini-edit-style";
  const { data: g } = await db.from("asset_groups").select("analysis_mode").eq("id", asset.group_id).maybeSingle();
  return g?.analysis_mode === "reaction" ? "gemini-reaction" : "gemini-video";
}

/** Start background analyses for a new asset (description for images/videos, transcript for voice). */
export async function startAnalysis(asset: any): Promise<Promise<void> | null> {
  if (!asset?.storage_path) return null;
  if ((asset.tags || []).includes("cutout")) return null; // cut-outs don't need their own description
  const db = admin();
  await expireStale(db);
  const jobs: Promise<void>[] = [];
  if (["image", "video"].includes(asset.kind) && asset.role !== "source") {
    const tool = asset.kind === "image" ? "gemini-image" : await videoTool(db, asset);
    const { data: row, error } = await db.from("asset_analyses").insert({ asset_id: asset.id, group_id: asset.group_id, tool, status: "running" }).select().single();
    if (error || !row) console.error("[auto-analysis] insert failed", error);
    else jobs.push(tool === "gemini-image" ? runImage(row.id, asset) : tool === "gemini-video" ? runGemini(row.id, asset) : runReaction(row.id, asset, tool));
  }
  if (isVoice(asset)) {
    const { data: row, error } = await db.from("asset_analyses").insert({ asset_id: asset.id, group_id: asset.group_id, tool: "assembly-transcript", status: "running" }).select().single();
    if (error || !row) console.error("[auto-transcript] insert failed", error);
    else jobs.push(runAssembly(row.id, asset));
  }
  return jobs.length ? Promise.all(jobs).then(() => {}) : null;
}
