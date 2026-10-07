// Real face tracking for a clip, done in the browser on the full-quality source, only over the clip's ranges.
// Output: a small "camera" list the editor pastes verbatim into the ClipCamera helper.
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { assetUrl } from "@/features/hub/api";
import type { ClipSeg } from "./api";

const STEP = 0.25; // seconds between samples
type Face = { id: string; cx: number; cy: number; w: number; h: number; talk: number };
type Rect = [number, number, number, number]; // x, y, w, h as fractions of the source frame
export type CamKey = { t: number; m: "s" | "p" | "w"; a?: Rect; b?: Rect; cut?: 1 };
export type Camera = { keys: CamKey[]; speakers: Record<string, string>; faces_seen: number; samples: number };

let landmarker: Promise<FaceLandmarker> | null = null;
function getLandmarker() {
  landmarker ??= (async () => {
    const fs = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
    return FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", delegate: "GPU" },
      runningMode: "IMAGE", numFaces: 4, outputFaceBlendshapes: true, minFaceDetectionConfidence: 0.4,
    });
  })();
  return landmarker;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export async function trackClip(sourceId: string, segments: ClipSeg[], words: any[], W: number, H: number, onProgress: (p: number) => void): Promise<Camera> {
  const lm = await getLandmarker();
  const v = document.createElement("video");
  v.crossOrigin = "anonymous"; v.muted = true; v.preload = "auto"; v.src = assetUrl(sourceId);
  await new Promise((r, j) => { v.onloadeddata = r; v.onerror = () => j(new Error("Couldn't open the source video for face tracking.")); });
  W = v.videoWidth || W; H = v.videoHeight || H;
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 960 / W);
  canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const tiny = document.createElement("canvas"); tiny.width = 32; tiny.height = 18;
  const tctx = tiny.getContext("2d", { willReadFrequently: true })!;

  const times: { src: number; local: number }[] = [];
  let off = 0;
  for (const s of segments) { for (let t = s.in; t < s.out; t += STEP) times.push({ src: t, local: off + (t - s.in) }); off += s.out - s.in; }

  // 1) detect faces + mouth movement + camera cuts
  type Sample = { local: number; src: number; cut: boolean; faces: Face[] };
  const samples: Sample[] = [];
  const tracks: { id: string; cx: number; cy: number; w: number; jaw: number }[] = [];
  let prevPx: Uint8ClampedArray | null = null, prevLocal = -1;
  for (let i = 0; i < times.length; i++) {
    v.currentTime = times[i].src;
    await new Promise((r) => { v.onseeked = r; });
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    tctx.drawImage(canvas, 0, 0, 32, 18);
    const px = tctx.getImageData(0, 0, 32, 18).data;
    let cut = i === 0 || times[i].local - prevLocal > STEP * 1.5; // segment joins are cuts
    if (prevPx && !cut) { let d = 0; for (let k = 0; k < px.length; k += 4) d += Math.abs(px[k] - prevPx[k]) + Math.abs(px[k + 1] - prevPx[k + 1]); if (d / (32 * 18 * 2) > 28) cut = true; }
    prevPx = px; prevLocal = times[i].local;
    const res = lm.detect(canvas);
    const faces: Face[] = [];
    res.faceLandmarks.forEach((pts, fi) => {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      x0 = clamp(x0, 0, 1); y0 = clamp(y0, 0, 1); x1 = clamp(x1, 0, 1); y1 = clamp(y1, 0, 1);
      const jaw = res.faceBlendshapes?.[fi]?.categories.find((c) => c.categoryName === "jawOpen")?.score ?? 0;
      const f = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
      if (f.w < 0.02) return;
      // stable identity: nearest known person by position + size (podcast angles repeat)
      let best = -1, bd = 0.18;
      tracks.forEach((t, ti) => { const d = Math.hypot(t.cx - f.cx, (t.cy - f.cy) * 0.5) + Math.abs(t.w - f.w); if (d < bd && !faces.some((x) => x.id === t.id)) { bd = d; best = ti; } });
      let talk = 0;
      if (best < 0) { tracks.push({ id: `P${tracks.length + 1}`, ...f, jaw }); best = tracks.length - 1; }
      else { const t = tracks[best]; talk = Math.abs(jaw - t.jaw); Object.assign(t, { cx: t.cx * 0.6 + f.cx * 0.4, cy: t.cy * 0.6 + f.cy * 0.4, w: t.w * 0.6 + f.w * 0.4, jaw }); }
      faces.push({ id: tracks[best].id, ...f, talk });
    });
    samples.push({ local: times[i].local, src: times[i].src, cut, faces });
    onProgress((i + 1) / times.length);
  }
  v.removeAttribute("src"); v.load();

  // 2) which face is which transcript speaker: mouth movement while that speaker's words play
  const score: Record<string, Record<string, number>> = {};
  for (const s of samples) {
    const w = words.find((x) => x.start <= s.src && x.end >= s.src);
    if (!w?.speaker) continue;
    for (const f of s.faces) { (score[w.speaker] ??= {})[f.id] = (score[w.speaker][f.id] || 0) + f.talk + 0.002; }
  }
  const speakers: Record<string, string> = {};
  const used = new Set<string>();
  Object.entries(score).sort((a, b) => Math.max(...Object.values(b[1])) - Math.max(...Object.values(a[1]))).forEach(([spk, m]) => {
    const pick = Object.entries(m).filter(([id]) => !used.has(id)).sort((a, b) => b[1] - a[1])[0];
    if (pick) { speakers[spk] = pick[0]; used.add(pick[0]); }
  });
  const speakerAt = (t: number) => words.find((x) => x.start <= t + 0.15 && x.end >= t - 0.15)?.speaker;

  // 3) decide the camera: follow the speaker, split when two trade lines fast, wide when unsure
  const aspect = W / H;
  const singleW = (9 / 16) / aspect; // full-height 9:16 window width as a fraction of source width
  const singleRect = (f: Face): Rect => {
    const h = clamp(Math.max(f.h * 3.2, 0.55), 0.55, 1), w = Math.min(1, h * singleW);
    return [r3(clamp(f.cx - w / 2, 0, 1 - w)), r3(clamp(f.cy - h * 0.38, 0, 1 - h)), r3(w), r3(h)];
  };
  const splitRect = (f: Face): Rect => {
    const h = clamp(f.h * 2.6, 0.3, 1), w = Math.min(1, h * (9 / 8) / aspect);
    return [r3(clamp(f.cx - w / 2, 0, 1 - w)), r3(clamp(f.cy - h * 0.42, 0, 1 - h)), r3(w), r3(h)];
  };
  const keys: CamKey[] = [];
  let last: CamKey | null = null, lastChange = -99, lastTarget: string | null = null;
  const talkRecent: Record<string, number> = {};
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    for (const k of Object.keys(talkRecent)) talkRecent[k] *= 0.8;
    for (const f of s.faces) talkRecent[f.id] = (talkRecent[f.id] || 0) + f.talk;
    // speaker switches within ±2.5s → two people trading lines
    const near = new Set<string>();
    for (const w of words) if (w.speaker && w.end > s.src - 2.5 && w.start < s.src + 2.5) near.add(w.speaker);
    const spk = speakerAt(s.src);
    const visible = s.faces.filter((f) => f.w > 0.03);
    let target: Face | undefined = spk && speakers[spk] ? visible.find((f) => f.id === speakers[spk]) : undefined;
    target ??= [...visible].sort((a, b) => (talkRecent[b.id] || 0) - (talkRecent[a.id] || 0) || b.w - a.w)[0];
    const others = visible.filter((f) => f.id !== target?.id);
    let key: CamKey;
    if (!target) key = { t: r3(s.local), m: "w" };
    else if (near.size >= 2 && others.length && visible.length <= 3) {
      const pair = [target, others.sort((a, b) => b.w - a.w)[0]].sort((a, b) => a.cx - b.cx);
      key = { t: r3(s.local), m: "p", a: splitRect(pair[0]), b: splitRect(pair[1]) };
    } else key = { t: r3(s.local), m: "s", a: singleRect(target) };
    if (s.cut) key.cut = 1;
    const sig = key.m + (key.m === "p" ? "" : target?.id || "");
    // hold steady: change only on cuts, after 1.2s, or when the face drifts out of the middle of the window
    const drift = last?.a && key.a && key.m === last.m ? Math.abs((key.a[0] + key.a[2] / 2) - (last.a[0] + last.a[2] / 2)) > last.a[2] * 0.18 : true;
    if (!last || s.cut || (sig !== lastTarget && s.local - lastChange >= 1.2) || (sig === lastTarget && drift && s.local - lastChange >= 0.5)) {
      keys.push(key); last = key; lastChange = s.local; lastTarget = sig;
    }
  }
  return { keys, speakers, faces_seen: samples.filter((s) => s.faces.length).length, samples: samples.length };
}

/** Track faces for a clip project and save the camera into project.plan.clip.camera. */
export async function trackProject(project: { id: string; plan: any }, onProgress: (p: number) => void) {
  const { supabase } = await import("@/integrations/supabase/client");
  const db = supabase as any;
  const c = project.plan?.clip;
  if (!c?.source_asset_id) throw new Error("This project isn't a clip.");
  const [{ data: src }, { data: an }] = await Promise.all([
    db.from("assets").select("meta").eq("id", c.source_asset_id).maybeSingle(),
    db.from("asset_analyses").select("report").eq("asset_id", c.source_asset_id).eq("tool", "assembly-transcript").eq("status", "complete").order("created_at", { ascending: false }).limit(1),
  ]);
  const words = an?.[0]?.report?.words || [];
  const camera = await trackClip(c.source_asset_id, c.segments, words, src?.meta?.width || 1920, src?.meta?.height || 1080, onProgress);
  const plan = { ...project.plan, clip: { ...c, camera } };
  const { error } = await db.from("projects").update({ plan }).eq("id", project.id);
  if (error) throw error;
  return camera;
}
