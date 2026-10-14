/* REMOTION_CONFIG = { fps: 30, durationInFrames: 862, width: 1080, height: 1920 } */
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from 'remotion';

// =============================================================================
// ASSETS (hub asset-url links, copied exactly from the project manifest)
// =============================================================================
const U = (id: string) =>
  `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;

const VOICE = U('94853e6d-103b-4e38-8e4b-634b53e13ce0');
const MUSIC = U('f4a1ed94-671d-4de6-ba60-43370bfafe68'); // docu-pluck bed
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

const IMG = {
  runnerSprint: U('f16cb0b1-808c-49f8-8201-6ac582f35b07'), // cutout
  runnerEndurance: U('05957b1f-3964-4292-a4a7-b6b5b6faba7d'), // cutout
  fat: U('b7e3610c-e6f0-46f7-abe5-c76d42ddad8a'), // cutout
  flame: U('7ef60db6-0aee-4e17-9dea-9213543002c3'), // cutout
  stopwatch: U('3044b8ef-0289-49b5-88a9-30c143c2f40f'), // cutout
  sugar: U('3a2925df-0935-41df-a106-e0cc44b995e2'), // cutout
  blood: U('30504965-bc35-43e2-95ec-8a802f38172c'), // cutout
  muscle: U('26a4d623-9e8e-48c7-b857-6fd5aa81dd35'), // cutout
  battery: U('953d754b-b207-4391-bf85-ebc788fd9f4e'), // cutout
  lever: U('4844dc3e-d31b-4a4c-9f57-26cf7ce4eb58'), // cutout
  glucose: U('ad1e9a26-48a2-4d86-8006-0c735bc1ac84'), // cutout
  torso: U('87d14eee-bea7-4d0c-b51f-cd5f51c4dc07'), // cutout (v2)
  road: U('472ddbdb-9704-460e-8c9d-7bef2a4ee4c6'), // original full plate
};

// =============================================================================
// STYLE
// =============================================================================
const C = {
  paper: '#F3E9D2',
  paper2: '#FFFAEE',
  ink: '#25221F',
  red: '#CF382D',
  yellow: '#F2C94C',
  mustard: '#D9A441',
  sage: '#8CA88A',
  muted: '#8A8070',
};
const FONT = 'Arial, Helvetica, sans-serif';
const EASE = Easing.bezier(0.33, 1, 0.68, 1);
const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// progress 0..1 between frames a..b (eased)
const p = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { easing: EASE, ...CL });
// raw linear progress
const pl = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], CL);

// =============================================================================
// SMALL PIECES
// =============================================================================
// A cut-out layer that slides/pops in and drifts idly. at<0 = already in at f0.
const Layer: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  at?: number;
  rot?: number;
  drift?: number;
  extraScale?: number;
}> = ({ src, x, y, w, at = 0, rot = 0, drift = 5, extraScale = 1 }) => {
  const f = useCurrentFrame();
  const e = p(f, at, at + 14);
  const idle = Math.sin((f + x) / 26) * drift;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (1 - e) * 70 + idle,
        width: w,
        height: w * 0.545,
        opacity: e,
        transform: `rotate(${rot}deg) scale(${(0.92 + 0.08 * e) * extraScale})`,
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 16px 16px rgba(37,34,31,0.22))',
        }}
      />
    </div>
  );
};

const Chip: React.FC<{
  text: string;
  x: number;
  y: number;
  at?: number;
  bg?: string;
  color?: string;
  size?: number;
  rot?: number;
}> = ({ text, x, y, at = 0, bg = C.ink, color = C.paper2, size = 36, rot = -1.5 }) => {
  const f = useCurrentFrame();
  const e = p(f, at, at + 10);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (1 - e) * 26,
        opacity: e,
        transform: `rotate(${rot}deg) scale(${0.9 + 0.1 * e})`,
        backgroundColor: bg,
        color,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 2,
        padding: '14px 26px',
        borderRadius: 6,
        boxShadow: '6px 6px 0 rgba(37,34,31,0.18)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

const Gauge: React.FC<{
  label: string;
  x: number;
  y: number;
  w: number;
  from: number;
  to: number;
  a: number;
  b: number;
  color: string;
  at?: number;
}> = ({ label, x, y, w, from, to, a, b, color, at = 0 }) => {
  const f = useCurrentFrame();
  const e = p(f, at, at + 10);
  const v = interpolate(f, [a, b], [from, to], CL);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, opacity: e }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: 2,
          color: C.ink,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: w,
          height: 58,
          backgroundColor: C.paper2,
          border: `4px solid ${C.ink}`,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: '100%', backgroundColor: color }} />
      </div>
    </div>
  );
};

// scene wrapper: slides/fades in from start, out at end (scene 1 starts composed)
const Scene: React.FC<{
  start: number;
  end: number;
  children: React.ReactNode;
}> = ({ start, end, children }) => {
  const f = useCurrentFrame();
  const inn = start === 0 ? 1 : p(f, start, start + 10);
  const out = end >= 862 ? 0 : p(f, end - 10, end);
  return (
    <AbsoluteFill
      style={{
        opacity: inn * (1 - out),
        transform: `translateX(${(1 - inn) * 90 - out * 90}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const BigLine: React.FC<{
  children: React.ReactNode;
  x: number;
  y: number;
  size: number;
  color?: string;
  at?: number;
}> = ({ children, x, y, size, color = C.ink, at = -30 }) => {
  const f = useCurrentFrame();
  const e = p(f, at, at + 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + (1 - e) * 30,
        opacity: e,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -2,
        color,
        margin: 0,
      }}
    >
      {children}
    </div>
  );
};

// =============================================================================
// MAIN
// =============================================================================
const WhenDoesFatActuallyBurn: React.FC = () => {
  const f = useCurrentFrame();

  // slow board camera: gentle scale drift across the whole piece
  const camScale = interpolate(f, [0, 280, 502, 672, 862], [1, 1.03, 1.05, 1.03, 1.06], CL);
  const camX = interpolate(f, [0, 280, 502, 672, 862], [0, -14, 10, -8, 0], CL);
  const camY = interpolate(f, [0, 280, 502, 672, 862], [0, -10, -18, -6, -12], CL);

  const flamePop = 1 + 0.1 * p(f, 73, 82) + 0.05 * Math.sin(f / 3);
  const stampE = p(f, 244, 252);
  const leverRot = interpolate(f, [570, 583], [-7, 11], { easing: EASE, ...CL });
  const curve = pl(f, 682, 816);
  const fatShrink = interpolate(f, [603, 800], [1, 0.82], CL);
  const loopFade = p(f, 845, 862);

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, fontFamily: FONT, overflow: 'hidden' }}>
      {/* paper texture: faint dots, pre-computed deterministic grid */}
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={60 + (i % 10) * 108 + (i % 3) * 13} cy={70 + Math.floor(i / 10) * 320} r={2.2} fill="#D9CCB6" />
        ))}
      </svg>
      {/* slim progress rule */}
      <div style={{ position: 'absolute', top: 0, left: 0, height: 8, width: 1080 * pl(f, 0, 862), backgroundColor: C.red, zIndex: 50 }} />

      <AbsoluteFill style={{ transform: `translate(${camX}px, ${camY}px) scale(${camScale})` }}>
        {/* ================= SCENE 1 · HOOK 0–3.72s ================= */}
        <Scene start={0} end={112}>
          <Chip text="THE BODY, EXPLAINED" x={64} y={120} bg={C.red} size={30} />
          <BigLine x={64} y={230} size={92}>WHEN DOES</BigLine>
          <BigLine x={64} y={330} size={118}>
            <span style={{ color: C.red }}>FAT</span> ACTUALLY
          </BigLine>
          <BigLine x={64} y={460} size={150}>BURN?</BigLine>
          <Layer src={IMG.runnerSprint} x={90} y={700} w={900} at={-20} />
          <Layer src={IMG.fat} x={610} y={1180} w={380} at={-20} rot={2} />
          <Layer src={IMG.flame} x={120} y={1210} w={210} at={-20} extraScale={flamePop} />
          <Chip text="NOT WHEN YOU THINK" x={300} y={1560} bg={C.yellow} color={C.ink} size={34} rot={1} />
        </Scene>

        {/* ================= SCENE 2 · THE MYTH 3.72–9.33s ================= */}
        <Scene start={112} end={280}>
          <Chip text="MOST PEOPLE THINK" x={64} y={130} at={118} />
          <BigLine x={64} y={240} size={104} at={124}>
            FAT BURNS
          </BigLine>
          <BigLine x={64} y={355} size={62} at={132}>
            THE MOMENT YOU START EXERCISING
          </BigLine>
          <Layer src={IMG.stopwatch} x={620} y={520} w={390} at={150} rot={3} />
          <Layer src={IMG.runnerSprint} x={60} y={760} w={760} at={126} />
          {/* the verdict stamp lands on "but you don't" (8.13s) */}
          <div
            style={{
              position: 'absolute',
              left: 90,
              top: 1180,
              opacity: stampE,
              transform: `rotate(-8deg) scale(${2.1 - 1.1 * stampE})`,
              border: `8px solid ${C.red}`,
              color: C.red,
              fontWeight: 900,
              fontSize: 92,
              letterSpacing: 2,
              padding: '10px 36px',
              borderRadius: 8,
              backgroundColor: 'rgba(255,250,238,0.85)',
            }}
          >
            NOT YET
          </div>
          <Chip text="BUT YOU DON'T" x={560} y={1230} bg={C.red} size={36} at={244} rot={1.5} />
        </Scene>

        {/* ================= SCENE 3 · FIRST FUELS 9.33–16.73s ================= */}
        <Scene start={280} end={502}>
          <Chip text="AT FIRST: QUICK FUEL" x={64} y={120} at={286} bg={C.mustard} color={C.ink} />
          <Layer src={IMG.sugar} x={40} y={360} w={520} at={386} rot={-2} />
          <Layer src={IMG.blood} x={540} y={380} w={520} at={398} rot={3} />
          <Chip text="SUGAR IN YOUR BLOOD" x={250} y={700} at={392} size={34} />
          <Layer src={IMG.glucose} x={800} y={730} w={240} at={410} rot={2} />
          <Layer src={IMG.muscle} x={60} y={880} w={460} at={437} rot={-2} />
          <Layer src={IMG.torso} x={570} y={920} w={430} at={452} rot={1.5} />
          <Chip text="GLYCOGEN IN YOUR MUSCLES" x={190} y={1330} at={443} bg={C.red} size={34} />
          <Gauge label="BLOOD SUGAR" x={80} y={1470} w={420} from={92} to={46} a={400} b={470} color={C.mustard} at={400} />
          <Gauge label="MUSCLE GLYCOGEN" x={580} y={1470} w={420} from={92} to={38} a={450} b={495} color={C.red} at={450} />
        </Scene>

        {/* ================= SCENE 4 · THE SHIFT 16.73–22.4s ================= */}
        <Scene start={502} end={672}>
          <Chip text="QUICK ENERGY RUNS OUT" x={64} y={120} at={508} />
          <Layer src={IMG.battery} x={220} y={300} w={640} at={514} />
          <Gauge label="QUICK ENERGY" x={230} y={690} w={620} from={64} to={6} a={520} b={580} color={C.red} at={520} />
          <div style={{ transform: `rotate(${leverRot}deg)`, transformOrigin: '540px 1080px' }}>
            <Layer src={IMG.lever} x={320} y={830} w={440} at={556} />
          </div>
          <Chip text="THE BODY SHIFTS" x={300} y={1130} bg={C.red} size={38} at={578} />
          <Layer src={IMG.torso} x={50} y={1220} w={400} at={596} rot={-1.5} />
          <Layer src={IMG.fat} x={600} y={1240} w={360} at={603} extraScale={fatShrink} />
          <Layer src={IMG.flame} x={680} y={1180} w={200} at={610} extraScale={flamePop} />
          <Chip text="NOW BURNING FAT" x={270} y={1560} bg={C.yellow} color={C.ink} size={36} at={619} />
        </Scene>

        {/* ================= SCENE 5 · PAYOFF + LOOP 22.4–28.72s ================= */}
        <Scene start={672} end={862}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Img src={IMG.road} style={{ width: 1080, height: 1920, objectFit: 'cover' }} />
          </div>
          <Layer src={IMG.runnerEndurance} x={270} y={1030} w={580} at={684} />
          {/* paper chart card drawn over the road */}
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: 210,
              width: 960,
              height: 620,
              backgroundColor: C.paper2,
              border: `4px solid ${C.ink}`,
              borderRadius: 10,
              boxShadow: '10px 10px 0 rgba(37,34,31,0.20)',
              opacity: p(f, 676, 688),
            }}
          >
            <div style={{ position: 'absolute', left: 36, top: 28, fontWeight: 900, fontSize: 42, letterSpacing: 0, color: C.ink }}>
              LONGER EXERCISE
            </div>
            <div style={{ position: 'absolute', left: 36, top: 84, fontWeight: 800, fontSize: 30, letterSpacing: 2, color: C.muted }}>
              MORE FAT BURNED
            </div>
            <svg width="880" height="420" style={{ position: 'absolute', left: 40, top: 150 }}>
              <line x1={30} y1={370} x2={840} y2={370} stroke={C.ink} strokeWidth={4} />
              <line x1={30} y1={370} x2={30} y2={30} stroke={C.ink} strokeWidth={4} />
              <path
                d="M 40 350 C 260 330, 420 260, 560 180 S 760 80, 830 55"
                fill="none"
                stroke={C.red}
                strokeWidth={9}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100 - 100 * curve}
              />
              <circle cx={830} cy={55} r={15} fill={C.red} opacity={curve > 0.97 ? 1 : 0} />
            </svg>
          </div>
          <Layer src={IMG.flame} x={810} y={700} w={170} at={790} extraScale={flamePop} />
          <Chip text="SO..." x={70} y={900} bg={C.ink} size={40} at={841} rot={-2} />
          {/* loop bridge: fade back toward the opening board */}
          <AbsoluteFill style={{ backgroundColor: C.paper, opacity: loopFade * 0.92 }} />
          <div style={{ opacity: loopFade }}>
            <BigLine x={64} y={230} size={92}>WHEN DOES</BigLine>
            <BigLine x={64} y={330} size={118}>
              <span style={{ color: C.red }}>FAT</span> ACTUALLY
            </BigLine>
            <BigLine x={64} y={460} size={150}>BURN?</BigLine>
          </div>
        </Scene>
      </AbsoluteFill>

      {/* ================= AUDIO ================= */}
      <Audio src={VOICE} />
      <Audio src={MUSIC} volume={0.12} />
      <Sequence from={104} durationInFrames={22}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={272} durationInFrames={22}><Audio src={SFX.pageFlip} volume={0.55} /></Sequence>
      <Sequence from={242} durationInFrames={20}><Audio src={SFX.stamp} volume={0.9} /></Sequence>
      <Sequence from={384} durationInFrames={16}><Audio src={SFX.pop} volume={0.55} /></Sequence>
      <Sequence from={435} durationInFrames={16}><Audio src={SFX.pop} volume={0.5} /></Sequence>
      <Sequence from={494} durationInFrames={22}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={556} durationInFrames={42}><Audio src={SFX.riser} volume={0.32} /></Sequence>
      <Sequence from={576} durationInFrames={20}><Audio src={SFX.toggle} volume={0.85} /></Sequence>
      <Sequence from={601} durationInFrames={16}><Audio src={SFX.pop} volume={0.6} /></Sequence>
      <Sequence from={664} durationInFrames={22}><Audio src={SFX.whoosh} volume={0.5} /></Sequence>
      <Sequence from={680} durationInFrames={50}><Audio src={SFX.pencil} volume={0.5} /></Sequence>
      <Sequence from={802} durationInFrames={32}><Audio src={SFX.impact} volume={0.65} /></Sequence>
    </AbsoluteFill>
  );
};

export default WhenDoesFatActuallyBurn;
