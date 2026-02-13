import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  renderMediaOnLambda,
} from "npm:@remotion/lambda-client@4.0.420";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FILE_MARKER = /^\/\/\s*---\s*file:\s*(.+?)\s*---\s*$/;

/**
 * Extract config from user code using multiple strategies:
 * 1. /*__REMOTION_CONFIG__ {...} *​/
 * 2. export const compositionConfig = {...};
 * 3. Individual patterns like durationInSeconds: 25
 */
const extractConfig = (src: string): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Strategy 1: __REMOTION_CONFIG__ JSON comment
  const commentMatch = src.match(/__REMOTION_CONFIG__\s*({[\s\S]*?})/);
  if (commentMatch) {
    try {
      const parsed = JSON.parse(commentMatch[1]);
      if (parsed && typeof parsed === "object") Object.assign(config, parsed);
    } catch { /* ignore */ }
  }

  // Strategy 2: compositionConfig object literal
  const configBlockMatch = src.match(/compositionConfig\s*=\s*({[\s\S]*?});/);
  if (configBlockMatch) {
    try {
      const jsonish = configBlockMatch[1]
        .replace(/'/g, '"')
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      const parsed = JSON.parse(jsonish);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          if (config[k] === undefined) config[k] = v;
        }
      }
    } catch { /* ignore */ }
  }

  // Strategy 3: individual property patterns
  const patterns: [string, RegExp][] = [
    ["durationInSeconds", /durationInSeconds\s*[:=]\s*(\d+(?:\.\d+)?)/],
    ["durationInFrames", /durationInFrames\s*[:=]\s*(\d+)/],
    ["fps", /fps\s*[:=]\s*(\d+)/],
    ["width", /width\s*[:=]\s*(\d+)/],
    ["height", /height\s*[:=]\s*(\d+)/],
  ];
  for (const [key, re] of patterns) {
    if (config[key] === undefined) {
      const m = src.match(re);
      if (m) config[key] = Number(m[1]);
    }
  }

  return config;
};

const pickComponentCode = (rawCode: string): string => {
  const lines = rawCode.split("\n");
  const files: { name: string; content: string }[] = [];
  let current: { name: string; content: string } | null = null;

  for (const line of lines) {
    const m = line.match(FILE_MARKER);
    if (m) {
      if (current) files.push(current);
      current = { name: m[1].trim(), content: "" };
      continue;
    }
    if (current) current.content += line + "\n";
  }
  if (current) files.push(current);

  const componentFile = files.find(
    (f) => !f.name.toLowerCase().includes("root")
  );
  return (componentFile ? componentFile.content : rawCode).trim();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const rawCode = String(body.code ?? "");
    if (!rawCode) {
      return new Response(JSON.stringify({ error: "Missing `code`." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compositionId = String(body.compositionId ?? "MyVideo");
    const codec = String(body.codec ?? "h264");
    const extraInputProps =
      body.inputProps && typeof body.inputProps === "object"
        ? body.inputProps
        : {};

    const code = pickComponentCode(rawCode);
    const config = extractConfig(rawCode); // extract from FULL code including Root.tsx

    console.log("Extracted config:", JSON.stringify(config));

    // Build inputProps — pass config values so calculateMetadata on Lambda can use them
    const inputProps: Record<string, unknown> = {
      code,
      ...extraInputProps,
    };
    // Forward any extracted config keys
    for (const key of [
      "format",
      "durationInSeconds",
      "durationInFrames",
      "fps",
      "width",
      "height",
    ]) {
      if (config[key] !== undefined) inputProps[key] = config[key];
    }

    console.log("inputProps sent to Lambda:", JSON.stringify(inputProps));

    const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
    const functionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const serveUrl = Deno.env.get("REMOTION_SERVE_URL");

    if (!functionName || !serveUrl) {
      return new Response(
        JSON.stringify({
          error:
            "Missing REMOTION_LAMBDA_FUNCTION_NAME or REMOTION_SERVE_URL env vars.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // CRITICAL: Use ONLY framesPerLambda, NOT concurrency.
    // Remotion v4 throws if both are set.
    // With AWS concurrency limit of 10, we need chunks ≤ 8 (leave room for orchestrator).
    // We calculate framesPerLambda based on estimated total frames.
    const MAX_LAMBDAS = 8;
    const cfgFps = Number(config.fps) || 30;
    const cfgDurationFrames = config.durationInFrames
      ? Number(config.durationInFrames)
      : Math.ceil((Number(config.durationInSeconds) || 5) * cfgFps);

    const framesPerLambda = Math.max(
      20,
      Math.ceil(cfgDurationFrames / MAX_LAMBDAS)
    );

    console.log(
      `Rendering: ${cfgDurationFrames} frames, framesPerLambda: ${framesPerLambda}`
    );

    const response = await renderMediaOnLambda({
      serveUrl,
      composition: compositionId,
      codec: codec as any,
      region: region as any,
      functionName,
      inputProps,
      framesPerLambda,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
