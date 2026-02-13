/**
 * check-render-progress – Polls render status via the official Remotion SDK.
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY  – used internally by the SDK
 *   AWS_REGION                                – default "us-east-1"
 *   REMOTION_LAMBDA_FUNCTION_NAME             – Lambda function name
 *
 * POST body:
 *   { renderId: string, bucketName: string, debug?: boolean }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getRenderProgress } from "npm:@remotion/lambda-client@4.0.420";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Retry getRenderProgress with exponential backoff on 429 errors */
async function getProgressWithRetry(
  params: { renderId: string; bucketName: string; functionName: string; region: string },
  maxRetries = 3
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await getRenderProgress(params as any);
    } catch (err: any) {
      const is429 = err?.name === "TooManyRequestsException" ||
        err?.$metadata?.httpStatusCode === 429 ||
        err?.message?.includes("Rate Exceeded");

      if (is429 && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[check-render-progress] 429 rate limit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const renderId = String(body.renderId ?? "");
    const bucketName = String(body.bucketName ?? "");

    if (!renderId || !bucketName) {
      return json({ error: "Missing `renderId` or `bucketName`." }, 400);
    }

    const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
    const functionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");

    if (!functionName) {
      return json({ error: "Missing REMOTION_LAMBDA_FUNCTION_NAME env var." }, 500);
    }

    const progress = await getProgressWithRetry({
      renderId,
      bucketName,
      functionName,
      region,
    });

    const result: Record<string, unknown> = { ...(progress ?? {}) };
    if (progress?.fatalErrorEncountered) {
      result.fatal = true;
    }

    return json(result);
  } catch (err) {
    console.error("[check-render-progress] Error:", err);
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
