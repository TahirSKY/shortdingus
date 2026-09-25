import { admin, assetUrl, cors, json } from "../_shared/hub.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const slug = (new URL(req.url).searchParams.get("slug") || "").trim().toLowerCase();
  if (!slug) return json({ error: "Missing slug." }, 400);
  const db = admin();
  const { data: group } = await db.from("asset_groups").select("*").eq("slug", slug).maybeSingle();
  if (!group) return json({ error: `No group with slug "${slug}".` }, 404);
  await db.from("asset_analyses").update({ status: "error", error_message: "Analysis timed out. Run it again." })
    .eq("group_id", group.id).in("status", ["running", "pending"]).lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  const [{ data: assets }, { data: analyses }] = await Promise.all([
    db.from("assets").select("*").eq("group_id", group.id).order("created_at", { ascending: true }),
    db.from("asset_analyses").select("*").eq("group_id", group.id).eq("status", "complete").order("created_at", { ascending: true }),
  ]);
  const list = assets || [];
  const counts: Record<string, number> = {};
  for (const a of list) counts[a.kind] = (counts[a.kind] || 0) + 1;
  const names = new Map(list.map((a) => [a.id, a.name]));
  return json({
    group: { slug: group.slug, title: group.title, notes: group.notes, created_at: group.created_at, updated_at: group.updated_at, counts },
    assets: list.map((a) => ({
      id: a.id, kind: a.kind, name: a.name, url: assetUrl(a.id), mime_type: a.mime_type,
      size_bytes: a.size_bytes, duration_seconds: a.duration_seconds === null ? null : Number(a.duration_seconds), meta: a.meta,
      created_at: a.created_at,
      ...(a.kind === "text" || a.kind === "code" || a.inline_content ? { inline_content: a.inline_content } : {}),
    })),
    analyses: (analyses || []).map((x) => ({ asset_id: x.asset_id, asset_name: names.get(x.asset_id) || null, tool: x.tool, status: x.status, summary: x.summary, report: x.report, updated_at: x.updated_at })),
    generated_at: new Date().toISOString(),
  });
});
