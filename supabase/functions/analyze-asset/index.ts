import { admin, cors, isUuid, json } from "../_shared/hub.ts";
import { expireStale, runGemini, runImage } from "../_shared/analysis.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

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
