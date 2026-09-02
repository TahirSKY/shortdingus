import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSites } from "npm:@remotion/lambda-client@4.0.438";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
    const { sites, buckets } = await getSites({ region } as any);
    return new Response(
      JSON.stringify({
        buckets: buckets.map((b: any) => b.name),
        sites: sites.map((s: any) => ({ id: s.id, serveUrl: s.serveUrl, bucketName: s.bucketName })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
