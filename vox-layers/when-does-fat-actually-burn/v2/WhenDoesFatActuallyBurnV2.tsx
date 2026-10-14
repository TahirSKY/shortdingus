/* REMOTION_CONFIG = { fps: 30, durationInFrames: 862, width: 1080, height: 1920 } */
import React, { createContext, useContext } from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { loadFont as loadSerif } from '@remotion/google-fonts/SourceSerif4';
import { loadFont as loadSans } from '@remotion/google-fonts/Inter';

// =============================================================================
// WhenDoesFatActuallyBurnV2 — VOX collage rebuild on Hasan Aboul Hasan's collage kit
// (github.com/hassancs91/claude-faceless-shorts-creator, remotion/src/lib/collage.tsx)
// Kit ported inline so this ONE file renders in the hub Playground: one paper
// board, a travelling camera with parallax, persistent route scenery, scenes
// as Sequences inside the board. Voice untouched, no captions, loop ending.
// =============================================================================

const FONT_EDITORIAL = loadSerif('normal', { weights: ['700', '900'], subsets: ['latin'] }).fontFamily;
const FONT_BODY = loadSans('normal', { weights: ['400', '600', '800'], subsets: ['latin'] }).fontFamily;

// =============================================================================
// ASSETS
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
// v2 photographic / engraving layers. NOTE: hub ingest was unreachable, so the
// images are GitHub-hosted local cutouts (same white-flood method the hub uses);
// swap these for hub cutout asset-urls once the hub is back.
const GH = (f: string) =>
  `https://github.com/TahirSKY/shortdingus/raw/refs/heads/arena/e04fa780-shortdingus/vox-layers/when-does-fat-actually-burn/v2/${f}`;
const A = {
  runner: GH('cutouts/runner-sprint-photo-cutout.png'),
  endurance: GH('cutouts/runner-endurance-photo-cutout.png'),
  stopwatch: GH('cutouts/stopwatch-photo-cutout.png'),
  sugarPrint: GH('sugar-cubes-photo.png'), // original, used as a bordered photo print
  blood: GH('cutouts/blood-cells-cutout.png'),
  muscle: GH('cutouts/muscle-leg-engraving-cutout.png'),
  torso: GH('cutouts/torso-fat-engraving-cutout.png'),
  droplets: GH('cutouts/fat-droplets-photo-cutout.png'),
  flame: GH('cutouts/flame-photo-cutout.png'),
  lever: U('4844dc3e-d31b-4a4c-9f57-26cf7ce4eb58'), // v1 lever cutout (hub), reused
};

// =============================================================================
// COLLAGE KIT (ported from Hasan's collage.tsx, fonts + hub URLs adapted)
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
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type CamKey = { f: number; x: number; y: number; z: number };
const CamCtx = createContext({ offX: 0, offY: 0, zoom: 1 });

const CollageBoard: React.FC<{ cam: CamKey[]; children: React.ReactNode }> = ({ cam, children }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const fs = cam.map((k) => k.f);
  const camX = cam.length > 1 ? interpolate(frame, fs, cam.map((k) => k.x), { easing: EASE_INOUT, ...clamp }) : cam[0].x;
  const camY = cam.length > 1 ? interpolate(frame, fs, cam.map((k) => k.y), { easing: EASE_INOUT, ...clamp }) : cam[0].y;
  const zoom = cam.length > 1 ? interpolate(frame, fs, cam.map((k) => k.z), { easing: EASE_INOUT, ...clamp }) : cam[0].z;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: W,
          height: H,
          transformOrigin: '0 0',
          transform: `scale(${zoom}) translate(${W / 2 / zoom - camX}px, ${H / 2 / zoom - camY}px)`,
        }}
      >
        <CamCtx.Provider value={{ offX: camX - W / 2, offY: camY - H / 2, zoom }}>{children}</CamCtx.Provider>
      </div>
    </AbsoluteFill>
  );
};

type Enter = 'pop' | 'place' | 'slide-l' | 'slide-r' | 'rise' | 'fade' | 'wipe' | 'none';
const seedOf = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) % 1000;

const Layer: React.FC<{
  x: number; y: number; w: number; at?: number; dur?: number; enter?: Enter;
  rotate?: number; depth?: number; drift?: number; z?: number; children: React.ReactNode;
}> = ({ x, y, w, at = 0, dur = 14, enter = 'place', rotate = 0, depth = 0, drift = 1, z, children }) => {
  const frame = useCurrentFrame();
  const { offX, offY } = useContext(CamCtx);
  const seed = seedOf(x, y);
  const raw = interpolate(frame, [at, at + dur], [0, 1], { easing: enter === 'place' ? EASE_PLACE : EASE_OUT, ...clamp });
  if (frame < at) return null;
  const dx = Math.sin(frame * 0.021 + seed) * 2.2 * drift;
  const dy = Math.cos(frame * 0.017 + seed * 1.7) * 2.6 * drift;
  const dr = Math.sin(frame * 0.012 + seed * 0.6) * 0.45 * drift;
  let ex = 0, ey = 0, sc = 1, rot = 0, op = 1;
  let clip: string | undefined;
  switch (enter) {
    case 'pop': sc = interpolate(raw, [0, 1], [0.55, 1]); op = interpolate(raw, [0, 0.35], [0, 1], clamp); break;
    case 'place': sc = interpolate(raw, [0, 1], [1.28, 1]); rot = interpolate(raw, [0, 1], [rotate > 0 ? 7 : -7, 0]); op = interpolate(raw, [0, 0.25], [0, 1], clamp); break;
    case 'slide-l': ex = interpolate(raw, [0, 1], [-w * 0.55 - 120, 0]); op = interpolate(raw, [0, 0.4], [0, 1], clamp); rot = interpolate(raw, [0, 1], [-3, 0]); break;
    case 'slide-r': ex = interpolate(raw, [0, 1], [w * 0.55 + 120, 0]); op = interpolate(raw, [0, 0.4], [0, 1], clamp); rot = interpolate(raw, [0, 1], [3, 0]); break;
    case 'rise': ey = interpolate(raw, [0, 1], [90, 0]); op = interpolate(raw, [0, 0.5], [0, 1], clamp); break;
    case 'wipe': clip = `inset(0 ${interpolate(raw, [0, 1], [100, 0])}% 0 0)`; break;
    case 'fade': op = raw; sc = interpolate(raw, [0, 1], [1.04, 1]); break;
    case 'none': break;
  }
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, zIndex: z, opacity: op, clipPath: clip,
        transform: `translate(-50%, -50%) translate(${-offX * depth + ex + dx}px, ${-offY * depth + ey + dy}px) rotate(${rotate + rot + dr}deg) scale(${sc})`,
      }}
    >
      {children}
    </div>
  );
};

const Cutout: React.FC<{
  src: string; x: number; y: number; w: number; at?: number; dur?: number; enter?: Enter;
  rotate?: number; depth?: number; drift?: number; sticker?: number; shadow?: number; z?: number;
}> = ({ src, x, y, w, at, dur, enter, rotate, depth, drift, sticker = 5, shadow = 2, z }) => {
  const s = sticker;
  const outline = s > 0
    ? `drop-shadow(${s}px 0 0 ${VOX.cream}) drop-shadow(-${s}px 0 0 ${VOX.cream}) drop-shadow(0 ${s}px 0 ${VOX.cream}) drop-shadow(0 -${s}px 0 ${VOX.cream}) `
    : '';
  const soft = shadow > 0 ? `drop-shadow(0 ${8 * shadow}px ${10 * shadow}px rgba(40,28,12,${0.14 + 0.07 * shadow}))` : '';
  return (
    <Layer x={x} y={y} w={w} at={at} dur={dur} enter={enter} rotate={rotate} depth={depth} drift={drift} z={z}>
      <Img src={src} style={{ width: '100%', display: 'block', filter: outline + soft }} />
    </Layer>
  );
};

const ArchivalPhoto: React.FC<{
  src: string; x: number; y: number; w: number; at?: number; dur?: number; enter?: Enter;
  rotate?: number; depth?: number; drift?: number; caption?: string; z?: number;
}> = ({ src, x, y, w, at, dur, enter = 'place', rotate = -2, depth, drift, caption, z }) => {
  const tapeStyle: React.CSSProperties = {
    position: 'absolute', width: w * 0.22, height: w * 0.07,
    background: 'rgba(232,222,196,0.75)', boxShadow: '0 1px 4px rgba(40,28,12,0.18)',
  };
  return (
    <Layer x={x} y={y} w={w} at={at} dur={dur} enter={enter} rotate={rotate} depth={depth} drift={drift} z={z}>
      <div style={{ background: VOX.cream, padding: w * 0.035, paddingBottom: w * 0.05, boxShadow: '0 16px 34px rgba(40,28,12,0.3)' }}>
        <Img src={src} style={{ width: '100%', display: 'block' }} />
        {caption ? (
          <div style={{ fontFamily: FONT_BODY, fontSize: w * 0.042, fontWeight: 600, color: VOX.inkSoft, paddingTop: w * 0.028, letterSpacing: 0.4 }}>{caption}</div>
        ) : null}
      </div>
      <div style={{ ...tapeStyle, top: -w * 0.02, left: -w * 0.05, transform: 'rotate(-38deg)' }} />
      <div style={{ ...tapeStyle, top: -w * 0.02, right: -w * 0.05, transform: 'rotate(35deg)' }} />
    </Layer>
  );
};

const PaperBG: React.FC<{ w: number; h: number; depth?: number }> = ({ w, h, depth = -0.06 }) => {
  const { offX, offY } = useContext(CamCtx);
  return (
    <div
      style={{
        position: 'absolute', left: -w * 0.08, top: -h * 0.08, width: w * 1.16, height: h * 1.16,
        background: VOX.paper, transform: `translate(${-offX * depth}px, ${-offY * depth}px)`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 46%, rgba(52,38,18,0.24) 100%)' }} />
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

const LabelChip: React.FC<{
  text: string; x: number; y: number; at?: number; size?: number; rotate?: number;
  accent?: string; kicker?: string; kickerColor?: string; depth?: number; z?: number;
}> = ({ text, x, y, at = 0, size = 30, rotate = -1.5, accent, kicker, kickerColor, depth = 0.02, z }) => (
  <Layer x={x} y={y} w={size * text.length * 0.75 + 60} at={at} dur={10} enter="pop" rotate={rotate} depth={depth} drift={0.7} z={z}>
    <div style={{ display: 'inline-block', background: VOX.cream, borderLeft: accent ? `${Math.max(5, size * 0.2)}px solid ${accent}` : undefined, padding: `${size * 0.38}px ${size * 0.65}px`, boxShadow: '0 6px 16px rgba(40,28,12,0.25)', whiteSpace: 'nowrap' }}>
      {kicker ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: size * 0.52, fontWeight: 600, letterSpacing: 2.2, color: kickerColor ?? accent ?? VOX.red, textTransform: 'uppercase', margin: 0 }}>{kicker}</div>
      ) : null}
      <div style={{ fontFamily: FONT_BODY, fontSize: size, fontWeight: 600, color: VOX.ink, margin: 0, lineHeight: 1.15 }}>{text}</div>
    </div>
  </Layer>
);

const SerifStatement: React.FC<{
  words: { t: string; hl?: boolean }[]; x: number; y: number; w: number; at?: number; size?: number;
  color?: string; hlColor?: string; align?: 'left' | 'center'; backing?: boolean; depth?: number; z?: number;
}> = ({ words, x, y, w, at = 0, size = 64, color = VOX.ink, hlColor = VOX.yellow, align = 'center', backing = false, depth = 0.03, z }) => {
  const frame = useCurrentFrame();
  const allIn = at + words.length * 3 + 10;
  return (
    <Layer x={x} y={y} w={w} at={at} dur={1} enter="none" depth={depth} drift={0.5} z={z}>
      <div style={{ fontFamily: FONT_EDITORIAL, fontSize: size, fontWeight: 700, color, textAlign: align, lineHeight: backing ? 1.42 : 1.22, margin: 0 }}>
        {words.map((wd, i) => {
          const pr = interpolate(frame, [at + i * 3, at + i * 3 + 9], [0, 1], { easing: EASE_OUT, ...clamp });
          const sweep = wd.hl ? interpolate(frame, [allIn, allIn + 12], [0, 100], { easing: EASE_INOUT, ...clamp }) : 0;
          const bg = wd.hl
            ? `linear-gradient(to right, ${hlColor} ${sweep}%, ${backing ? VOX.cream : 'transparent'} ${sweep}%)`
            : backing ? VOX.cream : undefined;
          return (
            <span key={i} style={{ display: 'inline-block', opacity: pr, transform: `translateY(${(1 - pr) * 24}px)`, marginRight: backing ? size * 0.14 : size * 0.26, background: bg, padding: backing ? `${size * 0.06}px ${size * 0.18}px` : wd.hl ? `0 ${size * 0.08}px` : undefined, boxShadow: backing ? '0 5px 14px rgba(40,28,12,0.22)' : undefined }}>
              {wd.t}
            </span>
          );
        })}
      </div>
    </Layer>
  );
};

const RubberStamp: React.FC<{
  text: string; x: number; y: number; at?: number; size?: number; color?: string; rotate?: number; depth?: number; z?: number;
}> = ({ text, x, y, at = 0, size = 72, color = VOX.red, rotate = -11, depth = 0.04, z }) => {
  const frame = useCurrentFrame();
  const pr = interpolate(frame, [at, at + 7], [0, 1], { easing: EASE_PLACE, ...clamp });
  return (
    <Layer x={x} y={y} w={size * text.length + 120} at={at} dur={1} enter="none" rotate={rotate} depth={depth} drift={0.4} z={z}>
      <div style={{ display: 'inline-block', opacity: interpolate(pr, [0, 0.4, 1], [0, 0.95, 0.88]), transform: `scale(${interpolate(pr, [0, 1], [2.1, 1])})` }}>
        <div style={{ fontFamily: FONT_EDITORIAL, fontWeight: 900, fontSize: size, letterSpacing: size * 0.08, textTransform: 'uppercase', color, border: `${Math.max(5, size * 0.09)}px solid ${color}`, borderRadius: size * 0.12, padding: `${size * 0.12}px ${size * 0.3}px`, whiteSpace: 'nowrap', mixBlendMode: 'multiply', margin: 0 }}>
          {text}
        </div>
      </div>
    </Layer>
  );
};

const SketchArrow: React.FC<{
  d: string; vb: { w: number; h: number }; at?: number; dur?: number; color?: string; width?: number; dashed?: boolean; head?: boolean; id: string; z?: number;
}> = ({ d, vb, at = 0, dur = 20, color = VOX.red, width = 7, dashed = false, head = true, id, z }) => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [at, at + dur], [0, 1], { easing: EASE_INOUT, ...clamp });
  if (frame < at || prog <= 0.001) return null;
  const evolved = evolvePath(prog, d);
  const len = getLength(d);
  const tip = getPointAtLength(d, len * prog);
  const back = getPointAtLength(d, Math.max(0, len * prog - 26));
  const ang = (Math.atan2(tip.y - back.y, tip.x - back.x) * 180) / Math.PI;
  return (
    <svg viewBox={`0 0 ${vb.w} ${vb.h}`} style={{ position: 'absolute', left: 0, top: 0, width: vb.w, height: vb.h, overflow: 'visible', zIndex: z }}>
      {dashed ? (
        <>
          <mask id={id}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={width * 3} strokeDasharray={evolved.strokeDasharray} strokeDashoffset={evolved.strokeDashoffset} />
          </mask>
          <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${width * 2.6} ${width * 2.2}`} mask={`url(#${id})`} />
        </>
      ) : (
        <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={evolved.strokeDasharray} strokeDashoffset={evolved.strokeDashoffset} />
      )}
      {head && prog > 0.06 ? (
        <g transform={`translate(${tip.x}, ${tip.y}) rotate(${ang})`}>
          <path d={`M 0 0 L ${-width * 3.2} ${-width * 1.9} M 0 0 L ${-width * 3.2} ${width * 1.9}`} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />
        </g>
      ) : null}
    </svg>
  );
};

// =============================================================================
// COMPOSITION
// =============================================================================
const W = 1080;
const H = 1920;

// Camera journey: push on the hook, dive to each fuel station, widen for the
// verdict, settle on fat, then travel home to the page-1 framing (loop).
const CAM: CamKey[] = [
  { f: 0, x: 540, y: 960, z: 1 },
  { f: 110, x: 540, y: 920, z: 1.07 },
  { f: 270, x: 500, y: 1000, z: 1.18 },
  { f: 390, x: 380, y: 1120, z: 1.55 },
  { f: 470, x: 580, y: 1180, z: 1.5 },
  { f: 560, x: 700, y: 1080, z: 1.38 },
  { f: 625, x: 800, y: 1120, z: 1.55 },
  { f: 700, x: 540, y: 980, z: 1.1 },
  { f: 820, x: 540, y: 960, z: 1.02 },
  { f: 862, x: 540, y: 960, z: 1 },
];

// the route across the board (the "map" of this video) + its stations
const ROUTE = 'M 150 1380 C 260 1230, 300 1210, 370 1195 C 460 1175, 520 1300, 610 1315 C 700 1330, 740 1190, 815 1175 C 880 1162, 910 1260, 955 1295';
const STATIONS = [
  { x: 150, y: 1380, at: 285 },
  { x: 370, y: 1195, at: 386 },
  { x: 610, y: 1315, at: 440 },
  { x: 815, y: 1175, at: 505 },
  { x: 955, y: 1295, at: 605 },
];

const SceneFade: React.FC<{ out: number; dur?: number; children: React.ReactNode }> = ({ out, dur = 14, children }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [out - dur, out], [1, 0], clamp);
  return <div style={{ opacity: op }}>{children}</div>;
};

const StationDot: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => (
  <Layer x={x} y={y} w={44} at={at} dur={8} enter="pop" depth={0.03} drift={0.4} z={3}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: VOX.red, border: `5px solid ${VOX.cream}`, boxShadow: '0 4px 10px rgba(40,28,12,0.35)' }} />
  </Layer>
);

const DrainBar: React.FC<{ x: number; y: number; w: number; label: string; a: number; b: number; color: string }> = ({ x, y, w, label, a, b, color }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [a, b], [96, 7], clamp);
  return (
    <Layer x={x} y={y} w={w} at={a - 12} dur={10} enter="rise" depth={0.03}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 27, letterSpacing: 2, color: VOX.ink, marginBottom: 8 }}>{label}</div>
      <div style={{ width: w, height: 46, background: VOX.cream, border: `4px solid ${VOX.ink}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 14px rgba(40,28,12,0.22)' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color }} />
      </div>
    </Layer>
  );
};

const TITLE = [{ t: 'When' }, { t: 'does' }, { t: 'fat', hl: true }, { t: 'actually' }, { t: 'burn?' }];

const WhenDoesFatActuallyBurnV2: React.FC = () => {
  const frame = useCurrentFrame();
  const leverRot = interpolate(frame, [570, 583], [-7, 11], { easing: EASE_PLACE, ...clamp });
  return (
    <AbsoluteFill style={{ backgroundColor: VOX.paper }}>
      <CollageBoard cam={CAM}>
        <PaperBG w={W} h={H} />

        {/* persistent scenery: the route + stations live under scenes 3-5 */}
        <Sequence from={100} durationInFrames={748} layout="none">
          <SceneFade out={742} dur={20}>
            <SketchArrow id="fuelroute" d={ROUTE} vb={{ w: W, h: H }} at={180} dur={520} dashed color={VOX.red} width={6} />
            {STATIONS.map((s, i) => (
              <StationDot key={i} x={s.x} y={s.y} at={s.at - 100} />
            ))}
          </SceneFade>
        </Sequence>

        {/* HOOK 0-5.3s */}
        <Sequence from={0} durationInFrames={160} layout="none">
          <SceneFade out={157}>
            <SerifStatement x={540} y={400} w={980} at={4} size={84} words={TITLE} />
            <Cutout src={A.runner} x={540} y={1120} w={620} at={18} enter="place" rotate={2} depth={0.1} shadow={3} />
            <LabelChip x={540} y={1580} at={45} text="Not when you think" kicker="The myth" accent={VOX.red} size={34} rotate={-1.2} />
          </SceneFade>
        </Sequence>

        {/* MYTH 3.7-9.3s */}
        <Sequence from={112} durationInFrames={168} layout="none">
          <SceneFade out={165}>
            <SerifStatement x={540} y={330} w={980} at={8} size={72} words={[{ t: 'Most' }, { t: 'people' }, { t: 'think' }, { t: 'it' }, { t: 'starts' }, { t: 'instantly.', hl: true }]} />
            <Cutout src={A.runner} x={350} y={1060} w={560} at={14} enter="slide-l" rotate={-1} depth={0.09} shadow={3} />
            <Cutout src={A.stopwatch} x={790} y={800} w={330} at={38} enter="slide-r" rotate={3} depth={0.12} shadow={3} />
            <RubberStamp text="Not yet" x={640} y={1180} at={132} size={76} rotate={-11} z={5} />
          </SceneFade>
        </Sequence>

        {/* FIRST FUELS 9.3-16.7s */}
        <Sequence from={280} durationInFrames={222} layout="none">
          <SceneFade out={219}>
            <ArchivalPhoto src={A.sugarPrint} x={320} y={600} w={500} at={106} rotate={-2} depth={0.06} caption="First fuel - sugar in the blood" />
            <Cutout src={A.blood} x={770} y={590} w={500} at={118} enter="slide-r" rotate={2} depth={0.08} shadow={2} />
            <LabelChip x={400} y={920} at={112} text="Sugar in your blood" kicker="First" accent={VOX.red} size={28} rotate={-1.5} />
            <Cutout src={A.muscle} x={320} y={1140} w={540} at={157} enter="slide-l" rotate={-1.5} depth={0.08} shadow={3} />
            <Cutout src={A.torso} x={770} y={1130} w={450} at={172} enter="slide-r" rotate={1.5} depth={0.08} shadow={3} />
            <LabelChip x={620} y={920} at={163} text="Glycogen in your muscles" kicker="Stored" accent={VOX.teal} size={28} rotate={1.2} />
            <DrainBar x={300} y={1520} w={400} label="BLOOD SUGAR" a={120} b={185} color={VOX.yellow} />
            <DrainBar x={760} y={1520} w={400} label="GLYCOGEN" a={170} b={215} color={VOX.red} />
          </SceneFade>
        </Sequence>

        {/* THE SHIFT 16.7-22.4s (frames here are local to from=502) */}
        <Sequence from={502} durationInFrames={170} layout="none">
          <SceneFade out={167}>
            <SerifStatement x={540} y={330} w={950} at={6} size={68} words={[{ t: 'Quick' }, { t: 'energy' }, { t: 'runs' }, { t: 'out.', hl: true }]} />
            <DrainBar x={540} y={560} w={620} label="QUICK ENERGY" a={18} b={78} color={VOX.red} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `rotate(${leverRot}deg)`, transformOrigin: '540px 1010px' }}>
              <Cutout src={A.lever} x={540} y={880} w={430} at={54} enter="place" depth={0.08} shadow={3} />
            </div>
            <LabelChip x={540} y={1120} at={76} text="The body shifts" kicker="The switch" accent={VOX.red} size={32} rotate={-1} />
            <Cutout src={A.torso} x={290} y={1330} w={380} at={94} enter="slide-l" depth={0.07} shadow={3} />
            <Cutout src={A.droplets} x={740} y={1360} w={430} at={101} enter="place" depth={0.09} shadow={3} />
            <Cutout src={A.flame} x={745} y={1120} w={185} at={108} enter="pop" depth={0.13} shadow={2} />
            <LabelChip x={540} y={1620} at={117} text="Now burning fat" kicker="New fuel" accent={VOX.yellow} kickerColor={VOX.inkSoft} size={32} rotate={1} />
          </SceneFade>
        </Sequence>

        {/* PAYOFF + LOOP 22.4-28.7s (local to from=672) */}
        <Sequence from={672} layout="none">
          <SceneFade out={128} dur={12}>
            <SerifStatement x={540} y={400} w={980} at={10} size={74} words={[{ t: 'The' }, { t: 'longer' }, { t: 'you' }, { t: 'move,' }, { t: 'the' }, { t: 'more' }, { t: 'fat', hl: true }, { t: 'burns.' }]} />
            <Cutout src={A.endurance} x={540} y={1150} w={600} at={16} enter="place" rotate={1.5} depth={0.1} shadow={3} />
            <Cutout src={A.flame} x={855} y={830} w={175} at={110} enter="pop" depth={0.13} shadow={2} />
          </SceneFade>
          {/* loop bridge: page-1 composition returns for the trailing "So" */}
          <Sequence from={138} layout="none">
            <SerifStatement x={540} y={400} w={980} at={4} size={84} words={TITLE} />
            <Cutout src={A.runner} x={540} y={1120} w={620} at={10} enter="place" rotate={2} depth={0.1} shadow={3} />
            <LabelChip x={540} y={1580} at={31} text="So..." kicker="Again" accent={VOX.red} size={34} rotate={-1.2} />
          </Sequence>
        </Sequence>
      </CollageBoard>
      <Grain opacity={0.055} />

      {/* AUDIO — voice + docu-pluck bed + paper foley on the visual beats */}
      <Audio src={VOICE} />
      <Audio src={MUSIC} volume={0.12} />
      <Sequence from={30} durationInFrames={30}><Audio src={SFX.impact} volume={0.5} /></Sequence>
      <Sequence from={52} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
      <Sequence from={104} durationInFrames={36}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={272} durationInFrames={20}><Audio src={SFX.pageFlip} volume={0.55} /></Sequence>
      <Sequence from={240} durationInFrames={42}><Audio src={SFX.riser} volume={0.3} /></Sequence>
      <Sequence from={242} durationInFrames={20}><Audio src={SFX.stamp} volume={0.9} /></Sequence>
      <Sequence from={384} durationInFrames={16}><Audio src={SFX.pop} volume={0.55} /></Sequence>
      <Sequence from={435} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
      <Sequence from={494} durationInFrames={22}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={556} durationInFrames={42}><Audio src={SFX.riser} volume={0.32} /></Sequence>
      <Sequence from={576} durationInFrames={20}><Audio src={SFX.toggle} volume={0.85} /></Sequence>
      <Sequence from={601} durationInFrames={16}><Audio src={SFX.pop} volume={0.6} /></Sequence>
      <Sequence from={664} durationInFrames={36}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={680} durationInFrames={50}><Audio src={SFX.pencil} volume={0.45} /></Sequence>
      <Sequence from={802} durationInFrames={32}><Audio src={SFX.impact} volume={0.65} /></Sequence>
    </AbsoluteFill>
  );
};

export default WhenDoesFatActuallyBurnV2;
