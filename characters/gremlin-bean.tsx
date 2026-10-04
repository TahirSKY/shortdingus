/* REMOTION_CONFIG { fps: 30, durationInFrames: 420, width: 1080, height: 1920 } */
// Gremlin Bean — reusable menace character for the Reactions hub.
// Copy the GremlinBean component (everything above "DEMO") into any video.
//
// <GremlinBean
//   size={520}                       // width in px (height = size * 1.25)
//   pose="smug"                      // or poses={[{ at: 0, pose: "smug" }, { at: 40, pose: "sideEye" }]}  (frames, local)
//   words={[{ start: 0.4, end: 0.8 }]} // seconds (local to this component's Sequence) → mouth flaps
//   enterAt={0} exitAt={90}          // pop-in / pop-out with squash & stretch
//   look={[x, y]}                    // optional pupil override, -1..1
//   flip                             // mirror (face the other way)
// />
// Poses: smug, sideEye, stare, judging, laugh, angry, shocked, talk
import React from "react";
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const INK = "#1c1a14";
const BODY = "#a8d64a";
const BODY_LIGHT = "#d2f07a";
const BODY_SHADE = "#6f9e26";
const LID = "#93c23c";
const MOUTH = "#3b1616";
const TONGUE = "#e0646a";

type PoseName = "smug" | "sideEye" | "stare" | "judging" | "laugh" | "angry" | "shocked" | "talk";
type P = {
  lidL: number; lidR: number; tiltL: number; tiltR: number;
  browLy: number; browLr: number; browRy: number; browRr: number;
  lookX: number; lookY: number; pupil: number;
  mW: number; mSmile: number; mOpen: number;
  arms: number; // 0 crossed, 1 raised
  tilt: number; bounce: number; tremble: number; stretch: number; flush: number;
};

const POSES: Record<PoseName, P> = {
  smug:    { lidL: .48, lidR: .36, tiltL: -6, tiltR: 8, browLy: 4, browLr: 6, browRy: -14, browRr: -14, lookX: .45, lookY: .15, pupil: 1, mW: 62, mSmile: 14, mOpen: 0, arms: 0, tilt: -3, bounce: 0, tremble: 0, stretch: 0, flush: 0 },
  sideEye: { lidL: .56, lidR: .52, tiltL: 0, tiltR: 0, browLy: 6, browLr: 2, browRy: 2, browRr: -4, lookX: -1, lookY: .1, pupil: 1, mW: 34, mSmile: 1, mOpen: 0, arms: 0, tilt: 4, bounce: 0, tremble: 0, stretch: 0, flush: 0 },
  stare:   { lidL: .32, lidR: .3, tiltL: 0, tiltR: 0, browLy: 4, browLr: 0, browRy: 4, browRr: 0, lookX: 0, lookY: 0, pupil: .6, mW: 30, mSmile: -1, mOpen: 0, arms: 0, tilt: 0, bounce: 0, tremble: 0, stretch: 0, flush: 0 },
  judging: { lidL: .6, lidR: .42, tiltL: -8, tiltR: 0, browLy: 8, browLr: 10, browRy: -18, browRr: -18, lookX: .2, lookY: .3, pupil: .9, mW: 30, mSmile: -8, mOpen: 0, arms: 0, tilt: 6, bounce: 0, tremble: 0, stretch: -.02, flush: 0 },
  laugh:   { lidL: .82, lidR: .78, tiltL: 10, tiltR: -10, browLy: -10, browLr: -6, browRy: -12, browRr: 6, lookX: 0, lookY: 0, pupil: 1, mW: 72, mSmile: 18, mOpen: .85, arms: 0, tilt: -2, bounce: 1, tremble: 0, stretch: 0, flush: .15 },
  angry:   { lidL: .42, lidR: .42, tiltL: 20, tiltR: -20, browLy: 10, browLr: 22, browRy: 8, browRr: 22, lookX: 0, lookY: .1, pupil: .7, mW: 52, mSmile: -12, mOpen: .32, arms: 0, tilt: 0, bounce: 0, tremble: 1, stretch: -.03, flush: 1 },
  shocked: { lidL: 0, lidR: 0, tiltL: 0, tiltR: 0, browLy: -24, browLr: -8, browRy: -26, browRr: 8, lookX: 0, lookY: -.1, pupil: .5, mW: 26, mSmile: 0, mOpen: 1, arms: 1, tilt: 0, bounce: 0, tremble: .25, stretch: .08, flush: 0 },
  talk:    { lidL: .4, lidR: .32, tiltL: -4, tiltR: 4, browLy: 0, browLr: 4, browRy: -8, browRr: -8, lookX: .2, lookY: 0, pupil: 1, mW: 52, mSmile: 8, mOpen: 0, arms: 0, tilt: -2, bounce: 0, tremble: 0, stretch: 0, flush: 0 },
};

const BLEND = 6;
const ease = (t: number) => t * t * (3 - 2 * t);
function poseAt(frame: number, pose: PoseName, poses?: { at: number; pose: PoseName }[]): P {
  if (!poses || !poses.length) return POSES[pose];
  const list = [...poses].sort((a, b) => a.at - b.at);
  let i = 0;
  while (i + 1 < list.length && list[i + 1].at <= frame) i++;
  const cur = POSES[list[i].pose];
  if (i === 0 || frame - list[i].at >= BLEND) return cur;
  const prev = POSES[list[i - 1].pose];
  const t = ease(Math.max(0, (frame - list[i].at) / BLEND));
  const out: any = {};
  for (const k of Object.keys(cur)) out[k] = (prev as any)[k] + ((cur as any)[k] - (prev as any)[k]) * t;
  return out;
}

function mouthOpenFromWords(t: number, words?: { start: number; end: number }[]) {
  if (!words) return 0;
  for (const w of words) {
    if (t < w.start - 0.03 || t > w.end + 0.03) continue;
    const d = Math.max(0.08, w.end - w.start);
    const syl = Math.max(1, Math.round(d / 0.17));
    const local = Math.min(1, Math.max(0, (t - w.start) / d));
    const edge = Math.min(1, (t - w.start + 0.03) / 0.05, (w.end + 0.03 - t) / 0.05);
    return Math.max(0, edge) * (0.3 + 0.7 * Math.abs(Math.sin(local * Math.PI * syl)));
  }
  return 0;
}

const q = (a: number, c: number, b: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

export const GremlinBean: React.FC<{
  size?: number; pose?: PoseName; poses?: { at: number; pose: PoseName }[];
  words?: { start: number; end: number }[]; enterAt?: number; exitAt?: number;
  look?: [number, number]; flip?: boolean; id?: string; style?: React.CSSProperties;
}> = ({ size = 520, pose = "smug", poses, words, enterAt = 0, exitAt, look, flip, id = "gb", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = poseAt(frame, pose, poses);
  const t = frame / fps;

  // Pop-in / pop-out physics
  const cfg = { damping: 9, stiffness: 190, mass: 0.7 };
  const inS = (f: number) => spring({ frame: f - enterAt, fps, config: cfg });
  const outS = (f: number) => (exitAt === undefined ? 0 : spring({ frame: f - exitAt, fps, config: { damping: 14, stiffness: 260 } }));
  const s = inS(frame) * (1 - outS(frame));
  const vel = s - inS(frame - 1) * (1 - outS(frame - 1));
  if (s <= 0.001 && frame > enterAt) return null;

  // Talking
  const talk = mouthOpenFromWords(t, words);
  const talking = talk > 0.05 ? 1 : 0;

  // Body motion
  const breathe = Math.sin(t * 2.4) * 0.012;
  const laughHop = -Math.abs(Math.sin(frame * 0.55)) * 14 * p.bounce;
  const shake = Math.sin(frame * 2.9) * 2.6 * p.tremble + Math.sin(frame * 4.1) * 1.4 * p.tremble;
  const talkBob = talk * 4;
  const sy = s * (1 + breathe + p.stretch + vel * 2.4 + talk * 0.02);
  const sx = s * (1 - breathe * 0.6 - p.stretch * 0.5 - vel * 1.3);
  const sway = Math.sin(t * 1.3) * 1.2 + p.tilt + p.bounce * Math.sin(frame * 0.55) * 3;

  // Secondary motion: hair + legs lag behind the body
  const since = Math.max(0, frame - enterAt);
  const hair = 22 * Math.exp(-since / 9) * Math.sin(since * 0.85) + Math.sin(t * 2.4 - 0.8) * 3 - vel * 60 + p.bounce * Math.sin(frame * 0.55 - 1) * 10 + p.tremble * Math.sin(frame * 3) * 4;
  const legL = Math.sin(t * 3.1) * 9 + 14 * Math.exp(-since / 10) * Math.sin(since * 0.7);
  const legR = Math.sin(t * 3.1 + 1.9) * 9 + 14 * Math.exp(-since / 10) * Math.sin(since * 0.7 + 1);

  // Blink (every ~3.4s, slightly irregular), not while squinting hard
  const cyc = (t + 0.7) % 3.4;
  const blink = cyc < 0.13 ? Math.sin((cyc / 0.13) * Math.PI) : (t + 2.1) % 7.3 < 0.12 ? Math.sin((((t + 2.1) % 7.3) / 0.12) * Math.PI) : 0;

  const lx = (look ? look[0] : p.lookX), ly = (look ? look[1] : p.lookY);

  const eye = (ex: number, ey: number, rx: number, ry: number, sclera: string, lid: number, tiltDeg: number, key: string) => {
    const l = Math.min(1, Math.max(lid, blink));
    const lidY = ey - ry + l * 2 * ry;
    const pr = 10 * p.pupil + 3;
    const px = ex + lx * rx * 0.5, py = ey + ly * ry * 0.4 + 3;
    return (
      <g>
        <clipPath id={`${id}-${key}`}><ellipse cx={ex} cy={ey} rx={rx} ry={ry} /></clipPath>
        <ellipse cx={ex} cy={ey} rx={rx} ry={ry} fill={sclera} />
        <g clipPath={`url(#${id}-${key})`}>
          <ellipse cx={ex + 6} cy={ey + ry * 0.55} rx={rx} ry={ry * 0.5} fill="#000" opacity={0.08} />
          <circle cx={px} cy={py} r={pr} fill={INK} />
          <circle cx={px - pr * 0.35} cy={py - pr * 0.4} r={pr * 0.3} fill="#fff" />
          <g transform={`rotate(${tiltDeg} ${ex} ${ey})`}>
            <path d={`M${ex - rx - 20} ${ey - ry - 30} L${ex + rx + 20} ${ey - ry - 30} L${ex + rx + 20} ${lidY} Q${ex} ${lidY + 10} ${ex - rx - 20} ${lidY} Z`} fill={LID} />
            <path d={`M${ex - rx - 20} ${lidY} Q${ex} ${lidY + 10} ${ex + rx + 20} ${lidY}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          </g>
        </g>
        <ellipse cx={ex} cy={ey} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={5.5} />
        <path d={`M${ex - rx * 0.6} ${ey + ry + 9} Q${ex} ${ey + ry + 16} ${ex + rx * 0.7} ${ey + ry + 7}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.55} />
      </g>
    );
  };

  const brow = (cx: number, cy: number, dy: number, rot: number, mirror: boolean) => (
    <g transform={`translate(${cx} ${cy + dy}) scale(${mirror ? -1 : 1} 1) rotate(${rot})`}>
      <path d="M-50 10 Q-8 -18 48 -6 Q52 -2 46 3 Q-6 -6 -46 16 Q-54 16 -50 10 Z" fill={INK} />
    </g>
  );

  // Mouth
  const open = Math.min(1, Math.max(p.mOpen, talk * (0.75 + 0.25 * talking)));
  const cx = 207, cy = 268;
  const w = p.mW * (1 - open * 0.28) + talk * 6;
  const sm = p.mSmile;
  const L = [cx - w, cy - sm * 0.7], R = [cx + w * 1.06, cy - sm * 1.25];
  const topC = [cx, cy + sm * 0.95 - open * 4];
  const depth = open * 58;
  const botC = [cx, cy + sm * 0.95 + depth * 1.7];
  const mouthD = `M${L[0]} ${L[1]} Q${topC[0]} ${topC[1]} ${R[0]} ${R[1]} Q${botC[0]} ${botC[1]} ${L[0]} ${L[1]} Z`;
  const tooth = (x: number) => {
    const tt = (x - L[0]) / (R[0] - L[0]);
    const y = q(L[1], topC[1], R[1], tt) - 2;
    return <path d={`M${x - 7} ${y} L${x + 7} ${y} L${x + 6.5} ${y + 15} Q${x} ${y + 18} ${x - 6.5} ${y + 15} Z`} fill="#fbf7e6" stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />;
  };

  const tube = (d: string, k: string) => (
    <g key={k}>
      <path d={d} fill="none" stroke={INK} strokeWidth={36} strokeLinecap="round" />
      <path d={d} fill="none" stroke={BODY} strokeWidth={25} strokeLinecap="round" />
    </g>
  );
  const crossed = (
    <g opacity={1 - p.arms}>
      {tube("M88 300 Q118 352 262 326", "a1")}
      <path d="M96 318 Q140 350 250 334" fill="none" stroke={BODY_SHADE} strokeWidth={5} opacity={0.5} strokeLinecap="round" />
      {tube("M316 298 Q292 356 150 344", "a2")}
      <circle cx={150} cy={344} r={15} fill={BODY} stroke={INK} strokeWidth={5.5} />
      <path d="M142 336 Q136 344 143 352 M152 333 Q146 343 153 354" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
  const raised = (
    <g opacity={p.arms}>
      {tube("M86 300 Q34 262 58 186", "r1")}
      {tube("M318 298 Q370 262 346 186", "r2")}
      {[[58, 180], [346, 180]].map(([hx, hy], i) => (
        <g key={i}>
          <circle cx={hx} cy={hy} r={17} fill={BODY} stroke={INK} strokeWidth={5.5} />
          <path d={`M${hx - 8} ${hy - 12} L${hx - 10} ${hy - 26} M${hx} ${hy - 15} L${hx} ${hy - 30} M${hx + 8} ${hy - 12} L${hx + 11} ${hy - 25}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );

  const BODY_D = "M204 44 C286 42 330 112 336 202 C343 298 362 360 332 410 C304 456 246 462 198 460 C142 458 86 446 71 396 C56 346 80 300 80 232 C80 122 122 46 204 44 Z";

  return (
    <div style={{ width: size, height: size * 1.25, transform: `translate(${shake}px, ${laughHop + talkBob}px) scaleX(${flip ? -1 : 1})`, ...style }}>
      <svg viewBox="-20 -10 440 520" width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`${id}-g`} cx="36%" cy="28%" r="78%">
            <stop offset="0%" stopColor={BODY_LIGHT} />
            <stop offset="45%" stopColor={BODY} />
            <stop offset="100%" stopColor={BODY_SHADE} />
          </radialGradient>
          <clipPath id={`${id}-body`}><path d={BODY_D} /></clipPath>
          <clipPath id={`${id}-mouth`}><path d={mouthD} /></clipPath>
        </defs>
        <ellipse cx={205} cy={498} rx={120 * s} ry={12 * s} fill="#000" opacity={0.18} />
        <g transform={`translate(200 470) rotate(${sway}) scale(${sx} ${sy}) translate(-200 -470)`}>
          {/* legs */}
          <g transform={`rotate(${legL} 172 445)`}>{tube("M172 440 Q168 470 162 492", "l1")}<ellipse cx={160} cy={496} rx={14} ry={8} fill={BODY} stroke={INK} strokeWidth={5} /></g>
          <g transform={`rotate(${legR} 236 448)`}>{tube("M236 442 Q240 470 246 492", "l2")}<ellipse cx={248} cy={496} rx={14} ry={8} fill={BODY} stroke={INK} strokeWidth={5} /></g>
          {/* body */}
          <path d={BODY_D} fill={`url(#${id}-g)`} />
          <g clipPath={`url(#${id}-body)`}>
            <path d={BODY_D} fill="#e8383a" opacity={p.flush * 0.28} />
            <ellipse cx={142} cy={118} rx={34} ry={54} fill="#fff" opacity={0.18} transform="rotate(-18 142 118)" />
            <path d="M300 160 C330 260 326 360 280 446 L360 470 L360 120 Z" fill={BODY_SHADE} opacity={0.35} />
            <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.35} fill="none">
              <path d="M300 380 l14 -6 M296 396 l16 -6 M292 412 l14 -5" />
              <path d="M104 384 l-10 -8 M110 400 l-12 -7" />
              <path d="M172 92 q8 -4 16 -2 M240 96 q8 1 14 5" />
              <path d="M186 410 q20 8 44 0" />
            </g>
          </g>
          <path d={BODY_D} fill="none" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          {/* hair strand */}
          <g transform={`rotate(${hair} 214 50)`}>
            <path d="M212 52 C214 22 246 2 282 10 C298 14 304 26 296 34 C292 22 270 16 252 22 C236 28 226 40 222 54 Z" fill={INK} />
          </g>
          {/* face */}
          {eye(150, 176, 38, 34, "#eef0c4", p.lidL, p.tiltL, "eL")}
          {eye(258, 168, 44, 40, "#f3d548", p.lidR, p.tiltR, "eR")}
          {brow(148, 124, p.browLy, p.browLr, false)}
          {brow(262, 112, p.browRy, p.browRr, true)}
          {/* nose bump */}
          <path d="M200 222 Q206 232 216 228" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
          {/* mouth */}
          {open > 0.02 && <path d={mouthD} fill={MOUTH} />}
          {open > 0.25 && <g clipPath={`url(#${id}-mouth)`}><ellipse cx={cx + 6} cy={botC[1] * 0.5 + cy * 0.5 + depth * 0.45} rx={w * 0.55} ry={depth * 0.5} fill={TONGUE} /></g>}
          {tooth(cx - 18)}
          {tooth(cx + 16)}
          <path d={mouthD} fill="none" stroke={INK} strokeWidth={5.5} strokeLinejoin="round" strokeLinecap="round" />
          <path d={`M${R[0] - 4} ${R[1] - 8} Q${R[0] + 10} ${R[1] - 1} ${R[0] + 2} ${R[1] + 11}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" opacity={sm > 4 ? 1 : 0} />
          <path d={`M${L[0] + 4} ${L[1] - 6} Q${L[0] - 8} ${L[1]} ${L[0] - 1} ${L[1] + 9}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" opacity={sm > 10 ? 0.8 : 0} />
          {/* arms on top */}
          {crossed}
          {raised}
        </g>
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- DEMO
const DEMO: { pose: PoseName; label: string }[] = [
  { pose: "smug", label: "smug" }, { pose: "sideEye", label: "sideEye" }, { pose: "stare", label: "stare" },
  { pose: "judging", label: "judging" }, { pose: "laugh", label: "laugh" }, { pose: "angry", label: "angry" },
  { pose: "shocked", label: "shocked" }, { pose: "talk", label: "talk" },
];
const STEP = 45;

export default function GremlinBeanDemo() {
  const frame = useCurrentFrame();
  const i = Math.min(DEMO.length - 1, Math.floor(frame / STEP));
  const words = Array.from({ length: 6 }, (_, k) => ({ start: (7 * STEP) / 30 + 0.1 + k * 0.32, end: (7 * STEP) / 30 + 0.34 + k * 0.32 }));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #3a3550, #141220)", alignItems: "center", justifyContent: "center", fontFamily: "Space Grotesk, sans-serif" }}>
      <Sequence from={0}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <GremlinBean size={700} poses={DEMO.map((d, k) => ({ at: k * STEP, pose: d.pose }))} words={words} enterAt={4} exitAt={DEMO.length * STEP + 10} />
        </AbsoluteFill>
      </Sequence>
      <div style={{ position: "absolute", bottom: 260, color: "#fff", fontSize: 72, fontWeight: 700, opacity: interpolate(frame % STEP, [0, 6], [0, 1], { extrapolateRight: "clamp" }) }}>{DEMO[i].label}</div>
    </AbsoluteFill>
  );
}
