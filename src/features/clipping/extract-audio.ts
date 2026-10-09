// Copies the sound track out of a (possibly multi-GB) MP4 without re-encoding, so renders
// can play audio from a small file while the picture streams from the original.
import { createFile } from "mp4box";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

const CHUNK = 16 * 1024 * 1024;

type Reader = { size: number; read: (start: number, end: number) => Promise<ArrayBuffer> };

function fileReader(file: File): Reader {
  return { size: file.size, read: (s, e) => file.slice(s, e).arrayBuffer() };
}

async function urlReader(url: string): Promise<Reader> {
  const head = await fetch(url, { headers: { Range: "bytes=0-0" } });
  let size = Number(head.headers.get("content-range")?.split("/")[1] || 0);
  // Content-Range is often hidden cross-origin; Content-Length on a HEAD always is visible.
  if (!size) size = Number((await fetch(head.url || url, { method: "HEAD" })).headers.get("content-length") || 0);
  if (!size) throw new Error("Couldn't read the original video from storage.");
  return {
    size,
    read: async (s, e) => {
      const r = await fetch(head.url || url, { headers: { Range: `bytes=${s}-${e - 1}` } });
      if (!r.ok) throw new Error(`Download failed (${r.status}).`);
      return r.arrayBuffer();
    },
  };
}

export async function extractAudio(source: File | string, onProgress: (p: number) => void): Promise<Blob> {
  const reader = typeof source === "string" ? await urlReader(source) : fileReader(source);
  const mp4: any = createFile();
  let muxer: Muxer<ArrayBufferTarget> | null = null;
  let config: any = null;
  let failed: Error | null = null;
  let first: number | null = null;

  mp4.onError = (e: string) => { failed = new Error(`Couldn't read this video: ${e}`); };
  mp4.onReady = (info: any) => {
    const t = info.audioTracks?.[0];
    if (!t) { failed = new Error("This video has no sound track."); return; }
    if (!String(t.codec).startsWith("mp4a")) { failed = new Error(`Sound format ${t.codec} isn't supported yet (needs AAC).`); return; }
    const trak = mp4.getTrackById(t.id);
    const desc = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0]?.esds?.esd?.descs?.[0]?.descs?.[0]?.data;
    const channels = t.audio?.channel_count || 2, rate = t.audio?.sample_rate || 48000;
    config = { codec: t.codec, numberOfChannels: channels, sampleRate: rate, description: desc ? new Uint8Array(desc) : undefined };
    muxer = new Muxer({ target: new ArrayBufferTarget(), audio: { codec: "aac", numberOfChannels: channels, sampleRate: rate }, fastStart: "in-memory", firstTimestampBehavior: "offset" });
    mp4.setExtractionOptions(t.id, null, { nbSamples: 2000 });
    mp4.start();
  };
  let sentMeta = false;
  mp4.onSamples = (id: number, _u: unknown, samples: any[]) => {
    for (const s of samples) {
      if (first === null) first = s.cts;
      const ts = ((s.cts - first) / s.timescale) * 1e6, dur = (s.duration / s.timescale) * 1e6;
      muxer!.addAudioChunkRaw(new Uint8Array(s.data), "key", ts, dur, sentMeta ? undefined : { decoderConfig: config });
      sentMeta = true;
    }
    mp4.releaseUsedSamples(id, samples[samples.length - 1].number);
  };

  let offset = 0;
  while (offset < reader.size && !failed) {
    const end = Math.min(reader.size, offset + CHUNK);
    const buf: any = await reader.read(offset, end);
    buf.fileStart = offset;
    const next = mp4.appendBuffer(buf);
    offset = typeof next === "number" && next !== offset ? next : end;
    onProgress(Math.min(0.99, offset / reader.size));
  }
  mp4.flush();
  if (failed) throw failed;
  if (!muxer || !sentMeta) throw new Error("No sound found in this video.");
  (muxer as Muxer<ArrayBufferTarget>).finalize();
  onProgress(1);
  return new Blob([(muxer as Muxer<ArrayBufferTarget>).target.buffer], { type: "audio/mp4" });
}
