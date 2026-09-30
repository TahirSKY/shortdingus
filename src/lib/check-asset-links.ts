import { supabase } from "@/integrations/supabase/client";

const LINK = /asset-url\?id=([0-9a-f-]{36})|['"`]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})['"`]/gi;

/** Returns the hub file IDs used in the code that don't exist or have no file yet. */
export async function findMissingAssets(code: string): Promise<string[]> {
  const ids = new Set<string>();
  for (const m of code.matchAll(LINK)) ids.add((m[1] || m[2]).toLowerCase());
  if (ids.size === 0) return [];
  const { data, error } = await supabase.from("assets").select("id, storage_path, inline_content").in("id", [...ids]);
  if (error) return [];
  const ok = new Set((data ?? []).filter((a) => a.storage_path || a.inline_content).map((a) => a.id));
  return [...ids].filter((id) => !ok.has(id));
}

export function missingMessage(ids: string[]) {
  return `${ids.length} file${ids.length > 1 ? "s" : ""} used in the code ${ids.length > 1 ? "aren't" : "isn't"} in the hub: ${ids.map((i) => i.slice(0, 8)).join(", ")}. Ask the agent to use IDs from the agent link.`;
}

/** Pulls the real message out of a failed edge function call. */
export async function functionErrorMessage(err: unknown, fallback: string): Promise<string> {
  const ctx = (err as { context?: Response })?.context;
  if (ctx && typeof ctx.text === "function") {
    try {
      const t = await ctx.clone().text();
      try { const j = JSON.parse(t); return j.error || j.message || t; } catch { return t || fallback; }
    } catch { /* ignore */ }
  }
  return (err as Error)?.message || fallback;
}
