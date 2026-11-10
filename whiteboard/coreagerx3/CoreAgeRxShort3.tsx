/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1245, "width": 1080, "height": 1920 } */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// =============================================================================
// QUICK TUNING KNOBS
// =============================================================================
const SHOW_CAPTIONS = true;
// Built-in pencil audio on whiteboard MP4s reduced by 97% (set to 0 to fully mute)
const PENCIL_CLIP_VOLUME = 0.03;
const MUSIC_BASE_VOLUME = 0.065;

// =============================================================================
// SILENCE-SPLIT PARTICIPATION PAUSE FOR THE "3 -> 2 -> 1" QUIZ COUNTDOWN
// Raw voiceover has pure silence from 21.65s to 22.14s (between "head." and "Sugary").
// Splitting cleanly at frame 656 (21.867s) and resuming at frame 717 (23.900s)
// gives a crisp 2.46s 3-2-1 countdown right before "Sugary drinks." drops!
// =============================================================================
const FPS_CONST = 30;
const VOICE_SPLIT_FRAME = 656; // 21.8667s in raw audio (dead silent)
const VOICE_RESUME_FRAME = 717; // 23.9000s in output timeline
const PAUSE_SHIFT_SEC = (VOICE_RESUME_FRAME - VOICE_SPLIT_FRAME) / FPS_CONST; // +2.0333s

// =============================================================================
// HUB PERMANENT ASSET URLS (MP4 CLIPS + VOICE + SHARED LIBRARY AUDIO ONLY)
// =============================================================================
const HUB = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=";

const VOICE_URL = `${HUB}76219d88-d891-441b-a022-40ffb23a05e7`;
const MUSIC_URL = `${HUB}f4a1ed94-671d-4de6-ba60-43370bfafe68`; // docu-pluck.mp3

const SFX = {
  whoosh: `${HUB}8000d709-85ee-4aa4-aad0-9fc84130d93b`,
  pop: `${HUB}c52d697f-f404-484e-881d-0349bc9d3b69`,
  click: `${HUB}b4bb2b99-a6c9-42f3-b3d6-816cca355aad`,
  toggle: `${HUB}aabeb8f0-a7f1-4ab0-ad37-96400b3f90f6`,
  typing: `${HUB}bd282333-3e72-45c7-8dad-b8809f4bf2db`,
  chime: `${HUB}e0021584-0f5b-4f03-9847-7798617996d4`,
  sparkle: `${HUB}16d0b9a2-6984-4a90-ad8d-41be83b4f0df`,
  stamp: `${HUB}72187c30-49d0-4a52-821c-ae1cf92be0be`,
  tick: `${HUB}4205bf00-25d2-457b-a974-07049914196a`,
  riser: `${HUB}377b15fe-2f65-42df-9c9a-0830ea894bf9`,
  impact: `${HUB}599a8103-6cc7-4b36-8b2c-159af900165a`,
};

interface WhiteboardSceneSpec {
  id: number;
  start: number; // Output timeline seconds
  end: number; // Output timeline seconds
  clipUrl: string;
  clipDuration: number;
  kicker?: string;
  accent?: string;
}

const WHITEBOARD_SCENES: WhiteboardSceneSpec[] = [
  { id: 1, start: 0.0, end: 4.45, clipUrl: `${HUB}5832261f-ba4e-465b-94cf-2342fd54589c`, clipDuration: 10.53, kicker: "10 SNEAKY CULPRITS", accent: "#FF8E7A" },
  { id: 2, start: 4.45, end: 7.3, clipUrl: `${HUB}22cde04a-68fd-477c-aeaa-6fc5a0df6b71`, clipDuration: 6.29, kicker: "NOT EVEN A FOOD", accent: "#C9AEFF" },
  { id: 3, start: 7.3, end: 11.22, clipUrl: `${HUB}4232fdda-f244-45c0-befd-f102f1c00fff`, clipDuration: 9.28, kicker: "EVERYDAY TRAPS · 1-4", accent: "#FFD45E" },
  { id: 4, start: 11.22, end: 14.8, clipUrl: `${HUB}d34bc938-39d5-48f1-b927-ad56dee5914d`, clipDuration: 9.8, kicker: "EVERYDAY TRAPS · 5-8", accent: "#7CC8F8" },
  { id: 5, start: 14.8, end: 18.9, clipUrl: `${HUB}0e5bf1ac-0c98-4cae-af7e-56d858891712`, clipDuration: 12.59, kicker: "PLUS DAILY BEER (#9)", accent: "#FF8E7A" },
  { id: 6, start: 18.9, end: 24.18, clipUrl: `${HUB}54eeccfa-5c67-49cc-a03b-8e10d349430a`, clipDuration: 6.27, kicker: "WHICH ONE IS #10?", accent: "#84E4B8" },
  { id: 7, start: 24.18, end: 26.95, clipUrl: `${HUB}bb2ec0f2-63ad-43ec-87f4-605c2a96d9a7`, clipDuration: 8.27, kicker: "#1 SNEAKIEST: SUGARY DRINKS", accent: "#FFD45E" },
  { id: 8, start: 26.95, end: 29.65, clipUrl: `${HUB}9d2af250-a841-4d80-b43d-d9e2ff35f1c2`, clipDuration: 8.72, kicker: "FAST SPIKE · ZERO FULLNESS", accent: "#FF8E7A" },
  // 29.65s -> 34.10s is the custom-coded CoreAge RX Interactive Search & Platform Scene
  { id: 9, start: 34.1, end: 37.3, clipUrl: `${HUB}4022f712-586d-4def-8942-d18e6d90d058`, clipDuration: 5.49, kicker: "ONE EASY SWAP", accent: "#84E4B8" },
  { id: 10, start: 37.3, end: 41.5, clipUrl: `${HUB}f827f5fa-eec1-4933-b48c-96dbe74686d6`, clipDuration: 16.54, kicker: "CHECK YOUR FRIDGE", accent: "#7CC8F8" },
];

// =============================================================================
// EXACT WORD-LEVEL TRANSCRIPT (RAW TIMINGS -> AUTO-SHIFTED AFTER 21.867s PAUSE)
// =============================================================================
interface WordTiming {
  w: string;
  s: number;
  e: number;
  hi?: string;
}

const RAW_WORDS: WordTiming[] = [
  { w: "10", s: 0.192, e: 0.385, hi: "#FFD45E" }, { w: "everyday", s: 0.593, e: 0.866 }, { w: "foods", s: 0.914, e: 1.315, hi: "#FF8E7A" }, { w: "and", s: 1.315, e: 1.396 },
  { w: "drinks", s: 1.396, e: 1.7, hi: "#7CC8F8" }, { w: "might", s: 1.7, e: 1.861 }, { w: "be", s: 1.861, e: 1.957 }, { w: "quietly", s: 1.957, e: 2.406, hi: "#C9AEFF" },
  { w: "feeding", s: 2.503, e: 2.904, hi: "#FF8E7A" }, { w: "the", s: 3.0, e: 3.08 }, { w: "fat", s: 3.241, e: 3.482, hi: "#FFD45E" }, { w: "around", s: 3.482, e: 3.738 },
  { w: "your", s: 3.738, e: 3.963 }, { w: "organs.", s: 3.963, e: 4.3, hi: "#FF8E7A" }, { w: "Stay", s: 4.621, e: 4.846, hi: "#FFD45E" }, { w: "for", s: 4.846, e: 5.006 },
  { w: "the", s: 5.006, e: 5.086 }, { w: "sneakiest", s: 5.086, e: 5.552, hi: "#C9AEFF" }, { w: "one,", s: 5.552, e: 5.74 }, { w: "it", s: 5.74, e: 5.873 },
  { w: "isn't", s: 5.969, e: 6.354, hi: "#FF8E7A" }, { w: "even", s: 6.354, e: 6.466 }, { w: "a", s: 6.53, e: 6.546 }, { w: "food.", s: 6.546, e: 6.9, hi: "#7CC8F8" },
  { w: "Fried", s: 7.509, e: 7.862, hi: "#FFD45E" }, { w: "foods,", s: 7.878, e: 8.344 }, { w: "processed", s: 8.44, e: 8.809, hi: "#FF8E7A" }, { w: "meats,", s: 8.921, e: 9.306 },
  { w: "white", s: 9.483, e: 9.643, hi: "#7CC8F8" }, { w: "bread,", s: 9.74, e: 10.269 }, { w: "pastries,", s: 10.382, e: 11.152, hi: "#C9AEFF" }, { w: "candy,", s: 11.264, e: 11.713, hi: "#FF8E7A" },
  { w: "sugary", s: 11.746, e: 12.275, hi: "#84E4B8" }, { w: "cereal,", s: 12.307, e: 12.773 }, { w: "packaged", s: 12.869, e: 13.286, hi: "#FFD45E" }, { w: "snacks,", s: 13.286, e: 13.751 },
  { w: "fast", s: 13.912, e: 14.201, hi: "#FF8E7A" }, { w: "food.", s: 14.233, e: 14.49 }, { w: "Those", s: 15.019, e: 15.147 }, { w: "are", s: 15.196, e: 15.244 },
  { w: "all", s: 15.42, e: 15.468 }, { w: "linked", s: 15.677, e: 15.982, hi: "#FF8E7A" }, { w: "to", s: 15.982, e: 16.062 }, { w: "more", s: 16.062, e: 16.174 },
  { w: "belly", s: 16.223, e: 16.367, hi: "#FFD45E" }, { w: "fat.", s: 16.479, e: 16.592, hi: "#FFD45E" }, { w: "Beer", s: 17.201, e: 17.506, hi: "#FFD45E" }, { w: "too,", s: 17.506, e: 17.747 },
  { w: "if", s: 17.763, e: 17.859 }, { w: "it's", s: 17.859, e: 18.004 }, { w: "a", s: 18.004, e: 18.084 }, { w: "daily", s: 18.084, e: 18.325, hi: "#FF8E7A" },
  { w: "habit.", s: 18.325, e: 18.597 }, { w: "Now,", s: 19.207, e: 19.432 }, { w: "which", s: 19.849, e: 19.993 }, { w: "one's", s: 19.993, e: 20.106 },
  { w: "sneakiest?", s: 20.106, e: 20.587, hi: "#C9AEFF" }, { w: "Pick", s: 20.876, e: 21.036, hi: "#84E4B8" }, { w: "one", s: 21.036, e: 21.149 }, { w: "in", s: 21.149, e: 21.213 },
  { w: "your", s: 21.213, e: 21.357 }, { w: "head.", s: 21.357, e: 21.55, hi: "#FFD45E" },
  // --- 3 -> 2 -> 1 COUNTDOWN PAUSE INSERTED HERE (raw >= 22.0 shifts by +PAUSE_SHIFT_SEC) ---
  { w: "Sugary", s: 22.24, e: 22.753, hi: "#FF8E7A" }, { w: "drinks.", s: 22.898, e: 23.267, hi: "#FF8E7A" }, { w: "They", s: 23.604, e: 23.636 }, { w: "show", s: 23.684, e: 23.78 },
  { w: "up", s: 23.845, e: 23.941 }, { w: "on", s: 23.941, e: 23.989 }, { w: "most", s: 24.021, e: 24.294, hi: "#FFD45E" }, { w: "lists.", s: 24.326, e: 24.615 },
  { w: "Liquid", s: 25.048, e: 25.305, hi: "#7CC8F8" }, { w: "sugar", s: 25.305, e: 25.513, hi: "#FF8E7A" }, { w: "hits", s: 25.53, e: 25.674 }, { w: "fast", s: 25.77, e: 26.059, hi: "#FFD45E" },
  { w: "and", s: 26.107, e: 26.316 }, { w: "barely", s: 26.348, e: 26.637, hi: "#FF8E7A" }, { w: "fills", s: 26.669, e: 26.877 }, { w: "you", s: 26.893, e: 27.006 },
  { w: "up.", s: 27.006, e: 27.134 }, { w: "Want", s: 27.857, e: 27.953 }, { w: "backup?", s: 27.953, e: 28.323, hi: "#7CC8F8" }, { w: "CoreAge", s: 28.596, e: 28.917, hi: "#84E4B8" },
  { w: "RX", s: 28.917, e: 29.239, hi: "#84E4B8" }, { w: "connects", s: 29.239, e: 29.544 }, { w: "you", s: 29.544, e: 29.576 }, { w: "with", s: 29.576, e: 29.721 },
  { w: "U.S.", s: 29.721, e: 29.946, hi: "#7CC8F8" }, { w: "doctors", s: 30.042, e: 30.38, hi: "#7CC8F8" }, { w: "online.", s: 30.444, e: 30.733, hi: "#84E4B8" }, { w: "Check", s: 30.926, e: 31.103, hi: "#FFD45E" },
  { w: "them", s: 31.103, e: 31.231 }, { w: "out.", s: 31.231, e: 31.408 }, { w: "You", s: 32.453, e: 32.549 }, { w: "don't", s: 32.549, e: 32.726 },
  { w: "need", s: 32.726, e: 32.854 }, { w: "perfect.", s: 32.854, e: 33.24, hi: "#C9AEFF" }, { w: "Swap", s: 33.337, e: 33.674, hi: "#84E4B8" }, { w: "one", s: 33.883, e: 34.012, hi: "#FFD45E" },
  { w: "thing", s: 34.381, e: 34.494 }, { w: "this", s: 34.767, e: 34.831 }, { w: "week.", s: 34.928, e: 35.12, hi: "#84E4B8" }, { w: "Now", s: 35.41, e: 35.57 },
  { w: "go", s: 35.747, e: 35.827 }, { w: "open", s: 35.908, e: 36.068, hi: "#7CC8F8" }, { w: "your", s: 36.068, e: 36.165 }, { w: "fridge.", s: 36.165, e: 36.326, hi: "#FFD45E" },
];

const WORDS: WordTiming[] = RAW_WORDS.map((item) =>
  item.s >= 22.0
    ? { ...item, s: item.s + PAUSE_SHIFT_SEC, e: item.e + PAUSE_SHIFT_SEC }
    : item
);

interface CaptionGroup {
  start: number;
  end: number;
  words: WordTiming[];
}

const CAPTION_GROUPS: CaptionGroup[] = (() => {
  const groups: CaptionGroup[] = [];
  let bucket: WordTiming[] = [];
  for (let i = 0; i < WORDS.length; i++) {
    const cur = WORDS[i];
    const prev = bucket[bucket.length - 1];
    const gap = prev ? cur.s - prev.e : 0;
    const endsSentence = prev ? /[.?!:]$/.test(prev.w) : false;
    const charLen = bucket.reduce((acc, item) => acc + item.w.length + 1, 0);

    if (
      bucket.length > 0 &&
      (gap > 0.28 || endsSentence || bucket.length >= 4 || charLen + cur.w.length > 22)
    ) {
      groups.push({
        start: bucket[0].s,
        end: bucket[bucket.length - 1].e,
        words: bucket,
      });
      bucket = [];
    }
    bucket.push(cur);
  }
  if (bucket.length > 0) {
    groups.push({
      start: bucket[0].s,
      end: bucket[bucket.length - 1].e,
      words: bucket,
    });
  }
  return groups;
})();

// =============================================================================
// SOUND EFFECTS TIMELINE (OUTPUT TIMELINE SECONDS)
// =============================================================================
interface SfxCue {
  at: number;
  src: string;
  vol: number;
  dur?: number;
}

const SFX_CUES: SfxCue[] = [
  { at: 0.15, src: SFX.pop, vol: 0.22 },
  { at: 4.46, src: SFX.whoosh, vol: 0.18 },
  { at: 7.5, src: SFX.click, vol: 0.18 },
  { at: 11.24, src: SFX.whoosh, vol: 0.16 },
  { at: 15.65, src: SFX.stamp, vol: 0.22 },
  { at: 18.92, src: SFX.whoosh, vol: 0.18 },
  // 3 -> 2 -> 1 Quiz Countdown Ticks (exact frame sync!)
  { at: 21.68, src: SFX.click, vol: 0.34 },
  { at: 21.68, src: SFX.tick, vol: 0.28, dur: 2.2 },
  { at: 22.5, src: SFX.click, vol: 0.36 },
  { at: 23.32, src: SFX.click, vol: 0.38 },
  { at: 23.15, src: SFX.riser, vol: 0.22 },
  // Big Reveal: "Sugary drinks."
  { at: 24.18, src: SFX.impact, vol: 0.28 },
  { at: 24.26, src: SFX.chime, vol: 0.25 },
  { at: 26.96, src: SFX.whoosh, vol: 0.18 },
  // CoreAge RX Interactive Search & U.S. Doctors UI (29.65s -> 34.10s)
  { at: 29.65, src: SFX.whoosh, vol: 0.22 },
  { at: 29.92, src: SFX.typing, vol: 0.32, dur: 0.9 },
  { at: 30.82, src: SFX.click, vol: 0.28 },
  { at: 30.94, src: SFX.pop, vol: 0.25 },
  { at: 31.55, src: SFX.toggle, vol: 0.25 },
  { at: 32.92, src: SFX.chime, vol: 0.24 },
  // Swap & Fridge Finale
  { at: 34.12, src: SFX.pop, vol: 0.22 },
  { at: 37.32, src: SFX.whoosh, vol: 0.18 },
  { at: 38.45, src: SFX.sparkle, vol: 0.24 },
];

const FONT_SANS =
  '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Clean top chapter kicker pill */
const KickerBadge: React.FC<{ label: string; accent: string }> = ({
  label,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 210, mass: 0.7 },
  });
  const y = interpolate(pop, [0, 1], [-18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 74,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 24px",
          borderRadius: 999,
          backgroundColor: "#FFFFFF",
          border: "2.5px solid #18181B",
          boxShadow: "0 6px 18px rgba(24, 24, 27, 0.08)",
        }}
      >
        <span
          style={{
            width: 13,
            height: 13,
            borderRadius: "50%",
            backgroundColor: accent,
            border: "2px solid #18181B",
          }}
        />
        <span
          style={{
            fontFamily: FONT_SANS,
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#18181B",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

/**
 * Signature "3 -> 2 -> 1" Quiz Countdown Overlay inside Scene 06 (18.90s -> 24.18s)
 * Right after "Pick one in your head." (21.55s), triggers a tactile 3 -> 2 -> 1
 * pulsing countdown ring + neutral suspect pills before Scene 07 reveals Sugary Drinks!
 */
const SneakiestCountdownOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Scene 06 starts at 18.90s
  const globalT = 18.9 + frame / fps;

  // Suspect labels appear gently as the question is asked
  const showSuspects = globalT >= 19.85;
  const suspectAppear = Math.max(0, (globalT - 19.85) * fps);
  const suspectOpacity = interpolate(suspectAppear, [0, 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 3 -> 2 -> 1 Countdown window: 21.68s -> 24.14s (0.82s per step)
  const cStart = 21.68;
  const stepDur = 0.82;
  const cEnd = cStart + stepDur * 3; // 24.14s
  const inCountdown = globalT >= cStart && globalT <= cEnd + 0.04;

  let currentNum = 3;
  let stepLocalFrames = 0;
  if (globalT >= cStart + stepDur * 2) {
    currentNum = 1;
    stepLocalFrames = (globalT - (cStart + stepDur * 2)) * fps;
  } else if (globalT >= cStart + stepDur) {
    currentNum = 2;
    stepLocalFrames = (globalT - (cStart + stepDur)) * fps;
  } else {
    currentNum = 3;
    stepLocalFrames = Math.max(0, (globalT - cStart) * fps);
  }

  const numPop = spring({
    frame: stepLocalFrames,
    fps,
    config: { damping: 13, stiffness: 260, mass: 0.65 },
  });
  const numScale = interpolate(numPop, [0, 1], [0.62, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const drainProgress = interpolate(globalT, [cStart, cEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - drainProgress);

  const numAccent =
    currentNum === 3 ? "#84E4B8" : currentNum === 2 ? "#FFD45E" : "#FF8E7A";

  const suspects = [
    { tag: "A · Fried Foods", bg: "#FFEAE5" },
    { tag: "B · Cold Drinks", bg: "#E6F4FE" },
    { tag: "C · Sweet Treats", bg: "#FFF6D6" },
  ];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Top Neutral Suspect Lineup Pills */}
      {showSuspects && (
        <div
          style={{
            position: "absolute",
            top: 152,
            left: 44,
            right: 44,
            display: "flex",
            justifyContent: "center",
            gap: 14,
            opacity: suspectOpacity,
          }}
        >
          {suspects.map((s, idx) => (
            <div
              key={idx}
              style={{
                padding: "10px 20px",
                borderRadius: 16,
                backgroundColor: s.bg,
                border: "2.5px solid #18181B",
                boxShadow: "0 6px 14px rgba(24,24,27,0.08)",
                fontFamily: FONT_SANS,
                fontSize: 23,
                fontWeight: 800,
                color: "#18181B",
              }}
            >
              {s.tag}
            </div>
          ))}
        </div>
      )}

      {/* Tactile 3 -> 2 -> 1 Countdown Medallion in Clean Lower Safe Zone */}
      {inCountdown && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 255,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 204,
              height: 204,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              border: "4px solid #18181B",
              boxShadow: "0 16px 36px rgba(24, 24, 27, 0.16)",
              transform: `scale(${numScale})`,
            }}
          >
            <svg
              width="192"
              height="192"
              viewBox="0 0 192 192"
              style={{
                position: "absolute",
                transform: "rotate(-90deg)",
              }}
            >
              <circle
                cx="96"
                cy="96"
                r={radius}
                stroke="#E2E8F0"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r={radius}
                stroke={numAccent}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                fill="none"
              />
            </svg>

            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 104,
                fontWeight: 900,
                lineHeight: 1,
                color: "#18181B",
                letterSpacing: "-0.04em",
              }}
            >
              {currentNum}
            </span>
          </div>

          {/* Lock-in label + 3 step dots */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 26px",
              borderRadius: 999,
              backgroundColor: "#18181B",
              color: "#FFFFFF",
              fontFamily: FONT_SANS,
              fontSize: 25,
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            <span>LOCK IN YOUR GUESS</span>
            <div style={{ display: "flex", gap: 8 }}>
              {[3, 2, 1].map((n) => (
                <span
                  key={n}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor:
                      currentNum <= n ? numAccent : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * Plays 100% of a rendered whiteboard MP4 clip (hand drawing -> full-color payoff)
 * by matching playbackRate to the exact voiceover window. Never cuts early!
 */
const WhiteboardClipScene: React.FC<{ scene: WhiteboardSceneSpec }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sceneSeconds = durationInFrames / fps;
  const playbackRate = Number(
    Math.max(0.5, (scene.clipDuration - 0.08) / sceneSeconds).toFixed(4)
  );

  const progress = frame / Math.max(1, durationInFrames - 1);

  const enterOpacity =
    scene.id === 1
      ? 1
      : interpolate(frame, [0, 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const payoffZoom = interpolate(progress, [0, 0.78, 1], [1, 1, 1.028], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: enterOpacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${payoffZoom})`,
          transformOrigin: "50% 46%",
        }}
      >
        <OffthreadVideo
          src={scene.clipUrl}
          playbackRate={playbackRate}
          muted={PENCIL_CLIP_VOLUME <= 0}
          volume={PENCIL_CLIP_VOLUME}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#FFFFFF",
          }}
        />
      </AbsoluteFill>

      {scene.kicker && (
        <KickerBadge
          label={scene.kicker}
          accent={scene.accent || "#7CC8F8"}
        />
      )}

      {scene.id === 6 && <SneakiestCountdownOverlay />}
    </AbsoluteFill>
  );
};

// =============================================================================
// INLINE DOODLE AVATARS FOR CUSTOM COREAGE RX SCENE (MATCHES CHANNEL ART STYLE)
// =============================================================================
const DoodleDoctorAvatar: React.FC<{ coatColor: string; accent: string }> = ({
  coatColor,
  accent,
}) => (
  <svg width="92" height="92" viewBox="0 0 96 96" fill="none">
    <circle
      cx="48"
      cy="48"
      r="44"
      fill={accent}
      stroke="#18181B"
      strokeWidth="3"
    />
    <path
      d="M22 84 C24 65, 72 65, 74 84"
      fill={coatColor}
      stroke="#18181B"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M36 67 C36 78, 60 78, 60 67"
      stroke="#18181B"
      strokeWidth="2.8"
      fill="none"
    />
    <circle
      cx="54"
      cy="77"
      r="4.5"
      fill="#FFD45E"
      stroke="#18181B"
      strokeWidth="2.5"
    />
    <circle
      cx="48"
      cy="43"
      r="22"
      fill="#FFFFFF"
      stroke="#18181B"
      strokeWidth="3.2"
    />
    <circle cx="40.5" cy="41" r="2.8" fill="#18181B" />
    <circle cx="55.5" cy="41" r="2.8" fill="#18181B" />
    <path
      d="M41.5 49.5 Q48 55 54.5 49.5"
      stroke="#18181B"
      strokeWidth="2.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/**
 * Custom-coded Brand Scene (29.65s -> 34.10s = 4.45s):
 * "Want backup? CoreAge RX connects you with U.S. doctors online. Check them out."
 * Briskly types "CoreAge RX", clicks search, and opens the U.S. Telehealth Doctors hub!
 */
const CoreAgeRxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps; // 0.00s -> 4.45s (global 29.65s -> 34.10s)

  const winSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 195, mass: 0.75 },
  });
  const winY = interpolate(winSpring, [0, 1], [65, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const winOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Brisk typing from localT 0.22s -> 1.02s ("Want backup? CoreAge RX...")
  const query = "CoreAge RX";
  const typedCount = Math.floor(
    interpolate(localT, [0.22, 1.02], [0, query.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedText = query.slice(0, typedCount);
  const caretVisible = Math.floor(frame / 8) % 2 === 0;

  // Click at localT = 1.18s (global 30.83s -> right on "CoreAge RX connects")
  const clickFrame = Math.round(1.18 * fps);
  const isPlatformOpen = frame >= clickFrame + 3;

  const searchClickScale = interpolate(
    frame,
    [clickFrame - 2, clickFrame + 1, clickFrame + 4],
    [1, 0.96, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const platformSpring = spring({
    frame: Math.max(0, frame - (clickFrame + 3)),
    fps,
    config: { damping: 17, stiffness: 210, mass: 0.72 },
  });

  // CTA pulse on "Check them out." (global 32.96s -> localT 3.31s)
  const ctaPulse = interpolate(
    localT,
    [3.2, 3.5, 3.8, 4.1],
    [1, 1.048, 1.01, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Pointer cursor trajectory
  const cursorX = interpolate(
    localT,
    [0.2, 0.98, 1.18, 3.05, 3.45],
    [840, 760, 625, 740, 545],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorY = interpolate(
    localT,
    [0.2, 0.98, 1.18, 3.05, 3.45],
    [960, 640, 600, 1060, 1255],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorScale = interpolate(
    frame,
    [
      clickFrame - 2,
      clickFrame + 1,
      clickFrame + 5,
      Math.round(3.45 * fps) - 2,
      Math.round(3.45 * fps) + 2,
      Math.round(3.45 * fps) + 6,
    ],
    [1, 0.82, 1, 1, 0.86, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const doctors = [
    {
      name: "Dr. Sarah Mitchell, MD",
      role: "U.S. Board-Certified · Metabolic Care",
      coat: "#7CC8F8",
      bg: "#EAF6FF",
      delay: 4,
    },
    {
      name: "Dr. James Carter, MD",
      role: "Licensed U.S. Physician · Telehealth",
      coat: "#84E4B8",
      bg: "#E9FBF3",
      delay: 9,
    },
    {
      name: "Dr. Elena Brooks, DO",
      role: "Weight & Nutrition Specialist · U.S.",
      coat: "#C9AEFF",
      bg: "#F3EEFF",
      delay: 14,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFFFFF",
        opacity: winOpacity,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(#D4D8E2 1.8px, transparent 1.8px)",
          backgroundSize: "34px 34px",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 190,
          left: 90,
          width: 900,
          height: 980,
          borderRadius: 60,
          background:
            "radial-gradient(circle at 50% 35%, rgba(124,200,248,0.22), rgba(132,228,184,0.12) 55%, rgba(255,255,255,0) 78%)",
        }}
      />

      <KickerBadge label="WANT MEDICAL BACKUP?" accent="#84E4B8" />

      <div
        style={{
          position: "absolute",
          top: 195,
          left: 64,
          right: 64,
          transform: `translateY(${winY}px)`,
          backgroundColor: "#FFFFFF",
          borderRadius: 34,
          border: "3.5px solid #18181B",
          boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)",
          overflow: "hidden",
        }}
      >
        {/* Browser Chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            backgroundColor: "#F8FAFC",
            borderBottom: "3px solid #18181B",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "#FF8E7A",
                border: "2px solid #18181B",
              }}
            />
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "#FFD45E",
                border: "2px solid #18181B",
              }}
            />
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: "#84E4B8",
                border: "2px solid #18181B",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 22px",
              borderRadius: 999,
              backgroundColor: "#FFFFFF",
              border: "2px solid #18181B",
              fontFamily: FONT_MONO,
              fontSize: 21,
              fontWeight: 700,
              color: "#18181B",
            }}
          >
            <span style={{ color: "#10B981" }}>●</span>
            <span>{isPlatformOpen ? "coreagerx.com" : "search · telehealth"}</span>
          </div>

          <div style={{ width: 58 }} />
        </div>

        {!isPlatformOpen ? (
          <div style={{ padding: "52px 44px 60px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <DoodleDoctorAvatar coatColor="#7CC8F8" accent="#FFF6D6" />
              <div
                style={{
                  marginTop: 14,
                  fontFamily: FONT_SANS,
                  fontSize: 34,
                  fontWeight: 800,
                  color: "#18181B",
                  letterSpacing: "-0.02em",
                }}
              >
                Get real U.S. doctor backup
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "22px 28px",
                borderRadius: 24,
                backgroundColor: "#FFFFFF",
                border: "3.5px solid #18181B",
                boxShadow: "0 10px 24px rgba(99, 102, 241, 0.12)",
                transform: `scale(${searchClickScale})`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="#6366F1"
                    strokeWidth="2.8"
                  />
                  <path
                    d="M16.5 16.5L21 21"
                    stroke="#6366F1"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 40,
                    fontWeight: 800,
                    color: typedText ? "#18181B" : "#94A3B8",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {typedText || "Search CoreAge RX..."}
                  {caretVisible && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 4,
                        height: 40,
                        marginLeft: 4,
                        verticalAlign: "middle",
                        backgroundColor: "#6366F1",
                      }}
                    />
                  )}
                </span>
              </div>

              <div
                style={{
                  padding: "12px 26px",
                  borderRadius: 16,
                  backgroundColor: typedCount >= 4 ? "#6366F1" : "#E2E8F0",
                  border: "2.5px solid #18181B",
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  fontWeight: 800,
                  color: typedCount >= 4 ? "#FFFFFF" : "#64748B",
                }}
              >
                Search
              </div>
            </div>

            {typedCount >= 2 && (
              <div
                style={{
                  marginTop: 18,
                  borderRadius: 22,
                  border: "3px solid #18181B",
                  backgroundColor: "#EEF2FF",
                  padding: "20px 26px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      backgroundColor: "#84E4B8",
                      border: "2px solid #18181B",
                      fontFamily: FONT_SANS,
                      fontSize: 19,
                      fontWeight: 800,
                      color: "#18181B",
                    }}
                  >
                    OFFICIAL
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#18181B",
                    }}
                  >
                    CoreAge RX · U.S. Doctors Online
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#6366F1",
                  }}
                >
                  Open →
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: "36px 38px 40px",
              transform: `scale(${interpolate(
                platformSpring,
                [0, 1],
                [0.95, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 26,
                paddingBottom: 20,
                borderBottom: "2.5px solid #E2E8F0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    backgroundColor: "#6366F1",
                    border: "3px solid #18181B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 3H15V9H21V15H15V21H9V15H3V9H9V3Z"
                      fill="#FFFFFF"
                      stroke="#18181B"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 39,
                      fontWeight: 900,
                      color: "#18181B",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.05,
                    }}
                  >
                    CoreAge <span style={{ color: "#6366F1" }}>RX</span>
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 21,
                      fontWeight: 700,
                      color: "#475569",
                      marginTop: 4,
                    }}
                  >
                    U.S. Telehealth Doctors Online
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  backgroundColor: "#E9FBF3",
                  border: "2.5px solid #18181B",
                  fontFamily: FONT_SANS,
                  fontSize: 21,
                  fontWeight: 800,
                  color: "#18181B",
                }}
              >
                ✓ Verified U.S. MDs
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {doctors.map((doc, i) => {
                const cardAppear = Math.max(
                  0,
                  frame - (clickFrame + 3 + doc.delay)
                );
                const s = spring({
                  frame: cardAppear,
                  fps,
                  config: { damping: 16, stiffness: 220, mass: 0.68 },
                });
                const cardX = interpolate(s, [0, 1], [38, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const cardOpacity = interpolate(cardAppear, [0, 5], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 22px",
                      borderRadius: 24,
                      backgroundColor: doc.bg,
                      border: "3px solid #18181B",
                      opacity: cardOpacity,
                      transform: `translateX(${cardX}px)`,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 18 }}
                    >
                      <DoodleDoctorAvatar
                        coatColor={doc.coat}
                        accent="#FFFFFF"
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: FONT_SANS,
                            fontSize: 27,
                            fontWeight: 800,
                            color: "#18181B",
                          }}
                        >
                          {doc.name}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT_SANS,
                            fontSize: 20,
                            fontWeight: 600,
                            color: "#334155",
                            marginTop: 3,
                          }}
                        >
                          {doc.role}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 18px",
                        borderRadius: 999,
                        backgroundColor: "#84E4B8",
                        border: "2.5px solid #18181B",
                        fontFamily: FONT_SANS,
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#18181B",
                      }}
                    >
                      <span>●</span>
                      <span>Online</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "22px 32px",
                borderRadius: 22,
                background: "linear-gradient(90deg, #6366F1 0%, #4DB8A8 100%)",
                border: "3px solid #18181B",
                boxShadow: "0 10px 24px rgba(99, 102, 241, 0.25)",
                transform: `scale(${ctaPulse})`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 30,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                }}
              >
                Check Out CoreAge RX Online →
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Animated Pointer Cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          transform: `scale(${cursorScale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        <svg width="58" height="58" viewBox="0 0 36 36" fill="none">
          <path
            d="M7 4L29 16.5L18.5 19.5L14 30L7 4Z"
            fill="#18181B"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// WORD-TIMED SHORTS CAPTIONS (HIDES CLEANLY DURING 3-2-1 MEDALLION)
// =============================================================================
const DynamicCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Hide speech caption pill during the silent 3 -> 2 -> 1 countdown so the medallion owns the lower zone
  if (t >= 21.66 && t <= 24.16) return null;

  let groupIndex = -1;
  for (let i = 0; i < CAPTION_GROUPS.length; i++) {
    const g = CAPTION_GROUPS[i];
    const nextStart =
      i + 1 < CAPTION_GROUPS.length ? CAPTION_GROUPS[i + 1].start : 9999;
    const winStart = g.start - 0.05;
    const winEnd = Math.min(g.end + 0.2, nextStart - 0.01);
    if (t >= winStart && t < winEnd) {
      groupIndex = i;
      break;
    }
  }
  if (groupIndex === -1) return null;

  const group = CAPTION_GROUPS[groupIndex];
  const groupAgeFrames = Math.max(0, (t - (group.start - 0.05)) * fps);
  const rise = interpolate(groupAgeFrames, [0, 5], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(groupAgeFrames, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let activeWordIdx = -1;
  for (let i = 0; i < group.words.length; i++) {
    if (t >= group.words[i].s - 0.03) {
      activeWordIdx = i;
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        right: 56,
        bottom: 295,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px 14px",
          padding: "18px 30px",
          borderRadius: 26,
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          border: "3.5px solid #18181B",
          boxShadow: "0 12px 30px rgba(24, 24, 27, 0.12)",
          maxWidth: 940,
        }}
      >
        {group.words.map((word, idx) => {
          const isCurrent = idx === activeWordIdx && t <= word.e + 0.22;
          const highlightColor = word.hi || "#FFD45E";

          return (
            <span
              key={idx}
              style={{
                display: "inline-block",
                padding: isCurrent ? "4px 14px" : "4px 4px",
                borderRadius: 14,
                backgroundColor: isCurrent ? highlightColor : "transparent",
                border: isCurrent
                  ? "2.5px solid #18181B"
                  : "2.5px solid transparent",
                fontFamily: FONT_SANS,
                fontSize: 50,
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: "-0.025em",
                color: "#18181B",
                transform: isCurrent ? "translateY(-3px) scale(1.04)" : "none",
              }}
            >
              {word.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Subtle top progress strip */
const TopProgressStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = interpolate(frame, [0, durationInFrames - 1], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: "rgba(24, 24, 27, 0.07)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "linear-gradient(90deg, #6366F1 0%, #5ED9B3 100%)",
        }}
      />
    </div>
  );
};

// =============================================================================
// ROOT COMPOSITION (1080x1920 @ 30fps, 1245 FRAMES = 41.50s)
// =============================================================================
export default function CoreAgeRxSneakyFoodsShort() {
  const { fps, durationInFrames } = useVideoConfig();

  const coreAgeStartFrame = Math.round(29.65 * fps);
  const coreAgeEndFrame = Math.round(34.1 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {/* 1. All 10 Whiteboard MP4 Drawing Clips (speed-matched so 100% of drawing + colored payoff plays) */}
      {WHITEBOARD_SCENES.map((scene) => {
        const from = Math.round(scene.start * fps);
        const to = Math.round(scene.end * fps);
        const dur = Math.max(1, to - from);
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={dur}
            name={`Scene-${String(scene.id).padStart(2, "0")}`}
          >
            <WhiteboardClipScene scene={scene} />
          </Sequence>
        );
      })}

      {/* 2. Custom-Coded Interactive CoreAge RX Search & U.S. Doctors Platform Scene (29.65s - 34.10s) */}
      <Sequence
        from={coreAgeStartFrame}
        durationInFrames={coreAgeEndFrame - coreAgeStartFrame}
        name="CoreAgeRX-Interactive-UI"
      >
        <CoreAgeRxScene />
      </Sequence>

      {/* 3. Word-Exact Dynamic Captions & Top Progress Strip */}
      {SHOW_CAPTIONS && <DynamicCaptions />}
      <TopProgressStrip />

      {/* 4. Master Voiceover (Cleanly Split in Silence at 21.867s for the 3-2-1 Countdown!) */}
      <Sequence from={0} durationInFrames={VOICE_SPLIT_FRAME} name="Voice-Part-1">
        <Audio src={VOICE_URL} volume={1} />
      </Sequence>
      <Sequence
        from={VOICE_RESUME_FRAME}
        durationInFrames={durationInFrames - VOICE_RESUME_FRAME}
        name="Voice-Part-2"
      >
        <Audio src={VOICE_URL} startFrom={VOICE_SPLIT_FRAME} volume={1} />
      </Sequence>

      {/* 5. Quiet Documentary Pluck Underscore (softly ducks during countdown & fades out cleanly) */}
      <Audio
        src={MUSIC_URL}
        volume={(f) => {
          const sec = f / fps;
          const endSec = durationInFrames / fps;
          const fadeOut = interpolate(sec, [endSec - 1.5, endSec], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const countdownDuck = sec >= 21.65 && sec <= 24.3 ? 0.62 : 1;
          return MUSIC_BASE_VOLUME * countdownDuck * fadeOut;
        }}
      />

      {/* 6. Tactile Story, Countdown & UI Sound Effects */}
      {SFX_CUES.map((cue, idx) => {
        const from = Math.round(cue.at * fps);
        const dur = cue.dur ? Math.round(cue.dur * fps) : Math.round(2.5 * fps);
        return (
          <Sequence key={idx} from={from} durationInFrames={dur}>
            <Audio src={cue.src} volume={cue.vol} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
