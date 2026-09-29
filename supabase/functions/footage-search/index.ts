import { cors, json } from "../_shared/hub.ts";

// Search Pexels stock videos/photos. GET or POST: token, q, type=video|photo, orientation=portrait|landscape|square, per_page (<=30), page.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  let p: Record<string, any> = {};
  if (req.method === "GET") p = Object.fromEntries(new URL(req.url).searchParams);
  else { try { p = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); } }
  const expected = Deno.env.get("HUB_WRITE_TOKEN");
  if (!expected || p.token !== expected) return json({ error: "Invalid token." }, 401);
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) return json({ error: "Stock search is not configured (PEXELS_API_KEY missing)." }, 503);
  const q = String(p.q || p.query || "").trim().slice(0, 200);
  if (!q) return json({ error: "q is required." }, 400);
  const type = p.type === "photo" ? "photo" : "video";
  let orientation = String(p.orientation || "").toLowerCase();
  if (orientation === "vertical") orientation = "portrait";
  if (orientation === "horizontal") orientation = "landscape";
  const per = Math.min(30, Math.max(1, Number(p.per_page) || 10));
  const page = Math.max(1, Number(p.page) || 1);
  const qs = new URLSearchParams({ query: q, per_page: String(per), page: String(page) });
  if (["portrait", "landscape", "square"].includes(orientation)) qs.set("orientation", orientation);
  const url = type === "video" ? `https://api.pexels.com/videos/search?${qs}` : `https://api.pexels.com/v1/search?${qs}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) return json({ error: `Pexels error (${res.status}).` }, res.status === 429 ? 429 : 502);
  const d = await res.json();
  const results = type === "video"
    ? (d.videos || []).map((v: any) => {
        const files = (v.video_files || []).filter((f: any) => f.file_type === "video/mp4").sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height));
        const best = files.find((f: any) => Math.max(f.width, f.height) <= 1920) || files[0];
        return { id: v.id, width: v.width, height: v.height, duration: v.duration, preview_image: v.image, page: v.url, by: v.user?.name, download_url: best?.link, file_width: best?.width, file_height: best?.height };
      })
    : (d.photos || []).map((ph: any) => ({ id: ph.id, width: ph.width, height: ph.height, alt: ph.alt, preview_image: ph.src?.medium, page: ph.url, by: ph.photographer, download_url: ph.src?.large2x || ph.src?.original }));
  return json({ source: "pexels", type, q, page, total: d.total_results, results, save_with: "agent-create with sourceUrl=download_url, kind=video|image, role=stock, project=<slug>" });
});
