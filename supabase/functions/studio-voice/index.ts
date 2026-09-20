import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { projectId, text, voice = "alloy" } = await req.json();
    if (!projectId || !String(text || "").trim()) return respond({ error: "Missing project or voice text." }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return respond({ error: "Voice generation is not configured." }, 500);
    const result = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "google/gemini-3.1-flash-tts-preview", input: String(text).slice(0, 4000), voice, response_format: "mp3" }),
    });
    if (!result.ok) return respond({ error: (await result.text()).slice(0, 500) || "Voice generation failed." }, result.status);
    const bytes = await result.arrayBuffer();
    const path = `${projectId}/voice-${crypto.randomUUID()}.mp3`;
    const client = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const uploaded = await client.storage.from("studio-media").upload(path, bytes, { contentType: "audio/mpeg", upsert: false });
    if (uploaded.error) throw uploaded.error;
    const signed = await client.storage.from("studio-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signed.error) throw signed.error;
    return respond({ url: signed.data.signedUrl, storagePath: path, mimeType: "audio/mpeg" });
  } catch (error) {
    console.error("[studio-voice]", error);
    return respond({ error: (error as Error).message || "Voice generation failed." }, 500);
  }
});
