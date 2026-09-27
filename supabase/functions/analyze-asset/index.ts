import { admin, cors, isUuid, json } from "../_shared/hub.ts";
import { expireStale, runAssembly, runGemini, runImage, runWords } from "../_shared/analysis.ts";

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

  await expireStale(db);
  if (tool === "assembly-transcript") {
    if (!["audio", "video"].includes(asset.kind) || !asset.storage_path) return json({ error: "Transcripts work on uploaded audio or video." }, 400);
    const { data: row, error } = await db.from("asset_analyses").insert({ asset_id: asset.id, group_id: asset.group_id, tool, status: "running" }).select().single();
    if (error || !row) return json({ error: "Could not start transcript." }, 500);
    EdgeRuntime.waitUntil(runAssembly(row.id, asset));
    return json({ analysis: row }, 202);
  }
  if (tool === "gemini-words") {
    if (!["audio", "video"].includes(asset.kind) || !asset.storage_path) return json({ error: "Word timing works on uploaded audio or video." }, 400);
    const { data: row, error } = await db.from("asset_analyses").insert({ asset_id: asset.id, group_id: asset.group_id, tool, status: "running" }).select().single();
    if (error || !row) return json({ error: "Could not start analysis." }, 500);
    EdgeRuntime.waitUntil(runWords(row.id, asset));
    return json({ analysis: row }, 202);
  }
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
