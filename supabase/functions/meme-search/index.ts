import { cors, json } from "../_shared/hub.ts";

// Search GIPHY memes/GIFs. GET or POST: token, q, type=gifs|stickers, limit (<=25), offset.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  let p: Record<string, any> = {};
  if (req.method === "GET") p = Object.fromEntries(new URL(req.url).searchParams);
  else { try { p = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); } }
  const expected = Deno.env.get("HUB_WRITE_TOKEN");
  if (!expected || p.token !== expected) return json({ error: "Invalid token." }, 401);
  const key = Deno.env.get("GIPHY_API_KEY");
  if (!key) return json({ error: "Meme search is not configured (GIPHY_API_KEY missing)." }, 503);
  const q = String(p.q || p.query || "").trim().slice(0, 50);
  if (!q) return json({ error: "q is required." }, 400);
  const type = p.type === "stickers" ? "stickers" : "gifs";
  const limit = Math.min(25, Math.max(1, Number(p.limit) || 10));
  const offset = Math.max(0, Number(p.offset) || 0);
  const qs = new URLSearchParams({ api_key: key, q, limit: String(limit), offset: String(offset), rating: "pg-13" });
  const res = await fetch(`https://api.giphy.com/v1/${type}/search?${qs}`);
  if (!res.ok) return json({ error: `GIPHY error (${res.status}).` }, res.status === 429 ? 429 : 502);
  const d = await res.json();
  const results = (d.data || []).map((g: any) => {
    const o = g.images?.original || {};
    return { id: g.id, title: g.title, width: Number(o.width), height: Number(o.height), preview_image: g.images?.fixed_width_still?.url, page: g.url, mp4_url: o.mp4, gif_url: o.url, webp_url: o.webp };
  });
  return json({ source: "giphy", type, q, total: d.pagination?.total_count, results, save_with: "agent-create with sourceUrl=mp4_url, kind=video, role=meme, project=<slug>" });
});
