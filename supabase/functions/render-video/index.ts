import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Remotion official approach for Supabase Edge Functions is to use @remotion/lambda-client.
// Replace the version with the one you use in your Remotion project (you said 4.0.420).
import {
  renderMediaOnLambda,
  // Optional helper if you ever want to compute the function name from specs:
  // speculateFunctionName,
} from "npm:@remotion/lambda-client@4.0.420";

// Supabase recommends using Deno.serve (not std/http serve.ts). <!--citation:4-->
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Your multi-file marker support (kept from your original code)
const FILE_MARKER = /^\/\/\s*---\s*file:\s*(.+?)\s*---\s*$/;

// Parse config embedded in pasted code, optional.
// (Your Root.tsx can also parse config; this is just extra convenience.)
const extractConfig = (src: string): Record<string, unknown> => {
  const config: Record<string, unknown> = {};

  // Strategy 1: /*__REMOTION_CONFIG__ {"format":"tiktok",...} */
  const commentMatch = src.match(/__REMOTION_CONFIG__\s*({[\s\S]*?})/);
  if (commentMatch) {
    try {
      const parsed = JSON.parse(commentMatch[1]);
      if (parsed && typeof parsed === "object") Object.assign(config, parsed);
    } catch {
      // ignore
    }
  }

  // Strategy 2: export const compositionConfig = { ... };
  // NOTE: This is best-effort. If users put functions/expressions inside, JSON.parse will fail.
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
    } catch {
      // ignore
    }
  }

  return config;
};

const pickComponentCode = (rawCode: string): string => {
  // Parse multi-file format and extract only the component code (exclude Root.tsx)
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

  // Use the first non-Root file, or fall back to the raw code
  const componentFile = files.find((f) => !f.name.toLowerCase().includes("root"));
  return (componentFile ? componentFile.content : rawCode).trim();
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Expected request shape:
    // {
    //   code: string,
    //   compositionId?: string,
    //   codec?: "h264" | "h265" | ...,
    //   inputProps?: object   // optional extra props from your UI
    // }
    const rawCode = String(body.code ?? "");
    if (!rawCode) {
      return new Response(JSON.stringify({ error: "Missing `code`." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compositionId = String(body.compositionId ?? "MyVideo");
    const codec = String(body.codec ?? "h264");
    const extraInputProps = body.inputProps && typeof body.inputProps === "object" ? body.inputProps : {};

    const code = pickComponentCode(rawCode);
    const embeddedConfig = extractConfig(code);

    // Build inputProps for your Remotion <Composition>.
    // Your MyVideo expects {code}, and your calculateMetadata can use format/duration/fps/etc.
    const inputProps = {
      ...embeddedConfig,
      ...extraInputProps,
      code,
    };

    const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
    const functionName = Deno.env.get("REMOTION_LAMBDA_FUNCTION_NAME");
    const serveUrl = Deno.env.get("REMOTION_SERVE_URL");

    if (!functionName || !serveUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing REMOTION_LAMBDA_FUNCTION_NAME or REMOTION_SERVE_URL env vars.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // With AWS concurrency limit = 10, don’t set this too high.
    // Using `concurrency` is an alternative to framesPerLambda. <!--citation:2-->
    // We default to 8 to leave headroom for orchestration.
    const concurrencyEnv = Number(Deno.env.get("REMOTION_CONCURRENCY") ?? "8");
    const concurrency = Number.isFinite(concurrencyEnv) ? concurrencyEnv : 8;

    const response = await renderMediaOnLambda({
      serveUrl,
      composition: compositionId,
      codec: codec as any,
      region: region as any,
      functionName,
      inputProps,

      // IMPORTANT: pick ONE:
      // - either `concurrency` (recommended here), OR `framesPerLambda`.
      concurrency,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
