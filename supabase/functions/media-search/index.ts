import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const schema = z.object({
  projectId: z.string().uuid(),
  source: z.enum(["pexels", "giphy"]),
  q: z.string().trim().min(1).max(50),
  type: z.enum(["video", "photo", "gifs", "stickers"]),
  orientation: z.enum(["any", "portrait", "landscape", "square"]).default("any"),
  page: z.number().int().min(1).max(100).default(1),
});
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: "Invalid search parameters." }, 400);
    const p = parsed.data;
    const base = Deno.env.get("SUPABASE_URL") || "";
    // Respect the same caller-scoped access rules as the project page, including
    // the existing public hub mode. Never send the hub write token to a browser.
    const caller = createClient(base, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: project, error } = await caller.from("projects").select("id").eq("id", p.projectId).maybeSingle();
    if (error || !project) return reply({ error: "Project is unavailable." }, 403);
    const token = Deno.env.get("HUB_WRITE_TOKEN");
    if (!token) return reply({ error: "Media search is not configured." }, 503);
    const isPexels = p.source === "pexels";
    const response = await fetch(`${base}/functions/v1/${isPexels ? "footage-search" : "meme-search"}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, q: p.q, type: p.type, orientation: p.orientation,
        per_page: 12, page: p.page, limit: 12, offset: (p.page - 1) * 12 }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Media search failed [${response.status}]: ${details}`);
      return reply({ error: "Media search failed", status: response.status, details }, response.status);
    }
    const data = await response.json();
    const results = (data.results || []).map((r: Record<string, any>) => ({
      id: String(r.id), source: p.source, kind: isPexels && p.type === "photo" ? "image" : r.mp4_url || isPexels ? "video" : "image",
      title: r.title || r.alt || `Pexels ${p.type} ${r.id}`,
      preview: r.preview_image, url: isPexels ? r.download_url : r.mp4_url || r.gif_url,
      pageUrl: r.page, credit: r.by || "GIPHY", width: r.file_width || r.width, height: r.file_height || r.height,
      duration: r.duration || null,
    })).filter((r: Record<string, any>) => r.url && r.preview);
    return reply({ results, page: p.page, hasMore: p.page * 12 < Number(data.total || 0) });
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : "Search failed." }, 500);
  }
});