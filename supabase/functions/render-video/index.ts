import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code: rawCode, compositionId = 'MyVideo', codec = 'h264' } = await req.json();

    // Parse multi-file format and extract only the component code (exclude Root.tsx)
    const FILE_MARKER = /^\/\/\s*---\s*file:\s*(.+?)\s*---\s*$/;
    const lines = rawCode.split('\n');
    const files: { name: string; content: string }[] = [];
    let current: { name: string; content: string } | null = null;

    for (const line of lines) {
      const m = line.match(FILE_MARKER);
      if (m) {
        if (current) files.push(current);
        current = { name: m[1].trim(), content: '' };
      } else if (current) {
        current.content += line + '\n';
      }
    }
    if (current) files.push(current);

    // Use the first non-Root file, or fall back to the raw code
    const componentFile = files.find(f => !f.name.toLowerCase().includes('root'));
    const code = componentFile ? componentFile.content.trim() : rawCode;

    // Extract video config from the component code using multiple strategies
    const extractConfig = (src: string): Record<string, unknown> => {
      const config: Record<string, unknown> = {};

      // Strategy 1: /*__REMOTION_CONFIG__ {"format":"tiktok",...} */
      const commentMatch = src.match(/__REMOTION_CONFIG__\s*({[\s\S]*?})/);
      if (commentMatch) {
        try {
          const parsed = JSON.parse(commentMatch[1]);
          if (parsed && typeof parsed === 'object') Object.assign(config, parsed);
        } catch { /* ignore */ }
      }

      // Strategy 2: export const compositionConfig = { ... }
      const configBlockMatch = src.match(/compositionConfig\s*=\s*({[\s\S]*?});/);
      if (configBlockMatch) {
        try {
          // Convert JS object literal to JSON (handle unquoted keys, trailing commas)
          const jsonish = configBlockMatch[1]
            .replace(/'/g, '"')
            .replace(/(\w+)\s*:/g, '"$1":')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          const parsed = JSON.parse(jsonish);
          if (parsed && typeof parsed === 'object') {
            // Only assign keys we haven't already set from __REMOTION_CONFIG__
            for (const [k, v] of Object.entries(parsed)) {
              if (config[k] === undefined) config[k] = v;
            }
          }
        } catch (e) {
          console.warn('Failed to parse compositionConfig:', e);
        }
      }

      // Strategy 3: individual property patterns like durationInSeconds: 25, width: 1080
      if (config.durationInSeconds === undefined && config.durationInFrames === undefined) {
        const durSecsMatch = src.match(/durationInSeconds\s*[:=]\s*(\d+(?:\.\d+)?)/);
        const durFramesMatch = src.match(/durationInFrames\s*[:=]\s*(\d+)/);
        if (durSecsMatch) config.durationInSeconds = Number(durSecsMatch[1]);
        else if (durFramesMatch) config.durationInFrames = Number(durFramesMatch[1]);
      }
      if (config.fps === undefined) {
        const fpsMatch = src.match(/\bfps\s*[:=]\s*(\d+)/);
        if (fpsMatch) config.fps = Number(fpsMatch[1]);
      }
      if (config.width === undefined) {
        const widthMatch = src.match(/\bwidth\s*[:=]\s*(\d+)/);
        if (widthMatch) config.width = Number(widthMatch[1]);
      }
      if (config.height === undefined) {
        const heightMatch = src.match(/\bheight\s*[:=]\s*(\d+)/);
        if (heightMatch) config.height = Number(heightMatch[1]);
      }

      return config;
    };

    const config = extractConfig(code);
    console.log('Extracted config:', config);

    // Build inputProps — pass through everything, let calculateMetadata resolve defaults
    const inputPropsData: Record<string, unknown> = { code };
    for (const key of ['format', 'durationInSeconds', 'durationInFrames', 'fps', 'width', 'height']) {
      if (config[key] !== undefined) {
        inputPropsData[key] = config[key];
      }
    }
    // Calculate total frames to determine optimal framesPerLambda
    // With AWS concurrency limit of 10, we need to keep total chunks ≤ 8
    // (leaving 2 for the main orchestrator + encoding)
    const MAX_CONCURRENT_LAMBDAS = 8;
    const cfgFps = Number(config.fps) || 30;
    const cfgDurationSecs = Number(config.durationInSeconds) || 5;
    const cfgDurationFrames = config.durationInFrames 
      ? Number(config.durationInFrames) 
      : Math.ceil(cfgDurationSecs * cfgFps);
    const framesPerLambda = Math.max(20, Math.ceil(cfgDurationFrames / MAX_CONCURRENT_LAMBDAS));

    console.log('inputProps sent to Lambda:', inputPropsData);
    console.log('Calculated framesPerLambda:', framesPerLambda, 'for', cfgDurationFrames, 'total frames');

    const region = Deno.env.get('AWS_REGION') || 'us-east-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
    const functionName = Deno.env.get('REMOTION_LAMBDA_FUNCTION_NAME')!;
    const serveUrl = Deno.env.get('REMOTION_SERVE_URL')!;

    if (!accessKeyId || !secretAccessKey || !functionName || !serveUrl) {
      throw new Error('Missing AWS or Remotion configuration');
    }

    // Build the payload matching exactly what the Remotion SDK sends
    const payload = {
      type: "start",
      version: "4.0.420",
      region,
      serveUrl,
      functionName,
      composition: compositionId,
      codec,
      inputProps: {
        type: "payload",
        payload: JSON.stringify(inputPropsData),
      },
      rendererFunctionName: null,
      framesPerLambda,
      concurrency: MAX_CONCURRENT_LAMBDAS,
      imageFormat: "jpeg",
      crf: null,
      envVariables: {},
      pixelFormat: null,
      proResProfile: null,
      x264Preset: null,
      jpegQuality: 80,
      maxRetries: 1,
      privacy: "public",
      logLevel: "warn",
      frameRange: null,
      outName: null,
      timeoutInMilliseconds: 120000,
      chromiumOptions: {},
      scale: 1,
      everyNthFrame: 1,
      numberOfGifLoops: null,
      concurrencyPerLambda: 1,
      downloadBehavior: { type: "play-in-browser" },
      muted: false,
      overwrite: false,
      audioBitrate: null,
      videoBitrate: null,
      encodingBufferSize: null,
      encodingMaxRate: null,
      webhook: null,
      forceHeight: null,
      forceWidth: null,
      bucketName: null,
      audioCodec: null,
      offthreadVideoCacheSizeInBytes: null,
      deleteAfter: null,
      colorSpace: null,
      preferLossless: false,
      forcePathStyle: false,
      metadata: null,
      licenseKey: null,
      offthreadVideoThreads: null,
      mediaCacheSizeInBytes: null,
      storageClass: null,
      isProduction: null,
      indent: false,
    };

    // Invoke AWS Lambda directly using AWS REST API
    const lambdaUrl = `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${functionName}/invocations`;

    const body = JSON.stringify(payload);
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

    // AWS Signature V4
    const encoder = new TextEncoder();

    async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
      const cryptoKey = await crypto.subtle.importKey(
        'raw', key instanceof Uint8Array ? key : new Uint8Array(key),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(msg));
    }

    async function sha256(msg: string): Promise<string> {
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(msg));
      return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const service = 'lambda';
    const host = `lambda.${region}.amazonaws.com`;
    const canonicalUri = `/2015-03-31/functions/${functionName}/invocations`;
    const canonicalQuerystring = '';
    const payloadHash = await sha256(body);

    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';

    const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

    const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, 'aws4_request');

    const signatureBuffer = await hmac(kSigning, stringToSign);
    const signature = [...new Uint8Array(signatureBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        'Authorization': authorizationHeader,
      },
      body,
    });

    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error('Lambda invocation failed:', lambdaResponse.status, errorText);
      throw new Error(`Lambda invocation failed: ${lambdaResponse.status}`);
    }

    let result = await lambdaResponse.json();
    console.log('Lambda response:', JSON.stringify(result));

    // Lambda may return a stringified JSON body
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }

    // Check for Remotion errors in the response
    if (result.type === 'error') {
      throw new Error(result.message || 'Remotion Lambda returned an error');
    }

    // Remotion Lambda returns { renderId, bucketName } on success
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in render-video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
