import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) => {
  const headers = new Headers({ ...cors, "Content-Type": "application/json" });
  new Headers(extraHeaders).forEach((value, name) => headers.set(name, value));
  return new Response(JSON.stringify(body), { status, headers });
};

function safeMessage(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.message || parsed?.error?.message || parsed?.error || fallback).slice(0, 500);
  } catch {
    return raw.trim().slice(0, 500) || fallback;
  }
}

function parseJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced || text).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini returned an unreadable analysis.");
  return JSON.parse(source.slice(start, end + 1));
}

function normalizeBeats(value: unknown, duration: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((item, index) => {
    const beat = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const start = Math.max(0, Math.min(duration, Number(beat.start) || 0));
    const end = Math.max(start, Math.min(duration, Number(beat.end) || start));
    return {
      start,
      end,
      label: String(beat.label || `Beat ${index + 1}`).slice(0, 120),
      detail: String(beat.detail || "").slice(0, 1000),
      emotion: String(beat.emotion || "neutral").slice(0, 80),
      dialogue: String(beat.dialogue || "").slice(0, 1000),
      visual_event: String(beat.visual_event || "").slice(0, 500),
      opportunity: String(beat.opportunity || "").slice(0, 500),
    };
  }).filter((beat) => beat.end > beat.start || beat.detail);
}

async function readSseText(response: Response) {
  if (!response.body) throw new Error("Gemini returned no response body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const event = JSON.parse(raw);
        output += event.choices?.[0]?.delta?.content || "";
      } catch {
        // Wait for a complete event.
      }
    }
  }
  return output.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const backendUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!backendUrl || !serviceKey) return json({ error: "Video storage is not configured." }, 500);
  if (!aiKey) return json({ error: "Lovable AI is not configured for this workspace." }, 500);

  const client = createClient(backendUrl, serviceKey);
  let analysisId = "";
  try {
    const body = await req.json();
    analysisId = String(body.analysisId || "");
    if (!analysisId) return json({ error: "Choose an uploaded video first." }, 400);

    const { data: record, error: recordError } = await client
      .from("video_analyses")
      .select("id, video_name, storage_path, mime_type, duration_seconds, status")
      .eq("id", analysisId)
      .single();
    if (recordError || !record) return json({ error: "The uploaded video record was not found." }, 404);
    if (!String(record.mime_type).startsWith("video/")) return json({ error: "The uploaded file is not a supported video." }, 400);

    await client.from("video_analyses").update({ status: "analyzing", error_message: null }).eq("id", analysisId);
    const { data: signed, error: signedError } = await client.storage
      .from("studio-media")
      .createSignedUrl(record.storage_path, 60 * 30);
    if (signedError || !signed?.signedUrl) throw new Error("Could not securely open the uploaded video.");

    const prompt = `Analyze this complete short video carefully. Return JSON only with this shape:
{"summary":"2-4 sentence factual summary","beats":[{"start":0,"end":3.2,"label":"short label","detail":"what visibly happens","emotion":"emotion or tone","dialogue":"spoken words or empty string","visual_event":"important motion, object, cut, or camera change","opportunity":"specific editing or hook opportunity"}]}
Use numeric seconds. Cover the full timeline from 0 to ${Number(record.duration_seconds) || 60} seconds with precise, non-overlapping beats. Do not invent dialogue you cannot hear; mark unclear speech as unclear. Describe people and actions without identifying unknown individuals. The output must be valid JSON.`;

    const initialRunId = req.headers.get("X-Lovable-AIG-Run-ID")?.trim();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": aiKey,
        "X-Lovable-AIG-SDK": "fetch",
        ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        stream: true,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "video_url", video_url: { url: signed.signedUrl } },
          ],
        }],
        response_format: { type: "json_object" },
      }),
    });

    const runId = response.headers.get("X-Lovable-AIG-Run-ID") || initialRunId;
    if (!response.ok) {
      const detail = await response.text();
      const message = safeMessage(detail, `Video analysis failed (${response.status}).`);
      await client.from("video_analyses").update({ status: "error", error_message: message }).eq("id", analysisId);
      return json({ error: message }, response.status, runId ? { "X-Lovable-AIG-Run-ID": runId } : undefined);
    }

    const text = await readSseText(response);
    if (!text) throw new Error("Gemini completed without an analysis.");
    const parsed = parseJsonObject(text);
    const duration = Number(record.duration_seconds) || 60;
    const beats = normalizeBeats(parsed.beats, duration);
    if (!beats.length) throw new Error("Gemini did not return any timecoded moments.");
    const summary = String(parsed.summary || "Video analysis complete.").slice(0, 3000);

    const { data: saved, error: saveError } = await client
      .from("video_analyses")
      .update({ status: "complete", summary, beats, error_message: null })
      .eq("id", analysisId)
      .select()
      .single();
    if (saveError) throw new Error("The analysis finished but could not be saved.");
    return json({ analysis: saved }, 200, runId ? { "X-Lovable-AIG-Run-ID": runId } : undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video analysis failed.";
    if (analysisId) await client.from("video_analyses").update({ status: "error", error_message: message.slice(0, 500) }).eq("id", analysisId);
    console.error("[video-analyzer]", message);
    return json({ error: message }, 500);
  }
});
