import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, type AssetGroup } from "./api";

export type MediaSource = "pexels" | "giphy";
export type MediaType = "video" | "photo" | "gifs" | "stickers";
export interface MediaResult {
  id: string; source: MediaSource; kind: "video" | "image"; title: string;
  preview: string; url: string; pageUrl: string; credit: string;
  width: number; height: number; duration: number | null;
}
export interface MediaSearch {
  projectId: string; source: MediaSource; q: string; type: MediaType;
  orientation: string; page: number;
}
export async function searchMedia(params: MediaSearch): Promise<{ results: MediaResult[]; page: number; hasMore: boolean }> {
  const { data, error } = await supabase.functions.invoke("media-search", { body: params });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    try { const parsed = JSON.parse(details); throw new Error(parsed.details || parsed.error || details); }
    catch (e) { if (e instanceof SyntaxError) throw new Error(details); throw e; }
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function saveMedia(result: MediaResult, group: AssetGroup, projectId: string, onProgress: (p: number) => void) {
  // Import through the regular upload path, preserving automatic analysis,
  // cut-outs and safe 1080p render copies instead of hotlinking provider files.
  const response = await fetch(result.url);
  if (!response.ok) throw new Error(`Could not download media (${response.status}).`);
  const blob = await response.blob();
  if (!blob.size) throw new Error("The media file was empty.");
  const mime = blob.type || (result.kind === "video" ? "video/mp4" : "image/jpeg");
  const extension = mime.includes("gif") ? "gif" : mime.includes("png") ? "png" : result.kind === "video" ? "mp4" : "jpg";
  const file = new File([blob], `${result.source}-${result.id}.${extension}`, { type: mime });
  const id = await uploadFile(group, file, projectId, result.source === "pexels" ? "stock" : "meme", onProgress);
  const db = supabase as any;
  const { data: asset } = await db.from("assets").select("meta").eq("id", id).single();
  const { error } = await db.from("assets").update({ meta: { ...(asset?.meta || {}),
    media_source: result.source, media_id: result.id, source_page: result.pageUrl,
    credit: result.credit, description: result.title,
  } }).eq("id", id);
  if (error) console.warn("Could not save media credit", error.message);
  return id;
}