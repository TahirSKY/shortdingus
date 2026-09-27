// One-time (re-runnable) import: skills/ → skills table, GitHub sfx/music → shared-library hub.
// Run: bun scripts/import-skills.ts /path/to/claude-faceless-shorts-creator
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const repo = process.argv[2];
const SRC = "https://github.com/hassancs91/claude-faceless-shorts-creator";

const adapter = readFileSync("skills/_adapter.md", "utf8");
const front = (t: string) => { const m = t.match(/^---\n([\s\S]*?)\n---\n?/); const o: Record<string, string> = {}; if (m) for (const l of m[1].split("\n")) { const i = l.indexOf(":"); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); } return { meta: o, body: m ? t.slice(m[0].length) : t }; };

const SKILLS: [string, string, boolean][] = [
  ["retention-structure", "Retention structure (6 parts)", false], ["make-short", "Make code-only short", true],
  ["make-ai-short", "Make AI-character short", true], ["make-vox", "Make Vox collage short", true],
  ["suggest-sfx", "Suggest sound effects", true], ["vidtsx-2d-generator", "2D visual generator + style presets", true],
  ["edit-raw-footage", "Edit raw footage", false], ["packaging", "Packaging: titles + thumbnails", false], ["final-check", "Final check before render", false],
];

for (const [slug, name, imported] of SKILLS) {
  const { meta, body } = front(readFileSync(`skills/${slug}.md`, "utf8"));
  const row = { slug, name, description: (meta.description || "").slice(0, 1000), body: imported ? adapter + body : body, source: imported ? SRC : "shortdingus", group_id: null };
  const { data: ex } = await db.from("skills").select("id").eq("slug", slug).is("group_id", null).maybeSingle();
  const r = ex ? await db.from("skills").update(row).eq("id", ex.id) : await db.from("skills").insert(row);
  console.log("skill", slug, r.error?.message || "ok");
}

let { data: hub } = await db.from("asset_groups").select("*").eq("slug", "shared-library").maybeSingle();
const style = readFileSync("skills/_brand-style-guide.md", "utf8");
if (!hub) ({ data: hub } = await db.from("asset_groups").insert({ slug: "shared-library", title: "Shared Library", notes: "Sounds, music and style shared by every hub. Imported from the faceless-shorts GitHub project.", style_guide: style }).select().single());
else await db.from("asset_groups").update({ style_guide: style }).eq("id", hub.id);

if (repo && existsSync(repo)) {
  const { data: have } = await db.from("assets").select("name").eq("group_id", hub!.id);
  const names = new Set((have || []).map((a: any) => a.name));
  for (const role of ["sfx", "music"]) {
    const cat = JSON.parse(readFileSync(`${repo}/media/library/${role}/catalog.json`, "utf8"));
    for (const c of cat.clips) {
      const name = `${c.id}.mp3`;
      if (names.has(name)) continue;
      const file = `${repo}/media/library/${role}/${c.file}`;
      if (!existsSync(file)) { console.log("missing", file); continue; }
      const bytes = readFileSync(file);
      const id = crypto.randomUUID();
      const path = `groups/shared-library/${id}-${name}`;
      const up = await db.storage.from("hub-media").upload(path, bytes, { contentType: "audio/mpeg" });
      if (up.error) { console.log("upload", name, up.error.message); continue; }
      const { license, ...rest } = c;
      const r = await db.from("assets").insert({ id, group_id: hub!.id, kind: "audio", role, tags: [c.category, ...(c.tags || [])].filter(Boolean), name, storage_path: path, mime_type: "audio/mpeg", size_bytes: bytes.byteLength, duration_seconds: c.duration_s ?? null, meta: { ...rest, description: c.prompt, license, source_repo: SRC } });
      console.log(role, name, r.error?.message || "ok");
    }
  }
}
