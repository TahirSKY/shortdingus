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

export const ROLES = ["sfx", "music", "clip", "image", "logo", "character", "voice", "script", "plan", "shot", "code", "render", "reference", "other"] as const;

/** Resolve optional project/role/tags params into extra asset columns. */
export async function assetTarget(db: any, groupId: string, p: Record<string, any>): Promise<{ extra: Record<string, unknown> } | { error: string; status: number }> {
  const extra: Record<string, unknown> = {};
  const proj = String(p.project || "").trim().toLowerCase();
  if (proj) {
    const { data } = await db.from("projects").select("id").eq("group_id", groupId).eq("slug", proj).maybeSingle();
    if (!data) return { error: `No project "${proj}" in this hub.`, status: 404 };
    extra.project_id = data.id;
  }
  if (p.role) {
    const role = String(p.role).trim().toLowerCase();
    if (!(ROLES as readonly string[]).includes(role)) return { error: `role must be one of: ${ROLES.join(", ")}.`, status: 400 };
    extra.role = role;
  }
  const tags = Array.isArray(p.tags) ? p.tags : typeof p.tags === "string" ? p.tags.split(",") : [];
  const clean = tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 30);
  if (clean.length) extra.tags = clean;
  return { extra };
}
