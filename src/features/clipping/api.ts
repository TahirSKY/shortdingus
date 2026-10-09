import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import type { AssetGroup } from "@/features/hub/api";

const db = supabase as any;
const URL_ = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export interface ClipSeg { in: number; out: number; purpose: string }
export interface Clip { title: string; hook_text: string; why: string; score: number; category: string; layout_hint: string; segments: ClipSeg[] }

const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "video";

function videoMeta(file: File) {
  return new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
    const v = document.createElement("video");
    const u = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight }); URL.revokeObjectURL(u); };
    v.onerror = () => { URL.revokeObjectURL(u); reject(new Error("This browser can't read that video. Try MP4 (H.264).")); };
    v.src = u;
  });
}

function tusUpload(path: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const up = new tus.Upload(file, {
      endpoint: `${URL_}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
      headers: { authorization: `Bearer ${KEY}`, apikey: KEY, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: "hub-media", objectName: path, contentType: file.type || "video/mp4", cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      onError: (e) => reject(new Error(`Upload failed: ${e.message.slice(0, 200)}`)),
      onProgress: (sent, total) => onProgress(sent / total),
      onSuccess: () => resolve(),
    });
    up.findPreviousUploads().then((prev) => { if (prev.length) up.resumeFromPreviousUpload(prev[0]); up.start(); });
  });
}

/** Snapshots every few seconds from the local file, packed 4x4 into JPEG sheets, plus shot-change times. */
async function makeSheets(file: File, duration: number, group: AssetGroup, id: string, onProgress: (p: number) => void) {
  const interval = Math.max(2, Math.ceil(duration / 720));
  const times: number[] = [];
  for (let t = 0.5; t < duration; t += interval) times.push(+t.toFixed(2));
  const v = document.createElement("video");
  const u = URL.createObjectURL(file);
  v.muted = true; v.preload = "auto"; v.src = u;
  await new Promise((r, j) => { v.onloadeddata = r; v.onerror = j; });
  const cw = 256, ch = Math.round(256 * (v.videoHeight / v.videoWidth || 9 / 16));
  const COLS = 4, PER = 16;
  const small = document.createElement("canvas"); small.width = 16; small.height = 9;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  let prev: Uint8ClampedArray | null = null;
  const shots: number[] = [0];
  const sheets: { path: string; times: number[]; cols: number }[] = [];
  for (let s = 0; s < times.length; s += PER) {
    const chunk = times.slice(s, s + PER);
    const c = document.createElement("canvas");
    c.width = cw * COLS; c.height = ch * Math.ceil(chunk.length / COLS);
    const ctx = c.getContext("2d")!;
    for (let i = 0; i < chunk.length; i++) {
      v.currentTime = chunk[i];
      await new Promise((r) => { v.onseeked = r; });
      ctx.drawImage(v, (i % COLS) * cw, Math.floor(i / COLS) * ch, cw, ch);
      sctx.drawImage(v, 0, 0, 16, 9);
      const px = sctx.getImageData(0, 0, 16, 9).data;
      if (prev) { let d = 0; for (let k = 0; k < px.length; k += 4) d += Math.abs(px[k] - prev[k]); if (d / 144 > 40) shots.push(chunk[i]); }
      prev = px;
      onProgress((s + i + 1) / times.length);
    }
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.72));
    const path = `groups/${group.slug}/frames/${id}/sheet-${String(sheets.length).padStart(3, "0")}.jpg`;
    const up = await supabase.storage.from("hub-media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw up.error;
    sheets.push({ path, times: chunk, cols: COLS });
  }
  URL.revokeObjectURL(u);
  return { interval, sheets, shots };
}

export type Stage = { label: string; p: number };

export async function uploadSource(group: AssetGroup, file: File, onStage: (s: Stage) => void) {
  const meta = await videoMeta(file);
  const id = crypto.randomUUID();
  const path = `groups/${group.slug}/${id}-${safe(file.name)}`;
  // Snapshots are made from the local file while the upload runs.
  let frames: Awaited<ReturnType<typeof makeSheets>> | null = null;
  let up = 0, fr = 0;
  const report = () => onStage({ label: `Uploading ${Math.round(up * 100)}% · snapshots ${Math.round(fr * 100)}%`, p: (up * 0.8 + fr * 0.2) });
  const framesJob = makeSheets(file, meta.duration, group, id, (p) => { fr = p; report(); }).then((f) => { frames = f; }).catch((e) => console.warn("snapshots failed", e));
  await tusUpload(path, file, (p) => { up = p; report(); });
  const { error } = await db.from("assets").insert({
    id, group_id: group.id, kind: "video", role: "source", name: file.name, storage_path: path, mime_type: file.type || "video/mp4",
    size_bytes: file.size, duration_seconds: meta.duration, tags: ["source", meta.height > meta.width ? "vertical" : "horizontal"],
    meta: { width: meta.width, height: meta.height },
  });
  if (error) throw error;
  await supabase.functions.invoke("analyze-asset", { body: { assetId: id, tool: "assembly-transcript" } });
  onStage({ label: "Finishing snapshots…", p: 0.95 });
  await framesJob;
  if (frames) {
    await db.from("assets").update({ meta: { width: meta.width, height: meta.height, frames } }).eq("id", id);
    await supabase.functions.invoke("analyze-asset", { body: { assetId: id, tool: "gemini-frames" } });
  }
  onStage({ label: "Copying the sound track…", p: 0.97 });
  try { await prepareAudio(id, group.slug, file, () => {}); } catch (e) { console.warn("audio copy failed", e); }
  return id;
}

/** Saves a small sound-only copy of a source (no re-encode); renders take audio from it. */
export async function prepareAudio(assetId: string, groupSlug: string, source: File | null, onProgress: (p: number) => void) {
  const { extractAudio } = await import("./extract-audio");
  const blob = await extractAudio(source ?? `${URL_}/functions/v1/asset-url?id=${assetId}`, onProgress);
  const path = `groups/${groupSlug}/${assetId}-audio.m4a`;
  await tusUpload(path, new File([blob], "audio.m4a", { type: "audio/mp4" }), () => {});
  const { data } = await db.from("assets").select("meta").eq("id", assetId).single();
  const { error } = await db.from("assets").update({ meta: { ...((data?.meta as any) || {}), audio_path: path } }).eq("id", assetId);
  if (error) throw error;
}

export async function resumeTranscript(analysisId: string) {
  await supabase.functions.invoke("analyze-asset", { body: { resume: analysisId } });
}

export async function findClips(assetId: string, model: string, instructions: string) {
  const { data, error } = await supabase.functions.invoke("find-clips", { body: { assetId, model, instructions } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Could not start clip finding.");
}

export async function listSources(groupId: string) {
  const [a, b] = await Promise.all([
    db.from("assets").select("*").eq("group_id", groupId).eq("role", "source").is("project_id", null).order("created_at", { ascending: false }),
    db.from("asset_analyses").select("id, asset_id, tool, status, summary, report, error_message, created_at").eq("group_id", groupId).in("tool", ["assembly-transcript", "gemini-frames", "clip-finder"]).order("created_at", { ascending: false }),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  return { sources: a.data as any[], analyses: b.data as any[] };
}

/** Losslessly cuts a project's clip ranges out of the big original so renders only touch a small file. */
export async function prepareClip(group: AssetGroup, project: any, onProgress: (p: number) => void) {
  const c = project.plan?.clip;
  if (!c?.source_asset_id || !c.segments?.length) throw new Error("This project has no clip ranges.");
  const { cutClip } = await import("./cut-clip");
  const out = await cutClip(`${URL_}/functions/v1/asset-url?id=${c.source_asset_id}`, c.segments, (p) => onProgress(p * 0.85));
  const id = crypto.randomUUID();
  const path = `groups/${group.slug}/${id}-clip-${safe(project.slug || "clip")}.mp4`;
  await tusUpload(path, new File([out.blob], "clip.mp4", { type: "video/mp4" }), (p) => onProgress(0.85 + p * 0.15));
  const { error } = await db.from("assets").insert({
    id, group_id: group.id, project_id: project.id, kind: "video", role: "clip-cut", name: `Cut: ${project.name || project.slug}`, storage_path: path,
    mime_type: "video/mp4", size_bytes: out.blob.size, duration_seconds: out.duration, tags: ["clip-cut"],
    meta: { source_asset_id: c.source_asset_id, ranges: out.ranges, width: out.width, height: out.height, skip_analysis: true },
  });
  if (error) throw error;
  await db.from("projects").update({ plan: { ...project.plan, clip: { ...c, cut_asset_id: id } } }).eq("id", project.id);
  return id;
}
