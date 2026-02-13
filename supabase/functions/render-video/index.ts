/**
 * render-video – Triggers a Remotion Lambda render via the official SDK.
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY  – used internally by the SDK
 *   AWS_REGION                                – default "us-east-1"
 *   REMOTION_SERVE_URL                        – S3 bundle URL
 *   REMOTION_LAMBDA_FUNCTION_NAME             – Lambda function name
 *   MAX_CONCURRENCY (optional)                – default 4, clamped 1–200
 *
 * POST body:
 *   { code: string, format?: "youtube"|"tiktok"|"square",
 *     compositionId?: string, codec?: string, inputProps?: object, debug?: boolean }
 *
 * curl example:
 *   curl -X POST 'https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/render-video' \
 *     -H 'Content-Type: application/json' \
 *     -H 'Authorization: Bearer <ANON_KEY>' \
 *     -d '{"code":"export default () => <div>Hi</div>;","format":"youtube"}'
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { renderMediaOnLambda } from "npm:@remotion/lambda-client@4.0.420";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  youtube: { width: 1920, height: 1080 },
  tiktok: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

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

    const code = String(body.code ?? "").trim();
    if (!code) {
      return json({ error: "Missing `code`." }, 400);
    }

    const format: string = String(body.format ?? "youtube").toLowerCase();
    const compositionId: string = String(body.compositionId ?? "MyVideo");
    const codec: string = String(body.codec ?? "h264");
    const debug: boolean = Boolean(body.debug);
    // Pass raw code untouched — Lambda handles evaluation via evaluateCode / calculateMetadata
    const inputProps: Record<string, unknown> = {
      code,
      format,
      debug,
    };

    const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
    const functionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const serveUrl = Deno.env.get("REMOTION_SERVE_URL");

    if (!functionName || !serveUrl) {
      return json(
        { error: "Missing REMOTION_LAMBDA_FUNCTION_NAME or REMOTION_SERVE_URL env vars." },
        500,
      );
    }

    const concurrency = clamp(
      Number(Deno.env.get("MAX_CONCURRENCY")) || 4,
      1,
      200,
    );

    const logLevel = debug ? "verbose" : "info";

    console.log(
      `[render-video] composition=${compositionId} format=${format} concurrency=${concurrency} codec=${codec} debug=${debug}`,
    );

    const renderParams: Record<string, unknown> = {
      serveUrl,
      composition: compositionId,
      codec,
      region,
      functionName,
      inputProps,
      concurrency,
      logLevel,
    };

    // dumpBrowserLogs captures Chrome console output for debugging evaluateCode issues
    if (debug) {
      (renderParams as any).dumpBrowserLogs = true;
    }

    const response = await renderMediaOnLambda(renderParams as any);

    return json({
      renderId: response.renderId,
      bucketName: response.bucketName,
      cloudWatchMainLogs: (response as any).cloudWatchMainLogs ?? null,
      region,
      functionName,
      serveUrl,
      compositionId,
      concurrency,
    });
  } catch (err) {
    console.error("[render-video] Error:", err);
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
