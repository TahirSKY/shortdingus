/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 2048, "width": 1080, "height": 1920 } */
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
// HUB PERMANENT ASSET URLS (MP4 CLIPS + VOICE + SHARED LIBRARY AUDIO ONLY)
// =============================================================================
const HUB = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=";

const VOICE_URL = `${HUB}fd103c47-1e02-40f8-9f8e-810686fe62c2`;
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
  start: number;
  end: number;
  clipUrl: string;
  clipDuration: number;
  kicker?: string;
  accent?: string;
}

const WHITEBOARD_SCENES: WhiteboardSceneSpec[] = [
  { id: 1, start: 0.0, end: 4.4, clipUrl: `${HUB}19fc584d-e522-4ff5-ba7c-aee542b77f24`, clipDuration: 9.76, kicker: "HIDDEN BELLY FAT", accent: "#FF8E7A" },
  { id: 2, start: 4.4, end: 8.05, clipUrl: `${HUB}f26e2e88-a3b3-4032-9e3d-5fe7197abd0c`, clipDuration: 6.88, kicker: "WAIT FOR THE END", accent: "#FFD45E" },
  { id: 3, start: 8.05, end: 11.55, clipUrl: `${HUB}48d7d438-de62-43ed-8bc9-d9c6752cb459`, clipDuration: 7.07, kicker: "VISCERAL FAT", accent: "#7CC8F8" },
  { id: 4, start: 11.55, end: 14.35, clipUrl: `${HUB}427d19bb-9fed-4956-8bc2-1528b11622f0`, clipDuration: 7.49, kicker: "DEEP & DANGEROUS", accent: "#FF8E7A" },
  { id: 5, start: 14.35, end: 18.55, clipUrl: `${HUB}95cb64a1-384f-45d0-9844-859dc2f684d3`, clipDuration: 6.58, kicker: "THE GOOD NEWS", accent: "#5ED9B3" },
  { id: 6, start: 18.55, end: 24.65, clipUrl: `${HUB}c4a26bb9-10c6-4368-98b5-8719d9db192f`, clipDuration: 8.01, kicker: "QUICK QUIZ", accent: "#B899FF" },
  { id: 7, start: 24.65, end: 28.1, clipUrl: `${HUB}5978f9aa-8ddd-485b-96a6-55021c2d37a7`, clipDuration: 6.0, kicker: "MYTH BUSTED", accent: "#FF8E7A" },
  { id: 8, start: 28.1, end: 33.5, clipUrl: `${HUB}1e52f02d-ef13-4938-bf5c-a02dd29e4afa`, clipDuration: 9.84, kicker: "WIN #1 · 10-MIN WALK", accent: "#5ED9B3" },
  { id: 9, start: 33.5, end: 39.1, clipUrl: `${HUB}2ff21972-b673-4a62-820c-015c87dd6b30`, clipDuration: 7.8, kicker: "GLUCOSE SPONGE", accent: "#7CC8F8" },
  { id: 10, start: 39.1, end: 45.0, clipUrl: `${HUB}10d2148f-d1d8-4317-979d-bdfba9f2a93b`, clipDuration: 8.48, kicker: "WIN #2 · 6+ HRS SLEEP", accent: "#B899FF" },
  { id: 11, start: 45.0, end: 50.7, clipUrl: `${HUB}31c85763-77f3-4e2d-b62c-5ad1ec6ab9d3`, clipDuration: 9.27, kicker: "WIN #3 · PROTEIN CHEAT CODE", accent: "#FFD45E" },
  // 50.70s -> 57.50s is the custom-coded CoreAge RX Interactive Search & Platform Scene
  { id: 12, start: 57.5, end: 60.95, clipUrl: `${HUB}b05d6042-9b89-4f84-8295-a8bdf0f63df8`, clipDuration: 6.69, kicker: "THE PROMISED LINE", accent: "#FF8E7A" },
  { id: 13, start: 60.95, end: 64.25, clipUrl: `${HUB}5908b3c7-6c21-4e24-9b1b-9946181d7769`, clipDuration: 6.56, kicker: "SMALL HABITS ON REPEAT", accent: "#5ED9B3" },
  { id: 14, start: 64.25, end: 68.26, clipUrl: `${HUB}11853cf0-c19a-4636-ab34-f338f3546ba1`, clipDuration: 10.07, kicker: "START SHRINKING IT", accent: "#7CC8F8" },
];

// =============================================================================
// EXACT WORD-LEVEL TRANSCRIPT (202 WORDS FROM ASSEMBLYAI)
// =============================================================================
interface WordTiming {
  w: string;
  s: number;
  e: number;
  hi?: string;
}

const WORDS: WordTiming[] = [
  { w: "Your", s: 0.256, e: 0.384 }, { w: "belly", s: 0.433, e: 0.641, hi: "#FFD45E" }, { w: "fat", s: 0.673, e: 0.994, hi: "#FFD45E" }, { w: "might", s: 0.994, e: 1.17 },
  { w: "be", s: 1.219, e: 1.315 }, { w: "the", s: 1.315, e: 1.395 }, { w: "kind", s: 1.395, e: 1.716 }, { w: "that's", s: 1.716, e: 2.037 },
  { w: "wrapping", s: 2.101, e: 2.422, hi: "#FF8E7A" }, { w: "around", s: 2.582, e: 2.999 }, { w: "your", s: 2.999, e: 3.223 }, { w: "organs", s: 3.223, e: 3.608, hi: "#FF8E7A" },
  { w: "right", s: 3.705, e: 3.897 }, { w: "now.", s: 3.897, e: 4.074 }, { w: "Stay", s: 4.603, e: 4.795, hi: "#FFD45E" }, { w: "for", s: 4.844, e: 4.988 },
  { w: "the", s: 4.988, e: 5.084 }, { w: "last", s: 5.084, e: 5.325, hi: "#FFD45E" }, { w: "line", s: 5.325, e: 5.533, hi: "#FFD45E" }, { w: "because", s: 5.565, e: 5.854 },
  { w: "it's", s: 6.046, e: 6.191 }, { w: "the", s: 6.191, e: 6.287 }, { w: "part", s: 6.287, e: 6.56 }, { w: "nobody", s: 6.784, e: 7.249, hi: "#C9AEFF" },
  { w: "tells", s: 7.249, e: 7.538 }, { w: "you.", s: 7.57, e: 7.715 }, { w: "It's", s: 8.228, e: 8.372 }, { w: "called", s: 8.372, e: 8.677 },
  { w: "visceral", s: 8.853, e: 9.27, hi: "#FF8E7A" }, { w: "fat.", s: 9.27, e: 9.543, hi: "#FF8E7A" }, { w: "It's", s: 9.88, e: 10.04 }, { w: "not", s: 10.072, e: 10.377, hi: "#7CC8F8" },
  { w: "the", s: 10.377, e: 10.441 }, { w: "soft", s: 10.441, e: 10.762 }, { w: "stuff", s: 10.762, e: 10.939 }, { w: "you", s: 10.939, e: 11.067 },
  { w: "pinch.", s: 11.083, e: 11.308, hi: "#FFD45E" }, { w: "It's", s: 11.741, e: 12.045 }, { w: "deep,", s: 12.045, e: 12.302, hi: "#FFD45E" }, { w: "and", s: 12.527, e: 12.623 },
  { w: "it's", s: 12.623, e: 12.863 }, { w: "the", s: 12.863, e: 12.944 }, { w: "dangerous", s: 13.024, e: 13.505, hi: "#FF8E7A" }, { w: "kind.", s: 13.505, e: 13.842 },
  { w: "But", s: 14.451, e: 14.724 }, { w: "here's", s: 14.852, e: 14.997 }, { w: "the", s: 15.029, e: 15.109 }, { w: "good", s: 15.109, e: 15.253, hi: "#84E4B8" },
  { w: "news:", s: 15.269, e: 15.462, hi: "#84E4B8" }, { w: "it's", s: 15.831, e: 15.991 }, { w: "often", s: 16.136, e: 16.36 }, { w: "one", s: 16.376, e: 16.488 },
  { w: "of", s: 16.488, e: 16.617 }, { w: "the", s: 16.617, e: 16.713 }, { w: "first", s: 16.713, e: 17.194, hi: "#84E4B8" }, { w: "fat", s: 17.194, e: 17.387 },
  { w: "stores", s: 17.451, e: 17.723 }, { w: "to", s: 17.756, e: 17.9 }, { w: "shrink.", s: 17.9, e: 18.157, hi: "#84E4B8" }, { w: "So,", s: 18.734, e: 18.926 },
  { w: "what", s: 19.263, e: 19.311 }, { w: "do", s: 19.311, e: 19.392 }, { w: "you", s: 19.424, e: 19.52 }, { w: "think", s: 19.52, e: 19.744 },
  { w: "works", s: 19.744, e: 19.985 }, { w: "best?", s: 20.001, e: 20.338, hi: "#FFD45E" }, { w: "Crunches?", s: 20.562, e: 21.092, hi: "#FF8E7A" }, { w: "Cardio?", s: 21.284, e: 21.814, hi: "#84E4B8" },
  { w: "Cutting", s: 22.231, e: 22.455, hi: "#FFD45E" }, { w: "carbs?", s: 22.551, e: 23.017, hi: "#FFD45E" }, { w: "Pick", s: 23.45, e: 23.626, hi: "#C9AEFF" }, { w: "one", s: 23.626, e: 23.722 },
  { w: "in", s: 23.77, e: 23.819 }, { w: "your", s: 23.851, e: 23.931 }, { w: "head.", s: 23.931, e: 24.139 }, { w: "If", s: 24.909, e: 25.038 },
  { w: "you", s: 25.038, e: 25.07 }, { w: "said", s: 25.07, e: 25.358 }, { w: "crunches,", s: 25.358, e: 25.904, hi: "#FF8E7A" }, { w: "that", s: 26.337, e: 26.561 },
  { w: "one", s: 26.561, e: 26.626 }, { w: "can't", s: 26.722, e: 26.994, hi: "#FF8E7A" }, { w: "target", s: 26.994, e: 27.395, hi: "#FF8E7A" }, { w: "belly", s: 27.395, e: 27.588 },
  { w: "fat.", s: 27.62, e: 27.909 }, { w: "The", s: 28.23, e: 28.326 }, { w: "real", s: 28.406, e: 28.55 }, { w: "wins", s: 28.582, e: 28.918, hi: "#84E4B8" },
  { w: "are", s: 29.047, e: 29.143 }, { w: "smaller", s: 29.143, e: 29.623, hi: "#FFD45E" }, { w: "than", s: 29.623, e: 29.768 }, { w: "you", s: 29.768, e: 29.864 },
  { w: "think.", s: 29.864, e: 30.04 }, { w: "Walk", s: 30.729, e: 31.05, hi: "#84E4B8" }, { w: "after", s: 31.21, e: 31.402 }, { w: "meals", s: 31.402, e: 31.88 },
  { w: "even", s: 31.88, e: 32.315 }, { w: "10", s: 32.428, e: 32.716, hi: "#FFD45E" }, { w: "minutes", s: 32.732, e: 33.052, hi: "#FFD45E" }, { w: "helps.", s: 33.052, e: 33.277 },
  { w: "Your", s: 33.693, e: 33.789 }, { w: "muscles", s: 33.789, e: 34.238, hi: "#FF8E7A" }, { w: "soak", s: 34.27, e: 34.51, hi: "#7CC8F8" }, { w: "up", s: 34.51, e: 34.607 },
  { w: "the", s: 34.655, e: 34.719 }, { w: "sugar,", s: 34.735, e: 34.975, hi: "#FFD45E" }, { w: "so", s: 35.167, e: 35.36 }, { w: "your", s: 35.392, e: 35.52 },
  { w: "blood", s: 35.552, e: 35.856 }, { w: "sugar", s: 35.856, e: 36.097 }, { w: "spikes", s: 36.097, e: 36.513, hi: "#84E4B8" }, { w: "less.", s: 36.577, e: 36.802, hi: "#84E4B8" },
  { w: "But", s: 37.379, e: 37.667 }, { w: "that's", s: 37.955, e: 38.148 }, { w: "only", s: 38.18, e: 38.356 }, { w: "half", s: 38.356, e: 38.596, hi: "#FFD45E" },
  { w: "of", s: 38.596, e: 38.757 }, { w: "it.", s: 38.757, e: 38.821 }, { w: "Next,", s: 39.397, e: 39.798 }, { w: "sleep.", s: 39.958, e: 40.359, hi: "#C9AEFF" },
  { w: "Under", s: 40.904, e: 41.08 }, { w: "6", s: 41.08, e: 41.4, hi: "#FF8E7A" }, { w: "hours", s: 41.464, e: 41.769, hi: "#FF8E7A" }, { w: "and", s: 41.865, e: 41.929 },
  { w: "you're", s: 41.945, e: 42.041 }, { w: "more", s: 42.041, e: 42.218 }, { w: "likely", s: 42.266, e: 42.538 }, { w: "to", s: 42.538, e: 42.618 },
  { w: "pile", s: 42.682, e: 43.019, hi: "#FFD45E" }, { w: "fat", s: 43.083, e: 43.323, hi: "#FFD45E" }, { w: "on", s: 43.323, e: 43.451 }, { w: "right", s: 43.644, e: 43.82 },
  { w: "around", s: 43.82, e: 44.108 }, { w: "your", s: 44.108, e: 44.204 }, { w: "belly.", s: 44.204, e: 44.413, hi: "#FF8E7A" }, { w: "Now,", s: 45.246, e: 45.438 },
  { w: "the", s: 45.646, e: 45.694 }, { w: "cheatin'", s: 45.727, e: 46.047, hi: "#FFD45E" }, { w: "part:", s: 46.047, e: 46.303 }, { w: "protein", s: 46.688, e: 47.361, hi: "#84E4B8" },
  { w: "at", s: 47.473, e: 47.633 }, { w: "every", s: 47.713, e: 47.858 }, { w: "meal.", s: 47.906, e: 48.226, hi: "#84E4B8" }, { w: "You", s: 48.611, e: 48.691 },
  { w: "stay", s: 48.691, e: 48.931 }, { w: "full,", s: 48.931, e: 49.204, hi: "#84E4B8" }, { w: "so", s: 49.412, e: 49.636 }, { w: "you", s: 49.716, e: 49.78 },
  { w: "eat", s: 49.957, e: 50.005 }, { w: "less.", s: 50.197, e: 50.421, hi: "#7CC8F8" }, { w: "And", s: 50.918, e: 51.094 }, { w: "if", s: 51.174, e: 51.27 },
  { w: "you", s: 51.27, e: 51.383 }, { w: "want", s: 51.399, e: 51.527 }, { w: "a", s: 51.559, e: 51.575 }, { w: "doctor's", s: 51.655, e: 52.024, hi: "#7CC8F8" },
  { w: "guidance,", s: 52.056, e: 52.536, hi: "#7CC8F8" }, { w: "Core", s: 52.857, e: 53.049, hi: "#84E4B8" }, { w: "Age", s: 53.241, e: 53.385, hi: "#84E4B8" }, { w: "RX", s: 53.482, e: 53.898, hi: "#84E4B8" },
  { w: "connects", s: 53.898, e: 54.219 }, { w: "you", s: 54.219, e: 54.283 }, { w: "with", s: 54.299, e: 54.443 }, { w: "U.S.", s: 54.603, e: 54.812, hi: "#7CC8F8" },
  { w: "doctors", s: 54.924, e: 55.308, hi: "#7CC8F8" }, { w: "online.", s: 55.404, e: 55.789, hi: "#84E4B8" }, { w: "Definitely", s: 56.19, e: 56.591, hi: "#FFD45E" }, { w: "check", s: 56.623, e: 56.848 },
  { w: "them", s: 56.848, e: 56.913 }, { w: "out.", s: 56.945, e: 57.073 }, { w: "Here's", s: 57.812, e: 58.037 }, { w: "the", s: 58.053, e: 58.118 },
  { w: "line", s: 58.15, e: 58.342, hi: "#FFD45E" }, { w: "I", s: 58.391, e: 58.471 }, { w: "promised:", s: 58.471, e: 58.889, hi: "#FFD45E" }, { w: "you", s: 59.258, e: 59.323 },
  { w: "don't", s: 59.371, e: 59.58, hi: "#FF8E7A" }, { w: "need", s: 59.596, e: 59.724 }, { w: "to", s: 59.756, e: 59.853 }, { w: "punish", s: 59.917, e: 60.287, hi: "#FF8E7A" },
  { w: "yourself.", s: 60.383, e: 60.769 }, { w: "You", s: 61.122, e: 61.202 }, { w: "need", s: 61.202, e: 61.411 }, { w: "small", s: 61.443, e: 61.909, hi: "#84E4B8" },
  { w: "habits", s: 61.909, e: 62.343, hi: "#84E4B8" }, { w: "you", s: 62.407, e: 62.552 }, { w: "can", s: 62.552, e: 62.648 }, { w: "repeat.", s: 62.729, e: 63.066, hi: "#FFD45E" },
  { w: "Keep", s: 63.677, e: 63.837 }, { w: "that", s: 63.853, e: 64.078 }, { w: "up,", s: 64.078, e: 64.255 }, { w: "and", s: 64.335, e: 64.4 },
  { w: "that", s: 64.416, e: 64.641 }, { w: "organ-wrapping", s: 64.721, e: 65.283, hi: "#FF8E7A" }, { w: "fat", s: 65.364, e: 65.572 }, { w: "can", s: 65.781, e: 65.926 },
  { w: "start", s: 65.926, e: 66.151 }, { w: "to", s: 66.183, e: 66.328 }, { w: "shrink.", s: 66.328, e: 66.649, hi: "#84E4B8" }, { w: "Follow", s: 67.147, e: 67.452, hi: "#FFD45E" },
  { w: "for", s: 67.452, e: 67.549 }, { w: "part", s: 67.549, e: 67.79, hi: "#7CC8F8" }, { w: "2.", s: 67.79, e: 67.87, hi: "#7CC8F8" },
];

// Group words into punchy 3-5 word caption phrases for clean Shorts readability
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
// SOUND EFFECTS TIMELINE (SPARSE, PURPOSEFUL, WORD-EXACT)
// =============================================================================
interface SfxCue {
  at: number;
  src: string;
  vol: number;
  dur?: number;
}

const SFX_CUES: SfxCue[] = [
  { at: 0.16, src: SFX.pop, vol: 0.22 },
  { at: 4.4, src: SFX.whoosh, vol: 0.17 },
  { at: 14.38, src: SFX.chime, vol: 0.22 },
  { at: 18.58, src: SFX.whoosh, vol: 0.16 },
  { at: 20.56, src: SFX.click, vol: 0.22 },
  { at: 21.28, src: SFX.click, vol: 0.22 },
  { at: 22.23, src: SFX.click, vol: 0.22 },
  { at: 23.38, src: SFX.tick, vol: 0.24, dur: 1.25 },
  { at: 25.35, src: SFX.stamp, vol: 0.25 },
  { at: 30.72, src: SFX.pop, vol: 0.2 },
  { at: 39.36, src: SFX.whoosh, vol: 0.16 },
  { at: 45.68, src: SFX.pop, vol: 0.2 },
  // CoreAge RX interactive UI cues
  { at: 50.7, src: SFX.whoosh, vol: 0.22 },
  { at: 52.32, src: SFX.typing, vol: 0.34, dur: 1.32 },
  { at: 53.78, src: SFX.click, vol: 0.28 },
  { at: 53.92, src: SFX.pop, vol: 0.25 },
  { at: 54.65, src: SFX.toggle, vol: 0.25 },
  { at: 56.15, src: SFX.chime, vol: 0.24 },
  // Promised payoff & finale
  { at: 57.5, src: SFX.riser, vol: 0.18 },
  { at: 59.25, src: SFX.impact, vol: 0.22 },
  { at: 64.3, src: SFX.sparkle, vol: 0.24 },
];

const FONT_SANS =
  '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Subtle top kicker pill so every scene reads like a directed chapter beat */
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

/** Interactive participation bar during Scene 06 ("Crunches? Cardio? Cutting carbs?") */
const QuizOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Scene 6 starts at 18.55s
  const globalT = 18.55 + frame / fps;

  const options = [
    { label: "A · Crunches", trigger: 20.56, color: "#FF8E7A" },
    { label: "B · Cardio", trigger: 21.28, color: "#84E4B8" },
    { label: "C · Cut Carbs", trigger: 22.23, color: "#FFD45E" },
  ];

  const showThinkTimer = globalT >= 23.35;
  const timerProgress = interpolate(globalT, [23.35, 24.6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 146,
        left: 54,
        right: 54,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        {options.map((opt, idx) => {
          const active = globalT >= opt.trigger;
          const localAppear = Math.max(0, (globalT - opt.trigger) * fps);
          const s = active
            ? spring({
                frame: localAppear,
                fps,
                config: { damping: 14, stiffness: 240, mass: 0.6 },
              })
            : 0;
          if (!active) return null;
          return (
            <div
              key={idx}
              style={{
                padding: "9px 20px",
                borderRadius: 16,
                backgroundColor: opt.color,
                border: "2.5px solid #18181B",
                fontFamily: FONT_SANS,
                fontWeight: 800,
                fontSize: 24,
                color: "#18181B",
                transform: `scale(${interpolate(s, [0, 1], [0.75, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })})`,
                boxShadow: "0 6px 14px rgba(24,24,27,0.10)",
              }}
            >
              {opt.label}
            </div>
          );
        })}
      </div>
      {showThinkTimer && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 20px",
            borderRadius: 999,
            backgroundColor: "#18181B",
            color: "#FFFFFF",
            fontFamily: FONT_SANS,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <span>Pick one in your head</span>
          <div
            style={{
              width: 90,
              height: 8,
              borderRadius: 99,
              backgroundColor: "rgba(255,255,255,0.22)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(timerProgress * 100)}%`,
                height: "100%",
                backgroundColor: "#FFD45E",
              }}
            />
          </div>
        </div>
      )}
    </div>
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
  // Leave 0.08s safety buffer inside the MP4's 1.0s final color hold so it never hits EOF early
  const playbackRate = Number(
    Math.max(0.5, (scene.clipDuration - 0.08) / sceneSeconds).toFixed(4)
  );

  const progress = frame / Math.max(1, durationInFrames - 1);

  // Crisp entrance settle + subtle push-in during the final colored payoff hold (progress > 0.78)
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

      {scene.id === 6 && <QuizOverlay />}
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
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
    <circle
      cx="48"
      cy="48"
      r="44"
      fill={accent}
      stroke="#18181B"
      strokeWidth="3"
    />
    {/* Coat shoulders */}
    <path
      d="M22 84 C24 65, 72 65, 74 84"
      fill={coatColor}
      stroke="#18181B"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    {/* Stethoscope */}
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
    {/* Round white doodle head */}
    <circle
      cx="48"
      cy="43"
      r="22"
      fill="#FFFFFF"
      stroke="#18181B"
      strokeWidth="3.2"
    />
    {/* Signature dot eyes & warm smile */}
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
 * Custom-coded Brand Scene (50.70s – 57.50s = 6.80s):
 * "And if you want a doctor's guidance, Core Age RX connects you with U.S. doctors online. Definitely check them out."
 * Phase 1: Browser window rises, user types "CoreAge RX" into search bar & clicks result.
 * Phase 2: CoreAge RX Telehealth Platform springs open showing verified U.S. doctors online + CTA pulse.
 */
const CoreAgeRxScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps; // 0.00s -> 6.80s (global 50.70s -> 57.50s)

  // Window entrance
  const winSpring = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 180, mass: 0.8 },
  });
  const winY = interpolate(winSpring, [0, 1], [70, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const winOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Typing "CoreAge RX" from localT 1.55s (52.25s) -> 2.80s (53.50s)
  const query = "CoreAge RX";
  const typedCount = Math.floor(
    interpolate(localT, [1.55, 2.75], [0, query.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedText = query.slice(0, typedCount);
  const caretVisible = Math.floor(frame / 10) % 2 === 0;

  // Click happens at localT = 3.10s (global 53.80s -> right on "RX connects")
  const clickFrame = Math.round(3.1 * fps);
  const isPlatformOpen = frame >= clickFrame + 3;

  const searchClickScale = interpolate(
    frame,
    [clickFrame - 2, clickFrame + 1, clickFrame + 4],
    [1, 0.96, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Platform reveal spring
  const platformSpring = spring({
    frame: Math.max(0, frame - (clickFrame + 3)),
    fps,
    config: { damping: 17, stiffness: 195, mass: 0.75 },
  });

  // CTA highlight on "Definitely check them out" (global 56.19s -> localT 5.49s)
  const ctaPulse = interpolate(
    localT,
    [5.35, 5.65, 5.95, 6.25],
    [1, 1.045, 1.01, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Animated pointer cursor coordinates
  const cursorX = interpolate(
    localT,
    [0.8, 2.75, 3.08, 5.2, 5.65],
    [830, 770, 620, 760, 540],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    }
  );
  const cursorY = interpolate(
    localT,
    [0.8, 2.75, 3.08, 5.2, 5.65],
    [980, 660, 608, 1080, 1265],
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
      Math.round(5.65 * fps) - 2,
      Math.round(5.65 * fps) + 2,
      Math.round(5.65 * fps) + 6,
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
      delay: 6,
    },
    {
      name: "Dr. James Carter, MD",
      role: "Licensed U.S. Physician · Telehealth",
      coat: "#84E4B8",
      bg: "#E9FBF3",
      delay: 13,
    },
    {
      name: "Dr. Elena Brooks, DO",
      role: "Weight & Longevity Specialist · U.S.",
      coat: "#C9AEFF",
      bg: "#F3EEFF",
      delay: 20,
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
      {/* Clean whiteboard-friendly dot grid + soft pastel aura */}
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

      <KickerBadge label="DOCTOR-GUIDED CARE" accent="#84E4B8" />

      {/* Main Browser / Telehealth Card Container */}
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
        {/* Browser Chrome Header */}
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
            <span>{isPlatformOpen ? "coreagerx.com" : "search · healthcare"}</span>
          </div>

          <div style={{ width: 58 }} />
        </div>

        {/* Browser Body: Phase 1 (Search Typing) vs Phase 2 (CoreAge RX Platform) */}
        {!isPlatformOpen ? (
          <div style={{ padding: "56px 44px 64px" }}>
            {/* Cute doodle helper badge */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 34,
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
                Looking for medical guidance?
              </div>
            </div>

            {/* Search Input Box */}
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
                {/* Search Icon SVG */}
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
                  {typedText || "Search U.S. telehealth..."}
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

            {/* Live Autocomplete Suggestions */}
            {typedCount >= 2 && (
              <div
                style={{
                  marginTop: 18,
                  borderRadius: 22,
                  border: "3px solid #18181B",
                  backgroundColor: "#F8FAFC",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 26px",
                    backgroundColor:
                      localT >= 2.85 ? "#EEF2FF" : "#FFFFFF",
                    borderBottom: "2px solid #E2E8F0",
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
                      CoreAge RX — U.S. Doctors Online
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
                <div
                  style={{
                    padding: "16px 26px",
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: "#64748B",
                  }}
                >
                  CoreAge RX medical weight management consultations
                </div>
              </div>
            )}
          </div>
        ) : (
          /* PHASE 2: CoreAge RX Platform Card */
          <div
            style={{
              padding: "38px 38px 42px",
              transform: `scale(${interpolate(
                platformSpring,
                [0, 1],
                [0.95, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )})`,
            }}
          >
            {/* Brand Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 28,
                paddingBottom: 22,
                borderBottom: "2.5px solid #E2E8F0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    backgroundColor: "#6366F1",
                    border: "3px solid #18181B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Medical Cross */}
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
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
                      fontSize: 40,
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
                    Online Telehealth · Nationwide U.S.
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
                ✓ U.S. Licensed
              </div>
            </div>

            {/* 3 Doodle U.S. Doctor Cards */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                marginBottom: 30,
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
                  config: { damping: 16, stiffness: 210, mass: 0.7 },
                });
                const cardX = interpolate(s, [0, 1], [40, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const cardOpacity = interpolate(cardAppear, [0, 6], [0, 1], {
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
                      padding: "16px 22px",
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
                            marginTop: 4,
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

            {/* Bottom CTA Banner ("Definitely check them out") */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
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
                Connect With U.S. Doctors at CoreAge RX →
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
// WORD-TIMED SHORTS CAPTIONS (WHITEBOARD MARKER HIGHLIGHT STYLE)
// =============================================================================
const DynamicCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

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

  // Pick single active spoken word cleanly so two words never highlight at once
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

/** Subtle bottom-safe progress bar above YouTube Shorts UI */
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
// ROOT COMPOSITION (1080x1920 @ 30fps, 2048 FRAMES = 68.27s)
// =============================================================================
export default function CoreAgeRxVisceralFatShort() {
  const { fps, durationInFrames } = useVideoConfig();

  const coreAgeStartFrame = Math.round(50.7 * fps);
  const coreAgeEndFrame = Math.round(57.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {/* 1. All 14 Whiteboard MP4 Drawing Clips (speed-matched to never cut before colored payoff) */}
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

      {/* 2. Custom-Coded Interactive CoreAge RX Search & U.S. Doctors Platform Scene (50.70s - 57.50s) */}
      <Sequence
        from={coreAgeStartFrame}
        durationInFrames={coreAgeEndFrame - coreAgeStartFrame}
        name="CoreAgeRX-Interactive-UI"
      >
        <CoreAgeRxScene />
      </Sequence>

      {/* 3. Word-Exact Dynamic Captions & Subtle Progress Strip */}
      {SHOW_CAPTIONS && <DynamicCaptions />}
      <TopProgressStrip />

      {/* 4. Master Voiceover */}
      <Audio src={VOICE_URL} volume={1} />

      {/* 5. Quiet Documentary Pluck Underscore (softly ducks on payoff & fades out cleanly) */}
      <Audio
        src={MUSIC_URL}
        loop
        volume={(f) => {
          const sec = f / fps;
          const endSec = durationInFrames / fps;
          const fadeOut = interpolate(sec, [endSec - 1.4, endSec], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const payoffDuck =
            sec >= 57.4 && sec <= 61.2 ? 0.68 : 1;
          return MUSIC_BASE_VOLUME * payoffDuck * fadeOut;
        }}
      />

      {/* 6. Tactile Story & UI Sound Effects */}
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
