import { admin, assetUrl, safeName } from "../_shared/hub.ts";

export async function runSerialQueue(db: ReturnType<typeof admin>, build: (payload: any) => Promise<{ code: string; meta: Record<string, unknown>; name: string; vertical: boolean }>, budget = 24) {
  const owner = crypto.randomUUID();
  const { data: claimed, error } = await db.rpc("claim_whiteboard_worker", { worker: owner });
  if (error) throw new Error(error.message);
  if (!claimed) return;
  const until = Date.now() + 48000;
  const post = async (fn: string, body: unknown) => {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `${fn} failed (${res.status})`);
    return data;
  };
  try {
    while (Date.now() < until) {
      const { data: job } = await db.from("whiteboard_jobs").select("*").in("status", ["queued", "running"]).order("created_at").limit(1).maybeSingle();
      if (!job) break;
      try {
        let code = job.code;
        if (!code) {
          const built = await build(job.payload);
          code = built.code;
          const saved = await db.from("whiteboard_jobs").update({ code, status: "running" }).eq("id", job.id);
          if (saved.error) throw saved.error;
          await db.from("assets").update({ name: built.name, duration_seconds: Number(built.meta.draw_seconds) + Number(built.meta.hold_seconds), meta: { ...built.meta, creating: true, whiteboard_status: "rendering" } }).eq("id", job.clip_id);
        }
        await db.rpc("claim_whiteboard_worker", { worker: owner });
        let renderId = job.render_id, bucket = job.bucket_name;
        if (!renderId) {
          const started = await post("render-video", { code, format: job.payload.format === "horizontal" ? "youtube" : "tiktok" });
          renderId = started.renderId; bucket = started.bucketName;
          const saved = await db.from("whiteboard_jobs").update({ render_id: renderId, bucket_name: bucket, status: "running" }).eq("id", job.id);
          if (saved.error) throw saved.error;
        }
        const progress = await post("check-render-progress", { renderId, bucketName: bucket });
        if (progress.fatal) throw new Error(progress.errors?.[0]?.message || "Drawing render failed.");
        if (progress.done && progress.outputFile) {
          const res = await fetch(progress.outputFile);
          if (!res.ok) throw new Error(`Could not save drawing MP4 (${res.status}).`);
          const bytes = new Uint8Array(await res.arrayBuffer());
          const { data: asset } = await db.from("assets").select("name,meta").eq("id", job.clip_id).single();
          const path = `groups/${job.payload.slug}/${job.clip_id}-${safeName(asset?.name || "drawing.mp4")}`;
          const up = await db.storage.from("hub-media").upload(path, bytes, { contentType: "video/mp4", upsert: true });
          if (up.error) throw up.error;
          const saved = await db.from("assets").update({ storage_path: path, size_bytes: bytes.length, meta: { ...asset?.meta, creating: false, whiteboard_status: "ready" } }).eq("id", job.clip_id);
          if (saved.error) throw saved.error;
          await db.from("whiteboard_jobs").update({ status: "done" }).eq("id", job.id);
        } else await new Promise(r => setTimeout(r, 10000));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const attempts = Number(job.payload.attempts || 0) + 1;
        if (/concurrency|rate exceeded|429|too many/i.test(message) && attempts < 6) {
          await db.from("whiteboard_jobs").update({ payload: { ...job.payload, attempts } }).eq("id", job.id);
          await new Promise(r => setTimeout(r, 15000));
          continue;
        }
        const { data: asset } = await db.from("assets").select("meta").eq("id", job.clip_id).maybeSingle();
        await db.from("assets").update({ meta: { ...asset?.meta, creating: false, whiteboard_status: "error", error: message } }).eq("id", job.clip_id);
        await db.from("whiteboard_jobs").update({ status: "error", error: message }).eq("id", job.id);
      }
    }
  } finally {
    await db.from("whiteboard_worker_lease").delete().eq("id", 1).eq("owner", owner);
  }
  const { data: remaining } = await db.from("whiteboard_jobs").select("id").in("status", ["queued", "running"]).limit(1);
  if (remaining?.length && budget > 0) {
    await new Promise(r => setTimeout(r, 1500));
    await post("whiteboard-animate", { action: "resume", workerToken: Deno.env.get("HUB_WRITE_TOKEN"), budget: budget - 1 });
  }
}