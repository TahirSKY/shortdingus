import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const BASE = import.meta.env.VITE_SUPABASE_URL as string;

export const ASSET_KINDS = ["video", "image", "audio", "text", "transcript", "analysis", "code", "render"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export interface AssetGroup { id: string; slug: string; title: string; notes: string | null; created_at: string; updated_at: string }
export interface Asset { id: string; group_id: string; kind: AssetKind; name: string; storage_path: string | null; inline_content: string | null; mime_type: string; size_bytes: number | null; duration_seconds: number | null; meta: Record<string, unknown>; created_at: string }
export interface Beat { start: number; end: number; label: string; detail: string; emotion?: string; dialogue?: string; visual_event?: string; opportunity?: string }
export interface Analysis { id: string; asset_id: string; group_id: string; tool: string; status: "pending" | "running" | "complete" | "error"; summary: string | null; report: { summary?: string; beats?: Beat[] }; error_message: string | null; created_at: string; updated_at: string }

export const assetUrl = (id: string) => `${BASE}/functions/v1/asset-url?id=${id}`;
export const manifestUrl = (slug: string) => `${BASE}/functions/v1/group-manifest?slug=${slug}`;
export const ingestUrl = `${BASE}/functions/v1/asset-ingest`;

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "group";
const safeFile = (s: string) => s.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "file";

export async function listGroups() {
  const { data, error } = await db.from("asset_groups").select("*, assets(kind)").order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Array<AssetGroup & { assets: { kind: AssetKind }[] }>;
}

export async function createGroup(title: string) {
  const base = slugify(title);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const { data, error } = await db.from("asset_groups").insert({ title: title.trim(), slug }).select().single();
    if (!error) return data as AssetGroup;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Could not find a free name for this group.");
}

export async function getGroup(slug: string) {
  const { data, error } = await db.from("asset_groups").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as AssetGroup | null;
}

export async function updateGroup(id: string, patch: Partial<Pick<AssetGroup, "title" | "notes">>) {
  const { error } = await db.from("asset_groups").update(patch).eq("id", id);
  if (error) throw error;
}

const touch = (groupId: string) => db.from("asset_groups").update({ updated_at: new Date().toISOString() }).eq("id", groupId);

export async function deleteGroup(group: AssetGroup) {
  const { data } = await db.from("assets").select("storage_path").eq("group_id", group.id);
  const paths = (data || []).map((a: any) => a.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from("hub-media").remove(paths);
  const { error } = await db.from("asset_groups").delete().eq("id", group.id);
  if (error) throw error;
}

export async function listAssets(groupId: string) {
  const [a, b] = await Promise.all([
    db.from("assets").select("*").eq("group_id", groupId).order("created_at", { ascending: true }),
    db.from("asset_analyses").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  return { assets: a.data as Asset[], analyses: b.data as Analysis[] };
}

export function kindFromFile(file: File): AssetKind {
  const t = file.type;
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  return "text";
}

function mediaDuration(file: File, kind: AssetKind) {
  if (kind !== "video" && kind !== "audio") return Promise.resolve(null);
  return new Promise<number | null>((resolve) => {
    const el = document.createElement(kind === "video" ? "video" : "audio");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(el.duration) ? el.duration : null); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    el.src = url;
  });
}

export async function uploadFile(group: AssetGroup, file: File) {
  const kind = kindFromFile(file);
  const id = crypto.randomUUID();
  const duration = await mediaDuration(file, kind);
  const path = `groups/${group.slug}/${id}-${safeFile(file.name)}`;
  const mime = file.type || (file.name.endsWith(".json") ? "application/json" : "text/plain");
  const up = await supabase.storage.from("hub-media").upload(path, file, { contentType: mime, upsert: false });
  if (up.error) throw up.error;
  const { error } = await db.from("assets").insert({ id, group_id: group.id, kind, name: file.name, storage_path: path, mime_type: mime, size_bytes: file.size, duration_seconds: duration });
  if (error) { await supabase.storage.from("hub-media").remove([path]); throw error; }
  await touch(group.id);
  if (kind === "image" || kind === "video") runAnalysis(id).catch((e) => console.warn("Auto-analysis failed to start", e));
}

export async function addTextAsset(group: AssetGroup, name: string, kind: AssetKind, content: string) {
  const { error } = await db.from("assets").insert({ group_id: group.id, kind, name, inline_content: content, mime_type: kind === "code" ? "text/plain" : "text/markdown", size_bytes: new Blob([content]).size });
  if (error) throw error;
  await touch(group.id);
}

export async function deleteAsset(asset: Asset) {
  if (asset.storage_path) await supabase.storage.from("hub-media").remove([asset.storage_path]);
  const { error } = await db.from("assets").delete().eq("id", asset.id);
  if (error) throw error;
  await touch(asset.group_id);
}

export async function runAnalysis(assetId: string) {
  const { data, error } = await supabase.functions.invoke("analyze-asset", { body: { assetId } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Analysis failed to start.");
  return data;
}

export async function fetchManifest(slug: string) {
  const res = await fetch(manifestUrl(slug));
  return res.json();
}

export const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const fmtBytes = (n: number | null) => n == null ? "—" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
