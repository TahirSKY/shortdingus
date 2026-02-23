/**
 * render-still – Triggers a Remotion Lambda still render via the official SDK.
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   AWS_REGION (default "us-east-1")
 *   REMOTION_SERVE_URL
 *   REMOTION_LAMBDA_FUNCTION_NAME
 *
 * POST body:
 *   { code: string, format?: "youtube"|"tiktok"|"square"|"poster_portrait"|"poster_landscape",
 *     compositionId?: string, imageFormat?: "png"|"jpeg", frame?: number,
 *     inputProps?: object, debug?: boolean }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { renderStillOnLambda } from "npm:@remotion/lambda-client@4.0.420";

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
  poster_portrait: { width: 1080, height: 1536 },
  poster_landscape: { width: 1536, height: 1080 },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Same code preparation as render-video */
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

  if (files.length === 0) {
    return ensureClassicJsx(ensureDefaultExport(raw));
  }

  const sceneFiles = files.filter(
    (f) => !/^Root\.(tsx|jsx|ts|js)$/i.test(f.name)
  );

  if (sceneFiles.length === 0) return raw;

  const hasDefault = sceneFiles.some((f) =>
    /export\s+default\b/.test(f.lines.join("\n"))
  );

  if (!hasDefault) {
    sceneFiles[0].lines.push("");
    const content = sceneFiles[0].lines.join("\n");
    const namedMatch = content.match(
      /export\s+(?:const|function|class)\s+([A-Z]\w*)/
    );
    if (namedMatch) {
      sceneFiles[0].lines.push(`export default ${namedMatch[1]};`);
    }
  }

  for (const f of sceneFiles) {
    const content = f.lines.join("\n");
    f.lines = ensureClassicJsx(content).split("\n");
  }

  if (sceneFiles.length === 1) {
    return sceneFiles[0].lines.join("\n").trim();
  }

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

function ensureClassicJsx(code: string): string {
  let result = code;
  if (!result.includes("@jsxRuntime")) {
    result = `/** @jsxRuntime classic */\n` + result;
  }
  if (!/import\s+React[\s,{]/.test(result) && !/const\s+React\s*=/.test(result)) {
    const pragmaEnd = result.indexOf("\n");
    result = result.slice(0, pragmaEnd + 1) + `import React from "react";\n` + result.slice(pragmaEnd + 1);
  }
  return result;
}

/**
 * Override durationInFrames in user code to ensure it covers the requested frame.
 * This handles cases where users set a small durationInFrames (e.g., 5 for a 5-page brochure)
 * but we need to render a higher frame number.
 */
function overrideDurationInFrames(code: string, requiredFrames: number): string {
  // Match REMOTION_CONFIG comment pattern
  const configMatch = code.match(/\/\*\s*REMOTION_CONFIG\s*\{([^}]+)\}\s*\*\//);
  if (configMatch) {
    const configBody = configMatch[1];
    const difMatch = configBody.match(/durationInFrames\s*:\s*(\d+)/);
    if (difMatch) {
      const currentFrames = Number(difMatch[1]);
      if (currentFrames < requiredFrames) {
        const newConfig = configBody.replace(
          /durationInFrames\s*:\s*\d+/,
          `durationInFrames: ${requiredFrames}`
        );
        return code.replace(configMatch[0], `/* REMOTION_CONFIG {${newConfig}} */`);
      }
    }
    return code;
  }

  // Match inline durationInFrames: N
  const inlineMatch = code.match(/durationInFrames\s*[:=]\s*(\d+)/);
  if (inlineMatch) {
    const currentFrames = Number(inlineMatch[1]);
    if (currentFrames < requiredFrames) {
      return code.replace(
        /durationInFrames\s*[:=]\s*\d+/,
        inlineMatch[0].replace(String(currentFrames), String(requiredFrames))
      );
    }
  }

  return code;
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

    const format: string = String(body.format ?? "poster_portrait").toLowerCase();
    const compositionId: string = String(body.compositionId ?? "MyVideo");
    const imageFormat: string = body.imageFormat === "jpeg" ? "jpeg" : "png";
    const frame: number = Math.max(0, Number(body.frame) || 0);
    const debug: boolean = Boolean(body.debug);
    // Duration must be long enough to cover the requested frame
    const minDurationInSeconds: number = Math.max(1, Math.ceil((frame + 1) / 30));
    const durationInSeconds: number = Math.max(minDurationInSeconds, Number(body.durationInSeconds) || minDurationInSeconds);

    // Override durationInFrames in user code to ensure enough frames exist for the requested frame
    const requiredFrames = frame + 1;
    const adjustedRawCode = overrideDurationInFrames(rawCode, requiredFrames);
    const code = prepareCodeForLambda(adjustedRawCode);

    // Derive dimensions from format
    const dims = FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS.poster_portrait;

    const inputProps: Record<string, unknown> = {
      code,
      format,
      durationInSeconds,
      fps: 30,
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

    const logLevel = debug ? "verbose" : "info";

    console.log(
      `[render-still] composition=${compositionId} format=${format} frame=${frame} imageFormat=${imageFormat}`,
    );

    const response = await renderStillOnLambda({
      serveUrl,
      composition: compositionId,
      region: region as any,
      functionName,
      inputProps,
      imageFormat: imageFormat as any,
      frame,
      logLevel: logLevel as any,
      privacy: "public",
      maxRetries: 1,
    } as any);

    return json({
      url: response.url,
      sizeInBytes: response.sizeInBytes,
      estimatedPrice: (response as any).estimatedPrice ?? null,
      renderId: response.renderId,
      bucketName: response.bucketName,
    });
  } catch (err) {
    console.error("[render-still] Error:", err);
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
