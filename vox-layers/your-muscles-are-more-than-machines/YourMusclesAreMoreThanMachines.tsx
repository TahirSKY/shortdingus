/* REMOTION_CONFIG = { fps: 30, durationInFrames: 1492, width: 1080, height: 1920 } */
import React, { createContext } from 'react';
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame } from 'remotion';

// =============================================================================
// YOUR MUSCLES ARE MORE THAN MACHINES — single-file VOX-style composition.
// One persistent paper world; one deliberate camera; every motion is meaningful.
// The 50.2s voice has one genuine silence cut (38.982–39.457), then stays at
// its recorded pitch/rate. Output duration: 49.725s / 1492 frames.
// =============================================================================

const W = 1080;
const H = 1920;
const BOARD_SCALE = 0.68;
const DURATION = 1492;
const COLORS = {
  paper: '#efe6d3', paperLight: '#faf5ea', ink: '#282217', muted: '#766c5b',
  red: '#b74036', redLight: '#df7c67', gold: '#e3b646', goldLight: '#f4d986',
  teal: '#47756b', blue: '#557b88', fiber: '#bb6256', fiberLight: '#dc8a73',
  rule: '#d2c4a9', dark: '#272620',
};
const FONT = 'Arial, Helvetica, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const U = (id: string) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;
const ASSET = {
  voice: U('5ae1c6cd-a5ca-4dc3-8246-8eb89879c085'),
  workout: U('881a39f5-b8fb-496b-9bff-92930b9d05fd'),
  research: U('f99b75fe-48cd-41f5-9f61-56d2d5ca285e'),
  music: U('f4a1ed94-671d-4de6-ba60-43370bfafe68'),
  whoosh: U('8000d709-85ee-4aa4-aad0-9fc84130d93b'),
  page: U('bd1da89a-d920-406c-a3d6-5a42c9e1c773'),
  impact: U('599a8103-6cc7-4b36-8b2c-159af900165a'),
  pencil: U('bf810aca-6f5a-418c-9f60-bb715550934c'),
  pop: U('c52d697f-f404-484e-881d-0349bc9d3b69'),
  stamp: U('72187c30-49d0-4a52-821c-ae1cf92be0be'),
  riser: U('377b15fe-2f65-42df-9c9a-0830ea894bf9'),
};
// Reuse the recurring character from the previous film for continuity. The
// story is about muscle biology, not body transformation.
const CHARACTER = 'https://raw.githubusercontent.com/TahirSKY/shortdingus/refs/heads/arena/e04fa780-shortdingus/vox-layers/when-does-fat-actually-burn/v3/cutouts/char-payoff-run-cutout.png';

const KEPT: [number, number][] = [[0, 38.982], [39.457, 50.2]];
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const EASE_OUT = Easing.bezier(0.33, 1, 0.68, 1);
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.24, 1);
const EASE_FLIGHT = Easing.bezier(0.6, 0, 0.12, 1);
const EASE_PLACE = Easing.bezier(0.22, 1.2, 0.36, 1);

type Point = { x: number; y: number };
type Pose = Point & { z: number };
type Stop = Pose & { a: number; d: number; push?: number; bend?: number; arc?: number; route?: boolean };
const BOARD: Point[] = [
  { x: 540, y: 950 },     // hook: muscle sends a message
  { x: 1400, y: 950 },    // machinery model
  { x: 1400, y: 2500 },   // contract / myokines
  { x: 540, y: 2500 },    // local vs distant signals
  { x: 540, y: 4050 },    // research connections
  { x: 1400, y: 4050 },   // two-way communication
  { x: 1400, y: 5600 },   // caveat / evidence boundary
  { x: 540, y: 5600 },    // final biological communication
];
const worldPose = (island: number, localX: number, localY: number, screenZoom: number): Pose => ({
  x: BOARD[island].x + (localX - W / 2) * BOARD_SCALE,
  y: BOARD[island].y + (localY - H / 2) * BOARD_SCALE,
  z: screenZoom / BOARD_SCALE,
});
const STOPS: Stop[] = [
  { ...worldPose(0, 540, 900, 1.02), a: 0, d: 150, push: 0.015, bend: 100, arc: 0.12, route: true },
  { ...worldPose(1, 540, 900, 1.0), a: 180, d: 383, push: 0.025, bend: 120, arc: 0.14, route: true },
  { ...worldPose(2, 540, 930, 1.04), a: 414, d: 565, push: 0.02, bend: 110, arc: 0.12, route: true },
  { ...worldPose(3, 540, 920, 1.0), a: 595, d: 740, push: 0.02, bend: 120, arc: 0.13, route: true },
  { ...worldPose(4, 540, 930, 1.02), a: 760, d: 995, push: 0.018, bend: 110, arc: 0.12, route: true },
  { ...worldPose(5, 540, 900, 1.0), a: 1020, d: 1161, push: 0.02, bend: 120, arc: 0.13, route: true },
  { ...worldPose(6, 540, 930, 1.0), a: 1172, d: 1308, push: 0.015, bend: 110, arc: 0.12, route: true },
  { ...worldPose(7, 540, 900, 1.03), a: 1325, d: 1415, push: 0.018, bend: 0, arc: 0.06 },
  // Last move is the promised all-island pull-back; keep the map inside the safe frame.
  { x: 970, y: 3275, z: 0.29 / BOARD_SCALE, a: DURATION - 15, d: DURATION - 1, push: 0 },
];
const cubic = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};
type Flight = { f0: number; f1: number; from: Pose; to: Pose; c1: Point; c2: Point; arc: number; route: boolean };
const holdPose = (s: Stop): Pose => ({ x: s.x, y: s.y, z: s.z * (1 + (s.push ?? 0)) });
const FLIGHTS: Flight[] = STOPS.slice(0, -1).map((s, i) => {
  const next = STOPS[i + 1];
  const from = holdPose(s);
  const to: Pose = { x: next.x, y: next.y, z: next.z };
  const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length, ny = dx / length, bend = s.bend ?? 0;
  return {
    f0: s.d, f1: next.a, from, to,
    c1: { x: from.x + dx / 3 + nx * bend, y: from.y + dy / 3 + ny * bend },
    c2: { x: from.x + dx * 2 / 3 - nx * bend, y: from.y + dy * 2 / 3 - ny * bend },
    arc: s.arc ?? 0, route: !!s.route,
  };
});
const flightPose = (fl: Flight, t: number): Pose => {
  const p = cubic(fl.from, fl.c1, fl.c2, fl.to, t);
  const z = Math.exp((1 - t) * Math.log(fl.from.z) + t * Math.log(fl.to.z)) * (1 - fl.arc * Math.sin(Math.PI * t));
  return { x: p.x, y: p.y, z };
};
const cameraAt = (frame: number): Pose => {
  for (let i = 0; i < STOPS.length; i++) {
    const s = STOPS[i];
    if (frame <= s.d) {
      const p = s.d > s.a ? interpolate(frame, [s.a, s.d], [0, 1], clamp) : 1;
      const creep = (s.push ?? 0) * interpolate(p, [0, 1], [0, 1], { easing: EASE_IN_OUT, ...clamp });
      return { x: s.x, y: s.y, z: s.z * (1 + creep) };
    }
    const f = FLIGHTS[i];
    if (f && frame < f.f1) return flightPose(f, EASE_FLIGHT(interpolate(frame, [f.f0, f.f1], [0, 1], clamp)));
  }
  return holdPose(STOPS[STOPS.length - 1]);
};

const CameraContext = createContext<Pose>({ x: 540, y: 960, z: 1 });
const CameraWorld: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${cam.z}) translate(${W / 2 / cam.z - cam.x}px, ${H / 2 / cam.z - cam.y}px)` }}>
        <CameraContext.Provider value={cam}>{children}</CameraContext.Provider>
      </div>
    </AbsoluteFill>
  );
};
const Paper: React.FC = () => <div style={{ position: 'absolute', left: -600, top: -500, width: 3400, height: 8000, backgroundColor: COLORS.paper, backgroundImage: 'radial-gradient(rgba(74,60,40,.13) 1.5px, transparent 2px)', backgroundSize: '52px 52px' }} />;
const Island: React.FC<{ id: number; children: React.ReactNode }> = ({ id, children }) => (
  <div style={{ position: 'absolute', left: BOARD[id].x - W / 2, top: BOARD[id].y - H / 2, width: W, height: H, transform: `scale(${BOARD_SCALE})`, transformOrigin: '50% 50%' }}>{children}</div>
);

// -------------------------- Consistent layer entrance -------------------------
type Enter = 'none' | 'fade' | 'rise' | 'place' | 'pop';
const Layer: React.FC<{ x: number; y: number; w?: number; at?: number; dur?: number; enter?: Enter; rotate?: number; children: React.ReactNode; z?: number }> = ({ x, y, w, at = 0, dur = 12, enter = 'place', rotate = 0, children, z }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const t = interpolate(f, [at, at + dur], [0, 1], { easing: enter === 'place' ? EASE_PLACE : EASE_OUT, ...clamp });
  const dx = enter === 'place' ? 0 : 0;
  const dy = enter === 'rise' ? interpolate(t, [0, 1], [54, 0]) : 0;
  const scale = enter === 'pop' ? interpolate(t, [0, 1], [0.76, 1]) : enter === 'place' ? interpolate(t, [0, 1], [1.12, 1]) : 1;
  const opacity = enter === 'none' ? 1 : interpolate(t, [0, 0.5, 1], [0, 1, 1], clamp);
  return <div style={{ position: 'absolute', left: x, top: y, width: w ?? 'max-content', zIndex: z, opacity, transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${rotate}deg) scale(${scale})` }}>{children}</div>;
};
const Headline: React.FC<{ text: string; x: number; y: number; size?: number; color?: string; at?: number; rotate?: number; align?: 'left' | 'center'; enter?: Enter }> = ({ text, x, y, size = 76, color = COLORS.ink, at = 0, rotate = 0, align = 'center', enter = 'rise' }) => (
  <Layer x={x} y={y} at={at} dur={10} enter={enter} rotate={rotate}>
    <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: 900, lineHeight: 0.98, letterSpacing: -2, color, textAlign: align, maxWidth: 900, textTransform: 'uppercase' }}>{text}</div>
  </Layer>
);
const Cutout: React.FC<{ src: string; x: number; y: number; w: number; at?: number; dur?: number; rotate?: number }> = ({ src, x, y, w, at = 0, dur = 12, rotate = 0 }) => (
  <Layer x={x} y={y} w={w} at={at} dur={dur} enter="place" rotate={rotate} z={7}>
    <Img
      src={src}
      style={{
        width: '100%',
        display: 'block',
        filter: 'drop-shadow(5px 0 0 #faf5ea) drop-shadow(-5px 0 0 #faf5ea) drop-shadow(0 5px 0 #faf5ea) drop-shadow(0 -5px 0 #faf5ea) drop-shadow(0 12px 16px rgba(40,34,23,.28))',
      }}
    />
  </Layer>
);

const SmallLabel: React.FC<{ text: string; x: number; y: number; at: number; color?: string; bg?: string; size?: number; rotate?: number }> = ({ text, x, y, at, color = COLORS.ink, bg = COLORS.goldLight, size = 28, rotate = -2 }) => (
  <Layer x={x} y={y} at={at} dur={8} enter="place" rotate={rotate} z={8}>
    <div style={{ fontFamily: FONT, fontSize: size, letterSpacing: 3, fontWeight: 800, color, background: bg, padding: '12px 22px', border: `2px solid ${COLORS.ink}`, boxShadow: '0 7px 12px rgba(40,34,23,.19)', whiteSpace: 'nowrap' }}>{text}</div>
  </Layer>
);
const Stamp: React.FC<{ text: string; x: number; y: number; at: number; color?: string; size?: number; rotate?: number }> = ({ text, x, y, at, color = COLORS.red, size = 42, rotate = -7 }) => (
  <Layer x={x} y={y} at={at} dur={8} enter="place" rotate={rotate} z={9}>
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color, border: `5px solid ${color}`, padding: '13px 23px', mixBlendMode: 'multiply', whiteSpace: 'nowrap' }}>{text}</div>
  </Layer>
);

// -------------------------- Biological illustrations -------------------------
const FiberBundle: React.FC<{ x: number; y: number; w?: number; h?: number; at: number; compact?: boolean }> = ({ x, y, w = 760, h = 400, at, compact = false }) => {
  const f = useCurrentFrame();
  const local = Math.max(0, f - at);
  const pulse = f < at ? 1 : 1 - 0.035 * Math.max(0, Math.sin(local * 0.18));
  const squeeze = interpolate(f, [at + 20, at + 34, at + 48, at + 62], [1, 0.95, 1.02, 1], { easing: EASE_IN_OUT, ...clamp });
  const count = compact ? 3 : 5;
  return (
    <Layer x={x} y={y} w={w} at={at} dur={compact ? 8 : 14} enter={compact ? 'none' : 'place'}>
      <svg width={w} height={h} viewBox="0 0 760 400" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`fiberGrad${compact ? 'c' : 'b'}`} x1="0" y1="0" x2="0.95" y2="1">
            <stop offset="0" stopColor={COLORS.fiberLight} /><stop offset="0.52" stopColor={COLORS.fiber} /><stop offset="1" stopColor="#85433e" />
          </linearGradient>
          <filter id={`fiberShadow${compact ? 'c' : 'b'}`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="13" stdDeviation="9" floodColor="#35251d" floodOpacity=".22" /></filter>
        </defs>
        <g transform={`translate(380 200) scale(${squeeze * pulse} 1) translate(-380 -200)`} filter={`url(#fiberShadow${compact ? 'c' : 'b'})`}>
          {Array.from({ length: count }).map((_, i) => {
            const yy = 62 + i * (compact ? 88 : 68);
            return <g key={i}>
              <path d={`M 34 ${yy + 27} C 190 ${yy - 21}, 555 ${yy - 19}, 726 ${yy + 26} C 568 ${yy + 73}, 192 ${yy + 78}, 34 ${yy + 27} Z`} fill={`url(#fiberGrad${compact ? 'c' : 'b'})`} stroke="#653a35" strokeWidth="5" />
              <path d={`M 55 ${yy + 27} C 240 ${yy + 5}, 500 ${yy + 5}, 705 ${yy + 28}`} fill="none" stroke="rgba(255,231,199,.48)" strokeWidth="4" />
              {Array.from({ length: 9 }).map((__, j) => <line key={j} x1={125 + j * 65} y1={yy + 7} x2={130 + j * 65} y2={yy + 48} stroke="rgba(94,42,39,.35)" strokeWidth="3" />)}
            </g>;
          })}
        </g>
        {!compact && <g opacity=".95"><path d="M 22 60 C 0 126,0 275,26 342" fill="none" stroke={COLORS.ink} strokeWidth="7" strokeLinecap="round" /><path d="M 738 58 C 760 125,760 273,735 342" fill="none" stroke={COLORS.ink} strokeWidth="7" strokeLinecap="round" /></g>}
      </svg>
    </Layer>
  );
};

const ParticleBurst: React.FC<{ x: number; y: number; at: number; scale?: number; color?: string }> = ({ x, y, at, scale = 1, color = COLORS.gold }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 68], [0, 1], clamp);
  const particles = [
    { dx: -180, dy: -130, delay: 0 }, { dx: -65, dy: -205, delay: 4 }, { dx: 70, dy: -152, delay: 9 },
    { dx: 180, dy: -80, delay: 14 }, { dx: 130, dy: 46, delay: 18 }, { dx: -100, dy: 60, delay: 23 },
    { dx: 40, dy: -285, delay: 28 }, { dx: 245, dy: -210, delay: 34 },
  ];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const q = interpolate(f, [at + p.delay, at + p.delay + 46], [0, 1], clamp);
        const r = i % 3 === 0 ? 17 : 12;
        return <g key={i} transform={`translate(${x + p.dx * q * scale} ${y + p.dy * q * scale})`} opacity={q > 0.96 ? interpolate(q, [0.96, 1], [1, 0.3], clamp) : q}>
          <circle r={r + 7} fill={color} opacity=".18" /><circle r={r} fill={color} stroke={COLORS.ink} strokeWidth="3" />
          {i % 2 === 0 && <circle r={r * 0.3} fill={COLORS.paperLight} />}
        </g>;
      })}
    </svg>
  );
};

const TravelingSignals: React.FC<{ at: number; from: Point[]; to: Point[]; color?: string; duration?: number }> = ({ at, from, to, color = COLORS.gold, duration = 120 }) => {
  const f = useCurrentFrame();
  const pts = [0, 1, 2, 3, 4];
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
    {pts.map((i) => {
      const start = at + i * 12;
      const t = interpolate(f, [start, start + duration], [0, 1], clamp);
      const a = from[i % from.length], b = to[i % to.length];
      const c1 = { x: a.x + (b.x - a.x) * 0.35, y: a.y - 100 };
      const c2 = { x: a.x + (b.x - a.x) * 0.72, y: b.y - 100 };
      const p = cubic(a, c1, c2, b, t);
      return <g key={i} opacity={interpolate(t, [0, 0.08, 0.92, 1], [0, 1, 1, 0], clamp)} transform={`translate(${p.x} ${p.y})`}>
        <circle r="18" fill={color} opacity=".18" /><circle r="10" fill={color} stroke={COLORS.ink} strokeWidth="2.5" /><circle r="3" fill={COLORS.paperLight} />
      </g>;
    })}
  </svg>;
};

// ------------------------------- Video windows -------------------------------
const TapeWindow: React.FC<{ src: string; at: number; dur: number; x: number; y: number; w: number; h: number; rotate?: number; grade?: 'warm' | 'cool' | 'mono'; startFrom?: number; instant?: boolean }> = ({ src, at, dur, x, y, w, h, rotate = -2, grade = 'warm', startFrom = 0, instant = false }) => (
  <Sequence from={at} durationInFrames={dur} layout="none">
    <TapeWindowInner src={src} x={x} y={y} w={w} h={h} rotate={rotate} grade={grade} startFrom={startFrom} instant={instant} />
  </Sequence>
);
const TapeWindowInner: React.FC<{ src: string; x: number; y: number; w: number; h: number; rotate: number; grade: 'warm' | 'cool' | 'mono'; startFrom: number; instant: boolean }> = ({ src, x, y, w, h, rotate, grade, startFrom, instant }) => {
  const f = useCurrentFrame();
  const t = instant ? 1 : interpolate(f, [0, 13], [0, 1], { easing: EASE_OUT, ...clamp });
  const filter = grade === 'warm' ? 'sepia(.22) saturate(1.08) contrast(1.06)' : grade === 'cool' ? 'saturate(.82) contrast(1.08) hue-rotate(8deg)' : 'grayscale(1) contrast(1.08)';
  return <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rotate}deg) scale(${interpolate(t, [0, 1], [1.08, 1])})`, opacity: t, zIndex: 4 }}>
    <div style={{ background: COLORS.paperLight, padding: 17, paddingBottom: 22, boxShadow: '0 18px 32px rgba(38,29,18,.28)', border: `1px solid ${COLORS.rule}` }}>
      <div style={{ width: w, height: h, overflow: 'hidden', background: COLORS.dark }}>
        <OffthreadVideo src={src} muted startFrom={startFrom} style={{ width: '100%', height: '100%', objectFit: 'cover', filter, transform: `scale(${1.035 + 0.025 * t})` }} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: -27, top: -14, width: 105, height: 30, background: 'rgba(224,191,125,.8)', transform: 'rotate(-31deg)', boxShadow: '0 2px 4px rgba(30,24,16,.16)' }} />
    <div style={{ position: 'absolute', right: -25, top: -14, width: 105, height: 30, background: 'rgba(224,191,125,.8)', transform: 'rotate(31deg)', boxShadow: '0 2px 4px rgba(30,24,16,.16)' }} />
  </div>;
};

// ------------------------------ Mechanism scene ------------------------------
const MachineModel: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const bend = interpolate(f, [at, at + 20, at + 38, at + 58], [0, -23, 5, 0], { easing: EASE_IN_OUT, ...clamp });
  const gearRotation = interpolate(f, [at, at + 96], [0, 360], clamp);
  const teeth = Array.from({ length: 10 });
  return <Layer x={540} y={1110} w={800} at={at} dur={12} enter="place">
    <svg width="820" height="720" viewBox="0 0 820 720" style={{ overflow: 'visible' }}>
      {/* skeletal lever and joint */}
      <path d="M 165 525 L 360 330 L 534 450 L 676 278" fill="none" stroke={COLORS.paperLight} strokeWidth="64" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 165 525 L 360 330 L 534 450 L 676 278" fill="none" stroke={COLORS.ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="360" cy="330" r="31" fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="7" />
      <circle cx="534" cy="450" r="26" fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="7" />
      {/* motor shaft */}
      <g transform={`rotate(${bend} 355 330)`}>
        <path d="M 110 310 C 170 235 292 230 360 300 C 405 348 400 429 350 468 C 278 522 168 482 128 419 Z" fill={COLORS.fiber} stroke={COLORS.ink} strokeWidth="7" />
        <path d="M 139 326 C 200 270 294 272 344 316" fill="none" stroke={COLORS.fiberLight} strokeWidth="15" strokeLinecap="round" />
        <path d="M 144 406 C 208 454 285 456 338 420" fill="none" stroke="#87433c" strokeWidth="10" strokeLinecap="round" />
      </g>
      {/* gear, then stops on the "another job" reveal */}
      <g transform={`rotate(${gearRotation} 654 542)`}>
        <circle cx="654" cy="542" r="94" fill={COLORS.goldLight} stroke={COLORS.ink} strokeWidth="7" />
        <circle cx="654" cy="542" r="35" fill={COLORS.paper} stroke={COLORS.ink} strokeWidth="7" />
        {teeth.map((_, i) => { const a = i * Math.PI / 5; return <rect key={i} x={649} y={435} width="10" height="29" rx="3" fill={COLORS.ink} transform={`rotate(${i * 36} 654 542)`} />; })}
      </g>
      <path d="M 80 600 L 735 600" stroke={COLORS.rule} strokeWidth="4" strokeDasharray="10 12" />
    </svg>
  </Layer>;
};

// ------------------------------ Tissue and map -------------------------------
const CellMembrane: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const open = interpolate(f, [at + 28, at + 45, at + 70], [0, 1, 1], { easing: EASE_IN_OUT, ...clamp });
  return <Layer x={540} y={1250} w={900} at={at} dur={12} enter="fade">
    <svg width="920" height="700" viewBox="0 0 920 700" style={{ overflow: 'visible' }}>
      <ellipse cx="460" cy="350" rx="355" ry="250" fill="#f8e8d8" stroke={COLORS.ink} strokeWidth="8" />
      <ellipse cx="460" cy="350" rx="318" ry="215" fill="#e9c9b3" stroke={COLORS.red} strokeWidth="9" strokeDasharray="18 11" />
      <g transform={`translate(460 350) scale(.76)`}>
        {[0, 1, 2].map((i) => {
          const yy = -72 + i * 70;
          return <g key={i}>
            <path d={`M -320 ${yy + 20} C -160 ${yy - 22}, 165 ${yy - 22}, 320 ${yy + 20} C 150 ${yy + 61}, -155 ${yy + 61}, -320 ${yy + 20} Z`} fill={COLORS.fiber} stroke={COLORS.ink} strokeWidth="6" />
            <path d={`M -288 ${yy + 18} C -120 ${yy + 5}, 120 ${yy + 5}, 288 ${yy + 18}`} fill="none" stroke={COLORS.fiberLight} strokeWidth="6" strokeLinecap="round" />
          </g>;
        })}
      </g>
      {/* vesicle-like packet opening in the membrane */}
      <g transform={`translate(${460 + 345 * open} ${260 - 48 * open})`}>
        <circle r={58} fill={COLORS.goldLight} stroke={COLORS.ink} strokeWidth="7" />
        <circle cx="-18" cy="-8" r="10" fill={COLORS.red} /><circle cx="16" cy="18" r="10" fill={COLORS.red} /><circle cx="19" cy="-19" r="8" fill={COLORS.red} />
      </g>
      <path d={`M ${460 + 345 * open} ${260 - 48 * open} Q 730 160 800 110`} fill="none" stroke={COLORS.gold} strokeWidth="7" strokeDasharray="13 12" opacity={open} />
    </svg>
  </Layer>;
};

const BodyMap: React.FC<{ x: number; y: number; scale?: number; at: number; showLabels?: boolean }> = ({ x, y, scale = 1, at, showLabels = false }) => {
  const f = useCurrentFrame();
  const signal = interpolate(f, [at + 8, at + 54], [0, 1], { easing: EASE_IN_OUT, ...clamp });
  const points = [
    { x: 310, y: 140, label: 'BRAIN', c: COLORS.blue },
    { x: 175, y: 340, label: 'BONE', c: COLORS.gold },
    { x: 430, y: 370, label: 'FAT', c: COLORS.redLight },
    { x: 300, y: 565, label: 'MUSCLE', c: COLORS.fiber },
  ];
  return <Layer x={x} y={y} w={scale * 720} at={at} dur={12} enter="rise">
    <svg width={720 * scale} height={760 * scale} viewBox="0 0 720 760" style={{ overflow: 'visible' }}>
      <g transform="translate(0 10)">
        <circle cx="310" cy="92" r="57" fill={COLORS.paperLight} stroke={COLORS.ink} strokeWidth="7" />
        <path d="M 275 157 C 214 186 193 243 214 314 L 234 421 L 203 592 L 266 600 L 312 430 L 359 600 L 421 592 L 389 421 L 408 314 C 429 243 405 186 345 157 Z" fill="#ead8bf" stroke={COLORS.ink} strokeWidth="8" strokeLinejoin="round" />
        <path d="M 218 246 L 106 380 L 139 408 L 258 310 M 405 246 L 512 382 L 483 409 L 369 309" fill="none" stroke={COLORS.ink} strokeWidth="29" strokeLinecap="round" />
        <path d="M 275 615 L 255 724 M 356 615 L 382 724" stroke={COLORS.ink} strokeWidth="31" strokeLinecap="round" />
      </g>
      {/* Connections draw one at a time; nodes brighten only when the signal reaches them. */}
      {points.map((p, i) => {
        const from = { x: 310, y: 525 };
        const progress = interpolate(f, [at + 14 + i * 8, at + 34 + i * 8], [0, 1], { easing: EASE_OUT, ...clamp });
        const tx = from.x + (p.x - from.x) * progress;
        const ty = from.y + (p.y - from.y) * progress;
        const op = interpolate(f, [at + 12 + i * 8, at + 22 + i * 8], [0, 0.9], clamp);
        return <g key={p.label}>
          <path d={`M ${from.x} ${from.y} Q ${(from.x + p.x) / 2 + (i % 2 ? 45 : -45)} ${(from.y + p.y) / 2} ${tx} ${ty}`} fill="none" stroke={p.c} strokeWidth="6" strokeDasharray="12 10" opacity={op} />
          <circle cx={tx} cy={ty} r={12 + progress * 7} fill={p.c} stroke={COLORS.paperLight} strokeWidth="4" opacity={op} />
          {showLabels && progress > 0.92 && <text x={p.x + 30} y={p.y + 10} fontFamily={FONT} fontSize="23" fontWeight="800" letterSpacing="2" fill={COLORS.ink}>{p.label}</text>}
        </g>;
      })}
      <circle cx="310" cy="525" r={15 + signal * 5} fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="4" />
    </svg>
  </Layer>;
};

const SystemsNetwork: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const nodes = [
    { x: 145, y: 180, r: 72, type: 'brain' }, { x: 380, y: 144, r: 58, type: 'bone' },
    { x: 635, y: 196, r: 70, type: 'fat' }, { x: 240, y: 465, r: 68, type: 'met' },
    { x: 510, y: 485, r: 72, type: 'inflam' }, { x: 386, y: 735, r: 61, type: 'muscle' },
  ];
  const reveal = interpolate(f, [at, at + 38], [0, 1], { easing: EASE_IN_OUT, ...clamp });
  const pathD = `M 386 735 C 160 650, 100 360, 145 180 C 230 80, 310 100, 380 144 C 510 75, 595 112, 635 196 C 700 340, 650 435, 510 485 C 390 565, 282 550, 240 465 C 210 360, 320 250, 386 144`;
  return <Layer x={540} y={1100} w={850} at={at} dur={10} enter="fade">
    <svg width="850" height="950" viewBox="0 0 780 920" style={{ overflow: 'visible' }}>
      <path d={pathD} fill="none" stroke={COLORS.rule} strokeWidth="8" strokeDasharray="13 13" />
      <path d={pathD} fill="none" stroke={COLORS.red} strokeWidth="8" strokeDasharray={`${reveal} 1.05`} pathLength="1" />
      {nodes.map((n, i) => {
        const p = interpolate(f, [at + 5 + i * 5, at + 20 + i * 5], [0, 1], { easing: EASE_OUT, ...clamp });
        const color = i === 0 ? COLORS.blue : i === 1 ? COLORS.gold : i === 2 ? COLORS.redLight : i === 3 ? COLORS.teal : i === 4 ? COLORS.fiber : COLORS.red;
        return <g key={n.type} transform={`translate(${n.x} ${n.y}) scale(${p})`}>
          <circle r={n.r} fill={COLORS.paperLight} stroke={COLORS.ink} strokeWidth="6" />
          <circle r={n.r - 13} fill={color} opacity=".32" />
          {n.type === 'brain' ? <path d="M -28 -12 C -53 -48,-5 -59,5 -31 C 31 -53,52 -20,26 -3 C 48 23,22 46,2 27 C -20 50,-48 26,-27 9 Z" fill={color} stroke={COLORS.ink} strokeWidth="4" /> : null}
          {n.type === 'bone' ? <g transform="rotate(-35)"><path d="M -46 0 C -50 -26,-29 -38,-16 -20 L 16 20 C 29 38,50 26,46 0 C 50 -26,29 -38,16 -20 L -16 20 C -29 38,-50 26,-46 0 Z" fill={color} stroke={COLORS.ink} strokeWidth="4" /></g> : null}
          {n.type === 'fat' ? <g fill={color} stroke={COLORS.ink} strokeWidth="3"><circle cx="-25" cy="-12" r="22"/><circle cx="17" cy="-26" r="19"/><circle cx="23" cy="17" r="25"/><circle cx="-20" cy="25" r="17"/></g> : null}
          {n.type === 'met' ? <g stroke={COLORS.ink} strokeWidth="7" strokeLinecap="round"><path d="M -29 17 L -29 -4 M -9 17 L -9 -30 M 11 17 L 11 -16 M 31 17 L 31 -42"/><path d="M -36 28 L 36 28"/></g> : null}
          {n.type === 'inflam' ? <g fill="none" stroke={color} strokeWidth="7"><circle r="31"/><circle r="15"/><path d="M 0 -50 L 0 -35 M 50 0 L 35 0 M 0 50 L 0 35 M -50 0 L -35 0"/></g> : null}
          {n.type === 'muscle' ? <g fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"><path d="M -34 -22 C -8 -43,14 -42,35 -20 M -38 0 C -6 -21,12 21,39 0 M -32 23 C -10 5,12 44,33 22"/></g> : null}
        </g>;
      })}
    </svg>
  </Layer>;
};

// ------------------------------- Two-way loop -------------------------------
const TwoWayCircuit: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const top = interpolate(f, [at + 12, at + 42], [0, 1], { easing: EASE_IN_OUT, ...clamp });
  const bottom = interpolate(f, [at + 58, at + 90], [0, 1], { easing: EASE_IN_OUT, ...clamp });
  return <Layer x={540} y={1000} w={900} at={at} dur={12} enter="place">
    <svg width="920" height="1030" viewBox="0 0 920 1030" style={{ overflow: 'visible' }}>
      {/* brain sends the familiar command down */}
      <circle cx="460" cy="105" r="86" fill={COLORS.blue} stroke={COLORS.ink} strokeWidth="8" />
      <path d="M 419 110 C 426 55,490 55,499 105 C 544 115,516 165,480 150 C 456 183,408 155,419 110 Z" fill="#d4e0df" stroke={COLORS.ink} strokeWidth="5" />
      <path d="M 460 199 L 460 500" stroke={COLORS.ink} strokeWidth="18" strokeLinecap="round" pathLength="1" strokeDasharray={`${top} 1.05`} />
      <path d="M 429 466 L 460 510 L 491 466" fill="none" stroke={COLORS.ink} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity={top} />
      {/* muscle sends its own signal back out and around */}
      <FiberBundle x={460} y={640} w={660} h={350} at={at + 30} compact />
      <path d="M 500 565 C 760 500, 800 316, 682 222" fill="none" stroke={COLORS.red} strokeWidth="13" strokeLinecap="round" pathLength="1" strokeDasharray={`${bottom} 1.05`} />
      <path d="M 649 218 L 688 211 L 692 251" fill="none" stroke={COLORS.red} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity={bottom} />
      <g opacity={bottom}>
        <circle cx="735" cy="415" r="19" fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="4" />
        <circle cx="780" cy="375" r="12" fill={COLORS.goldLight} stroke={COLORS.ink} strokeWidth="3" />
        <circle cx="735" cy="470" r="9" fill={COLORS.red} />
      </g>
      <path d="M 460 209 L 460 500" stroke={COLORS.blue} strokeWidth="5" strokeDasharray="7 15" opacity=".7" />
    </svg>
  </Layer>;
};

// ------------------------------- Evidence edge -------------------------------
const EvidenceBoundary: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const solid = interpolate(f, [at + 4, at + 24], [0, 1], { easing: EASE_IN_OUT, ...clamp });
  const dashed = interpolate(f, [at + 34, at + 70], [0, 1], { easing: EASE_IN_OUT, ...clamp });
  return <Layer x={540} y={1100} w={920} at={at} dur={8} enter="fade">
    <svg width="930" height="850" viewBox="0 0 930 850" style={{ overflow: 'visible' }}>
      <rect x="86" y="96" width="350" height="235" rx="30" fill={COLORS.fiber} stroke={COLORS.ink} strokeWidth="7" opacity={solid} />
      <rect x="500" y="96" width="350" height="235" rx="30" fill={COLORS.paperLight} stroke={COLORS.ink} strokeWidth="7" strokeDasharray="15 14" opacity={dashed} />
      <path d="M 437 214 L 498 214" stroke={COLORS.ink} strokeWidth="8" pathLength="1" strokeDasharray={`${dashed} 1.05`} />
      <path d="M 473 191 L 500 214 L 473 237" fill="none" stroke={COLORS.ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity={dashed} />
      {/* solid known pathway, dotted proposed effect */}
      <g transform="translate(260 210)" fill="none" stroke={COLORS.paperLight} strokeWidth="9" strokeLinecap="round">
        <path d="M -88 5 C -45 -72,45 -72,88 5 M -80 34 C -42 85,42 85,80 34" />
        <circle cx="0" cy="0" r="23" fill={COLORS.goldLight} stroke={COLORS.ink} strokeWidth="4" />
      </g>
      <g transform="translate(676 210)" opacity={dashed}>
        <circle cx="0" cy="0" r="26" fill={COLORS.gold} stroke={COLORS.ink} strokeWidth="4" />
        <circle cx="-65" cy="-48" r="14" fill={COLORS.blue} /><circle cx="70" cy="-42" r="14" fill={COLORS.redLight} />
        <circle cx="-62" cy="51" r="14" fill={COLORS.teal} /><circle cx="67" cy="48" r="14" fill={COLORS.gold} />
      </g>
      <text x="260" y="400" textAnchor="middle" fontFamily={FONT} fontSize="28" fontWeight="800" letterSpacing="3" fill={COLORS.ink} opacity={solid}>OBSERVED</text>
      <text x="676" y="400" textAnchor="middle" fontFamily={FONT} fontSize="28" fontWeight="800" letterSpacing="3" fill={COLORS.ink} opacity={dashed}>PROPOSED</text>
      <path d="M 102 475 L 820 475" stroke={COLORS.rule} strokeWidth="5" />
      <text x="465" y="542" textAnchor="middle" fontFamily={SERIF} fontSize="40" fontWeight="700" fill={COLORS.ink} opacity={dashed}>EVIDENCE IS STILL DEVELOPING</text>
    </svg>
  </Layer>;
};

// -------------------------------- Route layer --------------------------------
const BOARD_WIDTH = 2200;
const BOARD_HEIGHT = 7600;
const ROUTES = FLIGHTS.filter((f) => f.route);
const RouteLine: React.FC = () => {
  const f = useCurrentFrame();
  return <svg width={BOARD_WIDTH} height={BOARD_HEIGHT} viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
    {ROUTES.map((r, i) => {
      const t = interpolate(f, [r.f0, r.f1], [0, 1], clamp);
      const path = `M ${r.from.x} ${r.from.y} C ${r.c1.x} ${r.c1.y} ${r.c2.x} ${r.c2.y} ${r.to.x} ${r.to.y}`;
      return <g key={i} opacity=".58">
        <defs><mask id={`route-mask-${i}`} maskUnits="userSpaceOnUse" x={-600} y={-500} width={3400} height={8000}>
          <path d={path} fill="none" stroke="white" strokeWidth="44" strokeLinecap="round" pathLength="1" strokeDasharray={`${t} 1.05`} />
        </mask></defs>
        <path d={path} fill="none" stroke={COLORS.rule} strokeWidth="18" strokeLinecap="round" />
        <path d={path} fill="none" stroke={COLORS.red} strokeWidth="8" strokeLinecap="round" strokeDasharray="19 16" mask={`url(#route-mask-${i})`} />
      </g>;
    })}
  </svg>;
};
const RoutePins: React.FC = () => {
  const f = useCurrentFrame();
  return <svg width={BOARD_WIDTH} height={BOARD_HEIGHT} viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
    {ROUTES.map((r, i) => {
      if (f < r.f0 || f > r.f1) return null;
      const t = EASE_FLIGHT(interpolate(f, [r.f0, r.f1], [0, 1], clamp));
      const p = cubic(r.from, r.c1, r.c2, r.to, t);
      const progress = Math.max(0, Math.min(1, (f - r.f0) / Math.max(1, r.f1 - r.f0)));
      const op = Math.max(0, Math.min(1, progress / 0.18, (1 - progress) / 0.18));
      return <g key={i} transform={`translate(${p.x} ${p.y})`} opacity={op}><circle r="22" fill={COLORS.red} stroke={COLORS.paperLight} strokeWidth="7"/><circle r="6" fill={COLORS.paperLight}/></g>;
    })}
  </svg>;
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.045, mixBlendMode: 'multiply' }}>
    <svg width="100%" height="100%"><filter id="musclegrain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} seed={Math.floor(f / 2)} stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#musclegrain)"/></svg>
  </AbsoluteFill>;
};

// =============================================================================
// Composition
// =============================================================================
const YourMusclesAreMoreThanMachines: React.FC = () => {
  let outputSeconds = 0;
  const voice = KEPT.map(([sourceIn, sourceOut], i) => {
    const start = Math.round(outputSeconds * 30);
    const length = Math.round((sourceOut - sourceIn) * 30);
    outputSeconds += sourceOut - sourceIn;
    return <Sequence key={i} from={start} durationInFrames={length} layout="none"><Audio src={ASSET.voice} startFrom={Math.round(sourceIn * 30)} /></Sequence>;
  });
  return <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
    <CameraWorld>
      <Paper />
      <RouteLine />

      {/* 0 — Hook. Real movement in a designed frame; muscle sends a visible message. */}
      <Island id={0}>
        <Headline text="A MUSCLE CAN SEND A MESSAGE" x={540} y={390} size={76} at={0} enter="none" />
        <TapeWindow src={ASSET.workout} at={0} dur={164} x={320} y={1150} w={420} h={650} rotate={-2} grade="warm" startFrom={18} instant />
        <FiberBundle x={765} y={1050} w={610} h={340} at={0} compact />
        <ParticleBurst x={715} y={890} at={53} scale={0.9} />
        <SmallLabel text="SIGNAL OUT" x={760} y={1450} at={86} size={24} color={COLORS.paperLight} bg={COLORS.red} rotate={3} />
      </Island>

      {/* 1 — The old machine metaphor, made literally mechanical. */}
      <Island id={1}>
        <Headline text="WE THOUGHT IT WAS A MACHINE" x={540} y={440} size={68} at={180} />
        <MachineModel at={188} />
        <SmallLabel text="CONTRACT → MOVE" x={540} y={1580} at={268} size={25} bg={COLORS.goldLight} />
        <Stamp text="BUT…" x={540} y={1745} at={350} size={38} color={COLORS.red} rotate={-3} />
      </Island>

      {/* 2 — Contraction releases myokines: code-built cutaway + molecules. */}
      <Island id={2}>
        <Headline text="ANOTHER JOB" x={540} y={390} size={88} at={414} />
        <FiberBundle x={540} y={980} w={820} h={430} at={420} />
        <CellMembrane at={435} />
        <ParticleBurst x={800} y={820} at={464} scale={1.1} color={COLORS.goldLight} />
        <SmallLabel text="MYOKINES" x={540} y={1570} at={487} size={34} bg={COLORS.goldLight} rotate={-1} />
      </Island>

      {/* 3 — One local loop, then a longer route to distant tissues. */}
      <Island id={3}>
        <Headline text="MOLECULAR MESSAGES" x={540} y={365} size={72} at={595} />
        <BodyMap x={540} y={1120} at={600} scale={0.95} />
        <SmallLabel text="LOCAL" x={230} y={1210} at={615} size={26} color={COLORS.paperLight} bg={COLORS.teal} rotate={-4} />
        <SmallLabel text="ELSEWHERE" x={790} y={1500} at={668} size={26} color={COLORS.paperLight} bg={COLORS.red} rotate={3} />
        <TravelingSignals at={634} from={[{ x: 515, y: 925 }, { x: 520, y: 940 }, { x: 535, y: 930 }, { x: 510, y: 950 }, { x: 540, y: 940 }]} to={[{ x: 520, y: 820 }, { x: 420, y: 700 }, { x: 650, y: 820 }, { x: 390, y: 1120 }, { x: 600, y: 1100 }]} duration={96} />
      </Island>

      {/* 4 — Researchers are studying the connections; diagram stays cautious. */}
      <Island id={4}>
        <Headline text="A SIGNALING NETWORK" x={540} y={355} size={72} at={760} />
        <TapeWindow src={ASSET.research} at={765} dur={238} x={305} y={1160} w={370} h={580} rotate={-2} grade="cool" startFrom={10} />
        <SystemsNetwork at={786} />
        <SmallLabel text="UNDER STUDY" x={555} y={1700} at={930} size={25} color={COLORS.paperLight} bg={COLORS.blue} rotate={2} />
      </Island>

      {/* 5 — Two-way traffic: brain commands down; muscle sends signals back out. */}
      <Island id={5}>
        <Headline text="MUSCLE ISN'T JUST LISTENING" x={540} y={370} size={67} at={1020} />
        <TwoWayCircuit at={1022} />
        <SmallLabel text="SIGNALS OF ITS OWN" x={540} y={1690} at={1120} size={25} color={COLORS.paperLight} bg={COLORS.red} rotate={-2} />
      </Island>

      {/* 6 — Crucial honesty beat. Dashed pathways = proposed, not established. */}
      <Island id={6}>
        <Headline text="STILL A LOT TO LEARN" x={540} y={410} size={78} at={1172} />
        <EvidenceBoundary at={1190} />
        <Stamp text="NOT ALL CONFIRMED" x={540} y={1610} at={1250} size={30} color={COLORS.ink} rotate={-2} />
      </Island>

      {/* 7 — Close on movement as biological communication, then reveal the map. */}
      <Island id={7}>
        <Headline text="MOVEMENT IS BIOLOGICAL COMMUNICATION" x={540} y={420} size={63} at={1325} />
        <Cutout src={CHARACTER} x={255} y={1190} w={380} at={1325} dur={10} />
        <BodyMap x={720} y={1120} at={1340} scale={0.72} />
        <ParticleBurst x={650} y={820} at={1370} scale={0.78} color={COLORS.goldLight} />
        <SmallLabel text="THE BODY TALKS BACK" x={540} y={1470} at={1390} size={25} color={COLORS.paperLight} bg={COLORS.teal} rotate={-2} />
      </Island>

      <RoutePins />
    </CameraWorld>

    <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 58%, rgba(48,35,20,.2) 100%)' }} />
    <Grain />

    {/* Voice is cut only at the diagnosed silent gap; plucked bed stays restrained. */}
    {voice}
    <Audio src={ASSET.music} volume={0.085} />
    <Sequence from={144} durationInFrames={26}><Audio src={ASSET.whoosh} volume={0.38} /></Sequence>
    <Sequence from={174} durationInFrames={28}><Audio src={ASSET.page} volume={0.36} /></Sequence>
    <Sequence from={392} durationInFrames={28}><Audio src={ASSET.whoosh} volume={0.4} /></Sequence>
    <Sequence from={462} durationInFrames={18}><Audio src={ASSET.impact} volume={0.48} /></Sequence>
    <Sequence from={484} durationInFrames={24}><Audio src={ASSET.pop} volume={0.43} /></Sequence>
    <Sequence from={744} durationInFrames={20}><Audio src={ASSET.page} volume={0.38} /></Sequence>
    <Sequence from={1005} durationInFrames={20}><Audio src={ASSET.whoosh} volume={0.42} /></Sequence>
    <Sequence from={1162} durationInFrames={22}><Audio src={ASSET.riser} volume={0.26} /></Sequence>
    <Sequence from={1246} durationInFrames={18}><Audio src={ASSET.stamp} volume={0.55} /></Sequence>
    <Sequence from={1310} durationInFrames={30}><Audio src={ASSET.whoosh} volume={0.4} /></Sequence>
    <Sequence from={1415} durationInFrames={35}><Audio src={ASSET.pencil} volume={0.32} /></Sequence>
  </AbsoluteFill>;
};

export default YourMusclesAreMoreThanMachines;
