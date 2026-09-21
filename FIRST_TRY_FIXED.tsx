/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1650, "width": 1080, "height": 1920 } */
// @ts-nocheck
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const DURATION = 1650;

const VOICE_URL = "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/1789982752531-lm1i28ny81.wav";

const IMAGES = [
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-1-myth.png",
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-2-emerald.png",
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-3-garage.png",
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-4-zuck.png",
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-5-runway.png",
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-6-pool.png",
  "https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/studio-media/b6caa60b-fd4f-4537-a603-4ac1038647f8/generated-brainbank-7-safetynet.png"
];

const captionPhrases = [
  {
    "start": 0.112,
    "end": 1.999,
    "text": "Why self-made billionaires aren't."
  },
  {
    "start": 2.196,
    "end": 4.179,
    "text": "Every billionaire has the same origin story."
  },
  {
    "start": 4.44,
    "end": 5.317,
    "text": "I started with nothing,"
  },
  {
    "start": 5.498,
    "end": 6.824,
    "text": "just a dream and hard work."
  },
  {
    "start": 7.229,
    "end": 7.866,
    "text": "Elon Musk,"
  },
  {
    "start": 7.983,
    "end": 9.228000000000002,
    "text": "son of a man who owned an"
  },
  {
    "start": 9.153,
    "end": 11.056000000000001,
    "text": "emerald mine in apartheid South Africa."
  },
  {
    "start": 11.493,
    "end": 12.034,
    "text": "Jeff Bezos,"
  },
  {
    "start": 12.311,
    "end": 15.881,
    "text": "his parents invested $250,000 into Amazon when"
  },
  {
    "start": 15.725,
    "end": 16.827,
    "text": "it was a garage project."
  },
  {
    "start": 17.248,
    "end": 20.93,
    "text": "That's $250,000 in 1995 in a garage."
  },
  {
    "start": 21.432,
    "end": 21.972,
    "text": "Very humble."
  },
  {
    "start": 22.49,
    "end": 24.922,
    "text": "Self-made Mark Zuckerberg attended one of the"
  },
  {
    "start": 24.718,
    "end": 26.461000000000002,
    "text": "most elite prep schools in America,"
  },
  {
    "start": 26.866,
    "end": 28.545,
    "text": "had a private coding tutor at 12,"
  },
  {
    "start": 28.806,
    "end": 30.228,
    "text": "and his dad was a dentist who"
  },
  {
    "start": 30.008,
    "end": 31.494,
    "text": "could afford to fund his early projects."
  },
  {
    "start": 31.996,
    "end": 34.321999999999996,
    "text": "The average American couldn't survive without a"
  },
  {
    "start": 34.038,
    "end": 35.510999999999996,
    "text": "salary for 3 weeks."
  },
  {
    "start": 35.79,
    "end": 37.632999999999996,
    "text": "These guys had a runway long enough"
  },
  {
    "start": 37.574,
    "end": 38.003,
    "text": "to fail,"
  },
  {
    "start": 38.282,
    "end": 38.581999999999994,
    "text": "pivot,"
  },
  {
    "start": 38.764,
    "end": 39.385999999999996,
    "text": "fail again,"
  },
  {
    "start": 39.488,
    "end": 40.431,
    "text": "and still be fine."
  },
  {
    "start": 40.693,
    "end": 42.278999999999996,
    "text": "That's not a dream and hard work."
  },
  {
    "start": 42.526,
    "end": 44.128,
    "text": "That's a safety net that most people"
  },
  {
    "start": 44.15,
    "end": 45.895999999999994,
    "text": "will never see in their lifetime dressed"
  },
  {
    "start": 45.982,
    "end": 47.342999999999996,
    "text": "up as a personality trait."
  },
  {
    "start": 47.349,
    "end": 49.272999999999996,
    "text": "We don't call someone a self-made swimmer"
  },
  {
    "start": 49.439,
    "end": 50.784,
    "text": "when they grew up next to a"
  },
  {
    "start": 50.58,
    "end": 51.282,
    "text": "private pool."
  },
  {
    "start": 51.609,
    "end": 52.648999999999994,
    "text": "The water was already there."
  },
  {
    "start": 52.75,
    "end": 54.192,
    "text": "We just never talk about the pool."
  },
  {
    "start": 54.455,
    "end": 54.754999999999995,
    "text": "Subscribe."
  },
  {
    "start": 55.065,
    "end": 55.364999999999995,
    "text": "Bye."
  }
];

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const F = (sec) => Math.round(sec * FPS);
const fade = (frame, start, end, pad = 12) => Math.min(clamp((frame - start) / pad), clamp((end - frame) / pad));
const prog = (frame, start, end) => clamp((frame - start) / (end - start));
const popIn = (frame, start, config = {}) => {
  if (frame < start) return 0;
  return spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 12, stiffness: 180, mass: 0.75, ...config },
  });
};

function Caption({ frame }) {
  const t = frame / FPS;
  const phrase = captionPhrases.find((p) => t >= p.start && t < p.end);
  if (!phrase) return null;
  const lines = phrase.text.split("\n");
  const start = F(phrase.start);
  const end = F(phrase.end);
  const o = fade(frame, start, end, 8);
  const p = popIn(frame, start, { damping: 10, stiffness: 220 });
  const boxH = 92 + lines.length * 56;
  const boxY = 1496 - (lines.length - 2) * 20;
  const firstY = boxY + 76;
  const isHighlight = phrase.text.toLowerCase().includes("billionaire") || phrase.text.includes("$250,000") || phrase.text.toLowerCase().includes("safety net") || phrase.text.toLowerCase().includes("private pool") || phrase.text.toLowerCase().includes("emerald mine");

  return (
    <g opacity={o}>
      <rect x={70} y={boxY} width={940} height={boxH} rx={38} fill={isHighlight ? "#fef08a" : "rgba(7,10,18,0.82)"} stroke={isHighlight ? "#000000" : "rgba(255,255,255,0.18)"} strokeWidth={isHighlight ? 4 : 2} />
      {lines.map((line, i) => (
        <text
          key={line + i}
          x={540}
          y={firstY + i * 56}
          textAnchor="middle"
          fill={isHighlight ? "#000000" : "#ffffff"}
          fontFamily="Inter, Arial Black, Arial, sans-serif"
          fontSize={isHighlight ? 44 + p * 3 : 42}
          fontWeight={1000}
          letterSpacing={-0.6}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Background({ frame }) {
  const activeTime = frame / FPS;
  const activeCaption = captionPhrases.find(c => activeTime >= c.start && activeTime < c.end);
  const imageIdx = captionPhrases.indexOf(activeCaption || captionPhrases[0]) % IMAGES.length;
  const img = IMAGES[imageIdx] || IMAGES[0];
  const zoom = 1.0 + Math.sin(frame / 200) * 0.08;

  return (
    <g>
      <image href={img} x={-100} y={0} width={1280} height={1920} preserveAspectRatio="xMidYMid slice" opacity={0.9} transform={`translate(540 960) scale(${zoom}) translate(-540 -960)`} />
      <rect width={WIDTH} height={HEIGHT} fill="rgba(0,0,0,0.35)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#vig)" />
    </g>
  );
}

export default function Video() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#05060b" }}>
      <Audio src={VOICE_URL} volume={1} />
      
      <svg width={WIDTH} height={HEIGHT} viewBox={{0: 0, width: WIDTH, height: HEIGHT}}>
        <defs>
          <radialGradient id="vig" cx="50%" cy="48%" r="78%">
            <stop offset="58%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
          </radialGradient>
        </defs>

        <Background frame={frame} />

        <text x={540} y={92} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontFamily="Inter, sans-serif" fontSize={22} fontWeight={800} letterSpacing={4}>
          BRAINBANK • YAPPUCINO
        </text>

        <Caption frame={frame} />

        <g>
          <rect x={50} y={1858} width={980} height={12} rx={6} fill="#ffffff" opacity={0.16} />
          <rect x={50} y={1858} width={980 * clamp(frame / DURATION)} height={12} rx={6} fill="#ffffff" />
        </g>
      </svg>
    </AbsoluteFill>
  );
}
