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

/**
 * Prepare code for Lambda's evaluateCode/pickEntryFile contract:
 * 1. In multi-file mode: strip Root.tsx (Lambda has its own), keep scene files.
 * 2. Ensure exactly one file has `export default` so pickEntryFile succeeds.
 * 3. For single-file code without `export default`, append one.
 *
 * This is NOT config parsing — we never extract fps/duration/dimensions.
 * This only satisfies the Lambda bundle's hard requirement for a default export entry point.
 */
const FILE_MARKER = /^\/\/\s*---\s*file:\s*(.+?)\s*---\s*$/;

function prepareCodeForLambda(raw: string): string {
  const lines = raw.split("\n");
  const files: { name: string; lines: string[] }[] = [];
  let cur: { name: string; lines: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(FILE_MARKER);
    if (m) {
      if (cur) files.push(cur);
      cur = { name: m[1].trim(), lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) files.push(cur);

  // Single-file mode (no markers)
  if (files.length === 0) {
    return ensureClassicJsx(ensureDefaultExport(raw));
  }

  // Multi-file mode: drop Root.tsx since Lambda has its own
  const sceneFiles = files.filter(
    (f) => !/^Root\.(tsx|jsx|ts|js)$/i.test(f.name)
  );

  if (sceneFiles.length === 0) {
    // Only had Root.tsx — shouldn't happen, but return raw
    return raw;
  }

  // Ensure the first (or only) scene file has export default
  const hasDefault = sceneFiles.some((f) =>
    /export\s+default\b/.test(f.lines.join("\n"))
  );

  if (!hasDefault) {
    // Add default export to the first scene file
    sceneFiles[0].lines.push("");
    const content = sceneFiles[0].lines.join("\n");
    // Find the first named export: export const Foo / export function Foo
    const namedMatch = content.match(
      /export\s+(?:const|function|class)\s+([A-Z]\w*)/
    );
    if (namedMatch) {
      sceneFiles[0].lines.push(`export default ${namedMatch[1]};`);
    }
  }

  // Apply classic JSX pragma to all scene files
  for (const f of sceneFiles) {
    const content = f.lines.join("\n");
    f.lines = ensureClassicJsx(content).split("\n");
  }

  // If only one scene file remains, send without markers (single-file mode for Lambda)
  if (sceneFiles.length === 1) {
    return sceneFiles[0].lines.join("\n").trim();
  }

  // Multiple scene files: reconstruct with markers
  return sceneFiles
    .map((f) => `// --- file: ${f.name} ---\n${f.lines.join("\n").trimEnd()}`)
    .join("\n\n");
}

function ensureDefaultExport(code: string): string {
  if (/export\s+default\b/.test(code)) return code;
  const m = code.match(/export\s+(?:const|function|class)\s+([A-Z]\w*)/);
  if (m) return code + `\n\nexport default ${m[1]};`;
  return code;
}

/**
 * Ensure Babel uses classic JSX runtime (React.createElement) not automatic (jsx-runtime).
 * The Lambda bundle's manual require() doesn't map react/jsx-runtime, so automatic fails.
 * Also ensure `import React` is present since classic runtime needs it in scope.
 */
function ensureClassicJsx(code: string): string {
  let result = code;

  // Add classic pragma if not present
  if (!result.includes("@jsxRuntime")) {
    result = `/** @jsxRuntime classic */\n` + result;
  }

  // Ensure React is imported (classic runtime needs React in scope for createElement)
  if (!/import\s+React[\s,{]/.test(result) && !/const\s+React\s*=/.test(result)) {
    // Insert after the pragma line
    const pragmaEnd = result.indexOf("\n");
    result = result.slice(0, pragmaEnd + 1) + `import React from "react";\n` + result.slice(pragmaEnd + 1);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const rawCode = String(body.code ?? "").trim();
    if (!rawCode) {
      return json({ error: "Missing `code`." }, 400);
    }

    const format: string = String(body.format ?? "youtube").toLowerCase();
    const compositionId: string = String(body.compositionId ?? "MyVideo");
    const codec: string = String(body.codec ?? "h264");
    const debug: boolean = Boolean(body.debug);

    // Prepare code for Lambda's pickEntryFile contract (strip Root.tsx, ensure export default)
    const code = prepareCodeForLambda(rawCode);

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
