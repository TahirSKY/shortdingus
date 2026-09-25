import { admin, assetUrl, cors, json, KINDS, safeName } from "../_shared/hub.ts";

const MAX_BYTES = 200 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const expected = Deno.env.get("HUB_WRITE_TOKEN");
  if (!expected || body.token !== expected) return json({ error: "Invalid token." }, 401);
  const slug = String(body.slug || "").trim().toLowerCase();
  const kind = String(body.kind || "");
  const name = String(body.name || "").trim().slice(0, 200);
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl : null;
  const inlineContent = typeof body.inlineContent === "string" ? body.inlineContent : null;
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  if (!(KINDS as readonly string[]).includes(kind)) return json({ error: `Unknown kind. Use one of: ${KINDS.join(", ")}.` }, 400);
  if (!name) return json({ error: "Missing name." }, 400);
  if (!sourceUrl && inlineContent === null) return json({ error: "Provide sourceUrl or inlineContent." }, 400);

  const db = admin();
  const { data: group } = await db.from("asset_groups").select("id, slug").eq("slug", slug).maybeSingle();
  if (!group) return json({ error: `No group with slug "${slug}".` }, 404);

  const id = crypto.randomUUID();
  let row: Record<string, unknown> = { id, group_id: group.id, kind, name, meta };
  if (sourceUrl) {
    let url: URL;
    try { url = new URL(sourceUrl); } catch { return json({ error: "Invalid sourceUrl." }, 400); }
    if (!/^https?:$/.test(url.protocol)) return json({ error: "sourceUrl must be http(s)." }, 400);
    const res = await fetch(url);
    if (!res.ok) return json({ error: `Could not fetch sourceUrl (${res.status}).` }, 502);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return json({ error: "File too large (200MB max)." }, 413);
    const mime = (res.headers.get("content-type") || "application/octet-stream").split(";")[0];
    const path = `groups/${group.slug}/${id}-${safeName(name)}`;
    const up = await db.storage.from("hub-media").upload(path, bytes, { contentType: mime, upsert: false });
    if (up.error) return json({ error: "Upload failed." }, 500);
    row = { ...row, storage_path: path, mime_type: mime, size_bytes: bytes.byteLength };
  } else {
    row = { ...row, inline_content: inlineContent, mime_type: kind === "code" ? "text/plain" : "text/markdown", size_bytes: new TextEncoder().encode(inlineContent!).byteLength };
  }
  const { data, error } = await db.from("assets").insert(row).select().single();
  if (error) return json({ error: "Could not save asset." }, 500);
  await db.from("asset_groups").update({ updated_at: new Date().toISOString() }).eq("id", group.id);
  return json({ asset: { ...data, url: assetUrl(id) } }, 201);
});
