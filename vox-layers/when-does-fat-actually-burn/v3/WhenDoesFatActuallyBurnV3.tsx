/* REMOTION_CONFIG = { fps: 30, durationInFrames: 862, width: 1080, height: 1920 } */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, useCurrentFrame } from 'remotion';
// Hub preview bundles only react, remotion and @remotion/lottie, so no @remotion/paths
// or google-fonts. Fonts are system stacks and the path math is hand-rolled.

// =============================================================================
// WhenDoesFatActuallyBurn V3. VOX collage, camera-first rebuild.
//
// What changed vs V2 (and why it wobbled / cropped):
//  1. ONE motion source. V2 moved the camera, the paper (negative parallax), every
//     item (parallax + idle sin/cos drift) and per-segment ease-in-out keys that hit
//     zero speed at each key. Now: the paper is fixed to the board, there is no idle
//     drift and no parallax. Only the camera moves, and only along one continuous
//     path (every segment starts and ends at zero speed, holds are slow ease pushes).
//  2. A real WORLD. Each scene is an "island" (a 1080x1920 page, scaled 0.7) placed
//     on a big board. Poses are authored in island-local coordinates, so a stop
//     is always framed on its own page and nothing sits outside the frame.
//  3. The camera follows the pen. The dashed route draws while the camera flies, the
//     red pin is the pen tip, and the camera centre is the pen tip.
//  4. The ending pulls all the way back so the viewer sees the whole journey, then
//     dives back into the hook page for the loop.
//  Also fixed: chips and stamps were left-shifted inside oversized containers.
// =============================================================================

const FONT_EDITORIAL = 'Georgia, "Times New Roman", Times, serif';
const FONT_BODY = '"Helvetica Neue", Arial, "Segoe UI", Helvetica, sans-serif';

// =============================================================================
// ASSETS (unchanged)
// =============================================================================
const U = (id: string) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;
const VOICE = U('94853e6d-103b-4e38-8e4b-634b53e13ce0');
const MUSIC = U('f4a1ed94-671d-4de6-ba60-43370bfafe68');
const SFX = {
  whoosh: U('8000d709-85ee-4aa4-aad0-9fc84130d93b'),
  pageFlip: U('bd1da89a-d920-406c-a3d6-5a42c9e1c773'),
  stamp: U('72187c30-49d0-4a52-821c-ae1cf92be0be'),
  pop: U('c52d697f-f404-484e-881d-0349bc9d3b69'),
  toggle: U('aabeb8f0-a7f1-4ab0-ad37-96400b3f90f6'),
  pencil: U('bf810aca-6f5a-418c-9f60-bb715550934c'),
  impact: U('599a8103-6cc7-4b36-8b2c-159af900165a'),
  riser: U('377b15fe-2f65-42df-9c9a-0830ea894bf9'),
};
// the character: one overweight man, consistent across the journey (GitHub-hosted
// cutouts; belly hero = hook/loop, starter = myth, payoff = same man running happy)
const GH = 'https://raw.githubusercontent.com/TahirSKY/shortdingus/refs/heads/arena/e04fa780-shortdingus/vox-layers/when-does-fat-actually-burn/v3/cutouts';
const A = {
  runner: `${GH}/char-belly-hero-cutout.png`,
  starter: `${GH}/char-starting-jog-cutout.png`,
  endurance: `${GH}/char-payoff-run-cutout.png`,
  stopwatch: U('073f6af6-8fc8-4c57-bfa6-7a628b05faa9'),
  sugarPrint: U('b5cd68da-32af-4de5-b309-063ce09dc193'),
  blood: U('bbabe1b1-88c2-4885-b676-a2202e045f50'),
  muscle: U('3b59b403-e46c-4e65-96f5-d45728459554'),
  torso: U('b999a516-1be8-4498-b1cd-33d9e3d26c8f'),
  droplets: U('08010474-99e0-4511-8b0f-4308f5b2f5ed'),
  flame: U('2b2fdf85-f0dc-447a-904c-29dff09e8acc'),
  lever: U('4844dc3e-d31b-4a4c-9f57-26cf7ce4eb58'),
};

// =============================================================================
// KIT BASICS
// =============================================================================
export const VOX = {
  paper: '#efe6d3',
  paperDeep: '#e0d2b8',
  ink: '#282217',
  inkSoft: '#544a3a',
  red: '#c0392b',
  yellow: '#e8b73a',
  teal: '#33695d',
  cream: '#faf5ea',
} as const;

const EASE_OUT = Easing.bezier(0.33, 1, 0.68, 1);
const EASE_INOUT = Easing.bezier(0.42, 0, 0.24, 1);
const EASE_PLACE = Easing.bezier(0.22, 1.2, 0.36, 1);
const EASE_FLY = Easing.bezier(0.6, 0, 0.12, 1); // long, committed flights, soft landing
const EASE_PUNCH = Easing.bezier(0.1, 0.85, 0.2, 1); // opening pull-back: fast start
const EASE_BREATH = Easing.inOut(Easing.sin); // slow push during holds, zero speed at both ends
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ext = { extrapolateLeft: 'clamp', extrapolateRight: 'extend' } as const;

// =============================================================================
// THE WORLD
// Five islands on one paper board, snaking top-left > top-right > mid-left >
// mid-right > bottom. Each island is a 1080x1920 page drawn at scale S, so a
// camera "fit" of 1.0 frames exactly one page. Content coordinates below are
// island-local (0..1080 x 0..1920), same as the old single-page layout.
// =============================================================================
const W = 1080;
const H = 1920;
const S = 0.7;
const ISL = [
  { x: 520, y: 800 }, // 0 hook
  { x: 1420, y: 800 }, // 1 myth
  { x: 520, y: 2150 }, // 2 first fuels
  { x: 1420, y: 2150 }, // 3 the switch
  { x: 970, y: 3500 }, // 4 payoff
];

type Pt = { x: number; y: number };
type Pose = Pt & { z: number };
const P = (x: number, y: number): Pt => ({ x, y });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + e * p3.x, y: a * p0.y + b * p1.y + c * p2.y + e * p3.y };
};
// camera pose from island-local focus point + "fit" (1.0 = whole page fills the frame)
const loc = (k: number, lx: number, ly: number, zf: number): Pose => ({
  x: ISL[k].x + (lx - W / 2) * S,
  y: ISL[k].y + (ly - H / 2) * S,
  z: zf / S,
});

// =============================================================================
// CAMERA. A list of stops. Each stop = a pose, an arrive frame, a depart frame,
// and a gentle push-in during the hold. Between stops: one flight on a curve,
// eased with zero speed at both ends. Settings on a stop describe the flight
// LEAVING it (bend = curve sideways, arc = zoom-out hop mid-flight, route = the
// pen draws this flight on the board).
// =============================================================================
type Stop = Pose & {
  a: number; d: number; push?: number; bend?: number; arc?: number;
  ease?: (t: number) => number; route?: boolean;
};
const OVERVIEW: Pose = { x: 970, y: 2150, z: 0.45 };
const STOPS: Stop[] = [
  { ...loc(0, 540, 430, 2.1), a: 0, d: 0, ease: EASE_PUNCH }, // 0   tight on "fat" (hook frame)
  { ...loc(0, 540, 880, 1.1), a: 30, d: 74, push: 0.03, bend: 150, arc: 0.35, route: true }, // hook page
  { ...loc(1, 520, 820, 1.08), a: 118, d: 186, push: 0.03 }, // myth page
  { ...loc(1, 770, 830, 1.8), a: 212, d: 262, push: 0.04, bend: 200, arc: 0.45, route: true }, // stopwatch + stamp
  { ...loc(2, 540, 650, 1.15), a: 330, d: 412, push: 0.03 }, // first fuels, top
  { ...loc(2, 540, 1000, 1.0), a: 436, d: 474, push: 0.02, bend: 150, arc: 0.35, route: true }, // first fuels, full
  { ...loc(3, 540, 760, 1.3), a: 516, d: 590, push: 0.06 }, // the switch, push toward the lever
  { ...loc(3, 540, 1000, 1.04), a: 614, d: 650, push: 0.02, bend: 140, arc: 0.4, route: true }, // the switch, reveal
  { ...loc(4, 540, 880, 1.1), a: 688, d: 750, push: 0.03 }, // payoff
  { ...OVERVIEW, a: 802, d: 824, push: 0.03 }, // THE WHOLE JOURNEY
  { ...loc(0, 540, 880, 1.1), a: 852, d: 862 }, // dive back to the hook page (loop)
];

type Flight = { f0: number; f1: number; from: Pose; to: Pose; c1: Pt; c2: Pt; arc: number; ease: (t: number) => number; route: boolean };
const holdEnd = (s: Stop): Pose => ({ x: s.x, y: s.y, z: s.z * (1 + (s.push ?? 0)) });
const FLIGHTS: Flight[] = STOPS.slice(0, -1).map((s, i) => {
  const n = STOPS[i + 1];
  const from = holdEnd(s);
  const to: Pose = { x: n.x, y: n.y, z: n.z };
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, b = s.bend ?? 0;
  return {
    f0: s.d, f1: n.a, from, to,
    c1: { x: from.x + dx / 3 + nx * b, y: from.y + dy / 3 + ny * b },
    c2: { x: from.x + (dx * 2) / 3 - nx * b, y: from.y + (dy * 2) / 3 - ny * b },
    arc: s.arc ?? 0, ease: s.ease ?? EASE_FLY, route: !!s.route,
  };
});
const flightPose = (fl: Flight, e: number): Pose => {
  const c = cubic(fl.from, fl.c1, fl.c2, fl.to, e);
  const z = Math.exp(lerp(Math.log(fl.from.z), Math.log(fl.to.z), e)) * (1 - fl.arc * Math.sin(Math.PI * e));
  return { x: c.x, y: c.y, z };
};
export const camAt = (f: number): Pose => {
  for (let i = 0; i < STOPS.length; i++) {
    const s = STOPS[i];
    if (f <= s.d) {
      const t = s.d > s.a ? interpolate(f, [s.a, s.d], [0, 1], clamp) : 1;
      return { x: s.x, y: s.y, z: s.z * (1 + (s.push ?? 0) * EASE_BREATH(t)) };
    }
    const fl = FLIGHTS[i];
    if (fl && f < fl.f1) return flightPose(fl, fl.ease(interpolate(f, [fl.f0, fl.f1], [0, 1], clamp)));
  }
  return holdEnd(STOPS[STOPS.length - 1]);
};
const ROUTES = FLIGHTS.filter((f) => f.route);

const CamCtx = createContext<Pose>({ x: 540, y: 960, z: 1 });

const CollageBoard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
          transform: `scale(${cam.z}) translate(${W / 2 / cam.z - cam.x}px, ${H / 2 / cam.z - cam.y}px)`,
        }}
      >
        <CamCtx.Provider value={cam}>{children}</CamCtx.Provider>
      </div>
    </AbsoluteFill>
  );
};

// the paper is fixed to the board. A faint dot grid is the only thing that makes
// camera motion readable on blank paper, and it moves with the board, never against it
const PaperBG: React.FC = () => (
  <div
    style={{
      position: 'absolute', left: -600, top: -400, width: 3400, height: 5400, background: VOX.paper,
      backgroundImage: 'radial-gradient(rgba(84,74,58,0.15) 2.2px, transparent 2.8px)', backgroundSize: '64px 64px',
    }}
  />
);

const Island: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => (
  <div
    style={{
      position: 'absolute', left: ISL[k].x - W / 2, top: ISL[k].y - H / 2, width: W, height: H,
      transform: `scale(${S})`, transformOrigin: '50% 50%',
    }}
  >
    {children}
  </div>
);

// =============================================================================
// ITEMS. Entrance only, no idle motion. Everything uses ABSOLUTE frames.
// =============================================================================
type Enter = 'pop' | 'place' | 'slide-l' | 'slide-r' | 'rise' | 'fade' | 'none';

const Layer: React.FC<{
  x: number; y: number; w?: number; at?: number; dur?: number; enter?: Enter;
  rotate?: number; z?: number; children: React.ReactNode;
}> = ({ x, y, w, at = 0, dur = 14, enter = 'place', rotate = 0, z, children }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const raw = interpolate(frame, [at, at + dur], [0, 1], { easing: enter === 'place' ? EASE_PLACE : EASE_OUT, ...clamp });
  let ex = 0, ey = 0, sc = 1, rot = 0, op = 1;
  switch (enter) {
    case 'pop': sc = interpolate(raw, [0, 1], [0.55, 1], ext); op = interpolate(raw, [0, 0.35], [0, 1], clamp); break;
    case 'place': sc = interpolate(raw, [0, 1], [1.28, 1], ext); rot = interpolate(raw, [0, 1], [rotate > 0 ? 7 : -7, 0], ext); op = interpolate(raw, [0, 0.25], [0, 1], clamp); break;
    case 'slide-l': ex = interpolate(raw, [0, 1], [-(w ?? 400) * 0.55 - 120, 0]); op = interpolate(raw, [0, 0.4], [0, 1], clamp); rot = interpolate(raw, [0, 1], [-3, 0]); break;
    case 'slide-r': ex = interpolate(raw, [0, 1], [(w ?? 400) * 0.55 + 120, 0]); op = interpolate(raw, [0, 0.4], [0, 1], clamp); rot = interpolate(raw, [0, 1], [3, 0]); break;
    case 'rise': ey = interpolate(raw, [0, 1], [90, 0]); op = interpolate(raw, [0, 0.5], [0, 1], clamp); break;
    case 'fade': op = raw; sc = interpolate(raw, [0, 1], [1.04, 1]); break;
    case 'none': break;
  }
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w ?? 'max-content', zIndex: z, opacity: op,
        transform: `translate(-50%, -50%) translate(${ex}px, ${ey}px) rotate(${rotate + rot}deg) scale(${sc})`,
      }}
    >
      {children}
    </div>
  );
};

// fades a group down while the camera is working somewhere else, restores it for the recap
const RECAP_FROM = 770;
const RECAP_TO = 800;
const Dim: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [from, from + 16, RECAP_FROM, RECAP_TO], [1, 0.2, 0.2, 1], clamp);
  return <div style={{ opacity: o }}>{children}</div>;
};

const Cutout: React.FC<{
  src: string; x: number; y: number; w: number; at?: number; dur?: number; enter?: Enter;
  rotate?: number; sticker?: number; shadow?: number; z?: number;
}> = ({ src, x, y, w, at, dur, enter, rotate, sticker = 5, shadow = 2, z }) => {
  const s = sticker;
  const outline = s > 0
    ? `drop-shadow(${s}px 0 0 ${VOX.cream}) drop-shadow(-${s}px 0 0 ${VOX.cream}) drop-shadow(0 ${s}px 0 ${VOX.cream}) drop-shadow(0 -${s}px 0 ${VOX.cream}) `
    : '';
  const soft = shadow > 0 ? `drop-shadow(0 ${8 * shadow}px ${10 * shadow}px rgba(40,28,12,${0.14 + 0.07 * shadow}))` : '';
  return (
    <Layer x={x} y={y} w={w} at={at} dur={dur} enter={enter} rotate={rotate} z={z}>
      <Img src={src} style={{ width: '100%', display: 'block', filter: outline + soft }} />
    </Layer>
  );
};

const ArchivalPhoto: React.FC<{
  src: string; x: number; y: number; w: number; at?: number; dur?: number; enter?: Enter;
  rotate?: number; caption?: string; z?: number;
}> = ({ src, x, y, w, at, dur, enter = 'place', rotate = -2, caption, z }) => {
  const tape: React.CSSProperties = {
    position: 'absolute', width: w * 0.22, height: w * 0.07,
    background: 'rgba(232,222,196,0.75)', boxShadow: '0 1px 4px rgba(40,28,12,0.18)',
  };
  return (
    <Layer x={x} y={y} w={w} at={at} dur={dur} enter={enter} rotate={rotate} z={z}>
      <div style={{ background: VOX.cream, padding: w * 0.035, paddingBottom: w * 0.05, boxShadow: '0 16px 34px rgba(40,28,12,0.3)' }}>
        <Img src={src} style={{ width: '100%', display: 'block' }} />
        {caption ? (
          <div style={{ fontFamily: FONT_BODY, fontSize: w * 0.042, fontWeight: 600, color: VOX.inkSoft, paddingTop: w * 0.028, letterSpacing: 0.4 }}>{caption}</div>
        ) : null}
      </div>
      <div style={{ ...tape, top: -w * 0.02, left: -w * 0.05, transform: 'rotate(-38deg)' }} />
      <div style={{ ...tape, top: -w * 0.02, right: -w * 0.05, transform: 'rotate(35deg)' }} />
    </Layer>
  );
};

const LabelChip: React.FC<{
  text: string; x: number; y: number; at?: number; size?: number; rotate?: number;
  accent?: string; kicker?: string; kickerColor?: string;
}> = ({ text, x, y, at = 0, size = 30, rotate = -1.5, accent, kicker, kickerColor }) => (
  <Layer x={x} y={y} at={at} dur={10} enter="pop" rotate={rotate}>
    <div style={{ background: VOX.cream, borderLeft: accent ? `${Math.max(5, size * 0.2)}px solid ${accent}` : undefined, padding: `${size * 0.38}px ${size * 0.65}px`, boxShadow: '0 6px 16px rgba(40,28,12,0.25)', whiteSpace: 'nowrap' }}>
      {kicker ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: size * 0.52, fontWeight: 600, letterSpacing: 2.2, color: kickerColor ?? accent ?? VOX.red, textTransform: 'uppercase' }}>{kicker}</div>
      ) : null}
      <div style={{ fontFamily: FONT_BODY, fontSize: size, fontWeight: 600, color: VOX.ink, lineHeight: 1.15 }}>{text}</div>
    </div>
  </Layer>
);

const SerifStatement: React.FC<{
  words: { t: string; hl?: boolean }[]; x: number; y: number; w: number; at: number; size?: number;
}> = ({ words, x, y, w, at, size = 64 }) => {
  const frame = useCurrentFrame();
  const allIn = at + words.length * 3 + 10;
  return (
    <Layer x={x} y={y} w={w} at={at} dur={1} enter="none">
      <div style={{ fontFamily: FONT_EDITORIAL, fontSize: size, fontWeight: 700, color: VOX.ink, textAlign: 'center', lineHeight: 1.22 }}>
        {words.map((wd, i) => {
          const pr = interpolate(frame, [at + i * 3, at + i * 3 + 9], [0, 1], { easing: EASE_OUT, ...clamp });
          const sweep = wd.hl ? interpolate(frame, [allIn, allIn + 12], [0, 100], { easing: EASE_INOUT, ...clamp }) : 0;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block', opacity: pr, transform: `translateY(${(1 - pr) * 24}px)`,
                margin: `0 ${size * 0.13}px`, padding: wd.hl ? `0 ${size * 0.08}px` : undefined,
                background: wd.hl ? `linear-gradient(to right, ${VOX.yellow} ${sweep}%, transparent ${sweep}%)` : undefined,
              }}
            >
              {wd.t}
            </span>
          );
        })}
      </div>
    </Layer>
  );
};

// frame-0 hook: "fat" is already on screen, huge, with the marker swiping across it
const HookTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [-6, 12], [0, 100], { easing: EASE_INOUT, ...clamp });
  const row: React.CSSProperties = { whiteSpace: 'nowrap', lineHeight: 1.02 };
  return (
    <Layer x={540} y={430} enter="none">
      <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, color: VOX.ink, textAlign: 'center' }}>
        <div style={{ ...row, fontSize: 100 }}>When does</div>
        <div style={{ ...row, fontSize: 250 }}>
          <span style={{ display: 'inline-block', padding: '0 26px', transform: 'rotate(-1.5deg)', background: `linear-gradient(to right, ${VOX.yellow} ${sweep}%, transparent ${sweep}%)` }}>fat</span>
        </div>
        <div style={{ ...row, fontSize: 100 }}>actually burn?</div>
      </div>
    </Layer>
  );
};

const RubberStamp: React.FC<{
  text: string; x: number; y: number; at: number; size?: number; color?: string; rotate?: number; z?: number;
}> = ({ text, x, y, at, size = 72, color = VOX.red, rotate = -11, z }) => {
  const frame = useCurrentFrame();
  const pr = interpolate(frame, [at, at + 7], [0, 1], { easing: EASE_PLACE, ...clamp });
  return (
    <Layer x={x} y={y} at={at} dur={1} enter="none" rotate={rotate} z={z}>
      <div style={{ opacity: interpolate(pr, [0, 0.4, 1], [0, 0.95, 0.88]), transform: `scale(${interpolate(pr, [0, 1], [2.1, 1], ext)})` }}>
        <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: size, letterSpacing: size * 0.08, textTransform: 'uppercase', color, border: `${Math.max(5, size * 0.09)}px solid ${color}`, borderRadius: size * 0.12, padding: `${size * 0.12}px ${size * 0.3}px`, whiteSpace: 'nowrap', mixBlendMode: 'multiply' }}>
          {text}
        </div>
      </div>
    </Layer>
  );
};

const DrainBar: React.FC<{ x: number; y: number; w: number; label: string; a: number; b: number; color: string }> = ({ x, y, w, label, a, b, color }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [a, b], [96, 7], clamp);
  return (
    <Layer x={x} y={y} w={w} at={a - 12} dur={10} enter="rise">
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 27, letterSpacing: 2, color: VOX.ink, marginBottom: 8 }}>{label}</div>
      <div style={{ width: w, height: 46, background: VOX.cream, border: `4px solid ${VOX.ink}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 14px rgba(40,28,12,0.22)' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color }} />
      </div>
    </Layer>
  );
};

// hand-drawn pointer: one cubic that draws itself, head follows the tip.
// Drawn in island-local coordinates, so it always lines up with what it points at.
const Arrow: React.FC<{ p: [Pt, Pt, Pt, Pt]; at: number; dur?: number; color?: string; width?: number }> = ({ p, at, dur = 16, color = VOX.red, width = 7 }) => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_INOUT, ...clamp });
  if (prog <= 0.001) return null;
  const tip = cubic(p[0], p[1], p[2], p[3], prog);
  const back = cubic(p[0], p[1], p[2], p[3], Math.max(0, prog - 0.05));
  const ang = (Math.atan2(tip.y - back.y, tip.x - back.x) * 180) / Math.PI;
  const d = `M ${p[0].x} ${p[0].y} C ${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y} ${p[3].x} ${p[3].y}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${prog} 1.1`} />
      {prog > 0.08 ? (
        <g transform={`translate(${tip.x} ${tip.y}) rotate(${ang})`}>
          <path d={`M 0 0 L ${-width * 3.2} ${-width * 1.9} M 0 0 L ${-width * 3.2} ${width * 1.9}`} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// ROUTE, PIN, MAP BADGES (world space)
// =============================================================================
const WORLD_W = 2000;
const WORLD_H = 4400;
const routePath = (r: Flight) => `M ${r.from.x} ${r.from.y} C ${r.c1.x} ${r.c1.y} ${r.c2.x} ${r.c2.y} ${r.to.x} ${r.to.y}`;
const routeProgress = (r: Flight, frame: number) => r.ease(interpolate(frame, [r.f0, r.f1], [0, 1], clamp));

const Routes: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {ROUTES.map((r, k) => {
        const e = routeProgress(r, frame);
        if (e <= 0.001) return null;
        const d = routePath(r);
        return (
          <g key={k}>
            <mask id={`routemask${k}`} maskUnits="userSpaceOnUse" x={-600} y={-400} width={3400} height={5400}>
              <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={80} strokeDasharray={`${e} 1.2`} />
            </mask>
            <path d={d} fill="none" stroke={VOX.red} strokeWidth={9} strokeLinecap="round" strokeDasharray="26 20" mask={`url(#routemask${k})`} />
          </g>
        );
      })}
    </svg>
  );
};

// the pen tip. It sits exactly where the camera is looking during a route flight.
const Pins: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {ROUTES.map((r, k) => {
        if (frame < r.f0 || frame > r.f1) return null;
        const c = cubic(r.from, r.c1, r.c2, r.to, routeProgress(r, frame));
        const op = interpolate(frame, [r.f0, r.f0 + 6, r.f1 - 8, r.f1], [0, 1, 1, 0], clamp);
        return (
          <g key={k} opacity={op} transform={`translate(${c.x} ${c.y})`}>
            <circle r={26} fill={VOX.red} stroke={VOX.cream} strokeWidth={8} />
            <circle r={7} fill={VOX.cream} />
          </g>
        );
      })}
    </svg>
  );
};

// chapter numbers on each island, only readable (and only shown) once the camera is far out
const MapBadge: React.FC<{ k: number; n: number }> = ({ k, n }) => {
  const cam = useContext(CamCtx);
  const op = interpolate(cam.z, [0.55, 0.8], [1, 0], clamp);
  if (op <= 0.001) return null;
  const cx = ISL[k].x + (95 - W / 2) * S;
  const cy = ISL[k].y + (95 - H / 2) * S;
  return (
    <div
      style={{
        position: 'absolute', left: cx - 75, top: cy - 75, width: 150, height: 150, borderRadius: '50%',
        background: VOX.red, border: `10px solid ${VOX.cream}`, boxShadow: '0 8px 20px rgba(40,28,12,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op, transform: `scale(${lerp(0.6, 1, op)})`,
        fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: 84, color: VOX.cream,
      }}
    >
      {n}
    </div>
  );
};

const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.055 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity }}>
      <svg width="100%" height="100%">
        <filter id="voxgrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(frame / 2)} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#voxgrain)" />
      </svg>
    </AbsoluteFill>
  );
};

// =============================================================================
// COMPOSITION. All `at` values are ABSOLUTE frames (voice sync preserved).
// Camera arrives first, then items land on the beat.
// =============================================================================
const WhenDoesFatActuallyBurnV3: React.FC = () => {
  const frame = useCurrentFrame();
  const leverRot = interpolate(frame, [570, 583], [-7, 11], { easing: EASE_PLACE, ...clamp });
  return (
    <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
      <CollageBoard>
        <PaperBG />
        <Routes />

        {/* 1. HOOK. Frame 0 is already "fat", huge. Camera punches back to the page, then rides out. */}
        <Island k={0}>
          <HookTitle />
          <Cutout src={A.runner} x={540} y={1160} w={600} at={6} dur={18} enter="place" rotate={2} shadow={3} />
          <LabelChip x={540} y={1640} at={50} text="Not when you think" kicker="The myth" accent={VOX.red} size={36} rotate={-1.2} />
          {/* loop line, lands as the camera dives back in */}
          <SerifStatement x={540} y={120} w={700} at={840} size={96} words={[{ t: 'So...', hl: true }]} />
        </Island>

        {/* 2. MYTH. Statement, then the pen points at the stopwatch, camera pushes in, stamp lands on it. */}
        <Island k={1}>
          <Dim from={188}>
            <SerifStatement x={540} y={330} w={960} at={118} size={72} words={[{ t: 'Most' }, { t: 'people' }, { t: 'think' }, { t: 'it' }, { t: 'starts' }, { t: 'instantly.', hl: true }]} />
            <Cutout src={A.starter} x={320} y={1090} w={520} at={126} enter="slide-l" rotate={-1} shadow={3} />
            <Arrow p={[P(700, 452), P(735, 500), P(765, 548), P(778, 612)]} at={168} dur={16} />
          </Dim>
          <Cutout src={A.stopwatch} x={780} y={800} w={330} at={150} enter="slide-r" rotate={3} shadow={3} />
          <RubberStamp text="Not yet" x={760} y={915} at={244} size={80} rotate={-11} z={5} />
        </Island>

        {/* 3. FIRST FUELS. One page: sugar on top, glycogen below, both tanks drain. */}
        <Island k={2}>
          <SerifStatement x={540} y={230} w={900} at={334} size={92} words={[{ t: 'First' }, { t: 'fuels', hl: true }]} />
          <ArchivalPhoto src={A.sugarPrint} x={320} y={640} w={400} at={386} rotate={-2} caption="First fuel - sugar in the blood" />
          <Cutout src={A.blood} x={770} y={640} w={380} at={398} enter="slide-r" rotate={2} shadow={2} />
          <LabelChip x={540} y={950} at={392} text="Sugar in your blood" kicker="First" accent={VOX.red} size={32} rotate={-1.5} />
          <DrainBar x={540} y={1050} w={620} label="BLOOD SUGAR" a={400} b={465} color={VOX.yellow} />
          <Cutout src={A.muscle} x={300} y={1340} w={420} at={437} enter="slide-l" rotate={-1.5} shadow={3} />
          <Cutout src={A.torso} x={790} y={1340} w={360} at={452} enter="slide-r" rotate={1.5} shadow={3} />
          <LabelChip x={540} y={1650} at={443} text="Glycogen in your muscles" kicker="Stored" accent={VOX.teal} size={32} rotate={1.2} />
          <DrainBar x={540} y={1770} w={620} label="GLYCOGEN" a={450} b={495} color={VOX.red} />
        </Island>

        {/* 4. THE SWITCH. Camera pushes toward the lever, it flips, camera releases to show the new fuel. */}
        <Island k={3}>
          <SerifStatement x={540} y={290} w={900} at={518} size={84} words={[{ t: 'Quick' }, { t: 'energy' }, { t: 'runs' }, { t: 'out.', hl: true }]} />
          <DrainBar x={540} y={570} w={660} label="QUICK ENERGY" a={530} b={584} color={VOX.red} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `rotate(${leverRot}deg)`, transformOrigin: '540px 1090px' }}>
            <Cutout src={A.lever} x={540} y={960} w={400} at={540} enter="place" shadow={3} />
          </div>
          <Arrow p={[P(610, 642), P(668, 682), P(650, 728), P(590, 758)]} at={548} dur={18} />
          <LabelChip x={540} y={1270} at={578} text="The body shifts" kicker="The switch" accent={VOX.red} size={34} rotate={-1} />
          <Cutout src={A.torso} x={290} y={1540} w={340} at={596} enter="slide-l" shadow={3} />
          <Cutout src={A.droplets} x={760} y={1540} w={360} at={603} enter="place" shadow={3} />
          <Cutout src={A.flame} x={810} y={1190} w={150} at={610} enter="pop" shadow={2} />
          <LabelChip x={540} y={1790} at={619} text="Now burning fat" kicker="New fuel" accent={VOX.yellow} kickerColor={VOX.inkSoft} size={34} rotate={1} />
        </Island>

        {/* 5. PAYOFF. Pointer lands on the flame, then the camera pulls all the way out. */}
        <Island k={4}>
          <SerifStatement x={540} y={360} w={920} at={688} size={82} words={[{ t: 'The' }, { t: 'longer' }, { t: 'you' }, { t: 'move,' }, { t: 'the' }, { t: 'more' }, { t: 'fat', hl: true }, { t: 'burns.' }]} />
          <Cutout src={A.endurance} x={520} y={1180} w={640} at={696} enter="place" rotate={1.5} shadow={3} />
          <Arrow p={[P(650, 545), P(700, 590), P(760, 630), P(795, 690)]} at={764} dur={16} />
          <Cutout src={A.flame} x={860} y={790} w={180} at={782} enter="pop" shadow={2} />
        </Island>

        <Pins />
        {[0, 1, 2, 3, 4].map((k) => (
          <MapBadge key={k} k={k} n={k + 1} />
        ))}
      </CollageBoard>

      {/* lens vignette lives on the screen, not the board, so it never slides against the paper */}
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(52,38,18,0.26) 100%)' }} />
      <Grain opacity={0.055} />

      {/* AUDIO. Voice untouched. SFX re-timed to the camera: whoosh on each flight, hits on landings. */}
      <Audio src={VOICE} />
      <Audio src={MUSIC} volume={0.12} />
      <Sequence from={0} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={1} durationInFrames={30}><Audio src={SFX.impact} volume={0.6} /></Sequence>
      <Sequence from={50} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
      <Sequence from={72} durationInFrames={40}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={152} durationInFrames={16}><Audio src={SFX.pop} volume={0.45} /></Sequence>
      <Sequence from={212} durationInFrames={34}><Audio src={SFX.riser} volume={0.3} /></Sequence>
      <Sequence from={244} durationInFrames={20}><Audio src={SFX.stamp} volume={0.9} /></Sequence>
      <Sequence from={260} durationInFrames={44}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={326} durationInFrames={20}><Audio src={SFX.pageFlip} volume={0.5} /></Sequence>
      <Sequence from={386} durationInFrames={16}><Audio src={SFX.pop} volume={0.55} /></Sequence>
      <Sequence from={437} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
      <Sequence from={472} durationInFrames={40}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={536} durationInFrames={42}><Audio src={SFX.riser} volume={0.32} /></Sequence>
      <Sequence from={574} durationInFrames={20}><Audio src={SFX.toggle} volume={0.85} /></Sequence>
      <Sequence from={603} durationInFrames={16}><Audio src={SFX.pop} volume={0.6} /></Sequence>
      <Sequence from={648} durationInFrames={40}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={690} durationInFrames={50}><Audio src={SFX.pencil} volume={0.45} /></Sequence>
      <Sequence from={740} durationInFrames={46}><Audio src={SFX.riser} volume={0.35} /></Sequence>
      <Sequence from={782} durationInFrames={16}><Audio src={SFX.pop} volume={0.6} /></Sequence>
      <Sequence from={800} durationInFrames={30}><Audio src={SFX.impact} volume={0.6} /></Sequence>
      <Sequence from={822} durationInFrames={34}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={842} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
    </AbsoluteFill>
  );
};

export default WhenDoesFatActuallyBurnV3;
