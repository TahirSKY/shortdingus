/**
 * whiteboard-animate – Turn images into hand-drawn whiteboard animation.
 *
 * Image(s) in → ready-to-render Remotion composition out, saved as a project
 * code asset. The clip renders through the normal render-video flow, so agents
 * and the editor can stitch whiteboard clips into bigger videos.
 *
 * POST body (single image):
 *   { assetId?: string, imageUrl?: string, projectId: string, title?: string,
 *     duration?: number, drawSpeed?: number, voiceoverAssetId?: string,
 *     colorAssetId?: string, hand?: boolean }
 *
 * POST body (multi-scene short):
 *   { scenes: [{ assetId: string, duration?: number, start?: number }], projectId: string,
 *     title?: string, voiceoverAssetId?: string,  // paces scenes + adds audio
 *     captions?: boolean,                          // word-timed captions from the voiceover transcript
 *     format?: "vertical" | "horizontal", hand?: boolean }
 *
 * Returns { assetId, strokes, duration, width, height, name }.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { decode, Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { traceCenterlines, type Pt, type Stroke, type Traced } from "./centerline.ts";
import { admin, assetUrl, cors, isUuid, json, safeName } from "../_shared/hub.ts";
import { HAND_PNG_B64, HAND_TIP } from "../_shared/whiteboard-hand.ts";

const TRACE_MAX = 900; // longest side for tracing

/** Preprocess: grayscale, autocontrast, threshold → ink mask, then centre-line trace. */
async function traceBytes(bytes: Uint8Array): Promise<Traced> {
  const img = await decode(bytes);
  if (!(img instanceof Image)) throw new Error("Animated images are not supported.");
  const scale = Math.min(1, TRACE_MAX / Math.max(img.width, img.height));
  if (scale < 1) img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
  const b = img.bitmap as unknown as Uint8ClampedArray;
  const n = img.width * img.height;
  const gray = new Uint8Array(n);
  let mn = 255, mx = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const a = b[i + 3] / 255; // composite onto white
    const g = Math.round((0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]) * a + 255 * (1 - a));
    gray[p] = g;
    if (g < mn) mn = g;
    if (g > mx) mx = g;
  }
  const spread = Math.max(1, mx - mn);
  const thr = Math.max(90, Math.min(200, mn + spread * 0.55));
  const ink = new Uint8Array(n);
  for (let p = 0; p < n; p++) ink[p] = (((gray[p] - mn) / spread) * 255) < thr ? 1 : 0;
  return traceCenterlines(ink, img.width, img.height);
}

async function traceAsset(db: ReturnType<typeof admin>, assetId: string): Promise<Traced> {
  const { data: asset } = await db.from("assets").select("id, name, kind").eq("id", assetId).maybeSingle();
  if (!asset) throw new Error(`Unknown image asset ${assetId}.`);
  if (asset.kind !== "image") throw new Error(`${asset.name} is not an image.`);
  // Freshly generated images may still be uploading (asset-url answers 409/404): wait and retry up to ~60s.
  let res = await fetch(assetUrl(asset.id));
  for (let i = 0; !res.ok && [404, 409, 425, 502, 503].includes(res.status) && i < 12; i++) {
    await res.body?.cancel();
    await new Promise((r) => setTimeout(r, 5000));
    res = await fetch(assetUrl(asset.id));
  }
  if (!res.ok) throw new Error(`Could not download ${asset.name} (${res.status}) after waiting for it to finish uploading.`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const traced = await traceBytes(bytes);
  if (!traced.strokes.length) throw new Error(`No drawable lines found in ${asset.name} — use clear dark lines on a light background.`);
  return traced;
}

const roundTraces = (strokes: Stroke[]) =>
  strokes.map((s) => ({
    points: s.points.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]),
    length: Math.round(s.length * 100) / 100,
  }));

const SHARED_HELPERS = `
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{const p=clamp(x);return p*p*(3-2*p);};
const mix=(a,b,p)=>a+(b-a)*p;
const enrich=s=>{let lengths=[0];for(let i=1;i<s.points.length;i++)lengths.push(lengths[i-1]+Math.hypot(s.points[i][0]-s.points[i-1][0],s.points[i][1]-s.points[i-1][1]));return {...s,length:lengths[lengths.length-1],lengths};};
const geometry=ss=>{let total=0;return {strokes:ss.map(s=>{const p=enrich(s);const out={...p,offset:total};total+=p.length;return out;}),total};};
const locate=(s,d)=>{const v=clamp(d,0,s.length);for(let i=1;i<s.points.length;i++){if(s.lengths[i]>=v){const p=(v-s.lengths[i-1])/Math.max(.0001,s.lengths[i]-s.lengths[i-1]);return [mix(s.points[i-1][0],s.points[i][0],p),mix(s.points[i-1][1],s.points[i][1],p)];}}return s.points[s.points.length-1];};
const escapeXml=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function svgMarkup(node){if(node==null||node===false)return '';if(Array.isArray(node))return node.map(svgMarkup).join('');if(typeof node!=='object')return escapeXml(node);if(node.type===React.Fragment)return svgMarkup(node.props.children);if(typeof node.type==='function')return svgMarkup(node.type(node.props));const attrs=Object.entries(node.props).filter(([k,v])=>k!=='children'&&k!=='key'&&v!=null).map(([k,v])=>\` \${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()).replace('view-box','viewBox').replace('path-length','pathLength')}="\${escapeXml(v)}"\`).join('');return \`<\${node.type}\${attrs}>\${svgMarkup(node.props.children)}</\${node.type}>\`;}
`;

function markerCode(width: number): string {
  const handScale = Math.max(0.22, Math.min(0.4, width / 4800));
  const tipX = HAND_TIP.x * handScale, tipY = HAND_TIP.y * handScale, handPx = HAND_TIP.size * handScale;
  return `function Marker({x,y}) {return <g transform={\`translate(\${x} \${y})\`}>
 <image href={HAND_EMBEDDED} x={${-tipX}} y={${-tipY}} width={${handPx}} height={${handPx}}/>
 </g>;}`;
}

/** Build the self-contained Remotion composition for one traced drawing. */
function buildCode(opts: {
  strokes: Stroke[]; traceW: number; traceH: number;
  width: number; height: number; fps: number; duration: number;
  hand: boolean; voice?: string | null; colorArt?: string | null; title: string;
  penWidth?: number; hold?: number;
}): string {
  const { width, height, fps, duration } = opts;
  const hold = opts.hold ?? 0;
  const margin = Math.round(Math.min(width, height) * 0.08);
  const scale = Math.min((width - margin * 2) / opts.traceW, (height - margin * 2) / opts.traceH);
  const ox = Math.round((width - opts.traceW * scale) / 2);
  const oy = Math.round((height - opts.traceH * scale) / 2);
  const frames = Math.round(duration * fps);
  return `/* REMOTION_CONFIG { "fps": ${fps}, "durationInFrames": ${frames}, "width": ${width}, "height": ${height} } */
import React from 'react';
import {AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig} from 'remotion';
const HAND_EMBEDDED = "data:image/png;base64,${HAND_PNG_B64}";
const VOICE = ${opts.voice ? `"${opts.voice}"` : "null"};
const COLOR_ART = ${opts.colorArt ? `"${opts.colorArt}"` : "null"};
const TRACES = ${JSON.stringify(roundTraces(opts.strokes))};
const BOARD = {x: ${ox}, y: ${oy}, scale: ${scale}};
${SHARED_HELPERS}
const G=geometry(TRACES);
${markerCode(width)}
function Draw({t,duration,hand}){const p=clamp(t/duration),dist=G.total*p;const active=G.strokes.find(s=>dist>=s.offset&&dist<s.offset+s.length);const pen=active?locate(active,dist-active.offset):null;
 return <g transform={\`translate(\${BOARD.x} \${BOARD.y}) scale(\${BOARD.scale})\`}>{G.strokes.map((s,i)=>{const amount=clamp(dist-s.offset,0,s.length);if(!amount)return null;return <polyline key={i} points={s.points.map(p=>p.join(',')).join(' ')} pathLength={s.length} fill="none" stroke="#202829" strokeWidth={${Math.max(2, (opts.penWidth ?? 3)).toFixed(2)}} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={\`\${s.length} \${s.length}\`} strokeDashoffset={s.length-amount}/>;})}{hand&&pen&&p>0&&p<1?<Marker x={pen[0]} y={pen[1]}/>:null}</g>;}
export default function WhiteboardClip(){const f=useCurrentFrame(),{fps}=useVideoConfig(),t=f/fps;
 const drawEnd=${Math.max(0.5, duration - hold - (opts.colorArt && !hold ? 1.2 : 0)).toFixed(2)};
 // The finished artwork settles in over the traced lines so tiny details (dots, fills) end exact.
 const color=COLOR_ART?ease((t-drawEnd+.15)/.6):0;
 const svg=<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#ffffff"/><Draw t={t} duration={drawEnd} hand={${opts.hand}}/></svg>;
 return <AbsoluteFill style={{backgroundColor:'#ffffff'}}>{VOICE?<Audio src={VOICE}/>:null}<Img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgMarkup(svg))} style={{width:'100%',height:'100%',opacity:1-color*.999}}/>{COLOR_ART&&color>0?<Img src={COLOR_ART} style={{position:'absolute',left:BOARD.x,top:BOARD.y,width:${Math.round(opts.traceW * scale)},height:${Math.round(opts.traceH * scale)},opacity:color}}/>:null}</AbsoluteFill>;
}
`;
}

/** Build one composition that draws several scenes in sequence, paced to a voiceover. */
function buildScenesCode(opts: {
  scenes: { traced: Traced; start: number; end: number }[];
  width: number; height: number; fps: number; duration: number;
  hand: boolean; voice?: string | null; captions: { start: number; end: number; text: string }[];
  title: string;
}): string {
  const { width, height, fps, duration } = opts;
  const margin = Math.round(Math.min(width, height) * 0.07);
  const captionBand = opts.captions.length ? Math.round(height * 0.12) : 0;
  const scenes = opts.scenes.map((s) => {
    const scale = Math.min((width - margin * 2) / s.traced.width, (height - margin * 2 - captionBand) / s.traced.height);
    return {
      traces: roundTraces(s.traced.strokes),
      board: {
        x: Math.round((width - s.traced.width * scale) / 2),
        y: Math.round((height - captionBand - s.traced.height * scale) / 2),
        scale,
      },
      start: Math.round(s.start * 100) / 100,
      end: Math.round(s.end * 100) / 100,
      strokeWidth: Math.round(Math.max(2, s.traced.penWidth) * 100) / 100,
    };
  });
  const frames = Math.round(duration * fps);
  return `/* REMOTION_CONFIG { "fps": ${fps}, "durationInFrames": ${frames}, "width": ${width}, "height": ${height} } */
import React from 'react';
import {AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig} from 'remotion';
const HAND_EMBEDDED = "data:image/png;base64,${HAND_PNG_B64}";
const VOICE = ${opts.voice ? `"${opts.voice}"` : "null"};
const SCENES = ${JSON.stringify(scenes)};
const CAPTIONS = ${JSON.stringify(opts.captions)};
${SHARED_HELPERS}
const GS=SCENES.map(s=>({...s,g:geometry(s.traces)}));
${markerCode(width)}
function Scene({s,t,hand}){const local=t-s.start,p=clamp(local/(s.end-s.start-.3)),dist=s.g.total*p;const active=s.g.strokes.find(st=>dist>=st.offset&&dist<st.offset+st.length);const pen=active?locate(active,dist-active.offset):null;
 const fadeIn=ease(local/.35),fadeOut=1-ease((t-(s.end-.25))/.25);
 return <g opacity={Math.min(fadeIn,fadeOut)}><g transform={\`translate(\${s.board.x} \${s.board.y}) scale(\${s.board.scale})\`}>{s.g.strokes.map((st,i)=>{const amount=clamp(dist-st.offset,0,st.length);if(!amount)return null;return <polyline key={i} points={st.points.map(p=>p.join(',')).join(' ')} pathLength={st.length} fill="none" stroke="#202829" strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={\`\${st.length} \${st.length}\`} strokeDashoffset={st.length-amount}/>;})}{hand&&pen&&p>0&&p<1?<Marker x={pen[0]} y={pen[1]}/>:null}</g></g>;}
export default function WhiteboardShort(){const f=useCurrentFrame(),{fps}=useVideoConfig(),t=f/fps;
 const caption=CAPTIONS.find(c=>t>=c.start&&t<=c.end+.15);
 const svg=<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#ffffff"/>{GS.map((s,i)=>t>=s.start-.01&&t<=s.end+.01?<Scene key={i} s={s} t={t} hand={${opts.hand}}/>:null)}{caption?<text x={${width / 2}} y={${height - Math.round(height * 0.055)}} textAnchor="middle" fill="#202829" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="${Math.round(width * 0.042)}">{caption.text}</text>:null}<rect x="${margin}" y="${height - 24}" width={${width - margin * 2}*clamp(t/${duration.toFixed(2)})} height="6" rx="3" fill="#12aeaa"/></svg>;
 return <AbsoluteFill style={{backgroundColor:'#ffffff'}}>{VOICE?<Audio src={VOICE}/>:null}<Img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgMarkup(svg))} style={{width:'100%',height:'100%'}}/></AbsoluteFill>;
}
`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let p: any;
  try { p = await req.json(); } catch { return json({ error: "Body must be JSON." }, 400); }

  const projectId = String(p.projectId || "");
  if (!isUuid(projectId)) return json({ error: "projectId is required." }, 400);
  const db = admin();
  const { data: project } = await db.from("projects").select("id, group_id, name").eq("id", projectId).maybeSingle();
  if (!project) return json({ error: "Unknown project." }, 404);

  const voice = isUuid(String(p.voiceoverAssetId || "")) ? String(p.voiceoverAssetId) : null;
  const hand = p.hand !== false;
  const fps = 30;

  // ---- Multi-scene mode ----
  if (Array.isArray(p.scenes) && p.scenes.length) {
    const sceneInputs = p.scenes.slice(0, 12);
    for (const s of sceneInputs) {
      if (!isUuid(String(s?.assetId || ""))) return json({ error: "Each scene needs an image assetId." }, 400);
    }
    let tracedScenes: Traced[];
    try {
      tracedScenes = [];
      for (const s of sceneInputs) tracedScenes.push(await traceAsset(db, String(s.assetId)));
    } catch (e) {
      return json({ error: `Tracing failed: ${(e as Error).message}` }, 422);
    }

    // Total duration: voiceover length wins, then explicit durations, then stroke-length pacing.
    let voiceDuration: number | null = null;
    let captions: { start: number; end: number; text: string }[] = [];
    if (voice) {
      const { data: va } = await db.from("assets").select("duration_seconds").eq("id", voice).maybeSingle();
      voiceDuration = Number(va?.duration_seconds) || null;
      if (p.captions !== false) {
        const { data: an } = await db.from("asset_analyses").select("report").eq("asset_id", voice).eq("tool", "assembly-transcript").eq("status", "complete").order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lines = an?.report?.caption_lines;
        if (Array.isArray(lines)) captions = lines.map((l: any) => ({ start: Number(l.start), end: Number(l.end), text: String(l.text) })).filter((l) => l.text && isFinite(l.start) && isFinite(l.end));
      }
    }
    const weights = tracedScenes.map((t) => t.strokes.reduce((a, s) => a + s.length, 0));
    const explicit = sceneInputs.map((s: any) => Number(s.duration) || 0);
    const explicitTotal = explicit.reduce((a: number, b: number) => a + b, 0);
    const total = voiceDuration || explicitTotal || Math.max(3, Math.min(120, weights.reduce((a, b) => a + b, 0) / (Number(p.drawSpeed) || 1200)));
    // Optional explicit start times (seconds, e.g. from transcript word timings) win over pacing.
    const starts = sceneInputs.map((s: any) => (s.start === undefined || s.start === null ? NaN : Number(s.start)));
    if (starts.every((v: number) => isFinite(v) && v >= 0)) {
      const end = voiceDuration || explicitTotal || Math.max(...starts) + 6;
      const order = tracedScenes.map((traced, i) => ({ traced, start: starts[i] })).sort((a, b) => a.start - b.start);
      order[0].start = 0;
      const timed = order.map((o, i) => ({ traced: o.traced, start: o.start, end: i + 1 < order.length ? order[i + 1].start : end }));
      explicit.splice(0, explicit.length, ...timed.map((t) => t.end - t.start));
      tracedScenes.splice(0, tracedScenes.length, ...timed.map((t) => t.traced));
      weights.splice(0, weights.length, ...explicit);
    }
    let at = 0;
    const scenes = tracedScenes.map((traced, i) => {
      const share = explicit[i] || total * (weights[i] / weights.reduce((a, b) => a + b, 0));
      const start = at;
      at += share;
      return { traced, start, end: Math.min(at, total) };
    });
    const duration = Math.max(at, total);

    const vertical = String(p.format || "").toLowerCase() === "vertical" ||
      (!p.format && tracedScenes.filter((t) => t.height > t.width).length > tracedScenes.length / 2);
    const width = vertical ? 1080 : 1920;
    const height = vertical ? 1920 : 1080;
    const title = String(p.title || "Whiteboard short").slice(0, 120);

    const code = buildScenesCode({ scenes, width, height, fps, duration, hand, voice: voice ? assetUrl(voice) : null, captions, title });
    const { data: prev } = await db.from("assets").select("meta").eq("project_id", projectId).eq("kind", "code").order("created_at", { ascending: false }).limit(1);
    const version = (Number(prev?.[0]?.meta?.version) || 0) + 1;
    const name = `${safeName(title)}-v${version}.tsx`;
    const { data: saved, error } = await db.from("assets").insert({
      group_id: project.group_id, project_id: projectId, kind: "code", role: "code",
      name, inline_content: code, mime_type: "text/plain", size_bytes: new TextEncoder().encode(code).byteLength,
      duration_seconds: Math.round(duration * 100) / 100,
      meta: { version, source: "whiteboard-animate", scenes: scenes.length, strokes: tracedScenes.reduce((a, t) => a + t.strokes.length, 0), duration: Math.round(duration * 100) / 100, width, height, scene_asset_ids: sceneInputs.map((s: any) => String(s.assetId)), ...(voice ? { voiceover_asset_id: voice } : {}) },
    }).select("id").single();
    if (error) return json({ error: `Could not save: ${error.message}` }, 500);
    return json({
      assetId: saved.id, name, version, scenes: scenes.length,
      strokes: tracedScenes.reduce((a, t) => a + t.strokes.length, 0),
      duration: Math.round(duration * 100) / 100, width, height, captions: captions.length,
      note: "Render this code asset through the normal render-video flow.",
    }, 201);
  }

  // ---- Single-image mode ----
  let bytes: Uint8Array | null = null;
  let sourceName = "image";
  let sourceAssetId: string | null = null;
  if (isUuid(String(p.assetId || ""))) {
    sourceAssetId = String(p.assetId);
    const { data: asset } = await db.from("assets").select("id, name, kind").eq("id", sourceAssetId).maybeSingle();
    if (!asset) return json({ error: "Unknown image asset." }, 404);
    if (asset.kind !== "image") return json({ error: "assetId must be an image asset." }, 400);
    sourceName = asset.name || sourceName;
    const res = await fetch(assetUrl(asset.id));
    if (!res.ok) return json({ error: `Could not download the image (${res.status}).` }, 502);
    bytes = new Uint8Array(await res.arrayBuffer());
  } else if (p.imageUrl) {
    const res = await fetch(String(p.imageUrl));
    if (!res.ok) return json({ error: `Could not download imageUrl (${res.status}).` }, 502);
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    return json({ error: "Provide assetId, imageUrl, or scenes." }, 400);
  }

  let traced: Traced;
  try {
    traced = await traceBytes(bytes);
  } catch (e) {
    return json({ error: `Tracing failed: ${(e as Error).message}` }, 422);
  }
  if (!traced.strokes.length) return json({ error: "No drawable lines found — use an image with clear dark lines on a light background." }, 422);

  const totalLen = traced.strokes.reduce((a, s) => a + s.length, 0);
  const drawSpeed = Math.max(200, Math.min(4000, Number(p.drawSpeed) || 1200));
  const duration = Math.max(3, Math.min(60, Number(p.duration) || totalLen / drawSpeed));
  const landscape = traced.width >= traced.height;
  const width = landscape ? 1920 : 1080;
  const height = landscape ? 1080 : 1920;

  const colorArt = isUuid(String(p.colorAssetId || "")) ? assetUrl(String(p.colorAssetId)) : null;
  const title = String(p.title || `Whiteboard — ${sourceName}`).slice(0, 120);

  const code = buildCode({
    strokes: traced.strokes, traceW: traced.width, traceH: traced.height,
    width, height, fps, duration, hand, voice: voice ? assetUrl(voice) : null, colorArt, title,
  });

  const { data: prev } = await db.from("assets").select("meta").eq("project_id", projectId).eq("kind", "code").order("created_at", { ascending: false }).limit(1);
  const version = (Number(prev?.[0]?.meta?.version) || 0) + 1;
  const { data: saved, error } = await db.from("assets").insert({
    group_id: project.group_id, project_id: projectId, kind: "code", role: "code",
    name: `${safeName(title)}-v${version}.tsx`, inline_content: code,
    mime_type: "text/plain", size_bytes: new TextEncoder().encode(code).byteLength,
    duration_seconds: Math.round(duration * 100) / 100,
    meta: { version, source: "whiteboard-animate", strokes: traced.strokes.length, duration, width, height, ...(sourceAssetId ? { source_asset_id: sourceAssetId } : {}) },
  }).select("id").single();
  if (error) return json({ error: `Could not save: ${error.message}` }, 500);

  return json({
    assetId: saved.id, name: `${safeName(title)}-v${version}.tsx`, version,
    strokes: traced.strokes.length, duration: Math.round(duration * 100) / 100, width, height,
    note: "Render this code asset through the normal render-video flow.",
  }, 201);
});
