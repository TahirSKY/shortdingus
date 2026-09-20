import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
function decode(base64: string) { const raw = atob(base64); const bytes = new Uint8Array(raw.length); for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index); return bytes; }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { projectId, prompt } = await req.json();
    if (!projectId || !String(prompt || "").trim()) return respond({ error: "Missing project or image prompt." }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return respond({ error: "Image generation is not configured." }, 500);
    const result = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-image-2.5-sunburst", prompt: `${String(prompt).slice(0, 2500)}. Vertical 9:16 cinematic frame, no text or logos.`, size: "1024x1536", response_format: "b64_json" }),
    });
    if (!result.ok) return respond({ error: (await result.text()).slice(0, 500) || "Image generation failed." }, result.status);
    const payload = await result.json();
    const base64 = payload.data?.[0]?.b64_json;
    if (!base64) return respond({ error: "The image model returned no image." }, 502);
    const path = `${projectId}/image-${crypto.randomUUID()}.png`;
    const client = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const uploaded = await client.storage.from("studio-media").upload(path, decode(base64), { contentType: "image/png", upsert: false });
    if (uploaded.error) throw uploaded.error;
    const signed = await client.storage.from("studio-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed.error) throw signed.error;
    return respond({ url: signed.data.signedUrl, storagePath: path, mimeType: "image/png" });
  } catch (error) {
    console.error("[studio-image]", error);
    return respond({ error: (error as Error).message || "Image generation failed." }, 500);
  }
});
