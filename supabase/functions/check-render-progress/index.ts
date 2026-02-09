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
    const { renderId, bucketName } = await req.json();

    const region = Deno.env.get('AWS_REGION') || 'us-east-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
    const functionName = Deno.env.get('REMOTION_LAMBDA_FUNCTION_NAME')!;

    if (!accessKeyId || !secretAccessKey || !functionName) {
      throw new Error('Missing AWS configuration');
    }

    // Build the progress check payload
    const payload = {
      type: "status",
      version: "4.0.420",
      renderId,
      bucketName,
      logLevel: "warn",
    };

    // Invoke AWS Lambda directly
    const lambdaUrl = `https://lambda.${region}.amazonaws.com/2015-03-31/functions/${functionName}/invocations`;
    const body = JSON.stringify(payload);
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

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
    const payloadHash = await sha256(body);
    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    const canonicalRequest = `POST\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
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

    const result = await lambdaResponse.json();
    console.log('Progress response:', JSON.stringify(result));

    // Remotion returns: { overallProgress, outputFile, done, fatalErrorEncountered, ... }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-render-progress:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
