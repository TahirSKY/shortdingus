/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 2196, "width": 1080, "height": 1920 } */
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
const MUSIC_BASE_VOLUME = 0.068;

// =============================================================================
// VERIFIED HUB PERMANENT ASSET URLS (MP4 CLIPS + WINNING VOICE + AUDIO ONLY)
// =============================================================================
const HUB = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=";

// Winning Voiceover: "Generated Audio November 12, 2026 - 9_23PM.wav" (71.96s)
const VOICE_URL = `${HUB}d5e75d69-66d8-4a0c-a811-e9efa578ec2d`;

// Dual-Act Musical Score (Act I/II Curious Explainer -> Act III Modern Studio Pulse)
const MUSIC_DOCU_PLUCK = `${HUB}f4a1ed94-671d-4de6-ba60-43370bfafe68`;
const MUSIC_TECH_PULSE = `${HUB}6352a623-f2b1-490f-a85c-76c4eb683b34`;

const SFX = {
  whoosh: `${HUB}8000d709-85ee-4aa4-aad0-9fc84130d93b`,
  pop: `${HUB}c52d697f-f404-484e-881d-0349bc9d3b69`,
  click: `${HUB}b4bb2b99-a6c9-42f3-b3d6-816cca355aad`,
  toggle: `${HUB}aabeb8f0-a7f1-4ab0-ad37-96400b3f90f6`,
  send: `${HUB}ecb7cce6-2edf-4a4c-9f3f-4bacd2c07c30`,
  typing: `${HUB}bd282333-3e72-45c7-8dad-b8809f4bf2db`,
  chime: `${HUB}e0021584-0f5b-4f03-9847-7798617996d4`,
  chimeMagic: `${HUB}2d70f904-7701-492f-8085-89ffed6e2861`,
  sparkle: `${HUB}16d0b9a2-6984-4a90-ad8d-41be83b4f0df`,
  stamp: `${HUB}72187c30-49d0-4a52-821c-ae1cf92be0be`,
  riser: `${HUB}377b15fe-2f65-42df-9c9a-0830ea894bf9`,
  impact: `${HUB}599a8103-6cc7-4b36-8b2c-159af900165a`,
};

// Live mini-preview clip reused inside Step 4 of DoneForYouPipelineScene
const PIPELINE_PREVIEW_CLIP = `${HUB}95fd92d4-dfd4-43db-b065-7041a9f656a1`;

interface WhiteboardSceneSpec {
  id: number;
  start: number;
  end: number;
  clipUrl: string;
  clipDuration: number;
  kicker: string;
  accent: string;
}

const WHITEBOARD_SCENES: WhiteboardSceneSpec[] = [
  {
    id: 1,
    start: 0.0,
    end: 4.55,
    clipUrl: `${HUB}e5e0a43a-72b2-4c87-a99c-62109e622b82`,
    clipDuration: 7.28,
    kicker: "AUTOMATIC ATTENTION",
    accent: "#FF8E7A",
  },
  {
    id: 2,
    start: 4.55,
    end: 9.1,
    clipUrl: `${HUB}943d1616-40e4-436e-81fd-16696d93a4b6`,
    clipDuration: 11.16,
    kicker: "SCROLL FATIGUE",
    accent: "#FFD45E",
  },
  {
    id: 3,
    start: 9.1,
    end: 13.55,
    clipUrl: `${HUB}95fd92d4-dfd4-43db-b065-7041a9f656a1`,
    clipDuration: 9.37,
    kicker: "STEP-BY-STEP VISUALS",
    accent: "#84E4B8",
  },
  {
    id: 4,
    start: 13.55,
    end: 16.65,
    clipUrl: `${HUB}006d967e-1ea8-4bba-aa63-5c92c9db0980`,
    clipDuration: 6.22,
    kicker: "COGNITIVE PSYCHOLOGY",
    accent: "#C9AEFF",
  },
  {
    id: 5,
    start: 16.65,
    end: 23.05,
    clipUrl: `${HUB}a583227a-4ddf-4d8d-b6e0-4fa59d2a2816`,
    clipDuration: 9.78,
    kicker: "THE OPEN-LOOP EFFECT",
    accent: "#7CC8F8",
  },
  {
    id: 6,
    start: 23.05,
    end: 27.55,
    clipUrl: `${HUB}40119bcf-c04f-4585-a369-2f6c7bba35e0`,
    clipDuration: 11.12,
    kicker: "COMPLEX OFFERS",
    accent: "#FF8E7A",
  },
  // 27.55s -> 29.65s: Custom-Coded Beat 1 (GameChangerPivotScene: "This changes everything.")
  {
    id: 7,
    start: 29.65,
    end: 34.55,
    clipUrl: `${HUB}e4c2b280-0d33-4893-9729-2cbb3d61330d`,
    clipDuration: 9.57,
    kicker: "NO CAMERA · NO BOREDOM",
    accent: "#FFD45E",
  },
  {
    id: 8,
    start: 34.55,
    end: 38.85,
    clipUrl: `${HUB}be50a9ac-cf4a-4ddf-b8ed-ef2352aaf68a`,
    clipDuration: 9.95,
    kicker: "VISUAL CLARITY",
    accent: "#84E4B8",
  },
  {
    id: 9,
    start: 38.85,
    end: 44.35,
    clipUrl: `${HUB}df708bb7-f260-4a49-8969-add489240b16`,
    clipDuration: 7.74,
    kicker: "COLD TRAFFIC TO BUYERS",
    accent: "#7CC8F8",
  },
  {
    id: 10,
    start: 44.35,
    end: 47.95,
    clipUrl: `${HUB}739ca1d8-b0fc-49e3-9481-87d879d17035`,
    clipDuration: 10.68,
    kicker: "100% DONE-FOR-YOU",
    accent: "#C9AEFF",
  },
  // 47.95s -> 56.85s: Custom-Coded Beat 2 (DoneForYouPipelineScene)
  // 56.85s -> 68.15s: Custom-Coded Beat 3 (PricingPackagesScene)
  // 68.15s -> 73.20s: Custom-Coded Beat 4 (LaunchBatchCtaScene)
];

// =============================================================================
// EXACT WORD-LEVEL TRANSCRIPT (9_23PM WINNING VOICEOVER)
// =============================================================================
interface WordTiming {
  w: string;
  s: number;
  e: number;
  hi?: string;
}

const WORDS: WordTiming[] = [
  { w: "Right", s: 0.272, e: 0.513, hi: "#FFD45E" },
  { w: "now,", s: 0.513, e: 0.689, hi: "#FFD45E" },
  { w: "your", s: 1.154, e: 1.362 },
  { w: "brain", s: 1.378, e: 1.587, hi: "#C9AEFF" },
  { w: "is", s: 1.795, e: 1.844 },
  { w: "doing", s: 1.956, e: 2.1 },
  { w: "something", s: 2.18, e: 2.565 },
  { w: "completely", s: 2.677, e: 3.335, hi: "#7CC8F8" },
  { w: "automatic.", s: 3.575, e: 4.12, hi: "#FF8E7A" },

  { w: "Instead", s: 4.842, e: 5.147 },
  { w: "of", s: 5.147, e: 5.211 },
  { w: "scrolling", s: 5.227, e: 5.612, hi: "#FF8E7A" },
  { w: "past", s: 5.708, e: 6.125 },
  { w: "another", s: 6.125, e: 6.445 },
  { w: "talking-head", s: 6.445, e: 7.055, hi: "#FF8E7A" },
  { w: "video", s: 7.087, e: 7.456 },
  { w: "with", s: 7.552, e: 7.776 },
  { w: "flashing", s: 7.792, e: 8.177, hi: "#FFD45E" },
  { w: "captions,", s: 8.273, e: 8.738, hi: "#FFD45E" },

  { w: "you", s: 9.396, e: 9.492 },
  { w: "stopped", s: 9.492, e: 9.973, hi: "#84E4B8" },
  { w: "to", s: 9.973, e: 10.101 },
  { w: "watch", s: 10.117, e: 10.31, hi: "#7CC8F8" },
  { w: "an", s: 10.31, e: 10.39 },
  { w: "idea", s: 10.39, e: 10.871, hi: "#FFD45E" },
  { w: "get", s: 11.08, e: 11.24 },
  { w: "drawn", s: 11.24, e: 11.512, hi: "#C9AEFF" },
  { w: "out,", s: 11.561, e: 11.817 },
  { w: "step", s: 12.202, e: 12.475, hi: "#84E4B8" },
  { w: "by", s: 12.683, e: 12.779 },
  { w: "step.", s: 12.779, e: 13.052, hi: "#84E4B8" },

  { w: "Psychologists", s: 13.998, e: 14.768, hi: "#C9AEFF" },
  { w: "call", s: 14.768, e: 14.896 },
  { w: "this", s: 14.928, e: 15.12 },
  { w: "an", s: 15.345, e: 15.393 },
  { w: "open", s: 15.585, e: 15.874, hi: "#FFD45E" },
  { w: "loop.", s: 15.89, e: 16.13, hi: "#FFD45E" },

  { w: "When", s: 16.868, e: 16.996 },
  { w: "your", s: 17.012, e: 17.141 },
  { w: "eyes", s: 17.173, e: 17.397, hi: "#7CC8F8" },
  { w: "see", s: 17.445, e: 17.654 },
  { w: "a", s: 17.654, e: 17.67 },
  { w: "drawing", s: 17.67, e: 18.039, hi: "#C9AEFF" },
  { w: "start,", s: 18.151, e: 18.552, hi: "#FFD45E" },
  { w: "your", s: 18.953, e: 19.113 },
  { w: "brain", s: 19.113, e: 19.386, hi: "#C9AEFF" },
  { w: "naturally", s: 19.578, e: 19.995 },
  { w: "wants", s: 20.059, e: 20.235 },
  { w: "to", s: 20.235, e: 20.348 },
  { w: "stick", s: 20.38, e: 20.716, hi: "#84E4B8" },
  { w: "around", s: 20.716, e: 21.165, hi: "#84E4B8" },
  { w: "until", s: 21.197, e: 21.406 },
  { w: "the", s: 21.502, e: 21.598 },
  { w: "picture", s: 21.598, e: 21.919, hi: "#7CC8F8" },
  { w: "is", s: 21.919, e: 21.967 },
  { w: "finished.", s: 22.063, e: 22.48, hi: "#84E4B8" },

  { w: "And", s: 23.442, e: 23.506 },
  { w: "if", s: 23.539, e: 23.667 },
  { w: "you", s: 23.747, e: 23.859 },
  { w: "or", s: 24.084, e: 24.164 },
  { w: "your", s: 24.164, e: 24.388 },
  { w: "clients", s: 24.388, e: 24.918, hi: "#7CC8F8" },
  { w: "sell", s: 24.966, e: 25.158, hi: "#84E4B8" },
  { w: "something", s: 25.206, e: 25.495 },
  { w: "that", s: 25.591, e: 25.655 },
  { w: "takes", s: 25.687, e: 26.008 },
  { w: "a", s: 26.329, e: 26.409 },
  { w: "little", s: 26.409, e: 26.585 },
  { w: "bit", s: 26.585, e: 26.713 },
  { w: "of", s: 26.713, e: 26.746 },
  { w: "explaining,", s: 26.746, e: 27.259, hi: "#FF8E7A" },

  { w: "this", s: 27.756, e: 27.82, hi: "#FFD45E" },
  { w: "changes", s: 27.996, e: 28.38, hi: "#FFD45E" },
  { w: "everything.", s: 28.573, e: 28.925, hi: "#84E4B8" },

  { w: "Instead", s: 29.774, e: 30.079 },
  { w: "of", s: 30.079, e: 30.143 },
  { w: "begging", s: 30.335, e: 30.624, hi: "#FF8E7A" },
  { w: "someone", s: 30.736, e: 31.024 },
  { w: "to", s: 31.12, e: 31.216 },
  { w: "get", s: 31.216, e: 31.377 },
  { w: "on", s: 31.377, e: 31.425 },
  { w: "camera,", s: 31.537, e: 31.937, hi: "#FF8E7A" },
  { w: "or", s: 32.338, e: 32.594 },
  { w: "hoping", s: 32.723, e: 33.027 },
  { w: "viewers", s: 33.059, e: 33.347 },
  { w: "don't", s: 33.46, e: 33.62 },
  { w: "get", s: 33.62, e: 33.748 },
  { w: "bored,", s: 33.86, e: 34.197, hi: "#FFD45E" },

  { w: "you", s: 34.725, e: 34.789 },
  { w: "can", s: 34.821, e: 34.95 },
  { w: "visually", s: 35.046, e: 35.51, hi: "#7CC8F8" },
  { w: "break", s: 35.542, e: 35.863, hi: "#84E4B8" },
  { w: "down", s: 35.863, e: 36.071 },
  { w: "complex", s: 36.247, e: 36.696 },
  { w: "topics,", s: 36.744, e: 37.225, hi: "#7CC8F8" },
  { w: "stories,", s: 37.449, e: 37.914, hi: "#C9AEFF" },
  { w: "and", s: 38.026, e: 38.09 },
  { w: "offers", s: 38.25, e: 38.474, hi: "#FFD45E" },

  { w: "so", s: 38.923, e: 39.211 },
  { w: "cold", s: 39.211, e: 39.5, hi: "#7CC8F8" },
  { w: "prospects", s: 39.548, e: 40.077, hi: "#7CC8F8" },
  { w: "actually", s: 40.253, e: 40.637 },
  { w: "watch", s: 40.734, e: 41.07, hi: "#FFD45E" },
  { w: "till", s: 41.07, e: 41.198 },
  { w: "the", s: 41.23, e: 41.374 },
  { w: "end", s: 41.374, e: 41.599, hi: "#FFD45E" },
  { w: "and", s: 41.951, e: 42.015 },
  { w: "understand", s: 42.095, e: 42.8, hi: "#84E4B8" },
  { w: "why", s: 42.977, e: 43.105 },
  { w: "they", s: 43.153, e: 43.249 },
  { w: "should", s: 43.249, e: 43.473 },
  { w: "buy.", s: 43.473, e: 43.57, hi: "#84E4B8" },

  { w: "Best", s: 44.675, e: 44.851, hi: "#FFD45E" },
  { w: "of", s: 44.851, e: 44.931 },
  { w: "all,", s: 44.979, e: 45.028 },
  { w: "we", s: 45.556, e: 45.636 },
  { w: "handle", s: 45.7, e: 46.021, hi: "#84E4B8" },
  { w: "the", s: 46.101, e: 46.197 },
  { w: "entire", s: 46.197, e: 46.63, hi: "#C9AEFF" },
  { w: "process", s: 46.662, e: 47.078, hi: "#C9AEFF" },
  { w: "for", s: 47.142, e: 47.271 },
  { w: "you.", s: 47.383, e: 47.463, hi: "#84E4B8" },

  { w: "You", s: 48.184, e: 48.264 },
  { w: "just", s: 48.264, e: 48.52 },
  { w: "send", s: 48.536, e: 48.761, hi: "#7CC8F8" },
  { w: "us", s: 48.761, e: 48.809 },
  { w: "a", s: 48.857, e: 48.985 },
  { w: "topic", s: 48.985, e: 49.434, hi: "#FFD45E" },
  { w: "or", s: 49.466, e: 49.61 },
  { w: "website", s: 49.626, e: 49.994, hi: "#7CC8F8" },
  { w: "link,", s: 50.042, e: 50.267, hi: "#7CC8F8" },
  { w: "and", s: 50.683, e: 50.747 },
  { w: "we", s: 50.763, e: 50.924 },
  { w: "take", s: 50.924, e: 51.084 },
  { w: "care", s: 51.084, e: 51.276 },
  { w: "of", s: 51.34, e: 51.468 },
  { w: "the", s: 51.468, e: 51.533 },
  { w: "research,", s: 51.565, e: 52.093, hi: "#7CC8F8" },
  { w: "scriptwriting,", s: 52.286, e: 52.975, hi: "#C9AEFF" },
  { w: "voiceover,", s: 53.167, e: 53.776, hi: "#FFD45E" },
  { w: "and", s: 54.128, e: 54.192 },
  { w: "whiteboard", s: 54.272, e: 54.673, hi: "#84E4B8" },
  { w: "animation", s: 54.673, e: 55.057, hi: "#84E4B8" },
  { w: "in", s: 55.33, e: 55.378 },
  { w: "48", s: 55.554, e: 56.035, hi: "#FFD45E" },
  { w: "hours.", s: 56.035, e: 56.259, hi: "#FFD45E" },

  { w: "You", s: 57.159, e: 57.224 },
  { w: "can", s: 57.24, e: 57.336 },
  { w: "test", s: 57.336, e: 57.578 },
  { w: "a", s: 57.578, e: 57.594 },
  { w: "batch", s: 57.594, e: 57.787 },
  { w: "of", s: 57.9, e: 57.981 },
  { w: "5", s: 57.981, e: 58.432, hi: "#7CC8F8" },
  { w: "custom", s: 58.448, e: 58.77 },
  { w: "Shorts", s: 58.77, e: 59.124, hi: "#7CC8F8" },
  { w: "for", s: 59.188, e: 59.269 },
  { w: "just", s: 59.269, e: 59.559 },
  { w: "$97,", s: 59.591, e: 60.316, hi: "#84E4B8" },
  { w: "a", s: 60.96, e: 61.024 },
  { w: "full", s: 61.024, e: 61.169 },
  { w: "10-minute", s: 61.363, e: 61.862, hi: "#FFD45E" },
  { w: "YouTube", s: 61.91, e: 62.313, hi: "#FF8E7A" },
  { w: "explainer", s: 62.313, e: 62.812, hi: "#FFD45E" },
  { w: "for", s: 62.812, e: 63.037 },
  { w: "$147,", s: 63.054, e: 64.052, hi: "#84E4B8" },
  { w: "or", s: 64.648, e: 64.745 },
  { w: "white", s: 64.745, e: 64.873, hi: "#C9AEFF" },
  { w: "label", s: 64.97, e: 65.26, hi: "#C9AEFF" },
  { w: "30", s: 65.292, e: 65.679, hi: "#FFD45E" },
  { w: "Shorts", s: 65.711, e: 66.065, hi: "#FFD45E" },
  { w: "for", s: 66.194, e: 66.339 },
  { w: "$497.", s: 66.339, e: 67.611, hi: "#84E4B8" },

  { w: "Reply", s: 68.433, e: 68.69, hi: "#84E4B8" },
  { w: "to", s: 68.69, e: 68.771 },
  { w: "this", s: 68.771, e: 68.916 },
  { w: "message", s: 68.916, e: 69.238, hi: "#7CC8F8" },
  { w: "or", s: 69.673, e: 69.737 },
  { w: "click", s: 69.737, e: 69.914, hi: "#FFD45E" },
  { w: "the", s: 69.963, e: 70.043 },
  { w: "link", s: 70.043, e: 70.317, hi: "#FFD45E" },
  { w: "to", s: 70.397, e: 70.51 },
  { w: "start", s: 70.526, e: 70.768, hi: "#84E4B8" },
  { w: "your", s: 70.768, e: 70.864 },
  { w: "first", s: 70.864, e: 71.138 },
  { w: "batch", s: 71.186, e: 71.428, hi: "#C9AEFF" },
  { w: "today.", s: 71.428, e: 71.75, hi: "#84E4B8" },
];

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
    const endsSentence = prev ? /[.?!,:]$/.test(prev.w) : false;
    const charLen = bucket.reduce((acc, item) => acc + item.w.length + 1, 0);

    if (
      bucket.length > 0 &&
      (gap > 0.26 || endsSentence || bucket.length >= 4 || charLen + cur.w.length > 22)
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
// TACTILE STORYTELLING & UI SOUND DESIGN
// =============================================================================
interface SfxCue {
  at: number;
  src: string;
  vol: number;
  dur?: number;
}

const SFX_CUES: SfxCue[] = [
  // Act I: Brain Reflex & Open-Loop Psychology
  { at: 0.24, src: SFX.pop, vol: 0.22 },
  { at: 3.56, src: SFX.sparkle, vol: 0.22 },
  { at: 4.56, src: SFX.whoosh, vol: 0.18 },
  { at: 6.45, src: SFX.stamp, vol: 0.2 },
  { at: 9.12, src: SFX.whoosh, vol: 0.18 },
  { at: 12.2, src: SFX.click, vol: 0.2 },
  { at: 12.68, src: SFX.click, vol: 0.22 },
  { at: 12.82, src: SFX.pop, vol: 0.22 },
  { at: 13.56, src: SFX.whoosh, vol: 0.18 },
  { at: 15.58, src: SFX.chimeMagic, vol: 0.22 },
  { at: 16.66, src: SFX.whoosh, vol: 0.17 },
  // Meta Open-Loop Closing Right on "finished."
  { at: 22.06, src: SFX.chime, vol: 0.26 },
  { at: 22.14, src: SFX.sparkle, vol: 0.24 },
  { at: 23.06, src: SFX.whoosh, vol: 0.18 },

  // Midpoint Kinetic Pivot: "This changes everything." (27.55s - 29.65s)
  { at: 27.15, src: SFX.riser, vol: 0.22 },
  { at: 27.55, src: SFX.whoosh, vol: 0.22 },
  { at: 27.75, src: SFX.click, vol: 0.24 },
  { at: 27.99, src: SFX.pop, vol: 0.26 },
  { at: 28.57, src: SFX.impact, vol: 0.3 },
  { at: 28.65, src: SFX.sparkle, vol: 0.22 },

  // Act II: Pain vs Visual Breakdown & Buyer Transformation
  { at: 29.66, src: SFX.whoosh, vol: 0.18 },
  { at: 31.54, src: SFX.stamp, vol: 0.19 },
  { at: 34.56, src: SFX.whoosh, vol: 0.18 },
  { at: 36.74, src: SFX.pop, vol: 0.2 },
  { at: 37.45, src: SFX.pop, vol: 0.2 },
  { at: 38.25, src: SFX.pop, vol: 0.22 },
  { at: 38.86, src: SFX.whoosh, vol: 0.18 },
  { at: 43.47, src: SFX.chime, vol: 0.25 },
  { at: 44.36, src: SFX.whoosh, vol: 0.18 },

  // Act IIIA: Done-For-You 48h Pipeline (47.95s - 56.85s)
  { at: 47.95, src: SFX.whoosh, vol: 0.22 },
  { at: 48.35, src: SFX.typing, vol: 0.3, dur: 1.6 },
  { at: 50.22, src: SFX.click, vol: 0.28 },
  { at: 50.3, src: SFX.send, vol: 0.25 },
  { at: 51.56, src: SFX.toggle, vol: 0.23 },
  { at: 52.28, src: SFX.toggle, vol: 0.23 },
  { at: 53.16, src: SFX.toggle, vol: 0.23 },
  { at: 54.27, src: SFX.pop, vol: 0.25 },
  { at: 55.55, src: SFX.stamp, vol: 0.28 },
  { at: 55.65, src: SFX.chime, vol: 0.24 },

  // Act IIIB: Pricing Packages ($97 / $147 / $497) (56.85s - 68.15s)
  { at: 56.86, src: SFX.whoosh, vol: 0.22 },
  { at: 57.2, src: SFX.pop, vol: 0.22 },
  { at: 59.59, src: SFX.chime, vol: 0.24 },
  { at: 60.95, src: SFX.pop, vol: 0.22 },
  { at: 63.05, src: SFX.chime, vol: 0.25 },
  { at: 64.65, src: SFX.pop, vol: 0.24 },
  { at: 66.34, src: SFX.chimeMagic, vol: 0.28 },
  { at: 66.44, src: SFX.sparkle, vol: 0.24 },

  // Act IIIC: Interactive Reply + Link Click CTA (68.15s - 73.20s)
  { at: 68.16, src: SFX.whoosh, vol: 0.22 },
  { at: 68.45, src: SFX.typing, vol: 0.26, dur: 0.72 },
  { at: 69.22, src: SFX.send, vol: 0.25 },
  { at: 70.04, src: SFX.click, vol: 0.3 },
  { at: 70.14, src: SFX.chime, vol: 0.26 },
  { at: 71.45, src: SFX.sparkle, vol: 0.22 },
];

const FONT_DISPLAY =
  '"Space Grotesk", "Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
const FONT_SANS =
  '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

// =============================================================================
// REUSABLE EDITORIAL & CHANNEL-STYLE DOODLE COMPONENTS
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
    config: { damping: 18, stiffness: 215, mass: 0.7 },
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
        top: 64,
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
            fontSize: 22,
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

/** Matching cute round-headed doodle character SVG for custom-coded showcase scenes */
const DoodleFounderMascot: React.FC<{
  shirtColor: string;
  bgColor: string;
  size?: number;
  withHeadset?: boolean;
}> = ({ shirtColor, bgColor, size = 94, withHeadset = false }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
    <circle
      cx="48"
      cy="48"
      r="44"
      fill={bgColor}
      stroke="#18181B"
      strokeWidth="3"
    />
    <path
      d="M22 84 C24 65, 72 65, 74 84"
      fill={shirtColor}
      stroke="#18181B"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <circle
      cx="48"
      cy="43"
      r="22"
      fill="#FFFFFF"
      stroke="#18181B"
      strokeWidth="3.2"
    />
    {withHeadset && (
      <>
        <path
          d="M25 42 C25 24, 71 24, 71 42"
          stroke="#6366F1"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <rect
          x="21"
          y="37"
          width="7"
          height="13"
          rx="3.5"
          fill="#FFD45E"
          stroke="#18181B"
          strokeWidth="2.4"
        />
        <rect
          x="68"
          y="37"
          width="7"
          height="13"
          rx="3.5"
          fill="#FFD45E"
          stroke="#18181B"
          strokeWidth="2.4"
        />
      </>
    )}
    <circle cx="40.5" cy="41" r="2.8" fill="#18181B" />
    <circle cx="55.5" cy="41" r="2.8" fill="#18181B" />
    <path
      d="M40.5 49.5 Q48 55.5 55.5 49.5"
      stroke="#18181B"
      strokeWidth="2.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// =============================================================================
// SCENE-SPECIFIC MICRO-CALLOUTS OVER WHITEBOARD DRAWINGS (TOP SAFE ZONE)
// =============================================================================
const WhiteboardMicroOverlay: React.FC<{
  sceneId: number;
  sceneStart: number;
}> = ({ sceneId, sceneStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalT = sceneStart + frame / fps;

  const pillBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "8px 18px",
    borderRadius: 14,
    border: "2.5px solid #18181B",
    boxShadow: "0 6px 14px rgba(24,24,27,0.08)",
    fontFamily: FONT_SANS,
    fontSize: 22,
    fontWeight: 800,
    color: "#18181B",
  };

  // Scene 01: "automatic." pulse chip at 3.55s
  if (sceneId === 1 && globalT >= 3.52) {
    const f = (globalT - 3.52) * fps;
    const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 240 } });
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${interpolate(s, [0, 1], [0.85, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      >
        <div style={{ ...pillBase, backgroundColor: "#FFF8DB" }}>
          <span>⚡</span>
          <span>100% Automatic Brain Reflex</span>
        </div>
      </div>
    );
  }

  // Scene 02: "SWIPED PAST" verdict stamp at 6.45s
  if (sceneId === 2 && globalT >= 6.42) {
    const f = (globalT - 6.42) * fps;
    const s = spring({ frame: f, fps, config: { damping: 14, stiffness: 250 } });
    const scale = interpolate(s, [0, 1], [1.28, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div
        style={{
          position: "absolute",
          top: 142,
          right: 68,
          transform: `rotate(4deg) scale(${scale})`,
        }}
      >
        <div
          style={{
            ...pillBase,
            backgroundColor: "#FFEAE5",
            color: "#B91C1C",
            borderColor: "#B91C1C",
            letterSpacing: "0.04em",
          }}
        >
          <span>✗</span>
          <span>TALKING HEADS = IGNORED</span>
        </div>
      </div>
    );
  }

  // Scene 03: "step by step." -> 1 -> 2 -> 3 chips
  if (sceneId === 3 && globalT >= 11.15) {
    const steps = [
      { label: "1 · Hook", at: 11.18, bg: "#EAF6FF" },
      { label: "2 · Build", at: 12.2, bg: "#E9FBF3" },
      { label: "3 · Payoff", at: 12.78, bg: "#FFF8DB" },
    ];
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 44,
          right: 44,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {steps.map((st, idx) => {
          const active = globalT >= st.at;
          const f = Math.max(0, (globalT - st.at) * fps);
          const pop = spring({
            frame: f,
            fps,
            config: { damping: 16, stiffness: 240 },
          });
          return (
            <div
              key={idx}
              style={{
                ...pillBase,
                backgroundColor: active ? st.bg : "#F8FAFC",
                opacity: active ? 1 : 0.42,
                transform: `scale(${
                  active
                    ? interpolate(pop, [0, 1], [0.88, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 0.95
                })`,
              }}
            >
              <span>{st.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Scene 04: "open loop." definition badge
  if (sceneId === 4 && globalT >= 15.5) {
    const f = (globalT - 15.5) * fps;
    const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 230 } });
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${interpolate(s, [0, 1], [0.86, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      >
        <div style={{ ...pillBase, backgroundColor: "#F3EEFF" }}>
          <span>🔓</span>
          <span>Open Loop · Brain Craves Closure</span>
        </div>
      </div>
    );
  }

  // Scene 05: Live Meta Open-Loop Completion Meter hitting 100% right at "finished." (22.06s)
  if (sceneId === 5 && globalT >= 17.3) {
    const pct = Math.round(
      interpolate(globalT, [17.3, 22.12], [14, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    const closed = pct >= 100;
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...pillBase,
            backgroundColor: closed ? "#E9FBF3" : "#FFFFFF",
            gap: 14,
            padding: "9px 22px",
          }}
        >
          <span>{closed ? "✓ LOOP CLOSED" : "DRAWING IN PROGRESS"}</span>
          <div
            style={{
              width: 150,
              height: 14,
              borderRadius: 999,
              backgroundColor: "#E2E8F0",
              border: "2px solid #18181B",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: closed ? "#10B981" : "#6366F1",
              }}
            />
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 20 }}>{pct}%</span>
        </div>
      </div>
    );
  }

  // Scene 07: Camera-Shy vs Bored Viewers chips
  if (sceneId === 7 && globalT >= 30.6) {
    const showRight = globalT >= 32.9;
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ ...pillBase, backgroundColor: "#FFEAE5" }}>
          <span>✗</span>
          <span>Begging to Film</span>
        </div>
        {showRight && (
          <div style={{ ...pillBase, backgroundColor: "#EAF6FF" }}>
            <span>✗</span>
            <span>Bored Scroll-Offs</span>
          </div>
        )}
      </div>
    );
  }

  // Scene 08: Topics / Stories / Offers trio
  if (sceneId === 8 && globalT >= 36.65) {
    const items = [
      { label: "✓ Topics", at: 36.72, bg: "#EAF6FF" },
      { label: "✓ Stories", at: 37.44, bg: "#F3EEFF" },
      { label: "✓ Offers", at: 38.22, bg: "#FFF8DB" },
    ];
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 44,
          right: 44,
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {items.map((it, idx) =>
          globalT >= it.at ? (
            <div key={idx} style={{ ...pillBase, backgroundColor: it.bg }}>
              <span>{it.label}</span>
            </div>
          ) : null
        )}
      </div>
    );
  }

  // Scene 09: Cold Prospect -> Watched Till End -> Ready to Buy
  if (sceneId === 9 && globalT >= 39.2) {
    const ready = globalT >= 43.2;
    const watched = globalT >= 40.9;
    return (
      <div
        style={{
          position: "absolute",
          top: 136,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...pillBase,
            backgroundColor: ready
              ? "#E9FBF3"
              : watched
              ? "#FFF8DB"
              : "#EAF6FF",
          }}
        >
          <span>
            {ready
              ? "✓ Understands Value & Ready to Buy"
              : watched
              ? "▶ Watching All the Way Till the End"
              : "❄ Cold Prospect Enters"}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Plays 100% of a rendered whiteboard MP4 clip (hand drawing -> full-color payoff)
 * by matching playbackRate to the exact voiceover window.
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

  const payoffZoom = interpolate(progress, [0, 0.76, 1], [1, 1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: enterOpacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${payoffZoom})`,
          transformOrigin: "50% 47%",
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

      <KickerBadge label={scene.kicker} accent={scene.accent} />
      <WhiteboardMicroOverlay sceneId={scene.id} sceneStart={scene.start} />
    </AbsoluteFill>
  );
};

// =============================================================================
// CUSTOM-CODED SCENE 1 (27.55s -> 29.65s): "THIS CHANGES EVERYTHING."
// =============================================================================
const GameChangerPivotScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalT = 27.55 + frame / fps;

  const enter = interpolate(frame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tangled path fades down as razor-sharp straight clarity path draws in
  const arrowDraw = interpolate(globalT, [27.72, 28.45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const tangleFade = interpolate(globalT, [27.75, 28.35], [1, 0.16], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const w1 = spring({
    frame: Math.max(0, (globalT - 27.72) * fps),
    fps,
    config: { damping: 16, stiffness: 250, mass: 0.65 },
  });
  const w2 = spring({
    frame: Math.max(0, (globalT - 27.98) * fps),
    fps,
    config: { damping: 15, stiffness: 250, mass: 0.65 },
  });
  const w3 = spring({
    frame: Math.max(0, (globalT - 28.54) * fps),
    fps,
    config: { damping: 14, stiffness: 260, mass: 0.7 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFFFFF",
        opacity: enter,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(#CBD5E1 2px, transparent 2px)",
          backgroundSize: "34px 34px",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 280,
          left: 60,
          right: 60,
          height: 980,
          borderRadius: 48,
          background:
            "radial-gradient(circle at 50% 45%, rgba(99,102,241,0.16), rgba(132,228,184,0.14) 52%, rgba(255,255,255,0) 78%)",
        }}
      />

      <KickerBadge label="THE GAME-CHANGER" accent="#FFD45E" />

      {/* Visual Knot -> Straight Clarity Vector Card */}
      <div
        style={{
          position: "absolute",
          top: 235,
          left: 68,
          right: 68,
          padding: "30px 36px",
          borderRadius: 32,
          backgroundColor: "#FFFFFF",
          border: "3.5px solid #18181B",
          boxShadow: "0 20px 48px rgba(24,24,27,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
            fontFamily: FONT_MONO,
            fontSize: 21,
            fontWeight: 700,
          }}
        >
          <span style={{ color: "#EF4444" }}>CONFUSING PITCH</span>
          <span style={{ color: "#10B981" }}>INSTANT VISUAL CLARITY ✓</span>
        </div>

        <svg width="860" height="170" viewBox="0 0 860 170" fill="none">
          {/* Tangled Complex Knot (fades out) */}
          <path
            d="M 40 85 C 110 10, 170 165, 220 55 C 265 -15, 165 155, 295 110 C 370 80, 325 20, 410 85"
            stroke="#FF8E7A"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={tangleFade}
          />
          {/* Razor-Sharp Straight Vector Line (draws across) */}
          <line
            x1="45"
            y1="85"
            x2={45 + 735 * arrowDraw}
            y2="85"
            stroke="#6366F1"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {arrowDraw > 0.85 && (
            <g>
              <circle
                cx="800"
                cy="85"
                r="34"
                fill="#84E4B8"
                stroke="#18181B"
                strokeWidth="4"
              />
              <path
                d="M 786 85 L 796 95 L 816 74"
                stroke="#18181B"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Stacked Hero Kinetic Typography */}
      <div
        style={{
          position: "absolute",
          top: 635,
          left: 68,
          right: 68,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            opacity: interpolate(w1, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(w1, [0, 1], [28, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px)`,
            fontFamily: FONT_DISPLAY,
            fontSize: 98,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "#18181B",
          }}
        >
          THIS
        </div>

        <div
          style={{
            opacity: interpolate(w2, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `rotate(-1.5deg) scale(${interpolate(
              w2,
              [0, 1],
              [0.78, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )})`,
            padding: "16px 44px",
            borderRadius: 28,
            backgroundColor: "#FFD45E",
            border: "4px solid #18181B",
            boxShadow: "0 14px 32px rgba(24,24,27,0.12)",
            fontFamily: FONT_DISPLAY,
            fontSize: 106,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "#18181B",
          }}
        >
          CHANGES
        </div>

        <div
          style={{
            opacity: interpolate(w3, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(w3, [0, 1], [0.82, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })})`,
            padding: "18px 46px",
            borderRadius: 28,
            background: "linear-gradient(90deg, #6366F1 0%, #4DB8A8 100%)",
            border: "4px solid #18181B",
            boxShadow: "0 18px 40px rgba(99,102,241,0.28)",
            fontFamily: FONT_DISPLAY,
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: "-0.035em",
            lineHeight: 1,
            color: "#FFFFFF",
          }}
        >
          EVERYTHING.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// CUSTOM-CODED SCENE 2 (47.95s -> 56.85s): SEND A LINK -> 48H STUDIO PIPELINE
// =============================================================================
const DoneForYouPipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps; // 0.00s -> 8.90s
  const globalT = 47.95 + localT;

  const winSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 195, mass: 0.75 },
  });
  const winY = interpolate(winSpring, [0, 1], [55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const winOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Stage A: Typing client website link (global 48.30s -> 49.95s) & clicking Send at 50.25s
  const urlText = "https://yourbusiness.com/offer";
  const typedChars = Math.floor(
    interpolate(globalT, [48.3, 49.95], [0, urlText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  const sendClickGlobal = 50.24;
  const sendClickFrame = Math.round((sendClickGlobal - 47.95) * fps);
  const isPipelineOpen = globalT >= 50.55;

  const sendBtnScale = interpolate(
    frame,
    [sendClickFrame - 2, sendClickFrame + 1, sendClickFrame + 5],
    [1, 0.93, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // 4 Pipeline Steps synced to exact spoken words
  const steps = [
    {
      num: "01",
      title: "Market & Offer Research",
      sub: "Extracting buyer hooks & objections",
      at: 51.48,
      bg: "#EAF6FF",
      accent: "#7CC8F8",
    },
    {
      num: "02",
      title: "Retention Scriptwriting",
      sub: "Engineered with open-loop psychology",
      at: 52.25,
      bg: "#F3EEFF",
      accent: "#C9AEFF",
    },
    {
      num: "03",
      title: "Studio Voiceover",
      sub: "Crisp human-grade narration & pacing",
      at: 53.14,
      bg: "#FFF8DB",
      accent: "#FFD45E",
      waveform: true,
    },
  ];

  const wbActive = globalT >= 54.22;
  const wbAppearFrames = Math.max(0, (globalT - 54.22) * fps);
  const wbSpring = spring({
    frame: wbAppearFrames,
    fps,
    config: { damping: 16, stiffness: 220 },
  });

  const slaActive = globalT >= 55.52;
  const slaFrames = Math.max(0, (globalT - 55.52) * fps);
  const slaSpring = spring({
    frame: slaFrames,
    fps,
    config: { damping: 13, stiffness: 260, mass: 0.65 },
  });

  // Pointer cursor trajectory during Stage A
  const cursorX = interpolate(
    globalT,
    [48.1, 49.9, 50.24, 50.55],
    [820, 620, 800, 920],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorY = interpolate(
    globalT,
    [48.1, 49.9, 50.24, 50.55],
    [920, 665, 665, 820],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

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
      <KickerBadge label="END-TO-END PRODUCTION" accent="#84E4B8" />

      <div
        style={{
          position: "absolute",
          top: 150,
          left: 56,
          right: 56,
          transform: `translateY(${winY}px)`,
          backgroundColor: "#FFFFFF",
          borderRadius: 34,
          border: "3.5px solid #18181B",
          boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)",
          overflow: "hidden",
        }}
      >
        {/* Window Top Chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 26px",
            backgroundColor: "#F8FAFC",
            borderBottom: "3px solid #18181B",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                backgroundColor: "#FF8E7A",
                border: "2px solid #18181B",
              }}
            />
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                backgroundColor: "#FFD45E",
                border: "2px solid #18181B",
              }}
            />
            <span
              style={{
                width: 15,
                height: 15,
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
              padding: "7px 20px",
              borderRadius: 999,
              backgroundColor: "#FFFFFF",
              border: "2px solid #18181B",
              fontFamily: FONT_MONO,
              fontSize: 20,
              fontWeight: 700,
              color: "#18181B",
            }}
          >
            <span style={{ color: "#10B981" }}>●</span>
            <span>
              {isPipelineOpen
                ? "studio · 4-step pipeline"
                : "step 0 · 30-sec client brief"}
            </span>
          </div>

          <div style={{ width: 52 }} />
        </div>

        {!isPipelineOpen ? (
          /* STAGE A: SEND A TOPIC OR WEBSITE LINK */
          <div style={{ padding: "44px 40px 52px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                marginBottom: 30,
              }}
            >
              <DoodleFounderMascot
                shirtColor="#7CC8F8"
                bgColor="#EAF6FF"
                size={98}
              />
              <div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 38,
                    fontWeight: 800,
                    color: "#18181B",
                    letterSpacing: "-0.02em",
                  }}
                >
                  All We Need From You
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 23,
                    fontWeight: 600,
                    color: "#475569",
                    marginTop: 4,
                  }}
                >
                  Drop a topic idea or paste your landing page URL
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderRadius: 22,
                backgroundColor: "#F8FAFC",
                border: "3px solid #18181B",
                transform: `scale(${sendBtnScale})`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 27,
                  fontWeight: 700,
                  color: typedChars > 0 ? "#18181B" : "#94A3B8",
                }}
              >
                {urlText.slice(0, typedChars) || "Paste website link..."}
                {caretOn && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 3,
                      height: 30,
                      marginLeft: 4,
                      verticalAlign: "middle",
                      backgroundColor: "#6366F1",
                    }}
                  />
                )}
              </span>

              <div
                style={{
                  padding: "13px 26px",
                  borderRadius: 16,
                  backgroundColor: "#6366F1",
                  border: "2.5px solid #18181B",
                  fontFamily: FONT_SANS,
                  fontSize: 23,
                  fontWeight: 800,
                  color: "#FFFFFF",
                }}
              >
                Send Link →
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 14,
                marginTop: 22,
                flexWrap: "wrap",
              }}
            >
              {[
                "✓ SaaS / Tech",
                "✓ Agency Offers",
                "✓ Health & E-Com",
                "✓ Coaching / Info",
              ].map((tag, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 999,
                    backgroundColor: idx === 1 ? "#E9FBF3" : "#FFFFFF",
                    border: "2px solid #18181B",
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#18181B",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* STAGE B: 4-STAGE STUDIO PIPELINE + LIVE WHITEBOARD MINI-WINDOW + 48H SLA */
          <div style={{ padding: "28px 34px 34px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DoodleFounderMascot
                  shirtColor="#84E4B8"
                  bgColor="#E9FBF3"
                  size={68}
                  withHeadset
                />
                <div>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 33,
                      fontWeight: 900,
                      color: "#18181B",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    We Handle Everything
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 19,
                      fontWeight: 700,
                      color: "#6366F1",
                    }}
                  >
                    SOURCE: yourbusiness.com/offer
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: "#EEF2FF",
                  border: "2.5px solid #18181B",
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#18181B",
                }}
              >
                Full Turnkey Team
              </div>
            </div>

            {/* Steps 01 - 03 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {steps.map((st, i) => {
                const active = globalT >= st.at;
                const ageF = Math.max(0, (globalT - st.at) * fps);
                const sp = spring({
                  frame: ageF,
                  fps,
                  config: { damping: 16, stiffness: 230 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderRadius: 20,
                      backgroundColor: active ? st.bg : "#F8FAFC",
                      border: "3px solid #18181B",
                      opacity: active ? 1 : 0.48,
                      transform: `translateX(${
                        active
                          ? interpolate(sp, [0, 1], [26, 0], {
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            })
                          : 0
                      }px)`,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <div
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 14,
                          backgroundColor: active ? st.accent : "#E2E8F0",
                          border: "2.5px solid #18181B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: FONT_MONO,
                          fontSize: 22,
                          fontWeight: 800,
                          color: "#18181B",
                        }}
                      >
                        {st.num}
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: FONT_SANS,
                            fontSize: 26,
                            fontWeight: 800,
                            color: "#18181B",
                          }}
                        >
                          {st.title}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT_SANS,
                            fontSize: 19,
                            fontWeight: 600,
                            color: "#475569",
                          }}
                        >
                          {st.sub}
                        </div>
                      </div>
                    </div>

                    {st.waveform && active ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            height: 32,
                          }}
                        >
                          {[0, 1, 2, 3, 4, 5, 6].map((bar) => {
                            const h =
                              10 +
                              18 *
                                Math.abs(
                                  Math.sin((frame * 0.32 + bar * 0.9) % Math.PI)
                                );
                            return (
                              <span
                                key={bar}
                                style={{
                                  width: 5,
                                  height: h,
                                  borderRadius: 4,
                                  backgroundColor: "#18181B",
                                }}
                              />
                            );
                          })}
                        </div>
                        <span
                          style={{
                            padding: "6px 14px",
                            borderRadius: 999,
                            backgroundColor: "#84E4B8",
                            border: "2px solid #18181B",
                            fontFamily: FONT_SANS,
                            fontSize: 19,
                            fontWeight: 800,
                            color: "#18181B",
                          }}
                        >
                          ✓ Done
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "6px 16px",
                          borderRadius: 999,
                          backgroundColor: active ? "#84E4B8" : "#E2E8F0",
                          border: "2px solid #18181B",
                          fontFamily: FONT_SANS,
                          fontSize: 19,
                          fontWeight: 800,
                          color: "#18181B",
                        }}
                      >
                        {active ? "✓ Done" : "Queued"}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Step 04: Hand-Drawn Whiteboard Animation WITH Live Embedded Video Window! */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderRadius: 22,
                  backgroundColor: wbActive ? "#E9FBF3" : "#F8FAFC",
                  border: "3px solid #18181B",
                  opacity: wbActive ? 1 : 0.48,
                  transform: `scale(${
                    wbActive
                      ? interpolate(wbSpring, [0, 1], [0.96, 1], {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        })
                      : 1
                  })`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: wbActive ? "#84E4B8" : "#E2E8F0",
                      border: "2.5px solid #18181B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT_MONO,
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#18181B",
                    }}
                  >
                    04
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 26,
                        fontWeight: 900,
                        color: "#18181B",
                      }}
                    >
                      Custom Whiteboard Animation
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 19,
                        fontWeight: 600,
                        color: "#334155",
                        marginTop: 2,
                      }}
                    >
                      Hand-drawn scenes + captions + sound mix
                    </div>
                  </div>
                </div>

                {/* Live Mini Whiteboard Render Preview */}
                <div
                  style={{
                    width: 148,
                    height: 186,
                    borderRadius: 16,
                    backgroundColor: "#FFFFFF",
                    border: "3px solid #18181B",
                    overflow: "hidden",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {wbActive && (
                    <OffthreadVideo
                      src={PIPELINE_PREVIEW_CLIP}
                      playbackRate={2.8}
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 48-HOUR SLA STAMP BANNER */}
            <div
              style={{
                marginTop: 18,
                padding: "18px 26px",
                borderRadius: 22,
                background: slaActive
                  ? "linear-gradient(90deg, #18181B 0%, #312E81 100%)"
                  : "#F1F5F9",
                border: "3px solid #18181B",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transform: `scale(${
                  slaActive
                    ? interpolate(slaSpring, [0, 1], [1.08, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 0.98
                })`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: 10,
                    backgroundColor: "#FFD45E",
                    border: "2px solid #18181B",
                    fontFamily: FONT_MONO,
                    fontSize: 21,
                    fontWeight: 900,
                    color: "#18181B",
                  }}
                >
                  ⚡ 48 HOURS
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 25,
                    fontWeight: 800,
                    color: slaActive ? "#FFFFFF" : "#64748B",
                  }}
                >
                  Ready-to-Post Final Video Delivered
                </span>
              </div>
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  fontWeight: 900,
                  color: slaActive ? "#84E4B8" : "#94A3B8",
                }}
              >
                {slaActive ? "✓ Guaranteed" : "..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stage A Animated Pointer Cursor */}
      {!isPipelineOpen && (
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: cursorY,
            pointerEvents: "none",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 36 36" fill="none">
            <path
              d="M7 4L29 16.5L18.5 19.5L14 30L7 4Z"
              fill="#18181B"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </AbsoluteFill>
  );
};

// =============================================================================
// CUSTOM-CODED SCENE 3 (56.85s -> 68.15s): 3-TIER PRICING STACK ($97/$147/$497)
// =============================================================================
const PricingPackagesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalT = 56.85 + frame / fps;

  const enterOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tiers = [
    {
      badge: "STARTER TEST BATCH",
      badgeBg: "#EAF6FF",
      cardBg: "#FFFFFF",
      title: "5 Custom Shorts",
      sub: "Vertical 9:16 · Script, Voice, Art & Captions",
      price: "$97",
      unitNote: "One-time test batch",
      cardAppearAt: 57.1,
      pricePopAt: 59.58,
      featured: false,
    },
    {
      badge: "LONG-FORM VSL / YOUTUBE",
      badgeBg: "#FFF8DB",
      cardBg: "#FFFFFF",
      title: "10-Min YouTube Explainer",
      sub: "Full Deep-Dive Video · Built for Watch-Time",
      price: "$147",
      unitNote: "Complete 10-min asset",
      cardAppearAt: 60.92,
      pricePopAt: 63.04,
      featured: false,
    },
    {
      badge: "★ AGENCY WHITE-LABEL · ~$16 / SHORT",
      badgeBg: "#FFD45E",
      cardBg: "#F5F3FF",
      title: "30 White-Label Shorts",
      sub: "Unbranded · Resell to Clients or Fill 30 Days",
      price: "$497",
      unitNote: "Best agency margin",
      cardAppearAt: 64.62,
      pricePopAt: 66.33,
      featured: true,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFFFFF",
        opacity: enterOpacity,
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
          opacity: 0.52,
        }}
      />

      <KickerBadge label="TRANSPARENT PACKAGES" accent="#FFD45E" />

      {/* Section Title */}
      <div
        style={{
          position: "absolute",
          top: 138,
          left: 60,
          right: 60,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 48,
            fontWeight: 900,
            color: "#18181B",
            letterSpacing: "-0.03em",
          }}
        >
          Pick How You Want to Start
        </div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 23,
            fontWeight: 600,
            color: "#475569",
            marginTop: 6,
          }}
        >
          Every package includes research, script, voiceover & animation
        </div>
      </div>

      {/* 3 Stacked Pricing Cards (fits cleanly above y=1500 caption safe zone) */}
      <div
        style={{
          position: "absolute",
          top: 268,
          left: 56,
          right: 56,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {tiers.map((tier, idx) => {
          const visible = globalT >= tier.cardAppearAt;
          const cardFrames = Math.max(0, (globalT - tier.cardAppearAt) * fps);
          const cardSpring = spring({
            frame: cardFrames,
            fps,
            config: { damping: 17, stiffness: 215, mass: 0.72 },
          });

          const priceHit = globalT >= tier.pricePopAt;
          const priceFrames = Math.max(0, (globalT - tier.pricePopAt) * fps);
          const priceSpring = spring({
            frame: priceFrames,
            fps,
            config: { damping: 12, stiffness: 270, mass: 0.62 },
          });
          const priceScale = priceHit
            ? interpolate(priceSpring, [0, 0.6, 1], [0.75, 1.08, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0.92;

          return (
            <div
              key={idx}
              style={{
                opacity: visible
                  ? interpolate(cardFrames, [0, 6], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                  : 0.16,
                transform: `translateY(${
                  visible
                    ? interpolate(cardSpring, [0, 1], [34, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 18
                }px)`,
                padding: tier.featured ? "28px 32px" : "24px 32px",
                borderRadius: 30,
                backgroundColor: tier.cardBg,
                border: tier.featured
                  ? "4px solid #6366F1"
                  : "3.5px solid #18181B",
                boxShadow: tier.featured
                  ? "0 20px 46px rgba(99, 102, 241, 0.20)"
                  : "0 14px 32px rgba(24, 24, 27, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 16px",
                    borderRadius: 999,
                    backgroundColor: tier.badgeBg,
                    border: "2px solid #18181B",
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    color: "#18181B",
                    marginBottom: 12,
                  }}
                >
                  {tier.badge}
                </div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 38,
                    fontWeight: 900,
                    color: "#18181B",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.08,
                  }}
                >
                  {tier.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#475569",
                    marginTop: 8,
                  }}
                >
                  {tier.sub}
                </div>
              </div>

              {/* Price Medallion */}
              <div
                style={{
                  minWidth: 210,
                  padding: "18px 24px",
                  borderRadius: 24,
                  backgroundColor: priceHit
                    ? tier.featured
                      ? "#18181B"
                      : "#84E4B8"
                    : "#F1F5F9",
                  border: "3px solid #18181B",
                  textAlign: "center",
                  transform: `scale(${priceScale})`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 64,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color:
                      priceHit && tier.featured
                        ? "#84E4B8"
                        : priceHit
                        ? "#18181B"
                        : "#94A3B8",
                  }}
                >
                  {priceHit ? tier.price : "..."}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 17,
                    fontWeight: 700,
                    marginTop: 6,
                    color:
                      priceHit && tier.featured ? "#E2E8F0" : "#18181B",
                  }}
                >
                  {tier.unitNote}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// CUSTOM-CODED SCENE 4 (68.15s -> 73.20s): INTERACTIVE REPLY + CLICK CTA FINALE
// =============================================================================
const LaunchBatchCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalT = 68.15 + frame / fps;

  const enterOpacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 1) "Reply to this message" typing bubble (68.40s -> 69.20s)
  const replyMsg = "Let's start my first batch!";
  const replyCount = Math.floor(
    interpolate(globalT, [68.42, 69.18], [0, replyMsg.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const replySent = globalT >= 69.22;

  // 2) "or click the link" cursor click at 70.05s
  const linkClickFrame = Math.round((70.05 - 68.15) * fps);
  const linkClicked = globalT >= 70.08;
  const ctaScale = interpolate(
    frame,
    [linkClickFrame - 2, linkClickFrame + 1, linkClickFrame + 6],
    [1, 0.95, 1.02],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cursorX = interpolate(
    globalT,
    [68.3, 69.2, 70.05, 71.2],
    [780, 830, 560, 620],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorY = interpolate(
    globalT,
    [68.3, 69.2, 70.05, 71.2],
    [690, 675, 1020, 1055],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );

  const deckColors = ["#7CC8F8", "#84E4B8", "#FFD45E", "#C9AEFF", "#FF8E7A"];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFFFFF",
        opacity: enterOpacity,
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

      <KickerBadge label="START IN 60 SECONDS" accent="#84E4B8" />

      {/* Top Hero: Doodle Mascot + Fanned 5-Shorts Batch Deck */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 60,
          right: 60,
          padding: "26px 32px",
          borderRadius: 30,
          backgroundColor: "#F8FAFC",
          border: "3.5px solid #18181B",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <DoodleFounderMascot
            shirtColor="#84E4B8"
            bgColor="#FFFFFF"
            size={108}
          />
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 999,
                backgroundColor: "#FFD45E",
                border: "2px solid #18181B",
                fontFamily: FONT_MONO,
                fontSize: 18,
                fontWeight: 800,
                color: "#18181B",
                marginBottom: 8,
              }}
            >
              ⚡ 48-HOUR TURNAROUND
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 38,
                fontWeight: 900,
                color: "#18181B",
                letterSpacing: "-0.025em",
                lineHeight: 1.08,
              }}
            >
              Your First Batch
              <br />
              Starts Today
            </div>
          </div>
        </div>

        {/* Fanned 5 Vertical Short Mini-Cards */}
        <div
          style={{
            position: "relative",
            width: 215,
            height: 150,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {deckColors.map((col, i) => {
            const angle = (i - 2) * 9;
            const shiftX = (i - 2) * 22;
            const cardPop = spring({
              frame: Math.max(0, frame - i * 2),
              fps,
              config: { damping: 15, stiffness: 220 },
            });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 72,
                  height: 122,
                  borderRadius: 12,
                  backgroundColor: col,
                  border: "2.5px solid #18181B",
                  boxShadow: "0 6px 14px rgba(24,24,27,0.12)",
                  transform: `translateX(${shiftX}px) rotate(${angle}deg) scale(${interpolate(
                    cardPop,
                    [0, 1],
                    [0.6, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #18181B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  ▶
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action 1: Reply to This Message */}
      <div
        style={{
          position: "absolute",
          top: 425,
          left: 60,
          right: 60,
          padding: "26px 30px",
          borderRadius: 28,
          backgroundColor: "#FFFFFF",
          border: "3.5px solid #18181B",
          boxShadow: "0 14px 32px rgba(24,24,27,0.08)",
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 20,
            fontWeight: 800,
            color: "#6366F1",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}
        >
          OPTION 1 · DIRECT REPLY
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderRadius: 20,
            backgroundColor: replySent ? "#E9FBF3" : "#F8FAFC",
            border: "2.5px solid #18181B",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 29,
              fontWeight: 800,
              color: "#18181B",
            }}
          >
            "{replyMsg.slice(0, replyCount) || "Reply to this message..."}"
          </span>
          <span
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              backgroundColor: replySent ? "#84E4B8" : "#18181B",
              border: "2px solid #18181B",
              fontFamily: FONT_SANS,
              fontSize: 21,
              fontWeight: 800,
              color: replySent ? "#18181B" : "#FFFFFF",
            }}
          >
            {replySent ? "✓ Replied" : "Reply"}
          </span>
        </div>
      </div>

      {/* Clean Divider (No Em-Dashes) */}
      <div
        style={{
          position: "absolute",
          top: 660,
          left: 110,
          right: 110,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div style={{ flex: 1, height: 2.5, backgroundColor: "#CBD5E1" }} />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 22,
            fontWeight: 800,
            color: "#64748B",
          }}
        >
          OR
        </span>
        <div style={{ flex: 1, height: 2.5, backgroundColor: "#CBD5E1" }} />
      </div>

      {/* Action 2: Click the Link Button */}
      <div
        style={{
          position: "absolute",
          top: 718,
          left: 60,
          right: 60,
          padding: "28px 30px",
          borderRadius: 28,
          backgroundColor: "#FFFFFF",
          border: "3.5px solid #18181B",
          boxShadow: "0 18px 40px rgba(99,102,241,0.14)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 20,
              fontWeight: 800,
              color: "#10B981",
              letterSpacing: "0.06em",
            }}
          >
            OPTION 2 · INSTANT LINK
          </span>
          {linkClicked && (
            <span
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                backgroundColor: "#E9FBF3",
                border: "2px solid #18181B",
                fontFamily: FONT_SANS,
                fontSize: 19,
                fontWeight: 800,
                color: "#18181B",
              }}
            >
              ✓ Production Slot Open
            </span>
          )}
        </div>

        <div
          style={{
            padding: "24px 32px",
            borderRadius: 22,
            background: "linear-gradient(90deg, #6366F1 0%, #4DB8A8 100%)",
            border: "3.5px solid #18181B",
            boxShadow: "0 12px 28px rgba(99, 102, 241, 0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${ctaScale})`,
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 34,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
            }}
          >
            Click the Link · Start Your First Batch →
          </span>
        </div>
      </div>

      {/* Freeze-Frame Offer Summary Strip (Persists Through Final Frame!) */}
      <div
        style={{
          position: "absolute",
          top: 995,
          left: 60,
          right: 60,
          display: "flex",
          gap: 16,
        }}
      >
        {[
          { label: "5 Custom Shorts", price: "$97", bg: "#EAF6FF" },
          { label: "10-Min Explainer", price: "$147", bg: "#FFF8DB" },
          { label: "30 White-Label", price: "$497", bg: "#E9FBF3" },
        ].map((pkg, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              padding: "18px 14px",
              borderRadius: 22,
              backgroundColor: pkg.bg,
              border: "3px solid #18181B",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 38,
                fontWeight: 900,
                color: "#18181B",
                lineHeight: 1.05,
              }}
            >
              {pkg.price}
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 19,
                fontWeight: 800,
                color: "#334155",
                marginTop: 6,
              }}
            >
              {pkg.label}
            </div>
          </div>
        ))}
      </div>

      {/* Animated Pointer Cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
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
// WORD-TIMED CAPTIONS (CLEAN ZERO-OVERLAP WINDOWS)
// =============================================================================
const DynamicCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // GameChangerPivotScene (27.55s -> 29.65s) displays hero full-screen kinetic words directly
  if (t >= 27.55 && t < 29.65) return null;

  let groupIndex = -1;
  for (let i = 0; i < CAPTION_GROUPS.length; i++) {
    const g = CAPTION_GROUPS[i];
    const nextStart =
      i + 1 < CAPTION_GROUPS.length ? CAPTION_GROUPS[i + 1].start : 9999;
    const winStart = g.start - 0.05;
    const winEnd = Math.min(g.end + 0.22, nextStart - 0.01);
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
        left: 52,
        right: 52,
        bottom: 245,
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
          padding: "17px 28px",
          borderRadius: 26,
          backgroundColor: "rgba(255, 255, 255, 0.97)",
          border: "3.5px solid #18181B",
          boxShadow: "0 12px 30px rgba(24, 24, 27, 0.12)",
          maxWidth: 950,
        }}
      >
        {group.words.map((word, idx) => {
          const isCurrent = idx === activeWordIdx && t <= word.e + 0.24;
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
                fontSize: 48,
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
          background: "linear-gradient(90deg, #6366F1 0%, #4DB8A8 100%)",
        }}
      />
    </div>
  );
};

// =============================================================================
// ROOT COMPOSITION (1080x1920 @ 30fps, 2196 FRAMES = 73.20s)
// =============================================================================
export default function WhiteboardAgencyClientAcquisitionShowcase() {
  const { fps, durationInFrames } = useVideoConfig();

  const pivotStart = Math.round(27.55 * fps);
  const pivotEnd = Math.round(29.65 * fps);

  const pipelineStart = Math.round(47.95 * fps);
  const pipelineEnd = Math.round(56.85 * fps);

  const pricingStart = Math.round(56.85 * fps);
  const pricingEnd = Math.round(68.15 * fps);

  const ctaStart = Math.round(68.15 * fps);
  const ctaEnd = durationInFrames;

  const musicCrossfadeStartFrame = Math.round(47.4 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {/* 1. All 10 Hand-Drawn Whiteboard MP4 Scenes (speed-matched 1.39x - 2.94x) */}
      {WHITEBOARD_SCENES.map((scene) => {
        const from = Math.round(scene.start * fps);
        const to = Math.round(scene.end * fps);
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={Math.max(1, to - from)}
            name={`Whiteboard-Scene-${String(scene.id).padStart(2, "0")}`}
          >
            <WhiteboardClipScene scene={scene} />
          </Sequence>
        );
      })}

      {/* 2. Custom-Coded Beat 1: Midpoint Kinetic Pattern Interrupt ("This changes everything.") */}
      <Sequence
        from={pivotStart}
        durationInFrames={pivotEnd - pivotStart}
        name="Pivot-This-Changes-Everything"
      >
        <GameChangerPivotScene />
      </Sequence>

      {/* 3. Custom-Coded Beat 2: Send Link -> 4-Stage 48h Done-For-You Pipeline */}
      <Sequence
        from={pipelineStart}
        durationInFrames={pipelineEnd - pipelineStart}
        name="Done-For-You-48h-Pipeline"
      >
        <DoneForYouPipelineScene />
      </Sequence>

      {/* 4. Custom-Coded Beat 3: 3-Tier Stacked Offer Showcase ($97 / $147 / $497) */}
      <Sequence
        from={pricingStart}
        durationInFrames={pricingEnd - pricingStart}
        name="Pricing-Packages-Showcase"
      >
        <PricingPackagesScene />
      </Sequence>

      {/* 5. Custom-Coded Beat 4: Interactive Reply + Click CTA & Freeze-Frame Summary */}
      <Sequence
        from={ctaStart}
        durationInFrames={ctaEnd - ctaStart}
        name="Launch-First-Batch-CTA"
      >
        <LaunchBatchCtaScene />
      </Sequence>

      {/* 6. Word-Exact Dynamic Captions & Top Progress Strip */}
      {SHOW_CAPTIONS && <DynamicCaptions />}
      <TopProgressStrip />

      {/* 7. Winning Master Voiceover ("Generated Audio November 12, 2026 - 9_23PM.wav") */}
      <Sequence from={0} durationInFrames={Math.round(71.96 * fps)} name="Voiceover-9-23PM">
        <Audio src={VOICE_URL} volume={1} />
      </Sequence>

      {/* 8. Two-Act Underscore Crossfade (Docu-Pluck -> Modern Tech-Pulse, zero loop seams!) */}
      <Sequence
        from={0}
        durationInFrames={Math.round(49.2 * fps)}
        name="Music-Act1-DocuPluck"
      >
        <Audio
          src={MUSIC_DOCU_PLUCK}
          volume={(f) => {
            const sec = f / fps;
            const duckPivot = sec >= 27.5 && sec <= 29.1 ? 0.65 : 1;
            const fadeOut = interpolate(sec, [47.4, 49.1], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return MUSIC_BASE_VOLUME * duckPivot * fadeOut;
          }}
        />
      </Sequence>

      <Sequence
        from={musicCrossfadeStartFrame}
        durationInFrames={durationInFrames - musicCrossfadeStartFrame}
        name="Music-Act2-TechPulse"
      >
        <Audio
          src={MUSIC_TECH_PULSE}
          volume={(localF) => {
            const globalSec = (musicCrossfadeStartFrame + localF) / fps;
            const endSec = durationInFrames / fps;
            const fadeIn = interpolate(globalSec, [47.4, 49.0], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const fadeOut = interpolate(
              globalSec,
              [endSec - 1.5, endSec],
              [1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );
            return MUSIC_BASE_VOLUME * 1.05 * fadeIn * fadeOut;
          }}
        />
      </Sequence>

      {/* 9. Tactile Story, Pipeline, Pricing & CTA Sound Effects */}
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
