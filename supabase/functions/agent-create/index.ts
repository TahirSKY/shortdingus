import { admin, assetUrl, cors, json, safeName } from "../_shared/hub.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function gatewayError(status: number, body: string) {
  if (status === 402) return "AI credits are used up. Add credits and try again.";
  if (status === 429) return "AI is busy right now. Try again in a minute.";
  return `AI request failed (${status}): ${body.slice(0, 200)}`;
}

async function makeImage(key: string, prompt: string) {
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: "openai/gpt-image-2.5-sunburst", prompt: `${prompt.slice(0, 2500)}. Vertical 9:16 cinematic frame, no text or logos.`, size: "1024x1536", response_format: "b64_json" }),
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
    body: JSON.stringify({ model: "google/gemini-3.1-flash-tts-preview", input: text.slice(0, 4000), voice, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(gatewayError(res.status, await res.text()));
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: "audio/mpeg" };
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

  const slug = String(p.slug || "").trim();
  const kind = String(p.kind || "").trim();
  const prompt = String(p.prompt || "").trim();
  const voice = String(p.voice || "alloy").trim() || "alloy";
  if (!["image", "voice", "text", "code"].includes(kind)) return json({ error: "kind must be image, voice, text or code." }, 400);

  const db = admin();
  const { data: group } = await db.from("asset_groups").select("id").eq("slug", slug).maybeSingle();
  if (!group) return json({ error: "Unknown slug." }, 404);

  if (kind === "text" || kind === "code") {
    const content = String(p.inlineContent ?? "");
    if (!content) return json({ error: "inlineContent is required." }, 400);
    const name = String(p.name || (kind === "code" ? "snippet.tsx" : "note.md")).slice(0, 200);
    const { data, error } = await db.from("assets").insert({ group_id: group.id, kind, name, inline_content: content, mime_type: kind === "code" ? "text/plain" : "text/markdown", size_bytes: new TextEncoder().encode(content).byteLength, meta: {} }).select().single();
    if (error) return json({ error: error.message }, 500);
    await db.from("asset_groups").update({ updated_at: new Date().toISOString() }).eq("id", group.id);
    return json({ id: data.id, url: assetUrl(data.id), asset: data }, 201);
  }

  if (!prompt) return json({ error: "prompt is required." }, 400);
  const ext = kind === "image" ? ".png" : ".mp3";
  let name = String(p.name || `${kind}-${Date.now()}`).slice(0, 200);
  if (!name.toLowerCase().endsWith(ext)) name += ext;
  const { data: asset, error } = await db.from("assets").insert({
    group_id: group.id, kind: kind === "voice" ? "audio" : "image", name,
    mime_type: kind === "image" ? "image/png" : "audio/mpeg",
    meta: { creating: true, prompt, ...(kind === "voice" ? { voice } : {}) },
  }).select().single();
  if (error || !asset) return json({ error: error?.message || "Could not create asset." }, 500);
  EdgeRuntime.waitUntil(finish(asset, slug, kind, prompt, voice));
  return json({ id: asset.id, url: assetUrl(asset.id), status: "creating" }, 202);
});
