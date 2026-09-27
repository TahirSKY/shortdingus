import { admin, cors, json } from "../_shared/hub.ts";

const STAGES = ["idea", "script", "assets", "voice", "edit", "check", "render", "done"];
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let p: Record<string, any>;
  try { p = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const expected = Deno.env.get("HUB_WRITE_TOKEN");
  if (!expected || p.token !== expected) return json({ error: "Invalid token." }, 401);
  const db = admin();
  const { data: hub } = await db.from("asset_groups").select("id").eq("slug", String(p.slug || "").toLowerCase()).maybeSingle();
  if (!hub) return json({ error: "Unknown hub slug." }, 404);

  const patch: Record<string, unknown> = {};
  if (p.stage !== undefined) { if (!STAGES.includes(p.stage)) return json({ error: `stage must be one of: ${STAGES.join(", ")}.` }, 400); patch.stage = p.stage; }
  if (p.plan !== undefined) { if (typeof p.plan !== "object" || p.plan === null) return json({ error: "plan must be an object." }, 400); patch.plan = p.plan; }
  if (typeof p.notes === "string") patch.notes = p.notes.slice(0, 20000);
  if (typeof p.name === "string" && p.name.trim()) patch.name = p.name.trim().slice(0, 120);
  if (typeof p.skill === "string") {
    const { data: s } = await db.from("skills").select("id").eq("slug", p.skill).or(`group_id.is.null,group_id.eq.${hub.id}`).limit(1).maybeSingle();
    if (!s) return json({ error: `Unknown skill "${p.skill}".` }, 404);
    patch.skill_id = s.id;
  }

  const projSlug = String(p.project || "").toLowerCase();
  if (!projSlug) {
    // create
    const name = String(p.name || "").trim();
    if (!name) return json({ error: "Give project (slug) to update, or name to create." }, 400);
    const { data, error } = await db.from("projects").insert({ group_id: hub.id, slug: slugify(name) || "project", ...patch, name }).select().single();
    if (error) return json({ error: error.code === "23505" ? "A project with that name already exists." : error.message }, 400);
    return json({ project: data }, 201);
  }
  const { data, error } = await db.from("projects").update(patch).eq("group_id", hub.id).eq("slug", projSlug).select().maybeSingle();
  if (error) return json({ error: error.message }, 400);
  if (!data) return json({ error: "Unknown project." }, 404);
  return json({ project: data });
});
