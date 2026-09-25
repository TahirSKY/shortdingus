import { admin, cors, isUuid, json } from "../_shared/hub.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return json({ error: "Missing id." }, 400);
  if (!isUuid(id)) return json({ error: "Invalid id." }, 400);
  const db = admin();
  const { data: asset } = await db.from("assets").select("storage_path, inline_content, mime_type").eq("id", id).maybeSingle();
  if (!asset) return json({ error: "Asset not found." }, 404);
  if (!asset.storage_path) {
    return new Response(asset.inline_content || "", { headers: { ...cors, "Content-Type": `${asset.mime_type || "text/plain"}; charset=utf-8`, "Cache-Control": "no-store" } });
  }
  const { data, error } = await db.storage.from("hub-media").createSignedUrl(asset.storage_path, 3600);
  if (error || !data) return json({ error: "Could not open this file." }, 500);
  return new Response(null, { status: 302, headers: { ...cors, Location: data.signedUrl, "Cache-Control": "no-store" } });
});
