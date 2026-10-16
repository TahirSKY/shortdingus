/* REMOTION_CONFIG = { fps: 30, durationInFrames: 1533, width: 1080, height: 1920 } */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';
// Hub preview bundles only react, remotion and @remotion/lottie. Fonts are system
// stacks, path math is hand-rolled. Camera philosophy (from the V3 rebuild): ONE
// motion source — no parallax, no idle drift. Islands on a paper board, flights
// between stops, coded props instead of pictures wherever something DOES something.

// =============================================================================
// Your Body Has a Countermove — VOX collage short.
// Voice is the recorded 59.5s file played as KEPT SEGMENTS (silences + the "Ah"
// filler cut): 51.1s out. Every cue below is timed to the CUT (output) timeline.
// =============================================================================

const FONT_EDITORIAL = 'Georgia, "Times New Roman", Times, serif';
const FONT_BODY = '"Helvetica Neue", Arial, "Segoe UI", Helvetica, sans-serif';

const U = (id: string) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;
const VOICE = U('d76db2ed-d5b1-4e7a-aa2c-4bce940e5264');
const VIDEO_EAT = U('6b75678c-30a4-4fb2-8ddd-76cf984b8e06'); // pexels: man eating chips
const VIDEO_COUCH = U('873d6ea4-d62c-40b2-afc5-6aff248fbf1a'); // pexels: man collapsed on couch
const MUSIC = U('f4a1ed94-671d-4de6-ba60-43370bfafe68'); // docu-pluck
const SFX = {
  whoosh: U('8000d709-85ee-4aa4-aad0-9fc84130d93b'),
  pageFlip: U('bd1da89a-d920-406c-a3d6-5a42c9e1c773'),
  stamp: U('72187c30-49d0-4a52-821c-ae1cf92be0be'),
  pop: U('c52d697f-f404-484e-881d-0349bc9d3b69'),
  pencil: U('bf810aca-6f5a-418c-9f60-bb715550934c'),
  impact: U('599a8103-6cc7-4b36-8b2c-159af900165a'),
  riser: U('377b15fe-2f65-42df-9c9a-0830ea894bf9'),
};
// the channel character (same man as the fat-burn video)
const GH = 'https://raw.githubusercontent.com/TahirSKY/shortdingus/refs/heads/arena/e04fa780-shortdingus/vox-layers/when-does-fat-actually-burn/v3/cutouts';
const CHAR = {
  belly: `${GH}/char-belly-hero-cutout.png`,
  starter: `${GH}/char-starting-jog-cutout.png`,
  payoff: `${GH}/char-payoff-run-cutout.png`,
};

// voice kept segments [sourceStart, sourceEnd] in seconds (cuts removed)
const KEPT: [number, number][] = [
  [0.0, 5.378], [6.108, 8.249], [8.996, 9.806], [10.6, 15.966], [16.697, 18.95],
  [19.424, 21.998], [23.018, 25.913], [26.387, 28.995], [29.534, 33.395],
  [34.42, 42.917], [43.664, 46.947], [47.598, 51.218], [51.692, 59.48],
];

export const VOX = {
  paper: '#efe6d3', ink: '#282217', inkSoft: '#544a3a', red: '#c0392b',
  yellow: '#e8b73a', teal: '#33695d', cream: '#faf5ea',
} as const;

const EASE_OUT = Easing.bezier(0.33, 1, 0.68, 1);
const EASE_INOUT = Easing.bezier(0.42, 0, 0.24, 1);
const EASE_PLACE = Easing.bezier(0.22, 1.2, 0.36, 1);
const EASE_FLY = Easing.bezier(0.6, 0, 0.12, 1);
const EASE_BREATH = Easing.bezier(0.42, 0, 0.58, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ext = { extrapolateLeft: 'clamp', extrapolateRight: 'extend' } as const;

// =============================================================================
// WORLD + CAMERA (stops & flights, one continuous path)
// =============================================================================
const W = 1080;
const H = 1920;
const S = 0.7;
const ISL = [
  { x: 520, y: 800 },   // 0 hook
  { x: 1420, y: 800 },  // 1 the simple math
  { x: 520, y: 2150 },  // 2 an entire day
  { x: 1420, y: 2150 }, // 3 hungrier (video)
  { x: 520, y: 3500 },  // 4 move less
  { x: 1420, y: 3500 }, // 5 exhausted evening (video)
  { x: 520, y: 4850 },  // 6 2023 review
  { x: 1420, y: 4850 }, // 7 not everyone
  { x: 520, y: 6200 },  // 8 not 1-to-1
  { x: 970, y: 7550 },  // 9 payoff
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
const loc = (k: number, lx: number, ly: number, zf: number): Pose => ({
  x: ISL[k].x + (lx - W / 2) * S,
  y: ISL[k].y + (ly - H / 2) * S,
  z: zf / S,
});

type Stop = Pose & { a: number; d: number; push?: number; bend?: number; arc?: number; route?: boolean };
const STOPS: Stop[] = [
  { ...loc(0, 540, 880, 1.08), a: 0, d: 205, push: 0.03, bend: 130, arc: 0.32, route: true },
  { ...loc(1, 540, 900, 1.05), a: 238, d: 445, push: 0.03, bend: 150, arc: 0.35, route: true },
  { ...loc(2, 540, 950, 1.02), a: 478, d: 530, push: 0.02, bend: 120, arc: 0.3, route: true },
  { ...loc(3, 540, 900, 1.1), a: 556, d: 632, push: 0.03, bend: 140, arc: 0.35, route: true },
  { ...loc(4, 540, 900, 1.05), a: 648, d: 715, push: 0.02, bend: 130, arc: 0.3, route: true },
  { ...loc(5, 540, 900, 1.1), a: 730, d: 828, push: 0.03, bend: 140, arc: 0.35, route: true },
  { ...loc(6, 540, 900, 1.03), a: 845, d: 1080, push: 0.02, bend: 130, arc: 0.3, route: true },
  { ...loc(7, 540, 950, 1.0), a: 1102, d: 1185, push: 0.02, bend: 120, arc: 0.3, route: true },
  { ...loc(8, 540, 900, 1.05), a: 1208, d: 1295, push: 0.02, bend: 140, arc: 0.32, route: true },
  // Hold the payoff, then finish with a deliberate pull-back to the whole journey.
  { ...loc(9, 540, 900, 1.08), a: 1312, d: 1450, push: 0.025, bend: 0, arc: 0.08 },
  { x: 970, y: 4175, z: 0.22 / S, a: 1533, d: 1533, push: 0 },
];

type Flight = { f0: number; f1: number; from: Pose; to: Pose; c1: Pt; c2: Pt; arc: number; route: boolean };
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
    arc: s.arc ?? 0, route: !!s.route,
  };
});
const flightPose = (fl: Flight, e: number): Pose => {
  const c = cubic(fl.from, fl.c1, fl.c2, fl.to, e);
  const z = Math.exp(lerp(Math.log(fl.from.z), Math.log(fl.to.z), e)) * (1 - fl.arc * Math.sin(Math.PI * e));
  return { x: c.x, y: c.y, z };
};
const camAt = (f: number): Pose => {
  for (let i = 0; i < STOPS.length; i++) {
    const s = STOPS[i];
    if (f <= s.d) {
      const t = s.d > s.a ? interpolate(f, [s.a, s.d], [0, 1], clamp) : 1;
      return { x: s.x, y: s.y, z: s.z * (1 + (s.push ?? 0) * EASE_BREATH(t)) };
    }
    const fl = FLIGHTS[i];
    if (fl && f < fl.f1) return flightPose(fl, EASE_FLY(interpolate(f, [fl.f0, fl.f1], [0, 1], clamp)));
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
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${cam.z}) translate(${W / 2 / cam.z - cam.x}px, ${H / 2 / cam.z - cam.y}px)` }}>
        <CamCtx.Provider value={cam}>{children}</CamCtx.Provider>
      </div>
    </AbsoluteFill>
  );
};

const PaperBG: React.FC = () => (
  <div style={{ position: 'absolute', left: -600, top: -400, width: 3400, height: 10000, background: VOX.paper, backgroundImage: 'radial-gradient(rgba(84,74,58,0.15) 2.2px, transparent 2.8px)', backgroundSize: '64px 64px' }} />
);

const Island: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => (
  <div style={{ position: 'absolute', left: ISL[k].x - W / 2, top: ISL[k].y - H / 2, width: W, height: H, transform: `scale(${S})`, transformOrigin: '50% 50%' }}>
    {children}
  </div>
);

// =============================================================================
// ITEMS — entrance only, absolute frames
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
    <div style={{ position: 'absolute', left: x, top: y, width: w ?? 'max-content', zIndex: z, opacity: op, transform: `translate(-50%, -50%) translate(${ex}px, ${ey}px) rotate(${rotate + rot}deg) scale(${sc})` }}>
      {children}
    </div>
  );
};

const Cutout: React.FC<{ src: string; x: number; y: number; w: number; at?: number; dur?: number; enter?: Enter; rotate?: number; shadow?: number }> = ({ src, x, y, w, at, dur, enter, rotate, shadow = 2 }) => {
  const s = 5;
  const outline = `drop-shadow(${s}px 0 0 ${VOX.cream}) drop-shadow(-${s}px 0 0 ${VOX.cream}) drop-shadow(0 ${s}px 0 ${VOX.cream}) drop-shadow(0 -${s}px 0 ${VOX.cream}) `;
  const soft = `drop-shadow(0 ${8 * shadow}px ${10 * shadow}px rgba(40,28,12,${0.14 + 0.07 * shadow}))`;
  return (
    <Layer x={x} y={y} w={w} at={at} dur={dur} enter={enter} rotate={rotate}>
      <Img src={src} style={{ width: '100%', display: 'block', filter: outline + soft }} />
    </Layer>
  );
};

const Stamp: React.FC<{ text: string; x: number; y: number; at: number; size?: number; color?: string; rotate?: number }> = ({ text, x, y, at, size = 64, color = VOX.red, rotate = -9 }) => {
  const frame = useCurrentFrame();
  const pr = interpolate(frame, [at, at + 7], [0, 1], { easing: EASE_PLACE, ...clamp });
  return (
    <Layer x={x} y={y} at={at} dur={1} enter="none" rotate={rotate} z={5}>
      <div style={{ opacity: interpolate(pr, [0, 0.4, 1], [0, 0.95, 0.9]), transform: `scale(${interpolate(pr, [0, 1], [2.1, 1], ext)})` }}>
        <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: size, letterSpacing: size * 0.06, textTransform: 'uppercase', color, border: `${Math.max(5, size * 0.09)}px solid ${color}`, borderRadius: size * 0.12, padding: `${size * 0.12}px ${size * 0.3}px`, whiteSpace: 'nowrap', mixBlendMode: 'multiply' }}>
          {text}
        </div>
      </div>
    </Layer>
  );
};

// =============================================================================
// CODED PROPS
// =============================================================================
// smartwatch: the calorie number SPRINTS while the voice says "hundreds of calories"
const WatchDial: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at + 4, at + 66], [0, 1], { easing: EASE_OUT, ...clamp });
  const val = Math.round(6 + (412 - 6) * p);
  return (
    <Layer x={x} y={y} at={at} dur={12} enter={at === 0 ? 'none' : 'pop'}>
      <div style={{ width: 330, height: 390, borderRadius: 64, background: VOX.ink, boxShadow: '0 18px 36px rgba(40,28,12,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 282, height: 342, borderRadius: 44, background: '#171310', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 96, color: VOX.cream, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{val}</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 34, letterSpacing: 4, color: VOX.yellow, marginTop: 10 }}>KCAL</div>
          <svg width="180" height="26" style={{ marginTop: 18 }}>
            <path d="M4 22 L 46 10 L 88 16 L 130 6 L 176 12" fill="none" stroke={VOX.teal} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1.05`} />
          </svg>
        </div>
      </div>
    </Layer>
  );
};

// bathroom scale: needle lands... and refuses to move
const ScaleDial: React.FC<{ x: number; y: number; at: number; happy?: boolean }> = ({ x, y, at, happy = false }) => {
  const frame = useCurrentFrame();
  const settle = interpolate(frame, [at, at + 26], [-52, -10], { easing: EASE_OUT, ...clamp });
  const wobble = frame > at + 26 ? Math.sin((frame - at) * 0.22) * 1.6 : 0;
  const ang = settle + wobble;
  const check = happy ? interpolate(frame, [at + 40, at + 58], [0, 1], { easing: EASE_INOUT, ...clamp }) : 0;
  return (
    <Layer x={x} y={y} at={at} dur={12} enter="place" rotate={-1}>
      <div style={{ width: 400, background: VOX.cream, border: `5px solid ${VOX.ink}`, borderRadius: 26, padding: '26px 26px 18px', boxShadow: '0 14px 30px rgba(40,28,12,0.28)' }}>
        <svg width="348" height="205" viewBox="0 0 348 205">
          <path d="M 34 180 A 150 150 0 0 1 314 180" fill="none" stroke={VOX.inkSoft} strokeWidth={7} strokeLinecap="round" />
          {Array.from({ length: 9 }).map((_, i) => {
            const a = Math.PI + (i / 8) * Math.PI;
            const c = Math.cos(a), s2 = Math.sin(a);
            return <line key={i} x1={174 + c * 128} y1={180 + s2 * 128} x2={174 + c * 146} y2={180 + s2 * 146} stroke={VOX.ink} strokeWidth={5} strokeLinecap="round" />;
          })}
          <g transform={`rotate(${ang} 174 180)`}>
            <line x1={174} y1={180} x2={174} y2={62} stroke={happy ? VOX.teal : VOX.red} strokeWidth={9} strokeLinecap="round" />
          </g>
          <circle cx={174} cy={180} r={17} fill={VOX.ink} />
          {check > 0.01 ? (
            <g transform="translate(268 42)">
              <circle r={34} fill={VOX.teal} opacity={check} />
              <path d="M -15 0 L -4 11 L 17 -12" fill="none" stroke={VOX.cream} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={`${check} 1.05`} />
            </g>
          ) : null}
        </svg>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 44, color: VOX.ink, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>86.4</div>
      </div>
    </Layer>
  );
};

// the simple equation: two paper cards and an arrow
const Equation: React.FC<{ at: number; small?: boolean }> = ({ at, small = false }) => {
  const frame = useCurrentFrame();
  const arrow = interpolate(frame, [at + 52, at + 78], [0, 1], { easing: EASE_INOUT, ...clamp });
  const fs = small ? 40 : 52;
  const card = (txt: string): React.CSSProperties => ({
    fontFamily: FONT_BODY, fontWeight: 800, fontSize: fs, letterSpacing: 1, color: VOX.ink, background: VOX.cream,
    border: `4px solid ${VOX.ink}`, padding: `${fs * 0.42}px ${fs * 0.55}px`, whiteSpace: 'nowrap', boxShadow: '0 8px 18px rgba(40,28,12,0.22)',
  });
  return (
    <>
      <Layer x={small ? 330 : 300} y={820} at={at} dur={12} enter="pop" rotate={-1.5}><div style={card('BURN MORE')}>BURN MORE</div></Layer>
      <Layer x={small ? 760 : 790} y={820} at={at + 30} dur={12} enter="pop" rotate={1.5}><div style={card('LOSE MORE')}>LOSE MORE</div></Layer>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d="M 478 820 L 618 820" fill="none" stroke={VOX.ink} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={`${arrow} 1.05`} />
        {arrow > 0.85 ? <path d="M 596 794 L 624 820 L 596 846" fill="none" stroke={VOX.ink} strokeWidth={8} strokeLinecap="round" /> : null}
      </svg>
    </>
  );
};

// big red X, drawn over whatever it cancels
const XDraw: React.FC<{ at: number; cx?: number; cy?: number; r?: number }> = ({ at, cx = 545, cy = 820, r = 300 }) => {
  const frame = useCurrentFrame();
  const p1 = interpolate(frame, [at, at + 11], [0, 1], { easing: EASE_INOUT, ...clamp });
  const p2 = interpolate(frame, [at + 9, at + 20], [0, 1], { easing: EASE_INOUT, ...clamp });
  if (frame < at) return null;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 6 }}>
      <path d={`M ${cx - r} ${cy - r * 0.62} L ${cx + r} ${cy + r * 0.62}`} stroke={VOX.red} strokeWidth={17} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${p1} 1.05`} />
      <path d={`M ${cx + r} ${cy - r * 0.62} L ${cx - r} ${cy + r * 0.62}`} stroke={VOX.red} strokeWidth={17} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${p2} 1.05`} />
    </svg>
  );
};

// 24-hour day: the workout is one small slice
const DayTimeline: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  return (
    <Layer x={x} y={y} w={920} at={at} dur={1} enter="none">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26, padding: '0 6px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72"><circle cx={36} cy={36} r={17} fill={VOX.yellow} stroke={VOX.ink} strokeWidth={4} />{Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2; return <line key={i} x1={36 + Math.cos(a) * 24} y1={36 + Math.sin(a) * 24} x2={36 + Math.cos(a) * 31} y2={36 + Math.sin(a) * 31} stroke={VOX.ink} strokeWidth={4} strokeLinecap="round" />; })}</svg>
        <svg width="64" height="64" viewBox="0 0 64 64"><path d="M 44 8 A 26 26 0 1 0 44 56 A 20 20 0 1 1 44 8" fill={VOX.inkSoft} /></svg>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const on = interpolate(frame, [at + i * 1.6, at + i * 1.6 + 8], [0, 1], clamp);
          const workout = i === 7;
          const pulse = workout ? 0.72 + 0.28 * Math.sin(frame * 0.18) : 1;
          return <div key={i} style={{ flex: 1, height: 96, border: `3px solid ${VOX.ink}`, background: workout ? VOX.red : VOX.cream, opacity: on * pulse, boxShadow: workout ? '0 0 22px rgba(192,57,43,0.55)' : undefined }} />;
        })}
      </div>
    </Layer>
  );
};

// step counter bleeding out across the afternoon
const StepCounter: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  const v = Math.round(interpolate(frame, [at + 6, at + 78], [10240, 3180], { easing: EASE_INOUT, ...clamp }));
  return (
    <Layer x={x} y={y} at={at} dur={12} enter="rise">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 128, color: VOX.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{v.toLocaleString('en-US')}</div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 42 }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const o = interpolate(frame, [at + 12 + i * 11, at + 12 + i * 11 + 10], [1, 0.14], clamp);
            return (
              <svg key={i} width="46" height="66" viewBox="0 0 46 66" style={{ opacity: o, transform: `rotate(${i % 2 ? 16 : -16}deg)` }}>
                <ellipse cx={23} cy={20} rx={13} ry={18} fill={VOX.inkSoft} />
                <ellipse cx={23} cy={52} rx={10} ry={11} fill={VOX.inkSoft} />
              </svg>
            );
          })}
        </div>
        <svg width="340" height="90" style={{ marginTop: 30 }}>
          <path d="M 20 12 L 300 70" stroke={VOX.red} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={`${interpolate(frame, [at + 8, at + 60], [0, 1], { easing: EASE_INOUT, ...clamp })} 1.05`} />
          <path d="M 268 62 L 302 72 L 288 38" fill="none" stroke={VOX.red} strokeWidth={9} strokeLinecap="round" />
        </svg>
      </div>
    </Layer>
  );
};

const Battery: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [at + 16, at + 92], [88, 9], { easing: EASE_INOUT, ...clamp });
  return (
    <Layer x={x} y={y} at={at} dur={12} enter="pop">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 330, height: 128, border: `7px solid ${VOX.ink}`, borderRadius: 18, padding: 10, background: VOX.cream }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 8, background: pct < 25 ? VOX.red : VOX.teal }} />
        </div>
        <div style={{ width: 22, height: 52, background: VOX.ink, borderRadius: '0 8px 8px 0' }} />
      </div>
    </Layer>
  );
};

// taped video window: B-roll lives inside a photo frame, graded, never full-screen
const TapedClip: React.FC<{ src: string; at: number; dur: number; rotate?: number; filterFrom: string; filterTo: string; drainAt?: number; drainDur?: number }> = ({ src, at, dur, rotate = -2, filterFrom, filterTo, drainAt = 0, drainDur = 1 }) => {
  const inner: React.FC = () => {
    const f = useCurrentFrame(); // local to the Sequence
    const enter = interpolate(f, [0, 14], [0, 1], { easing: EASE_PLACE, ...clamp });
    const zoom = interpolate(f, [0, dur], [1.04, 1.13], clamp);
    const useDrain = drainDur > 1;
    const fp = useDrain ? interpolate(f, [drainAt, drainAt + drainDur], [0, 1], { easing: EASE_INOUT, ...clamp }) : 0;
    const sat = useDrain ? lerp(1, 0, fp) : 1;
    const sep = useDrain ? lerp(0.32, 0.05, fp) : 0.32;
    return (
      <div style={{ position: 'absolute', left: 540, top: 890, transform: `translate(-50%,-50%) rotate(${rotate}deg) scale(${interpolate(enter, [0, 1], [1.24, 1])})`, opacity: interpolate(enter, [0, 0.3, 1], [0, 1, 1]) }}>
        <div style={{ background: VOX.cream, padding: 20, paddingBottom: 26, boxShadow: '0 22px 44px rgba(40,28,12,0.38)', width: 640 }}>
          <div style={{ width: 600, height: 900, overflow: 'hidden', background: '#111' }}>
            <OffthreadVideo src={src} muted startFrom={75} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: `sepia(${sep}) saturate(${sat * 1.12}) contrast(1.05)` }} />
          </div>
        </div>
        <div style={{ position: 'absolute', width: 150, height: 46, background: 'rgba(231,202,137,0.8)', top: -14, left: -38, transform: 'rotate(-38deg)', boxShadow: '0 1px 4px rgba(40,28,12,0.2)' }} />
        <div style={{ position: 'absolute', width: 150, height: 46, background: 'rgba(231,202,137,0.8)', top: -14, right: -38, transform: 'rotate(35deg)', boxShadow: '0 1px 4px rgba(40,28,12,0.2)' }} />
      </div>
    );
  };
  void filterFrom; void filterTo;
  return (
    <Sequence from={at} durationInFrames={dur} layout="none">
      {React.createElement(inner)}
    </Sequence>
  );
};

// hand-drawn red circle over a window (annotation, not text)
const DrawnCircle: React.FC<{ at: number; cx: number; cy: number; rx?: number; ry?: number }> = ({ at, cx, cy, rx = 250, ry = 310 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 20], [0, 1], { easing: EASE_INOUT, ...clamp });
  if (frame < at) return null;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', zIndex: 6 }}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={VOX.red} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1.05`} transform={`rotate(-4 ${cx} ${cy})`} />
    </svg>
  );
};

// evidence card + everyday-activity bars
const EvidenceCard: React.FC<{ at: number }> = ({ at }) => (
  <Layer x={540} y={560} at={at} dur={14} enter="place" rotate={-1.5}>
    <div style={{ width: 720, background: VOX.cream, border: `4px solid ${VOX.ink}`, padding: '38px 44px 30px', boxShadow: '0 16px 34px rgba(40,28,12,0.3)' }}>
      <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: 74, color: VOX.ink, letterSpacing: 1 }}>2023 REVIEW</div>
      <div style={{ height: 16, background: '#ddd2ba', marginTop: 30 }} />
      <div style={{ height: 16, background: '#ddd2ba', marginTop: 16, width: '82%' }} />
      <div style={{ height: 16, background: '#ddd2ba', marginTop: 16, width: '64%' }} />
    </div>
  </Layer>
);

const ActivityChart: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const before = [300, 330, 285, 345, 315];
  const after = [205, 225, 170, 240, 190];
  return (
    <Layer x={540} y={1300} w={880} at={at} dur={1} enter="none">
      <svg width="880" height="520" viewBox="0 0 880 520">
        <line x1={70} y1={450} x2={830} y2={450} stroke={VOX.ink} strokeWidth={6} strokeLinecap="round" />
        {before.map((hgt, i) => {
          const growB = interpolate(frame, [at + i * 4, at + i * 4 + 12], [0, 1], { easing: EASE_OUT, ...clamp });
          const growA = interpolate(frame, [at + 66 + i * 5, at + 66 + i * 5 + 14], [0, 1], { easing: EASE_OUT, ...clamp });
          const x = 110 + i * 148;
          return (
            <g key={i}>
              <rect x={x} y={450 - hgt * growB} width={52} height={hgt * growB} fill="#b9ab8d" />
              <rect x={x + 62} y={450 - after[i] * growA} width={52} height={after[i] * growA} fill={VOX.red} />
            </g>
          );
        })}
        <path d="M 150 90 L 770 240" stroke={VOX.red} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={`${interpolate(frame, [at + 100, at + 126], [0, 1], { easing: EASE_INOUT, ...clamp })} 1.05`} />
        <path d="M 724 224 L 772 244 L 736 268" fill="none" stroke={VOX.red} strokeWidth={9} strokeLinecap="round" />
      </svg>
    </Layer>
  );
};

// three people, three different responses
const ResponseBars: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const targets = [0.88, 0.42, 0.64];
  return (
    <Layer x={540} y={1080} w={860} at={at} dur={1} enter="none">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 560, borderBottom: `7px solid ${VOX.ink}`, padding: '0 30px' }}>
        {targets.map((t, i) => {
          const g = interpolate(frame, [at + i * 14, at + i * 14 + 26], [0, 1], { easing: EASE_OUT, ...clamp });
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <svg width="74" height="74" viewBox="0 0 74 74" style={{ marginBottom: 18, opacity: g }}>
                <circle cx={37} cy={26} r={17} fill={VOX.ink} />
                <path d="M 10 70 A 27 24 0 0 1 64 70 Z" fill={VOX.ink} />
              </svg>
              <div style={{ width: 120, height: 380 * t * g, background: i === 1 ? VOX.teal : i === 0 ? VOX.red : VOX.yellow, border: `4px solid ${VOX.ink}` }} />
            </div>
          );
        })}
      </div>
    </Layer>
  );
};

// closing measures: progress is more than one number
const MeasuresRow: React.FC<{ at: number }> = ({ at }) => {
  const items = [
    <svg key="tape" width="92" height="92" viewBox="0 0 92 92"><circle cx={42} cy={46} r={32} fill="none" stroke={VOX.ink} strokeWidth={8} /><circle cx={42} cy={46} r={13} fill={VOX.ink} /><path d="M 66 24 L 86 10" stroke={VOX.ink} strokeWidth={8} strokeLinecap="round" /></svg>,
    <svg key="bolt" width="92" height="92" viewBox="0 0 92 92"><path d="M 52 6 L 20 52 L 40 52 L 34 86 L 72 36 L 50 36 Z" fill={VOX.yellow} stroke={VOX.ink} strokeWidth={5} strokeLinejoin="round" /></svg>,
    <svg key="bell" width="92" height="92" viewBox="0 0 92 92"><rect x={4} y={30} width={14} height={32} fill={VOX.ink} /><rect x={22} y={22} width={12} height={48} fill={VOX.ink} /><rect x={58} y={22} width={12} height={48} fill={VOX.ink} /><rect x={74} y={30} width={14} height={32} fill={VOX.ink} /><rect x={30} y={40} width={32} height={12} fill={VOX.ink} /></svg>,
  ];
  return (
    <div>
      {items.map((icon, i) => (
        <Layer key={i} x={330 + i * 210} y={1580} at={at + i * 24} dur={11} enter="pop">
          <div style={{ width: 158, height: 158, borderRadius: '50%', background: VOX.cream, border: `5px solid ${VOX.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px rgba(40,28,12,0.25)' }}>
            {icon}
          </div>
        </Layer>
      ))}
    </div>
  );
};

// route + pen (world space)
const WORLD_W = 2100;
const WORLD_H = 8700;
const routeProgress = (r: Flight, frame: number) => EASE_FLY(interpolate(frame, [r.f0, r.f1], [0, 1], clamp));
const Routes: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {ROUTES.map((r, k) => {
        const e = routeProgress(r, frame);
        if (e <= 0.001) return null;
        const d = `M ${r.from.x} ${r.from.y} C ${r.c1.x} ${r.c1.y} ${r.c2.x} ${r.c2.y} ${r.to.x} ${r.to.y}`;
        return (
          <g key={k}>
            <mask id={`rm${k}`} maskUnits="userSpaceOnUse" x={-600} y={-400} width={3400} height={10000}>
              <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={80} strokeDasharray={`${e} 1.2`} />
            </mask>
            <path d={d} fill="none" stroke={VOX.red} strokeWidth={9} strokeLinecap="round" strokeDasharray="26 20" mask={`url(#rm${k})`} />
          </g>
        );
      })}
    </svg>
  );
};
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

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'multiply', opacity: 0.055 }}>
      <svg width="100%" height="100%">
        <filter id="cmgrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(frame / 2)} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cmgrain)" />
      </svg>
    </AbsoluteFill>
  );
};

// =============================================================================
// COMPOSITION
// =============================================================================
const YourBodyHasACountermove: React.FC = () => {
  let outCursor = 0;
  const voiceSeqs = KEPT.map(([s0, s1], i) => {
    const from = Math.round(outCursor * 30);
    const dur = Math.max(1, Math.round((s1 - s0) * 30));
    outCursor += s1 - s0;
    return (
      <Sequence key={i} from={from} durationInFrames={dur} layout="none">
        <Audio src={VOICE} startFrom={Math.round(s0 * 30)} />
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
      <CollageBoard>
        <PaperBG />
        <Routes />

        {/* 0 HOOK — frame 0: our guy already jogging; watch sprints; scale won't move */}
        <Island k={0}>
          {/* Thumbnail frame is already composed: athlete + live calorie counter at frame 0. */}
          <Cutout src={CHAR.starter} x={310} y={1080} w={520} at={0} dur={1} enter="none" rotate={0} />
          <WatchDial x={770} y={700} at={0} />
          <ScaleDial x={730} y={1380} at={118} />
          <Stamp text="Not losing" x={470} y={1700} at={176} size={60} />
        </Island>

        {/* 1 SIMPLE MATH — equation builds, earns its check, then gets cancelled */}
        <Island k={1}>
          <Layer x={540} y={420} at={232} dur={10} enter="pop">
            <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: 210, color: VOX.red, transform: 'rotate(-6deg)' }}>?</div>
          </Layer>
          <Equation at={262} />
          {/* Show both sides of the bad equation: calorie count climbs; scale needle barely moves. */}
          <WatchDial x={280} y={1330} at={286} />
          <ScaleDial x={800} y={1330} at={304} />
          <XDraw at={414} />
        </Island>

        {/* 2 ENTIRE DAY — the workout is one slice of 24 */}
        <Island k={2}>
          <DayTimeline x={540} y={930} at={484} />
        </Island>

        {/* 3 HUNGRIER — B-roll in a taped window, circled, graded warm */}
        <Island k={3}>
          <TapedClip src={VIDEO_EAT} at={558} dur={92} rotate={-2} filterFrom="" filterTo="" />
          <DrawnCircle at={592} cx={560} cy={880} rx={265} ry={330} />
        </Island>

        {/* 4 MOVE LESS — steps bleed away */}
        <Island k={4}>
          <StepCounter x={540} y={760} at={652} />
          <Cutout src={CHAR.belly} x={540} y={1500} w={380} at={676} dur={16} enter="place" rotate={1} />
        </Island>

        {/* 5 EXHAUSTED EVENING — B-roll drains to black & white as the battery empties */}
        <Island k={5}>
          <TapedClip src={VIDEO_COUCH} at={728} dur={112} rotate={2} filterFrom="" filterTo="" drainAt={34} drainDur={62} />
          <Battery x={540} y={1620} at={742} />
        </Island>

        {/* 6 2023 REVIEW — evidence + activity falls */}
        <Island k={6}>
          <EvidenceCard at={850} />
          <ActivityChart at={946} />
        </Island>

        {/* 7 NOT EVERYONE — three different compensations */}
        <Island k={7}>
          <ResponseBars at={1106} />
        </Island>

        {/* 8 NOT 1-TO-1 — the old equation, cancelled for good */}
        <Island k={8}>
          <Equation at={1212} small />
          <XDraw at={1246} cy={820} r={290} />
          <Layer x={545} y={1180} at={1272} dur={10} enter="pop">
            <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: 190, color: VOX.ink }}>≠</div>
          </Layer>
          <Stamp text="Not 1-to-1" x={545} y={1420} at={1286} size={58} color={VOX.ink} rotate={-4} />
        </Island>

        {/* 9 PAYOFF — scale becomes one measure among many */}
        <Island k={9}>
          <ScaleDial x={300} y={620} at={1318} happy />
          <Cutout src={CHAR.payoff} x={700} y={1160} w={540} at={1324} dur={18} enter="place" rotate={1} />
          <Stamp text="Not wasted" x={270} y={1050} at={1330} size={56} color={VOX.teal} rotate={-6} />
          <MeasuresRow at={1442} />
        </Island>

        <Pins />
      </CollageBoard>

      <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(52,38,18,0.26) 100%)' }} />
      <Grain />

      {/* AUDIO — cut voice + docu-pluck + sparse tactile hits */}
      {voiceSeqs}
      <Audio src={MUSIC} volume={0.1} />
      <Sequence from={110} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
      <Sequence from={176} durationInFrames={20}><Audio src={SFX.stamp} volume={0.85} /></Sequence>
      <Sequence from={203} durationInFrames={36}><Audio src={SFX.whoosh} volume={0.45} /></Sequence>
      <Sequence from={262} durationInFrames={50}><Audio src={SFX.pencil} volume={0.4} /></Sequence>
      <Sequence from={408} durationInFrames={36}><Audio src={SFX.riser} volume={0.3} /></Sequence>
      <Sequence from={443} durationInFrames={36}><Audio src={SFX.whoosh} volume={0.45} /></Sequence>
      <Sequence from={528} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={630} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={713} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={826} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={850} durationInFrames={22}><Audio src={SFX.pageFlip} volume={0.5} /></Sequence>
      <Sequence from={1006} durationInFrames={20}><Audio src={SFX.impact} volume={0.5} /></Sequence>
      <Sequence from={1078} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={1183} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={1286} durationInFrames={20}><Audio src={SFX.stamp} volume={0.8} /></Sequence>
      <Sequence from={1293} durationInFrames={30}><Audio src={SFX.whoosh} volume={0.4} /></Sequence>
      <Sequence from={1330} durationInFrames={20}><Audio src={SFX.stamp} volume={0.7} /></Sequence>
      <Sequence from={1442} durationInFrames={16}><Audio src={SFX.pop} volume={0.45} /></Sequence>
      <Sequence from={1466} durationInFrames={16}><Audio src={SFX.pop} volume={0.45} /></Sequence>
      <Sequence from={1490} durationInFrames={16}><Audio src={SFX.pop} volume={0.45} /></Sequence>
    </AbsoluteFill>
  );
};

export default YourBodyHasACountermove;
