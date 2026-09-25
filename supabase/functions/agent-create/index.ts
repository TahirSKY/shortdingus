import { admin, assetUrl, cors, json, KINDS, safeName } from "../_shared/hub.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MAX_BYTES = 200 * 1024 * 1024;

function gatewayError(status: number, body: string) {
  if (status === 402) return "AI credits are used up. Add credits and try again.";
  if (status === 429) return "AI is busy right now. Try again in a minute.";
  return `AI request failed (${status}): ${body.slice(0, 200)}`;
}

async function shortHash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d).slice(0, 4)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeImage(key: string, prompt: string) {
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-image-2.5-sunburst", prompt: `${prompt.slice(0, 2500)}. Vertical 9:16 cinematic frame, no text or logos.`, size: "1024x1536" }),
  });
  if (!res.ok) throw new Error(gatewayError(res.status, await res.text()));
  const b64 = (await res.json()).data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model returned no image.");
  return { bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), mime: "image/png" };
}

async function makeVoice(key: string, text: string, voice: string) {
  const res = await fetch(`${GATEWAY}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-4o-mini-tts", input: text.slice(0, 4000), voice, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(gatewayError(res.status, await res.text()));
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength) throw new Error("The voice model returned no audio.");
  return { bytes, mime: "audio/mpeg" };
}

async function finish(asset: any, slug: string, kind: string, prompt: string, voice: string) {
  const db = admin();
  const baseMeta = { ...asset.meta };
  delete baseMeta.creating;
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("AI is not configured.");
    const out = kind === "image" ? await makeImage(key, prompt) : await makeVoice(key, prompt, voice);
    const path = `groups/${slug}/${asset.id}-${safeName(asset.name)}`;
    const up = await db.storage.from("hub-media").upload(path, out.bytes, { contentType: out.mime, upsert: true });
    if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
    await db.from("assets").update({ storage_path: path, mime_type: out.mime, size_bytes: out.bytes.byteLength, meta: baseMeta }).eq("id", asset.id);
    await db.from("asset_groups").update({ updated_at: new Date().toISOString() }).eq("id", asset.group_id);
  } catch (e) {
    console.error("[agent-create]", e);
    await db.from("assets").update({ meta: { ...baseMeta, error: (e as Error).message?.slice(0, 300) || "Creation failed." } }).eq("id", asset.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  let p: Record<string, any> = {};
  if (req.method === "GET") p = Object.fromEntries(new URL(req.url).searchParams);
  else if (req.method === "POST") { try { p = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); } }
  else return json({ error: "Use GET or POST." }, 405);

  const expected = Deno.env.get("HUB_WRITE_TOKEN");
  if (!expected || p.token !== expected) return json({ error: "Invalid token." }, 401);

  const slug = String(p.slug || "").trim().toLowerCase();
  const kind = String(p.kind || "").trim();
  const prompt = String(p.prompt || "").trim();
  const voice = String(p.voice || "alloy").trim() || "alloy";
  const sourceUrl = typeof p.sourceUrl === "string" && p.sourceUrl.trim() ? p.sourceUrl.trim() : null;

  const allowed = sourceUrl ? [...KINDS, "voice"] : ["image", "voice", "text", "code"];
  if (!allowed.includes(kind)) return json({ error: sourceUrl ? `kind must be one of: ${KINDS.join(", ")}.` : "kind must be image, voice, text or code." }, 400);

  const db = admin();
  const { data: group } = await db.from("asset_groups").select("id, slug").eq("slug", slug).maybeSingle();
  if (!group) return json({ error: "Unknown slug." }, 404);

  // Duplicate guard: same group + name within 60s returns the existing row.
  const recent = async (name: string) => {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data } = await db.from("assets").select("*").eq("group_id", group.id).eq("name", name).gte("created_at", since).order("created_at", { ascending: true }).limit(1);
    return data?.[0] || null;
  };
  const reuse = (a: any) => json({ id: a.id, url: assetUrl(a.id), ...(a.meta?.creating ? { status: "creating" } : { asset: a }), duplicate: true }, a.meta?.creating ? 202 : 200);

  const settle = async (mine: any) => {
    const first = await recent(mine.name);
    if (first && first.id !== mine.id) { await db.from("assets").delete().eq("id", mine.id); return first; }
    return null;
  };
  // ---- sourceUrl push ----
  if (sourceUrl) {
    let url: URL;
    try { url = new URL(sourceUrl); } catch { return json({ error: "Invalid sourceUrl." }, 400); }
    if (!/^https?:$/.test(url.protocol)) return json({ error: "sourceUrl must be http(s)." }, 400);
    const storeKind = kind === "voice" ? "audio" : kind;
    const name = String(p.name || decodeURIComponent(url.pathname.split("/").pop() || "") || `file-${await shortHash(sourceUrl)}`).slice(0, 200);
    const dup = await recent(name);
    if (dup) return reuse(dup);
    const res = await fetch(url);
    if (!res.ok) return json({ error: `Could not fetch sourceUrl (${res.status}).` }, 502);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return json({ error: "File too large (200MB max)." }, 413);
    const mime = (res.headers.get("content-type") || "application/octet-stream").split(";")[0];
    const id = crypto.randomUUID();
    const path = `groups/${group.slug}/${id}-${safeName(name)}`;
    const up = await db.storage.from("hub-media").upload(path, bytes, { contentType: mime, upsert: false });
    if (up.error) return json({ error: "Upload failed." }, 500);
    const { data, error } = await db.from("assets").insert({ id, group_id: group.id, kind: storeKind, name, storage_path: path, mime_type: mime, size_bytes: bytes.byteLength, meta: { sourceUrl } }).select().single();
    if (error) return json({ error: error.message }, 500);
    await db.from("asset_groups").update({ updated_at: new Date().toISOString() }).eq("id", group.id);
    return json({ id, url: assetUrl(id), asset: data }, 201);
  }

  if (kind === "text" || kind === "code") {
    const content = String(p.inlineContent ?? "");
    if (!content) return json({ error: "inlineContent is required." }, 400);
    const h = await shortHash(content);
    const name = String(p.name || (kind === "code" ? `snippet-${h}.tsx` : `note-${h}.md`)).slice(0, 200);
    const dup = await recent(name);
    if (dup) return reuse(dup);
    const { data, error } = await db.from("assets").insert({ group_id: group.id, kind, name, inline_content: content, mime_type: kind === "code" ? "text/plain" : "text/markdown", size_bytes: new TextEncoder().encode(content).byteLength, meta: {} }).select().single();
    if (error) return json({ error: error.message }, 500);
    const winner = await settle(data);
    if (winner) return reuse(winner);
    await db.from("asset_groups").update({ updated_at: new Date().toISOString() }).eq("id", group.id);
    return json({ id: data.id, url: assetUrl(data.id), asset: data }, 201);
  }

  if (!prompt) return json({ error: "prompt is required." }, 400);
  const ext = kind === "image" ? ".png" : ".mp3";
  let name = String(p.name || `${kind}-${await shortHash(prompt + voice)}`).slice(0, 200);
  if (!name.toLowerCase().endsWith(ext)) name += ext;
  const dup = await recent(name);
  if (dup) return reuse(dup);
  const { data: asset, error } = await db.from("assets").insert({
    group_id: group.id, kind: kind === "voice" ? "audio" : "image", name,
    mime_type: kind === "image" ? "image/png" : "audio/mpeg",
    meta: { creating: true, prompt, ...(kind === "voice" ? { voice } : {}) },
  }).select().single();
  if (error || !asset) return json({ error: error?.message || "Could not create asset." }, 500);
  const winner = await settle(asset);
  if (winner) return reuse(winner);
  EdgeRuntime.waitUntil(finish(asset, group.slug, kind, prompt, voice));
  return json({ id: asset.id, url: assetUrl(asset.id), status: "creating" }, 202);
});
