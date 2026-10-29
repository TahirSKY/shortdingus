/**
 * whiteboard-animate – Turn any image into a hand-drawn whiteboard animation.
 *
 * Image in → ready-to-render Remotion composition out, saved as a project code
 * asset. The clip renders through the normal render-video flow, so agents and
 * the editor can stitch whiteboard clips into bigger videos.
 *
 * POST body:
 *   { assetId?: string,        // image asset in the hub (or imageUrl)
 *     imageUrl?: string,       // direct image URL
 *     projectId: string,       // project that owns the generated clip
 *     title?: string,          // asset name
 *     duration?: number,       // seconds; default derived from stroke length
 *     drawSpeed?: number,      // px/s at board scale (default 1200)
 *     voiceoverAssetId?: string, // optional audio asset to play under the clip
 *     colorAssetId?: string,   // optional image asset faded in at the end ("color payoff")
 *     hand?: boolean }         // show the pencil hand (default true)
 *
 * Returns { assetId, strokes, duration, width, height, name }.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { decode, Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import potrace from "npm:potrace@2.1.8";
import { Buffer } from "node:buffer";
import { admin, assetUrl, cors, isUuid, json, safeName } from "../_shared/hub.ts";
import { HAND_PNG_B64, HAND_TIP } from "../_shared/whiteboard-hand.ts";

const TRACE_MAX = 900; // longest side for tracing
const MIN_STROKE = 15; // drop specks shorter than this (px, trace space)
const MAX_STROKES = 500;

type Pt = [number, number];
type Stroke = { points: Pt[]; length: number };

/** Preprocess: grayscale, autocontrast, threshold to clean black-on-white line art. */
async function toLineArt(bytes: Uint8Array): Promise<Uint8Array> {
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
  // Autocontrast, then threshold slightly above mid-ink so pencil-grey lines survive.
  const spread = Math.max(1, mx - mn);
  const thr = Math.max(90, Math.min(200, mn + spread * 0.55));
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const v = Math.round(((gray[p] - mn) / spread) * 255);
    const ink = v < thr ? 0 : 255;
    b[i] = b[i + 1] = b[i + 2] = ink;
    b[i + 3] = 255;
  }
  return img.encode(); // PNG
}

/** Flatten one potrace subpath string into a polyline. */
function flattenPath(d: string): Pt[] {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  const pts: Pt[] = [];
  let cur: Pt = [0, 0];
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++].toUpperCase();
    if (cmd === "M") {
      cur = [num(), num()];
      pts.push(cur);
    } else if (cmd === "L") {
      cur = [num(), num()];
      pts.push(cur);
    } else if (cmd === "C") {
      const c1: Pt = [num(), num()];
      const c2: Pt = [num(), num()];
      const end: Pt = [num(), num()];
      const from = cur;
      for (let s = 1; s <= 6; s++) {
        const t = s / 6, u = 1 - t;
        pts.push([
          u * u * u * from[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
          u * u * u * from[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
        ]);
      }
      cur = end;
    } else if (cmd === "Z") {
      if (pts.length) pts.push(pts[0]);
    }
  }
  return pts;
}

function traceStrokes(png: Uint8Array): Promise<{ strokes: Stroke[]; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    potrace.trace(Buffer.from(png), { threshold: 128, turdSize: 24, optiTolerance: 0.5 }, (err: Error | null, svg: string) => {
      if (err) return reject(err);
      const vb = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
      const w = Number(vb?.[1] || svg.match(/width="([\d.]+)/)?.[1] || 0);
      const h = Number(vb?.[2] || svg.match(/height="([\d.]+)/)?.[1] || 0);
      const strokes: Stroke[] = [];
      for (const m of svg.matchAll(/d="([^"]+)"/g)) {
        // Each path may hold several subpaths; split on M.
        for (const sub of m[1].split(/(?=M)/)) {
          const points = flattenPath(sub);
          if (points.length < 2) continue;
          let length = 0;
          for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
          if (length >= MIN_STROKE) strokes.push({ points, length });
        }
      }
      // Keep the longest strokes, then order by nearest-neighbour travel.
      strokes.sort((a, b) => b.length - a.length);
      const kept = strokes.slice(0, MAX_STROKES);
      const ordered: Stroke[] = [];
      let at: Pt = [0, 0];
      const pool = kept.slice();
      while (pool.length) {
        let best = 0, bd = Infinity;
        for (let i = 0; i < pool.length; i++) {
          const d = Math.hypot(pool[i].points[0][0] - at[0], pool[i].points[0][1] - at[1]);
          if (d < bd) { bd = d; best = i; }
        }
        const s = pool.splice(best, 1)[0];
        ordered.push(s);
        at = s.points[s.points.length - 1];
      }
      resolve({ strokes: ordered, width: w, height: h });
    });
  });
}

/** Build the self-contained Remotion composition for the traced drawing. */
function buildCode(opts: {
  strokes: Stroke[]; traceW: number; traceH: number;
  width: number; height: number; fps: number; duration: number;
  hand: boolean; voice?: string | null; colorArt?: string | null; title: string;
}): string {
  const { width, height, fps, duration } = opts;
  // Fit the traced art into the board with a margin.
  const margin = Math.round(Math.min(width, height) * 0.08);
  const scale = Math.min((width - margin * 2) / opts.traceW, (height - margin * 2) / opts.traceH);
  const ox = Math.round((width - opts.traceW * scale) / 2);
  const oy = Math.round((height - opts.traceH * scale) / 2);
  const traces = opts.strokes.map((s) => ({
    points: s.points.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]),
    length: Math.round(s.length * 100) / 100,
  }));
  const handScale = Math.max(0.22, Math.min(0.4, width / 4800)); // hand size relative to board
  const tipX = HAND_TIP.x * handScale, tipY = HAND_TIP.y * handScale, handPx = HAND_TIP.size * handScale;
  const frames = Math.round(duration * fps);
  return `/* REMOTION_CONFIG { "fps": ${fps}, "durationInFrames": ${frames}, "width": ${width}, "height": ${height} } */
import React from 'react';
import {AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig} from 'remotion';
const HAND_EMBEDDED = "data:image/png;base64,${HAND_PNG_B64}";
const VOICE = ${opts.voice ? `"${opts.voice}"` : "null"};
const COLOR_ART = ${opts.colorArt ? `"${opts.colorArt}"` : "null"};
const TRACES = ${JSON.stringify(traces)};
const BOARD = {x: ${ox}, y: ${oy}, scale: ${scale}};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{const p=clamp(x);return p*p*(3-2*p);};
const mix=(a,b,p)=>a+(b-a)*p;
const enrich=s=>{let lengths=[0];for(let i=1;i<s.points.length;i++)lengths.push(lengths[i-1]+Math.hypot(s.points[i][0]-s.points[i-1][0],s.points[i][1]-s.points[i-1][1]));return {...s,length:lengths[lengths.length-1],lengths};};
const geometry=ss=>{let total=0;return {strokes:ss.map(s=>{const p=enrich(s);const out={...p,offset:total};total+=p.length;return out;}),total};};
const locate=(s,d)=>{const v=clamp(d,0,s.length);for(let i=1;i<s.points.length;i++){if(s.lengths[i]>=v){const p=(v-s.lengths[i-1])/Math.max(.0001,s.lengths[i]-s.lengths[i-1]);return [mix(s.points[i-1][0],s.points[i][0],p),mix(s.points[i-1][1],s.points[i][1],p)];}}return s.points[s.points.length-1];};
const G=geometry(TRACES);
function Marker({x,y}) {return <g transform={\`translate(\${x} \${y})\`}>
 <image href={HAND_EMBEDDED} x={${-tipX}} y={${-tipY}} width={${handPx}} height={${handPx}}/>
 </g>;}
function Draw({t,duration,hand}){const p=clamp(t/duration),dist=G.total*p;const active=G.strokes.find(s=>dist>=s.offset&&dist<s.offset+s.length);const pen=active?locate(active,dist-active.offset):null;
 return <g transform={\`translate(\${BOARD.x} \${BOARD.y}) scale(\${BOARD.scale})\`}>{G.strokes.map((s,i)=>{const amount=clamp(dist-s.offset,0,s.length);if(!amount)return null;return <polyline key={i} points={s.points.map(p=>p.join(',')).join(' ')} pathLength={s.length} fill="none" stroke="#202829" strokeWidth={${Math.max(2, Math.round(3 / scale))}} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={\`\${s.length} \${s.length}\`} strokeDashoffset={s.length-amount}/>;})}{hand&&pen&&p>0&&p<1?<Marker x={pen[0]} y={pen[1]}/>:null}</g>;}
const escapeXml=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function svgMarkup(node){if(node==null||node===false)return '';if(Array.isArray(node))return node.map(svgMarkup).join('');if(typeof node!=='object')return escapeXml(node);if(node.type===React.Fragment)return svgMarkup(node.props.children);if(typeof node.type==='function')return svgMarkup(node.type(node.props));const attrs=Object.entries(node.props).filter(([k,v])=>k!=='children'&&k!=='key'&&v!=null).map(([k,v])=>\` \${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()).replace('view-box','viewBox').replace('path-length','pathLength')}="\${escapeXml(v)}"\`).join('');return \`<\${node.type}\${attrs}>\${svgMarkup(node.props.children)}</\${node.type}>\`;}
export default function WhiteboardClip(){const f=useCurrentFrame(),{fps}=useVideoConfig(),t=f/fps;
 const drawEnd=${Math.max(0.5, duration - (opts.colorArt ? 1.2 : 0)).toFixed(2)};
 const color=COLOR_ART?ease((t-drawEnd)/.9):0;
 const svg=<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#ffffff"/>{COLOR_ART?<image href={COLOR_ART} x={BOARD.x} y={BOARD.y} width={${Math.round(opts.traceW * scale)}} height={${Math.round(opts.traceH * scale)}} opacity={color}/>:null}<g opacity={1-color}><Draw t={t} duration={drawEnd} hand={${opts.hand}}/></g></svg>;
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

  // Resolve the source image bytes.
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
    return json({ error: "Provide assetId or imageUrl." }, 400);
  }

  let traced: { strokes: Stroke[]; width: number; height: number };
  try {
    const lineArt = await toLineArt(bytes);
    traced = await traceStrokes(lineArt);
  } catch (e) {
    return json({ error: `Tracing failed: ${(e as Error).message}` }, 422);
  }
  if (!traced.strokes.length) return json({ error: "No drawable lines found — use an image with clear dark lines on a light background." }, 422);

  const totalLen = traced.strokes.reduce((a, s) => a + s.length, 0);
  const drawSpeed = Math.max(200, Math.min(4000, Number(p.drawSpeed) || 1200));
  const duration = Math.max(3, Math.min(60, Number(p.duration) || totalLen / drawSpeed));
  const fps = 30;
  const landscape = traced.width >= traced.height;
  const width = landscape ? 1920 : 1080;
  const height = landscape ? 1080 : 1920;

  const voice = isUuid(String(p.voiceoverAssetId || "")) ? assetUrl(String(p.voiceoverAssetId)) : null;
  const colorArt = isUuid(String(p.colorAssetId || "")) ? assetUrl(String(p.colorAssetId)) : null;
  const title = String(p.title || `Whiteboard — ${sourceName}`).slice(0, 120);

  const code = buildCode({
    strokes: traced.strokes, traceW: traced.width, traceH: traced.height,
    width, height, fps, duration, hand: p.hand !== false, voice, colorArt, title,
  });

  const { data: prev } = await db.from("assets").select("meta").eq("project_id", projectId).eq("kind", "code").order("created_at", { ascending: false }).limit(1);
  const version = (Number(prev?.[0]?.meta?.version) || 0) + 1;
  const { data: saved, error } = await db.from("assets").insert({
    group_id: project.group_id, project_id: projectId, kind: "code", role: "code",
    name: `${safeName(title)}-v${version}.tsx`, inline_content: code,
    mime_type: "text/plain", size_bytes: new TextEncoder().encode(code).byteLength,
    meta: { version, source: "whiteboard-animate", strokes: traced.strokes.length, duration, width, height, ...(sourceAssetId ? { source_asset_id: sourceAssetId } : {}) },
  }).select("id").single();
  if (error) return json({ error: `Could not save: ${error.message}` }, 500);

  return json({
    assetId: saved.id, name: `${safeName(title)}-v${version}.tsx`, version,
    strokes: traced.strokes.length, duration: Math.round(duration * 100) / 100, width, height,
    note: "Render this code asset through the normal render-video flow.",
  }, 201);
});
