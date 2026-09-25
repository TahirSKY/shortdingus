import { createClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const admin = () => createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

export const assetUrl = (id: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/asset-url?id=${id}`;

export const KINDS = ["video", "image", "audio", "text", "transcript", "analysis", "code", "render"] as const;

export const safeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").replace(/-+/g, "-").slice(0, 120) || "file";

export const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
