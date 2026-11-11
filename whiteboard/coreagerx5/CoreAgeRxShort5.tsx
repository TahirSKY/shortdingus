/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1305, "width": 1080, "height": 1920 } */
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
// SILENCE-SPLIT PARTICIPATION PAUSE FOR THE "3 -> 2 -> 1" CORTISOL QUIZ
// Raw voiceover has pure silence from 17.827s to 18.381s (between "head." and "Both").
// Splitting cleanly at frame 543 (18.100s) and resuming at frame 602 (20.067s)
// gives a playable 2.46s 3-2-1 countdown right before "Both can." drops!
// =============================================================================
const FPS_CONST = 30;
const VOICE_SPLIT_FRAME = 543; // 18.1000s in raw audio (dead silent)
const VOICE_RESUME_FRAME = 602; // 20.0667s in output timeline
const PAUSE_SHIFT_SEC = (VOICE_RESUME_FRAME - VOICE_SPLIT_FRAME) / FPS_CONST; // +1.9667s

// =============================================================================
// HUB PERMANENT ASSET URLS (MP4 CLIPS + VOICE + SHARED LIBRARY AUDIO ONLY)
// =============================================================================
const HUB = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=";

const VOICE_URL = `${HUB}93cd2853-f655-48a7-ae4f-4e92b7bec363`;
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
  { id: 1, start: 0.0, end: 3.8, clipUrl: `${HUB}06e29fad-58fe-4f01-b2e8-887908a00fca`, clipDuration: 8.64, kicker: "CORTISOL & ORGAN FAT", accent: "#FF8E7A" },
  { id: 2, start: 3.8, end: 7.0, clipUrl: `${HUB}bd760c40-c595-4e5a-b8d4-b81542cc9336`, clipDuration: 7.25, kicker: "ZERO ISN'T POSSIBLE", accent: "#FFD45E" },
  { id: 3, start: 7.0, end: 9.12, clipUrl: `${HUB}f1349bea-2fd3-4c57-a380-70ac84d960eb`, clipDuration: 4.48, kicker: "NEEDED FOR DAILY ENERGY", accent: "#84E4B8" },
  { id: 4, start: 9.12, end: 13.15, clipUrl: `${HUB}6881a04a-58aa-496b-add4-7ececb85b822`, clipDuration: 11.64, kicker: "MONTHS OF CHRONIC STRESS", accent: "#FF8E7A" },
  { id: 5, start: 13.15, end: 20.38, clipUrl: `${HUB}74c1253d-3ae9-4745-897b-3f4e48f2dd97`, clipDuration: 4.59, kicker: "WHICH RAISES CORTISOL?", accent: "#C9AEFF" },
  { id: 6, start: 20.38, end: 24.6, clipUrl: `${HUB}c3f6b4a3-3892-4e61-8152-2404e284069c`, clipDuration: 7.82, kicker: "TWIST: BOTH CAN · REST & SLEEP", accent: "#84E4B8" },
  { id: 7, start: 24.6, end: 27.9, clipUrl: `${HUB}14b3c50a-e9a6-455c-b9cf-4f170bbdc320`, clipDuration: 7.8, kicker: "WALKING + LIFTING SHRINK IT", accent: "#7CC8F8" },
  // 27.90s -> 32.95s is the custom-coded CoreAge RX Interactive Search & U.S. Doctors Scene
  { id: 8, start: 32.95, end: 37.25, clipUrl: `${HUB}12ab601d-d9d6-49d9-baa8-294bb782ba17`, clipDuration: 5.94, kicker: "THE PROMISED LINE · NO HACKS", accent: "#FF8E7A" },
  { id: 9, start: 37.25, end: 39.95, clipUrl: `${HUB}2e6ce90b-8846-48c4-9685-502d168da994`, clipDuration: 6.41, kicker: "SMALL REPEATABLE HABITS", accent: "#84E4B8" },
  { id: 10, start: 39.95, end: 43.5, clipUrl: `${HUB}72e4a57c-7a59-4f66-ae57-c3e56684731d`, clipDuration: 5.49, kicker: "CHECK YOUR STRESS LEVEL", accent: "#FFD45E" },
];

// =============================================================================
// EXACT WORD-LEVEL TRANSCRIPT (RAW TIMINGS -> AUTO-SHIFTED AFTER 18.100s PAUSE)
// =============================================================================
interface WordTiming {
  w: string;
  s: number;
  e: number;
  hi?: string;
}

const RAW_WORDS: WordTiming[] = [
  { w: "Your", s: 0.256, e: 0.385 },
  { w: "stress", s: 0.449, e: 0.834, hi: "#FF8E7A" },
  { w: "hormone", s: 0.834, e: 1.187, hi: "#C9AEFF" },
  { w: "might", s: 1.395, e: 1.556 },
  { w: "be", s: 1.556, e: 1.7 },
  { w: "steering", s: 1.7, e: 2.005, hi: "#FFD45E" },
  { w: "fat", s: 2.101, e: 2.31, hi: "#FFD45E" },
  { w: "straight", s: 2.374, e: 2.759 },
  { w: "to", s: 2.759, e: 2.984 },
  { w: "your", s: 2.984, e: 3.16 },
  { w: "organs.", s: 3.16, e: 3.529, hi: "#FF8E7A" },

  { w: "Zero", s: 4.026, e: 4.347, hi: "#FF8E7A" },
  { w: "cortisol", s: 4.347, e: 4.716, hi: "#C9AEFF" },
  { w: "isn't", s: 4.861, e: 5.069 },
  { w: "possible.", s: 5.069, e: 5.52, hi: "#FF8E7A" },
  { w: "Stay", s: 5.55, e: 5.887, hi: "#FFD45E" },
  { w: "for", s: 5.887, e: 6.032 },
  { w: "the", s: 6.032, e: 6.112 },
  { w: "last", s: 6.112, e: 6.337, hi: "#84E4B8" },
  { w: "line.", s: 6.369, e: 6.513, hi: "#84E4B8" },

  { w: "You", s: 7.315, e: 7.379 },
  { w: "need", s: 7.492, e: 7.861, hi: "#84E4B8" },
  { w: "cortisol", s: 7.893, e: 8.31, hi: "#7CC8F8" },
  { w: "to", s: 8.358, e: 8.454 },
  { w: "live.", s: 8.454, e: 8.663, hi: "#FFD45E" },

  { w: "But", s: 9.176, e: 9.304 },
  { w: "stay", s: 9.417, e: 9.738 },
  { w: "stressed", s: 9.738, e: 10.107, hi: "#FF8E7A" },
  { w: "for", s: 10.139, e: 10.251 },
  { w: "months,", s: 10.251, e: 10.813, hi: "#C9AEFF" },
  { w: "and", s: 11.005, e: 11.133 },
  { w: "fat", s: 11.182, e: 11.438, hi: "#FFD45E" },
  { w: "can", s: 11.438, e: 11.599 },
  { w: "settle", s: 11.599, e: 11.903, hi: "#FF8E7A" },
  { w: "around", s: 11.903, e: 12.128 },
  { w: "your", s: 12.128, e: 12.208 },
  { w: "organs.", s: 12.305, e: 12.641, hi: "#FF8E7A" },

  { w: "Which", s: 13.492, e: 13.636 },
  { w: "can", s: 13.732, e: 13.845 },
  { w: "raise", s: 13.893, e: 14.037, hi: "#FF8E7A" },
  { w: "cortisol?", s: 14.069, e: 14.551, hi: "#C9AEFF" },
  { w: "Hard", s: 15.016, e: 15.24, hi: "#FF8E7A" },
  { w: "workouts", s: 15.256, e: 15.754, hi: "#FF8E7A" },
  { w: "or", s: 15.898, e: 15.946 },
  { w: "bad", s: 16.155, e: 16.363, hi: "#7CC8F8" },
  { w: "sleep?", s: 16.379, e: 16.588, hi: "#7CC8F8" },
  { w: "Pick", s: 17.037, e: 17.262, hi: "#84E4B8" },
  { w: "one", s: 17.262, e: 17.326, hi: "#FFD45E" },
  { w: "in", s: 17.374, e: 17.454 },
  { w: "your", s: 17.454, e: 17.583 },
  { w: "head.", s: 17.583, e: 17.727, hi: "#FFD45E" },

  // --- 3 -> 2 -> 1 COUNTDOWN PAUSE INSERTED HERE (raw >= 18.4 shifts by +PAUSE_SHIFT_SEC) ---
  { w: "Both", s: 18.481, e: 18.722, hi: "#FFD45E" },
  { w: "can.", s: 18.786, e: 18.914, hi: "#84E4B8" },
  { w: "So", s: 19.46, e: 19.652 },
  { w: "rest", s: 19.845, e: 20.118, hi: "#C9AEFF" },
  { w: "days", s: 20.118, e: 20.294, hi: "#C9AEFF" },
  { w: "matter.", s: 20.39, e: 20.727, hi: "#84E4B8" },
  { w: "So", s: 21.208, e: 21.369 },
  { w: "does", s: 21.369, e: 21.497 },
  { w: "a", s: 21.529, e: 21.593 },
  { w: "full", s: 21.593, e: 21.77, hi: "#7CC8F8" },
  { w: "night's", s: 21.77, e: 21.995, hi: "#FFD45E" },
  { w: "sleep.", s: 21.995, e: 22.203, hi: "#84E4B8" },

  { w: "Walking", s: 22.877, e: 23.262, hi: "#7CC8F8" },
  { w: "and", s: 23.374, e: 23.487 },
  { w: "lifting", s: 23.599, e: 23.904, hi: "#84E4B8" },
  { w: "help", s: 24.0, e: 24.192 },
  { w: "shrink", s: 24.257, e: 24.577, hi: "#FFD45E" },
  { w: "visceral", s: 24.642, e: 24.979, hi: "#FF8E7A" },
  { w: "fat", s: 24.979, e: 25.171, hi: "#FFD45E" },
  { w: "too.", s: 25.283, e: 25.396 },

  { w: "Want", s: 26.247, e: 26.392 },
  { w: "backup?", s: 26.44, e: 26.826, hi: "#7CC8F8" },
  { w: "CoreAge", s: 27.39, e: 27.98, hi: "#84E4B8" },
  { w: "RX", s: 27.98, e: 28.517, hi: "#84E4B8" },
  { w: "connects", s: 28.517, e: 28.839 },
  { w: "you", s: 28.839, e: 28.903 },
  { w: "with", s: 28.919, e: 29.129 },
  { w: "U.S.", s: 29.145, e: 29.386, hi: "#7CC8F8" },
  { w: "doctors", s: 29.483, e: 29.934, hi: "#7CC8F8" },
  { w: "online.", s: 30.03, e: 30.336, hi: "#84E4B8" },

  { w: "Here's", s: 31.318, e: 31.544, hi: "#FFD45E" },
  { w: "the", s: 31.576, e: 31.657 },
  { w: "line", s: 31.657, e: 31.882, hi: "#FFD45E" },
  { w: "I", s: 31.882, e: 31.979 },
  { w: "promised:", s: 31.979, e: 32.397, hi: "#84E4B8" },
  { w: "No", s: 32.848, e: 32.993, hi: "#FF8E7A" },
  { w: "cortisol", s: 33.106, e: 33.54, hi: "#C9AEFF" },
  { w: "hack", s: 33.573, e: 33.991, hi: "#FF8E7A" },
  { w: "melts", s: 34.072, e: 34.458 },
  { w: "visceral", s: 34.474, e: 34.861, hi: "#FFD45E" },
  { w: "fat.", s: 34.861, e: 35.07, hi: "#FFD45E" },

  { w: "Small", s: 35.521, e: 35.891, hi: "#84E4B8" },
  { w: "habits", s: 35.988, e: 36.358, hi: "#84E4B8" },
  { w: "slowly", s: 36.471, e: 37.179, hi: "#7CC8F8" },
  { w: "shrink", s: 37.211, e: 37.534, hi: "#FFD45E" },
  { w: "it.", s: 37.534, e: 37.662 },

  { w: "So,", s: 38.194, e: 38.387 },
  { w: "how", s: 38.805, e: 38.999 },
  { w: "stressed", s: 38.999, e: 39.401, hi: "#FF8E7A" },
  { w: "are", s: 39.401, e: 39.466 },
  { w: "you", s: 39.466, e: 39.611 },
  { w: "right", s: 39.611, e: 39.788, hi: "#FFD45E" },
  { w: "now?", s: 39.788, e: 40.029, hi: "#FFD45E" },
];

const WORDS: WordTiming[] = RAW_WORDS.map((item) =>
  item.s >= 18.4
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
  { at: 0.2, src: SFX.pop, vol: 0.22 },
  { at: 3.82, src: SFX.whoosh, vol: 0.18 },
  { at: 5.54, src: SFX.sparkle, vol: 0.2 },
  { at: 7.02, src: SFX.chime, vol: 0.2 },
  { at: 9.14, src: SFX.whoosh, vol: 0.18 },
  { at: 13.16, src: SFX.whoosh, vol: 0.18 },
  // 3 -> 2 -> 1 Cortisol Quiz Countdown Ticks (17.88s, 18.70s, 19.52s)
  { at: 17.88, src: SFX.click, vol: 0.34 },
  { at: 17.88, src: SFX.tick, vol: 0.28, dur: 2.2 },
  { at: 18.7, src: SFX.click, vol: 0.36 },
  { at: 19.52, src: SFX.click, vol: 0.38 },
  { at: 19.35, src: SFX.riser, vol: 0.22 },
  // Plot-Twist Reveal: "Both can."
  { at: 20.38, src: SFX.impact, vol: 0.28 },
  { at: 20.46, src: SFX.chime, vol: 0.25 },
  // Walking & Lifting
  { at: 24.62, src: SFX.whoosh, vol: 0.18 },
  { at: 26.22, src: SFX.sparkle, vol: 0.22 },
  // CoreAge RX Interactive Search & U.S. Doctors UI (27.90s -> 32.95s)
  { at: 27.9, src: SFX.whoosh, vol: 0.22 },
  { at: 28.15, src: SFX.typing, vol: 0.32, dur: 0.9 },
  { at: 29.32, src: SFX.click, vol: 0.28 },
  { at: 29.44, src: SFX.pop, vol: 0.25 },
  { at: 30.05, src: SFX.toggle, vol: 0.25 },
  { at: 31.8, src: SFX.chime, vol: 0.23 },
  // Promised Line ("No cortisol hack...") + Small Habits + Stress Gauge Closer
  { at: 32.97, src: SFX.whoosh, vol: 0.18 },
  { at: 34.82, src: SFX.stamp, vol: 0.25 },
  { at: 37.27, src: SFX.pop, vol: 0.22 },
  { at: 39.2, src: SFX.sparkle, vol: 0.24 },
  { at: 39.97, src: SFX.whoosh, vol: 0.18 },
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
 * Signature "3 -> 2 -> 1" Cortisol Quiz Countdown Overlay inside Scene 05 (13.15s -> 20.38s)
 * Right after "Hard workouts or bad sleep? Pick one in your head." (17.73s),
 * triggers a tactile 3 -> 2 -> 1 countdown medallion + neutral choice pills before
 * Scene 06 drops the plot-twist reveal: "Both can."!
 */
const CortisolQuizCountdownOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Scene 05 starts at 13.15s
  const globalT = 13.15 + frame / fps;

  // Neutral choice pills appear as "Hard workouts or bad sleep?" is asked
  const showChoices = globalT >= 15.0;
  const choiceAppear = Math.max(0, (globalT - 15.0) * fps);
  const choiceOpacity = interpolate(choiceAppear, [0, 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 3 -> 2 -> 1 Countdown window: 17.88s -> 20.34s (0.82s per step)
  const cStart = 17.88;
  const stepDur = 0.82;
  const cEnd = cStart + stepDur * 3; // 20.34s
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

  const choices = [
    { tag: "A · Hard Workouts", bg: "#FFEAE5" },
    { tag: "B · Bad Sleep", bg: "#E6F4FE" },
  ];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Top Neutral Choice Pills (kept neutral until "Both can." twist in Scene 06) */}
      {showChoices && (
        <div
          style={{
            position: "absolute",
            top: 152,
            left: 44,
            right: 44,
            display: "flex",
            justifyContent: "center",
            gap: 18,
            opacity: choiceOpacity,
          }}
        >
          {choices.map((c, idx) => (
            <div
              key={idx}
              style={{
                padding: "11px 24px",
                borderRadius: 16,
                backgroundColor: c.bg,
                border: "2.5px solid #18181B",
                boxShadow: "0 6px 14px rgba(24,24,27,0.08)",
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 800,
                color: "#18181B",
              }}
            >
              {c.tag}
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

          {/* Lock-in label + 3 progress dots */}
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
            <span>PICK A OR B</span>
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

      {scene.id === 5 && <CortisolQuizCountdownOverlay />}
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
 * Custom-coded Brand Scene (27.90s -> 32.95s = 5.05s):
 * "Want backup? CoreAge RX connects you with U.S. doctors online."
 * Types "CoreAge RX", clicks search right on "CoreAge", and opens the U.S. Telehealth Doctors hub!
 */
const CoreAgeRxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps; // 0.00s -> 5.05s (global 27.90s -> 32.95s)

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

  // Brisk typing from localT 0.25s -> 1.15s ("Want backup?")
  const query = "CoreAge RX";
  const typedCount = Math.floor(
    interpolate(localT, [0.25, 1.15], [0, query.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedText = query.slice(0, typedCount);
  const caretVisible = Math.floor(frame / 8) % 2 === 0;

  // Click at localT = 1.42s (global 29.32s -> right as "CoreAge RX" is spoken!)
  const clickFrame = Math.round(1.42 * fps);
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

  const ctaPulse = interpolate(
    localT,
    [3.7, 4.05, 4.4, 4.75],
    [1, 1.048, 1.01, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Pointer cursor trajectory
  const cursorX = interpolate(
    localT,
    [0.2, 1.12, 1.42, 3.5, 4.0],
    [840, 760, 625, 740, 545],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorY = interpolate(
    localT,
    [0.2, 1.12, 1.42, 3.5, 4.0],
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
      Math.round(4.0 * fps) - 2,
      Math.round(4.0 * fps) + 2,
      Math.round(4.0 * fps) + 6,
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
      role: "Hormone & Weight Specialist · U.S.",
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
                Connect With U.S. Doctors Online →
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
  if (t >= 17.86 && t <= 20.36) return null;

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
// ROOT COMPOSITION (1080x1920 @ 30fps, 1305 FRAMES = 43.50s)
// =============================================================================
export default function CoreAgeRxCortisolOrganFatShort() {
  const { fps, durationInFrames } = useVideoConfig();

  const coreAgeStartFrame = Math.round(27.9 * fps);
  const coreAgeEndFrame = Math.round(32.95 * fps);

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

      {/* 2. Custom-Coded Interactive CoreAge RX Search & U.S. Doctors Platform Scene (27.90s - 32.95s) */}
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

      {/* 4. Master Voiceover (Cleanly Split in Silence at 18.100s for the 3-2-1 Cortisol Quiz Countdown!) */}
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
          const countdownDuck = sec >= 17.85 && sec <= 20.5 ? 0.62 : 1;
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
