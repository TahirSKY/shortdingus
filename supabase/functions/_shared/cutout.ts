import { decode, Image } from "npm:imagescript@1.3.0";
import { admin, safeName } from "./hub.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const NEAR_WHITE = 232; // min channel
const MAX_SPREAD = 28; // max-min channel (grey-ish only)

const isWhite = (b: Uint8ClampedArray, i: number) => {
  const r = b[i], g = b[i + 1], bl = b[i + 2];
  const mn = Math.min(r, g, bl), mx = Math.max(r, g, bl);
  return b[i + 3] > 0 && mn >= NEAR_WHITE && mx - mn <= MAX_SPREAD;
};

/** Flood-fill white from the edges. Returns null if the edges are not mostly white. */
export function whiteCutout(img: Image): { png: Promise<Uint8Array>; removed: number } | null {
  const { width: w, height: h } = img;
  const b = img.bitmap as unknown as Uint8ClampedArray;
  let edge = 0, white = 0;
  const edgeIdx: number[] = [];
  for (let x = 0; x < w; x++) edgeIdx.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) edgeIdx.push(y * w, y * w + w - 1);
  for (const p of edgeIdx) { edge++; if (isWhite(b, p * 4)) white++; }
  if (white / edge < 0.85) return null;

  const bg = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;
  for (const p of edgeIdx) if (!bg[p] && isWhite(b, p * 4)) { bg[p] = 1; q[tail++] = p; }
  while (head < tail) {
    const p = q[head++], x = p % w, y = (p / w) | 0;
    const n = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const k of n) if (k >= 0 && !bg[k] && isWhite(b, k * 4)) { bg[k] = 1; q[tail++] = k; }
  }
  let removed = 0;
  for (let p = 0; p < w * h; p++) {
    if (bg[p]) { b[p * 4 + 3] = 0; removed++; continue; }
    // Feather: light foreground pixels touching background get partial alpha.
    const x = p % w, y = (p / w) | 0;
    const touches = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]);
    if (touches) {
      const i = p * 4, mn = Math.min(b[i], b[i + 1], b[i + 2]);
      if (mn > 180) b[i + 3] = Math.min(b[i + 3], Math.round(((255 - mn) / 75) * 255));
    }
  }
  return { png: img.encode(), removed: removed / (w * h) };
}

async function aiCutout(bytes: Uint8Array, mime: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("AI is not configured.");
  const fd = new FormData();
  fd.append("model", "openai/gpt-image-2.5-sunburst");
  fd.append("prompt", "Remove the background completely. Output the main subject only on a fully transparent background. Keep the subject's shape, colours and details exactly unchanged.");
  fd.append("background", "transparent");
  fd.append("output_format", "png");
  fd.append("image", new Blob([bytes], { type: mime }), mime.includes("png") ? "in.png" : "in.jpg");
  const res = await fetch(`${GATEWAY}/images/edits`, { method: "POST", headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" }, body: fd });
  if (!res.ok) throw new Error(`AI cut-out failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const b64 = (await res.json()).data?.[0]?.b64_json;
  if (!b64) throw new Error("AI cut-out returned no image.");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function makeCutout(bytes: Uint8Array, mime: string): Promise<{ png: Uint8Array; method: string }> {
  const img = await decode(bytes);
  if (!(img instanceof Image)) throw new Error("Animated images can't be cut out.");
  const white = whiteCutout(img);
  if (white) {
    if (white.removed < 0.02) throw new Error("Nothing to remove — the background wasn't found.");
    if (white.removed > 0.98) throw new Error("The cut-out came out empty.");
    return { png: await white.png, method: "white-flood" };
  }
  return { png: await aiCutout(bytes, mime), method: "ai" };
}

/** Starts a cut-out for an image asset if its hub opted in (or force). Returns the background job or null. */
export async function startCutout(asset: any, force = false): Promise<Promise<void> | null> {
  if (!asset || asset.kind !== "image" || !asset.storage_path) return null;
  if ((asset.tags || []).includes("cutout") || asset.meta?.source_asset_id) return null;
  const db = admin();
  const { data: group } = await db.from("asset_groups").select("id, slug, auto_cutout").eq("id", asset.group_id).maybeSingle();
  if (!group || (!force && !group.auto_cutout)) return null;
  const base = String(asset.name).replace(/\.[a-z0-9]+$/i, "");
  const name = `${base}-cutout.png`;
  const { data: row, error } = await db.from("assets").insert({
    group_id: asset.group_id, project_id: asset.project_id ?? null, kind: "image", name, mime_type: "image/png",
    role: asset.role ?? null, tags: ["cutout"], meta: { creating: true, source_asset_id: asset.id },
  }).select().single();
  if (error || !row) { console.error("[cutout] insert", error); return null; }
  return (async () => {
    try {
      const dl = await db.storage.from("hub-media").download(asset.storage_path);
      if (dl.error || !dl.data) throw new Error("Could not read the original image.");
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      const { png, method } = await makeCutout(bytes, asset.mime_type || "image/png");
      const path = `groups/${group.slug}/${row.id}-${safeName(name)}`;
      const up = await db.storage.from("hub-media").upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
      await db.from("assets").update({ storage_path: path, size_bytes: png.byteLength, meta: { source_asset_id: asset.id, cutout_method: method } }).eq("id", row.id);
    } catch (e) {
      console.error("[cutout]", e);
      await db.from("assets").update({ meta: { source_asset_id: asset.id, error: (e as Error).message?.slice(0, 300) || "Cut-out failed." } }).eq("id", row.id);
    }
  })();
}
