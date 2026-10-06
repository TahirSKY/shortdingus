import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const env = Object.fromEntries(readFileSync(".env","utf8").split("\n").filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,"")]}));
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
for (const [slug, name] of [["clip-finder","Clip finder"],["clip-editing","Clip editing"]]) {
  const t = readFileSync(`skills/${slug}.md`,"utf8"); const m = t.match(/^---\n([\s\S]*?)\n---\n?/)!;
  const desc = m[1].split("\n").find(l=>l.startsWith("description:"))!.slice(12).trim();
  const row = { slug, name, description: desc, body: t.slice(m[0].length), source: "clipping", group_id: null };
  const { data: ex } = await db.from("skills").select("id").eq("slug", slug).is("group_id", null).maybeSingle();
  const r = ex ? await db.from("skills").update(row).eq("id", ex.id) : await db.from("skills").insert(row);
  console.log(slug, r.error?.message || "ok");
}
