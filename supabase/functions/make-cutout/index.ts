import { admin, cors, isUuid, json } from "../_shared/hub.ts";
import { startCutout } from "../_shared/cutout.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

// Browser-callable: { assetId, force? }. Without force it only runs for hubs with auto cut-outs on.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let p: any;
  try { p = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const id = String(p.assetId || "");
  if (!isUuid(id)) return json({ error: "assetId is required." }, 400);
  const { data: asset } = await admin().from("assets").select("*").eq("id", id).maybeSingle();
  if (!asset) return json({ error: "Unknown asset." }, 404);
  if (asset.kind !== "image" || !asset.storage_path) return json({ error: "Only saved images can be cut out." }, 400);
  const job = await startCutout(asset, p.force === true);
  if (!job) return json({ status: "skipped" });
  EdgeRuntime.waitUntil(job);
  return json({ status: "started" }, 202);
});
