/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1230, "width": 1080, "height": 1920 } */
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
// SILENCE-SPLIT PARTICIPATION PAUSE FOR THE "3 -> 2 -> 1" SLEEP QUIZ COUNTDOWN
// Raw voiceover has pure silence from 22.342s to 22.927s (between "head." and "Under").
// Splitting cleanly at frame 678 (22.600s) and resuming at frame 735 (24.500s)
// gives a playable 2.46s 3-2-1 countdown right before "Under 6 hours..." drops!
// =============================================================================
const FPS_CONST = 30;
const VOICE_SPLIT_FRAME = 678; // 22.6000s in raw audio (dead silent)
const VOICE_RESUME_FRAME = 735; // 24.5000s in output timeline
const PAUSE_SHIFT_SEC = (VOICE_RESUME_FRAME - VOICE_SPLIT_FRAME) / FPS_CONST; // +1.9000s

// =============================================================================
// HUB PERMANENT ASSET URLS (MP4 CLIPS + VOICE + SHARED LIBRARY AUDIO ONLY)
// =============================================================================
const HUB = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=";

const VOICE_URL = `${HUB}94618780-a6af-4758-8d8d-27d9ab967591`;
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
  { id: 1, start: 0.0, end: 3.8, clipUrl: `${HUB}9aaa56bf-3a1b-4a88-be7a-a38e1713e4e7`, clipDuration: 9.82, kicker: "TONIGHT'S ORGAN FAT TRAP", accent: "#FFD45E" },
  { id: 2, start: 3.8, end: 6.95, clipUrl: `${HUB}0d47a80f-135a-404e-8bed-cab71bd14968`, clipDuration: 6.91, kicker: "5 HABITS · EASIEST FIX #5", accent: "#84E4B8" },
  { id: 3, start: 6.95, end: 11.0, clipUrl: `${HUB}3c72078f-8380-4c61-8891-2910d3deead4`, clipDuration: 8.47, kicker: "HABIT #1 · EATING LATE", accent: "#FF8E7A" },
  { id: 4, start: 11.0, end: 14.85, clipUrl: `${HUB}26eb3a24-7c54-4793-ba22-df2857ceabc4`, clipDuration: 7.03, kicker: "HABIT #2 · NIGHTCAPS", accent: "#C9AEFF" },
  { id: 5, start: 14.85, end: 18.2, clipUrl: `${HUB}1be6a53c-6e01-48ed-8a88-4882d785e440`, clipDuration: 7.06, kicker: "HABIT #3 · SCROLLING IN BED", accent: "#7CC8F8" },
  { id: 6, start: 18.2, end: 24.86, clipUrl: `${HUB}ea66357b-1aa4-45ac-9f8c-8c9945db4fff`, clipDuration: 5.16, kicker: "HABIT #4 · SHORT SLEEP QUIZ", accent: "#FFD45E" },
  { id: 7, start: 24.86, end: 27.25, clipUrl: `${HUB}227e9e24-b00c-4f53-9432-f044c7731986`, clipDuration: 7.59, kicker: "ANSWER · UNDER 6 HOURS", accent: "#FF8E7A" },
  { id: 8, start: 27.25, end: 30.55, clipUrl: `${HUB}cca6952a-4aa6-4936-b2af-3d65a10731b7`, clipDuration: 8.88, kicker: "HABIT #5 · SKIPPING THE WALK", accent: "#C9AEFF" },
  { id: 9, start: 30.55, end: 33.02, clipUrl: `${HUB}d9139e59-59f1-4c01-9d0e-48899554f2b9`, clipDuration: 8.78, kicker: "10-MIN WALK · EASES SPIKES", accent: "#84E4B8" },
  // 33.02s -> 37.02s is the custom-coded CoreAge RX Interactive Search & U.S. Doctors Scene
  { id: 10, start: 37.02, end: 41.0, clipUrl: `${HUB}aceb17ad-622d-4bfb-a1e4-1b790046eb46`, clipDuration: 6.67, kicker: "PICK ONE TONIGHT", accent: "#84E4B8" },
];

// =============================================================================
// EXACT WORD-LEVEL TRANSCRIPT (RAW TIMINGS -> AUTO-SHIFTED AFTER 22.600s PAUSE)
// =============================================================================
interface WordTiming {
  w: string;
  s: number;
  e: number;
  hi?: string;
}

const RAW_WORDS: WordTiming[] = [
  { w: "Tonight,", s: 0.176, e: 0.673, hi: "#FFD45E" },
  { w: "you", s: 0.914, e: 1.026 },
  { w: "might", s: 1.154, e: 1.314 },
  { w: "be", s: 1.314, e: 1.475 },
  { w: "feeding", s: 1.475, e: 1.844, hi: "#FF8E7A" },
  { w: "the", s: 1.94, e: 2.02 },
  { w: "fat", s: 2.02, e: 2.517, hi: "#FFD45E" },
  { w: "wrapped", s: 2.517, e: 2.79 },
  { w: "around", s: 2.822, e: 3.046 },
  { w: "your", s: 3.062, e: 3.239 },
  { w: "organs.", s: 3.239, e: 3.608, hi: "#FF8E7A" },

  { w: "5", s: 3.944, e: 4.281, hi: "#FFD45E" },
  { w: "habits", s: 4.281, e: 4.634, hi: "#C9AEFF" },
  { w: "to", s: 4.682, e: 4.778 },
  { w: "drop.", s: 4.778, e: 5.083, hi: "#FF8E7A" },
  { w: "Stay", s: 5.404, e: 5.644, hi: "#7CC8F8" },
  { w: "for", s: 5.644, e: 5.74 },
  { w: "the", s: 5.74, e: 5.885 },
  { w: "easiest", s: 5.885, e: 6.27, hi: "#84E4B8" },
  { w: "fix.", s: 6.286, e: 6.542, hi: "#84E4B8" },

  { w: "1,", s: 7.152, e: 7.28, hi: "#FFD45E" },
  { w: "eating", s: 7.713, e: 7.857, hi: "#FF8E7A" },
  { w: "late.", s: 7.889, e: 8.114, hi: "#FF8E7A" },
  { w: "In", s: 8.691, e: 8.739 },
  { w: "one", s: 8.851, e: 8.98 },
  { w: "study,", s: 9.092, e: 9.381, hi: "#7CC8F8" },
  { w: "it", s: 9.573, e: 9.637 },
  { w: "made", s: 9.669, e: 9.894 },
  { w: "people", s: 9.894, e: 10.15 },
  { w: "hungrier.", s: 10.15, e: 10.696, hi: "#FF8E7A" },

  { w: "2,", s: 11.257, e: 11.465, hi: "#FFD45E" },
  { w: "nightcaps.", s: 11.882, e: 12.363, hi: "#C9AEFF" },
  { w: "Alcohol", s: 12.764, e: 13.149, hi: "#FF8E7A" },
  { w: "is", s: 13.261, e: 13.358 },
  { w: "linked", s: 13.422, e: 13.742 },
  { w: "to", s: 13.742, e: 13.839 },
  { w: "more", s: 13.839, e: 14.015 },
  { w: "belly", s: 14.063, e: 14.272, hi: "#FFD45E" },
  { w: "fat.", s: 14.304, e: 14.496, hi: "#FFD45E" },

  { w: "3,", s: 15.17, e: 15.442, hi: "#FFD45E" },
  { w: "scrolling", s: 15.603, e: 16.164, hi: "#7CC8F8" },
  { w: "in", s: 16.228, e: 16.276 },
  { w: "bed.", s: 16.308, e: 16.517, hi: "#C9AEFF" },
  { w: "It", s: 16.885, e: 16.95 },
  { w: "can", s: 16.95, e: 17.078 },
  { w: "cut", s: 17.11, e: 17.335, hi: "#FF8E7A" },
  { w: "into", s: 17.335, e: 17.495 },
  { w: "your", s: 17.495, e: 17.591 },
  { w: "sleep.", s: 17.591, e: 17.832, hi: "#84E4B8" },

  { w: "4,", s: 18.473, e: 18.73, hi: "#FFD45E" },
  { w: "short", s: 18.858, e: 19.259, hi: "#FF8E7A" },
  { w: "sleep.", s: 19.259, e: 19.467, hi: "#FF8E7A" },
  { w: "How", s: 19.9, e: 20.093 },
  { w: "little", s: 20.157, e: 20.381, hi: "#C9AEFF" },
  { w: "is", s: 20.542, e: 20.606 },
  { w: "too", s: 20.798, e: 20.911 },
  { w: "little?", s: 21.023, e: 21.263, hi: "#FFD45E" },
  { w: "Pick", s: 21.44, e: 21.616, hi: "#84E4B8" },
  { w: "a", s: 21.616, e: 21.648 },
  { w: "number", s: 21.648, e: 21.857, hi: "#7CC8F8" },
  { w: "in", s: 21.857, e: 21.953 },
  { w: "your", s: 21.985, e: 22.065 },
  { w: "head.", s: 22.065, e: 22.242, hi: "#FFD45E" },

  // --- 3 -> 2 -> 1 COUNTDOWN PAUSE INSERTED HERE (raw >= 23.0 shifts by +PAUSE_SHIFT_SEC) ---
  { w: "Under", s: 23.027, e: 23.204, hi: "#FF8E7A" },
  { w: "6", s: 23.204, e: 23.508, hi: "#FF8E7A" },
  { w: "hours", s: 23.508, e: 23.733, hi: "#FF8E7A" },
  { w: "is", s: 23.909, e: 23.973 },
  { w: "linked", s: 24.006, e: 24.23 },
  { w: "to", s: 24.23, e: 24.294 },
  { w: "more", s: 24.31, e: 24.422 },
  { w: "belly", s: 24.471, e: 24.615, hi: "#FFD45E" },
  { w: "fat.", s: 24.711, e: 24.936, hi: "#FFD45E" },

  { w: "5,", s: 25.433, e: 25.834, hi: "#84E4B8" },
  { w: "the", s: 26.074, e: 26.154 },
  { w: "easy", s: 26.235, e: 26.379, hi: "#84E4B8" },
  { w: "one:", s: 26.411, e: 26.619, hi: "#FFD45E" },
  { w: "skipping", s: 26.812, e: 27.341, hi: "#FF8E7A" },
  { w: "your", s: 27.357, e: 27.421 },
  { w: "after-dinner", s: 27.598, e: 28.095, hi: "#7CC8F8" },
  { w: "walk.", s: 28.095, e: 28.399, hi: "#84E4B8" },

  { w: "10", s: 28.816, e: 29.025, hi: "#FFD45E" },
  { w: "minutes", s: 29.057, e: 29.442, hi: "#FFD45E" },
  { w: "can", s: 29.458, e: 29.698 },
  { w: "ease", s: 29.762, e: 29.907, hi: "#84E4B8" },
  { w: "blood", s: 29.939, e: 30.244, hi: "#FF8E7A" },
  { w: "sugar", s: 30.244, e: 30.436, hi: "#FF8E7A" },
  { w: "spikes.", s: 30.436, e: 30.821, hi: "#84E4B8" },

  { w: "Want", s: 31.222, e: 31.384 },
  { w: "backup?", s: 31.384, e: 31.69, hi: "#7CC8F8" },
  { w: "CoreAge", s: 32.173, e: 32.68, hi: "#84E4B8" },
  { w: "RX", s: 32.68, e: 33.108, hi: "#84E4B8" },
  { w: "connects", s: 33.157, e: 33.543 },
  { w: "you", s: 33.543, e: 33.592 },
  { w: "with", s: 33.624, e: 33.769 },
  { w: "U.S.", s: 33.866, e: 34.124, hi: "#7CC8F8" },
  { w: "doctors", s: 34.124, e: 34.495, hi: "#7CC8F8" },
  { w: "online.", s: 34.591, e: 34.817, hi: "#84E4B8" },

  { w: "Just", s: 35.268, e: 35.446 },
  { w: "pick", s: 35.478, e: 35.655, hi: "#84E4B8" },
  { w: "one.", s: 35.655, e: 35.784, hi: "#FFD45E" },
  { w: "So,", s: 36.235, e: 36.526 },
  { w: "what", s: 36.687, e: 36.8 },
  { w: "are", s: 36.8, e: 36.848 },
  { w: "you", s: 36.864, e: 36.961 },
  { w: "doing", s: 36.961, e: 37.154, hi: "#7CC8F8" },
  { w: "tonight?", s: 37.186, e: 37.46, hi: "#FFD45E" },
];

const WORDS: WordTiming[] = RAW_WORDS.map((item) =>
  item.s >= 23.0
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
  { at: 0.16, src: SFX.pop, vol: 0.22 },
  { at: 3.82, src: SFX.whoosh, vol: 0.18 },
  { at: 5.88, src: SFX.sparkle, vol: 0.2 },
  { at: 6.96, src: SFX.whoosh, vol: 0.18 },
  { at: 11.02, src: SFX.whoosh, vol: 0.17 },
  { at: 14.86, src: SFX.whoosh, vol: 0.17 },
  { at: 17.1, src: SFX.stamp, vol: 0.2 },
  { at: 18.22, src: SFX.whoosh, vol: 0.18 },
  // 3 -> 2 -> 1 Sleep Quiz Countdown Ticks (exact frame sync: 22.38, 23.20, 24.02)
  { at: 22.38, src: SFX.click, vol: 0.34 },
  { at: 22.38, src: SFX.tick, vol: 0.28, dur: 2.2 },
  { at: 23.2, src: SFX.click, vol: 0.36 },
  { at: 24.02, src: SFX.click, vol: 0.38 },
  { at: 23.85, src: SFX.riser, vol: 0.22 },
  // Big Reveal: "Under 6 hours..."
  { at: 24.86, src: SFX.impact, vol: 0.28 },
  { at: 24.94, src: SFX.stamp, vol: 0.24 },
  // Habit #5 & 10-Min Walk Payoff
  { at: 27.26, src: SFX.whoosh, vol: 0.18 },
  { at: 30.56, src: SFX.pop, vol: 0.22 },
  { at: 31.66, src: SFX.chime, vol: 0.24 },
  // CoreAge RX Interactive Search & U.S. Doctors UI (33.02s -> 37.02s)
  { at: 33.02, src: SFX.whoosh, vol: 0.22 },
  { at: 33.2, src: SFX.typing, vol: 0.32, dur: 0.82 },
  { at: 34.06, src: SFX.click, vol: 0.28 },
  { at: 34.18, src: SFX.pop, vol: 0.25 },
  { at: 34.75, src: SFX.toggle, vol: 0.25 },
  { at: 36.15, src: SFX.chime, vol: 0.23 },
  // Finale: "Just pick one. So, what are you doing tonight?"
  { at: 37.04, src: SFX.whoosh, vol: 0.18 },
  { at: 37.55, src: SFX.sparkle, vol: 0.25 },
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
 * Signature "3 -> 2 -> 1" Sleep Quiz Countdown Overlay inside Scene 06 (18.20s -> 24.86s)
 * Right after "How little is too little? Pick a number in your head." (22.24s),
 * triggers a tactile 3 -> 2 -> 1 countdown medallion + neutral hour choices before
 * Scene 07 reveals "Under 6 hours is linked to more belly fat."!
 */
const ShortSleepCountdownOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Scene 06 starts at 18.20s
  const globalT = 18.2 + frame / fps;

  // Neutral hour choice pills appear as "How little is too little?" is asked
  const showChoices = globalT >= 19.9;
  const choiceAppear = Math.max(0, (globalT - 19.9) * fps);
  const choiceOpacity = interpolate(choiceAppear, [0, 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 3 -> 2 -> 1 Countdown window: 22.38s -> 24.84s (0.82s per step)
  const cStart = 22.38;
  const stepDur = 0.82;
  const cEnd = cStart + stepDur * 3; // 24.84s
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
    { tag: "A · Under 5 hrs", bg: "#FFEAE5" },
    { tag: "B · Under 6 hrs", bg: "#E6F4FE" },
    { tag: "C · Under 7 hrs", bg: "#FFF6D6" },
  ];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Top Neutral Hour Options (all kept strictly neutral until Scene 07 reveal) */}
      {showChoices && (
        <div
          style={{
            position: "absolute",
            top: 152,
            left: 44,
            right: 44,
            display: "flex",
            justifyContent: "center",
            gap: 14,
            opacity: choiceOpacity,
          }}
        >
          {choices.map((c, idx) => (
            <div
              key={idx}
              style={{
                padding: "10px 20px",
                borderRadius: 16,
                backgroundColor: c.bg,
                border: "2.5px solid #18181B",
                boxShadow: "0 6px 14px rgba(24,24,27,0.08)",
                fontFamily: FONT_SANS,
                fontSize: 23,
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
            <span>LOCK IN YOUR HOURS</span>
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

      {scene.id === 6 && <ShortSleepCountdownOverlay />}
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
 * Custom-coded Brand Scene (33.02s -> 37.02s = 4.00s):
 * "Want backup? CoreAge RX connects you with U.S. doctors online."
 * Briskly types "CoreAge RX", clicks search right on "CoreAge", and opens the U.S. Telehealth Doctors hub!
 */
const CoreAgeRxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps; // 0.00s -> 4.00s (global 33.02s -> 37.02s)

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

  // Brisk typing from localT 0.16s -> 0.90s ("Want backup?")
  const query = "CoreAge RX";
  const typedCount = Math.floor(
    interpolate(localT, [0.16, 0.9], [0, query.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedText = query.slice(0, typedCount);
  const caretVisible = Math.floor(frame / 8) % 2 === 0;

  // Click at localT = 1.04s (global 34.06s -> right as "CoreAge RX" is spoken!)
  const clickFrame = Math.round(1.04 * fps);
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
    [2.85, 3.15, 3.45, 3.75],
    [1, 1.048, 1.01, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Pointer cursor trajectory
  const cursorX = interpolate(
    localT,
    [0.15, 0.88, 1.04, 2.75, 3.2],
    [840, 760, 625, 740, 545],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorY = interpolate(
    localT,
    [0.15, 0.88, 1.04, 2.75, 3.2],
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
      Math.round(3.2 * fps) - 2,
      Math.round(3.2 * fps) + 2,
      Math.round(3.2 * fps) + 6,
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
      delay: 3,
    },
    {
      name: "Dr. James Carter, MD",
      role: "Licensed U.S. Physician · Telehealth",
      coat: "#84E4B8",
      bg: "#E9FBF3",
      delay: 8,
    },
    {
      name: "Dr. Elena Brooks, DO",
      role: "Sleep & Weight Specialist · U.S.",
      coat: "#C9AEFF",
      bg: "#F3EEFF",
      delay: 13,
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
  if (t >= 22.36 && t <= 24.86) return null;

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
// ROOT COMPOSITION (1080x1920 @ 30fps, 1230 FRAMES = 41.00s)
// =============================================================================
export default function CoreAgeRxTonightHabitsShort() {
  const { fps, durationInFrames } = useVideoConfig();

  const coreAgeStartFrame = Math.round(33.02 * fps);
  const coreAgeEndFrame = Math.round(37.02 * fps);

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

      {/* 2. Custom-Coded Interactive CoreAge RX Search & U.S. Doctors Platform Scene (33.02s - 37.02s) */}
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

      {/* 4. Master Voiceover (Cleanly Split in Silence at 22.600s for the 3-2-1 Sleep Quiz Countdown!) */}
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
          const countdownDuck = sec >= 22.35 && sec <= 25.0 ? 0.62 : 1;
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
