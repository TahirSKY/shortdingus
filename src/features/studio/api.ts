import { supabase } from "@/integrations/supabase/client";
import type { EditDirection, StudioBeat, StudioEdl, StudioMessage, StudioMode, StudioStage } from "./types";

const db = supabase as any;
export const newId = () => crypto.randomUUID();

export async function createStudioProject(mode: StudioMode, title: string) {
  const { data, error } = await db.from("studio_projects").insert({ mode, title }).select().single();
  if (error) throw error;
  return data as { id: string; stage: StudioStage };
}

export async function patchStudioProject(projectId: string, patch: Record<string, unknown>) {
  const { error } = await db.from("studio_projects").update(patch).eq("id", projectId);
  if (error) throw error;
}

export async function persistMessage(projectId: string, message: StudioMessage, sequence: number) {
  const { error } = await db.from("studio_messages").insert({ project_id: projectId, role: message.role, kind: message.kind, content: message.content, payload: message.payload || null, sequence });
  if (error) throw error;
}

export async function callStudioAgent(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("studio-agent", { body });
  if (error || data?.error) throw new Error(data?.error || error?.message || "The editor could not respond.");
  return data as { reply?: string; summary?: string; beats?: StudioBeat[]; directions?: EditDirection[]; script?: { title: string; turns: Array<{ speaker: string; text: string; start: number; end: number }> }; imagePrompts?: string[]; edl?: StudioEdl };
}

export async function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); Number.isFinite(duration) ? resolve(duration) : reject(new Error("Could not read this video's duration.")); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This MP4 could not be opened.")); };
    video.src = url;
  });
}

export async function uploadFootage(projectId: string, file: File, duration: number) {
  const path = `${projectId}/source-${newId()}.mp4`;
  const { error: uploadError } = await supabase.storage.from("studio-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data: signed, error: signedError } = await supabase.storage.from("studio-media").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signedError) throw signedError;
  const { data: asset, error: assetError } = await db.from("studio_assets").insert({ project_id: projectId, kind: "source_video", title: file.name, url: signed.signedUrl, storage_path: path, mime_type: file.type, duration_seconds: duration, metadata: { size: file.size } }).select().single();
  if (assetError) throw assetError;
  return asset as { id: string; url: string; storage_path: string };
}

export async function generateVoice(projectId: string, text: string, voice: string) {
  const { data, error } = await supabase.functions.invoke("studio-voice", { body: { projectId, text, voice } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Voice generation failed.");
  await db.from("studio_assets").insert({ project_id: projectId, kind: "voice", title: "Narration", url: data.url, storage_path: data.storagePath, mime_type: data.mimeType });
  return data as { url: string };
}

export async function generateStudioImage(projectId: string, prompt: string) {
  const { data, error } = await supabase.functions.invoke("studio-image", { body: { projectId, prompt } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Image generation failed.");
  await db.from("studio_assets").insert({ project_id: projectId, kind: "generated_image", title: prompt.slice(0, 80), url: data.url, storage_path: data.storagePath, mime_type: data.mimeType });
  return data as { url: string };
}
