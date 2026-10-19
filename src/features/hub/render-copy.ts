import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
/** Longest side the renderer ever outputs (1080x1920). */
export const RENDER_MAX_SIDE = 1920;
/** ~12 Mbit/s and up is wasteful for a 1080p render and heavy for GPU-less Lambda. */
const MAX_BITRATE = 12_000_000;

export function needsRenderCopy(w: number, h: number, bytes: number, seconds: number | null) {
  if (Math.max(w, h) > RENDER_MAX_SIDE) return true;
  return !!seconds && (bytes * 8) / seconds > MAX_BITRATE * 1.5;
}

/**
 * Makes a 1080p-class, high-quality copy in the browser and stores it as `meta.render_path`.
 * asset-url then serves this copy to previews and renders; the original stays untouched.
 */
export async function makeRenderCopy(file: Blob, asset: { id: string; storage_path: string; meta?: any }, onProgress?: (p: number) => void) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const track = await input.getPrimaryVideoTrack();
  const landscape = track ? track.displayWidth >= track.displayHeight : false;
  const conv = await Conversion.init({
    input, output,
    video: { ...(landscape ? { width: RENDER_MAX_SIDE } : { height: RENDER_MAX_SIDE }), codec: "avc", bitrate: QUALITY_HIGH, forceTranscode: true },
    audio: { codec: "aac", bitrate: 192_000 },
  });
  if (!conv.isValid) throw new Error("This browser can't resize this video. Try Chrome on a computer.");
  conv.onProgress = (p) => onProgress?.(p);
  await conv.execute();
  const blob = new Blob([output.target.buffer!], { type: "video/mp4" });
  const path = asset.storage_path.replace(/(\.[^./]+)?$/, "") + "-render.mp4";
  const { tusUpload } = await import("@/features/clipping/api");
  await tusUpload(path, new File([blob], path.split("/").pop()!, { type: "video/mp4" }), () => {});
  const { data } = await db.from("assets").select("meta").eq("id", asset.id).maybeSingle();
  const meta = { ...(data?.meta || {}), render_path: path, render_size_bytes: blob.size, needs_render_copy: false };
  await db.from("assets").update({ meta }).eq("id", asset.id);
  return path;
}

/** For videos already uploaded: download the original, then make the copy. */
export async function makeRenderCopyFromStorage(asset: { id: string; storage_path: string; meta?: any }, onProgress?: (p: number) => void) {
  const { data, error } = await supabase.storage.from("hub-media").download(asset.storage_path);
  if (error || !data) throw new Error("Could not download the original video.");
  return makeRenderCopy(data, asset, onProgress);
}
