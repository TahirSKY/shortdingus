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
 *
 * curl example:
 *   curl -X POST 'https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/check-render-progress' \
 *     -H 'Content-Type: application/json' \
 *     -H 'Authorization: Bearer <ANON_KEY>' \
 *     -d '{"renderId":"abc123","bucketName":"remotionlambda-useast1-abc"}'
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

    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region: region as any,
    });

    return json(progress);
  } catch (err) {
    console.error("[check-render-progress] Error:", err);
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
