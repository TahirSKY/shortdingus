// Cuts only the chosen ranges out of a (possibly multi-GB) MP4, losslessly (no re-encode).
// Reads the index, then downloads just the bytes of the needed samples via range requests.
// Each range starts at the keyframe before it; `ranges` says where each source second lives in the new file.
import { createFile, DataStream } from "mp4box";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export interface CutRange { a: number; b: number; f: number } // source seconds a..b sit at file second f

async function openUrl(url: string) {
  const head = await fetch(url, { headers: { Range: "bytes=0-0" } });
  const size = Number(head.headers.get("content-range")?.split("/")[1] || 0);
  if (!size) throw new Error("Couldn't read the original video from storage.");
  const real = head.url || url;
  const read = async (s: number, e: number) => {
    for (let i = 0; ; i++) {
      try {
        const r = await fetch(real, { headers: { Range: `bytes=${s}-${e - 1}` } });
        if (!r.ok) throw new Error(`Download failed (${r.status}).`);
        return r.arrayBuffer();
      } catch (err) { if (i >= 3) throw err; await new Promise((z) => setTimeout(z, 1500 * (i + 1))); }
    }
  };
  return { size, read };
}

function description(trak: any) {
  const entry = trak.mdia.minf.stbl.stsd.entries[0];
  const box = entry.avcC || entry.hvcC || entry.esds;
  if (entry.esds) return entry.esds.esd?.descs?.[0]?.descs?.[0]?.data ? new Uint8Array(entry.esds.esd.descs[0].descs[0].data) : undefined;
  const ds = new (DataStream as any)(undefined, 0, (DataStream as any).BIG_ENDIAN);
  box.write(ds);
  return new Uint8Array(ds.buffer, 8);
}

export async function cutClip(url: string, segments: { in: number; out: number }[], onProgress: (p: number) => void) {
  const src = await openUrl(url);
  const mp4: any = createFile();
  let info: any = null, failed: string | null = null;
  mp4.onReady = (i: any) => { info = i; };
  mp4.onError = (e: string) => { failed = e; };
  // Read boxes until the index (moov) is parsed; mp4box tells us where to jump (skips the huge mdat).
  let off = 0;
  while (!info && !failed && off < src.size) {
    const end = Math.min(src.size, off + 2 * 1024 * 1024);
    const buf: any = await src.read(off, end);
    buf.fileStart = off;
    const next = mp4.appendBuffer(buf);
    off = typeof next === "number" && next > off ? next : end;
  }
  if (failed || !info) throw new Error(`Couldn't read this video's index: ${failed || "not found"}`);
  const vt = info.videoTracks?.[0], at = info.audioTracks?.[0];
  if (!vt) throw new Error("No picture track in this video.");
  const vcodec = String(vt.codec).startsWith("avc") ? "avc" : /^(hvc|hev)/.test(vt.codec) ? "hevc" : null;
  if (!vcodec) throw new Error(`Video format ${vt.codec} isn't supported for cutting (needs H.264 or H.265).`);
  if (at && !String(at.codec).startsWith("mp4a")) throw new Error(`Sound format ${at.codec} isn't supported (needs AAC).`);
  const vTrak = mp4.getTrackById(vt.id), aTrak = at ? mp4.getTrackById(at.id) : null;
  const vs: any[] = vTrak.samples, as: any[] = aTrak?.samples || [];
  const vScale = vTrak.mdia.mdhd.timescale, aScale = aTrak?.mdia.mdhd.timescale || 1;
  const W = vt.track_width || vt.video?.width, H = vt.track_height || vt.video?.height;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: vcodec as any, width: W, height: H },
    ...(at ? { audio: { codec: "aac", numberOfChannels: at.audio?.channel_count || 2, sampleRate: at.audio?.sample_rate || 48000 } } : {}),
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  const vMeta = { decoderConfig: { codec: vt.codec, codedWidth: W, codedHeight: H, description: description(vTrak) } };
  const aMeta = at ? { decoderConfig: { codec: at.codec, numberOfChannels: at.audio?.channel_count || 2, sampleRate: at.audio?.sample_rate || 48000, description: description(aTrak) } } : undefined;
  let vSent = false, aSent = false;

  // Merge overlapping/nearby segments, padded so small timing edits still have footage.
  const PAD = 1.5;
  const wins = [...segments].map((s) => ({ a: Math.max(0, s.in - PAD), b: s.out + PAD })).sort((x, y) => x.a - y.a);
  const merged: { a: number; b: number }[] = [];
  for (const w of wins) { const l = merged[merged.length - 1]; if (l && w.a <= l.b + 1) l.b = Math.max(l.b, w.b); else merged.push({ ...w }); }
  const total = merged.reduce((n, w) => n + (w.b - w.a), 0) || 1;

  const fetchSamples = async (list: any[]) => {
    // Coalesce into byte ranges; samples are mostly contiguous inside mdat.
    const sorted = [...list].sort((x, y) => x.offset - y.offset);
    const groups: { s: number; e: number; items: any[] }[] = [];
    for (const x of sorted) {
      const g = groups[groups.length - 1];
      if (g && x.offset - g.e < 512 * 1024 && g.e - g.s < 24 * 1024 * 1024) { g.e = Math.max(g.e, x.offset + x.size); g.items.push(x); }
      else groups.push({ s: x.offset, e: x.offset + x.size, items: [x] });
    }
    const data = new Map<any, Uint8Array>();
    for (const g of groups) {
      const buf = new Uint8Array(await src.read(g.s, g.e));
      for (const x of g.items) data.set(x, buf.subarray(x.offset - g.s, x.offset - g.s + x.size));
    }
    return data;
  };

  const ranges: CutRange[] = [];
  let T = 0, done = 0;
  for (const w of merged) {
    // Start at the last keyframe at/before w.a (presentation time).
    let k = 0;
    for (let i = 0; i < vs.length; i++) { if (vs[i].cts / vScale > w.a) break; if (vs[i].is_sync) k = i; }
    let e = k;
    while (e < vs.length && vs[e].dts / vScale <= w.b) e++;
    const vList = vs.slice(k, e);
    if (!vList.length) continue;
    const start = vList[0].cts / vScale;
    const end = Math.max(...vList.map((x) => (x.cts + x.duration) / vScale));
    const aList = as.filter((x) => x.cts / aScale >= start && x.cts / aScale < end);
    const data = await fetchSamples([...vList, ...aList]);
    // Interleave by time so the muxer gets ordered input.
    const items = [
      ...vList.map((x) => ({ x, v: true, t: x.dts / vScale })),
      ...aList.map((x) => ({ x, v: false, t: x.cts / aScale })),
    ].sort((p, q) => p.t - q.t);
    for (const { x, v } of items) {
      if (v) {
        const pts = (T + (x.cts / vScale - start)) * 1e6;
        const cto = ((x.cts - x.dts) / vScale) * 1e6;
        muxer.addVideoChunkRaw(data.get(x)!, x.is_sync ? "key" : "delta", Math.max(0, pts), (x.duration / vScale) * 1e6, vSent ? undefined : (vMeta as any), cto);
        vSent = true;
      } else {
        const ts = (T + (x.cts / aScale - start)) * 1e6;
        muxer.addAudioChunkRaw(data.get(x)!, "key", ts, (x.duration / aScale) * 1e6, aSent ? undefined : (aMeta as any));
        aSent = true;
      }
    }
    ranges.push({ a: start, b: end, f: T });
    T += end - start;
    done += w.b - w.a;
    onProgress(Math.min(0.99, done / total));
  }
  if (!vSent) throw new Error("Nothing to cut — the clip ranges are outside the video.");
  muxer.finalize();
  onProgress(1);
  return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), ranges, duration: T, width: W, height: H };
}
