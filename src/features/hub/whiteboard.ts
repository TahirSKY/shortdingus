import type { Asset } from "./api";

export function whiteboardClipState(asset: Pick<Asset, "meta" | "storage_path">) {
  if (typeof asset.meta?.error === "string") return "error";
  if (asset.meta?.creating && asset.meta?.whiteboard_status === "queued") return "queued";
  if (asset.meta?.creating) return "rendering";
  return asset.storage_path ? "ready" : "missing";
}

export function pendingWhiteboardImages(assets: Asset[]) {
  return assets.filter(a => a.kind === "image" && a.storage_path && !a.meta?.creating && !a.tags?.includes("cutout") && !assets.some(c => c.tags?.includes("whiteboard-clip") && c.meta?.source_asset_id === a.id && ["ready", "queued", "rendering"].includes(whiteboardClipState(c))));
}

export function whiteboardRequest(assetId: string, projectId: string, drawSeconds: number, holdSeconds: number, format: string, hand: boolean, finish: string) {
  if (!Number.isFinite(drawSeconds) || drawSeconds < 1.5 || drawSeconds > 30) throw new Error("Drawing time must be between 1.5 and 30 seconds.");
  if (!Number.isFinite(holdSeconds) || holdSeconds < 0.3 || holdSeconds > 5) throw new Error("Hold time must be between 0.3 and 5 seconds.");
  return { projectId, format, hand, clips: [{ assetId, drawSeconds, holdSeconds, finish }] };
}