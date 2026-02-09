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
    const { code, compositionId = 'MyVideo', codec = 'h264' } = await req.json();

    const region = Deno.env.get('AWS_REGION') || 'us-east-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
    const functionName = Deno.env.get('REMOTION_LAMBDA_FUNCTION_NAME')!;
    const serveUrl = Deno.env.get('REMOTION_SERVE_URL')!;

    if (!accessKeyId || !secretAccessKey || !functionName || !serveUrl) {
      throw new Error('Missing AWS or Remotion configuration');
    }

    // Build the payload that Remotion Lambda expects
    // IMPORTANT: Fields like frameRange must be explicitly null, not omitted,
    // because Remotion checks `!== null` (undefined would pass that check and crash)
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
        payload: JSON.stringify({ code }),
      },
      imageFormat: "jpeg",
      maxRetries: 1,
      privacy: "public",
      logLevel: "warn",
      timeoutInMilliseconds: 120000,
      frameRange: null,
      framesPerLambda: null,
      concurrency: 1,
      everyNthFrame: 1,
      muted: false,
      overwrite: true,
      audioBitrate: null,
      videoBitrate: null,
      encodingBufferSize: null,
      encodingMaxRate: null,
      webhook: null,
      forceHeight: null,
      forceWidth: null,
      rendererFunctionName: null,
      forceBucketName: null,
      audioCodec: null,
      deleteAfter: null,
      colorSpace: "default",
      preferLossless: false,
      offthreadVideoCacheSizeInBytes: null,
      multiProcessOnLinux: true,
      bezelColor: null,
      x264Preset: null,
      jpegQuality: 80,
      scale: 1,
      numberOfGifLoops: null,
      outName: null,
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
