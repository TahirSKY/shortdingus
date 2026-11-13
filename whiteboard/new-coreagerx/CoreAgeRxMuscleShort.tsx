/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 2544, "width": 1080, "height": 1920 } */
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

const SHOW_CAPTIONS = true;
const PENCIL_CLIP_VOLUME = 0.03;
const MUSIC_BASE_VOLUME = 0.06;

const HUB = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=";
const VOICE_URL = `${HUB}daefd336-4538-4048-ab67-6658c34b7b16`;
const MUSIC_A_URL = `${HUB}f4a1ed94-671d-4de6-ba60-43370bfafe68`;
const MUSIC_B_URL = `${HUB}6352a623-f2b1-490f-a85c-76c4eb683b34`;

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
  { id: 1, start: 0.0, end: 4.15, clipUrl: `${HUB}e970164e-1b57-455d-abc2-4ee498f4c332`, clipDuration: 8.23, kicker: "WEIGHT LOSS DESERVES ATTENTION", accent: "#FFD45E" },
  { id: 2, start: 4.15, end: 8.6, clipUrl: `${HUB}f57e1b7b-ca8e-4595-b7bf-8ed3833b96ee`, clipDuration: 7.55, kicker: "NOT JUST FAT ALONE", accent: "#FF8E7A" },
  { id: 3, start: 8.6, end: 12.2, clipUrl: `${HUB}15d45a0e-f1c1-4f5b-9b7e-a82d7b196cbf`, clipDuration: 5.77, kicker: "YOU CAN LOSE MUSCLE TOO", accent: "#FF8E7A" },
  { id: 4, start: 12.2, end: 16.98, clipUrl: `${HUB}908dc58c-6a26-4599-a5bb-b3a46bbc0b54`, clipDuration: 7.89, kicker: "BEYOND LOOKING ATHLETIC", accent: "#84E4B8" },
  { id: 5, start: 16.98, end: 21.65, clipUrl: `${HUB}c45b611d-2c37-4e13-b882-670705a5c7e4`, clipDuration: 8.34, kicker: "EVERYDAY LIFE AND METABOLIC HEALTH", accent: "#C9AEFF" },
  { id: 6, start: 24.3, end: 31.8, clipUrl: `${HUB}9cc198f7-0e43-4633-b737-4e4b056a3ffc`, clipDuration: 7.2, kicker: "GLP-1 APPETITE AND STOMACH PACE", accent: "#7CC8F8" },
  { id: 7, start: 31.8, end: 38.95, clipUrl: `${HUB}e7eaf133-968c-40d8-8529-130c91f78f4f`, clipDuration: 8.59, kicker: "QUALITY OF WEIGHT LOST", accent: "#FFD45E" },
  { id: 8, start: 50.0, end: 57.35, clipUrl: `${HUB}01cd2172-eb22-4411-9325-cd9f59f276d0`, clipDuration: 10.23, kicker: "NUTRITION PROTEIN RESISTANCE", accent: "#84E4B8" },
  { id: 9, start: 57.35, end: 64.75, clipUrl: `${HUB}cfedf07e-4c28-4d8d-8a4d-68971485c0d7`, clipDuration: 8.25, kicker: "QUESTIONS FOR YOUR PROVIDER", accent: "#7CC8F8" },
  { id: 10, start: 76.1, end: 81.5, clipUrl: `${HUB}6e5df87c-d9ca-48bf-bbac-b9a3ac2f6035`, clipDuration: 8.9, kicker: "CARE FOR HEALTH ALONG THE WAY", accent: "#84E4B8" },
];

interface WordTiming { w: string; s: number; e: number; hi?: string; }
const WORDS: WordTiming[] = [
  { w: "Here's", s: 0.176, e: 0.48 },
  { w: "something", s: 0.561, e: 0.769 },
  { w: "about", s: 0.817, e: 1.057 },
  { w: "weight", s: 1.057, e: 1.234, hi: "#FFD45E" },
  { w: "loss", s: 1.234, e: 1.426, hi: "#FFD45E" },
  { w: "that", s: 1.554, e: 1.65 },
  { w: "deserves", s: 1.699, e: 2.083 },
  { w: "way", s: 2.436, e: 2.548 },
  { w: "more", s: 2.772, e: 2.949 },
  { w: "attention.", s: 3.141, e: 3.446, hi: "#FFD45E" },
  { w: "When", s: 4.279, e: 4.391 },
  { w: "you", s: 4.439, e: 4.6 },
  { w: "lose", s: 4.6, e: 4.808 },
  { w: "weight,", s: 4.84, e: 5.161 },
  { w: "your", s: 5.401, e: 5.529 },
  { w: "body", s: 5.561, e: 5.85 },
  { w: "doesn't", s: 5.882, e: 6.331 },
  { w: "automatically", s: 6.347, e: 6.892 },
  { w: "lose", s: 6.924, e: 7.132 },
  { w: "fat", s: 7.244, e: 7.533, hi: "#FFD45E" },
  { w: "and", s: 7.565, e: 7.629 },
  { w: "nothing", s: 7.661, e: 7.854 },
  { w: "else.", s: 7.966, e: 8.174 },
  { w: "You", s: 8.767, e: 8.815 },
  { w: "can", s: 8.911, e: 9.072 },
  { w: "lose", s: 9.072, e: 9.216 },
  { w: "muscle", s: 9.264, e: 9.777, hi: "#FF8E7A" },
  { w: "too.", s: 9.809, e: 9.985 },
  { w: "And", s: 10.691, e: 10.819 },
  { w: "that's", s: 10.851, e: 11.091 },
  { w: "a", s: 11.091, e: 11.107 },
  { w: "big", s: 11.252, e: 11.412, hi: "#FF8E7A" },
  { w: "deal.", s: 11.476, e: 11.684, hi: "#FF8E7A" },
  { w: "Because", s: 12.358, e: 12.582 },
  { w: "muscle", s: 12.614, e: 13.079, hi: "#FF8E7A" },
  { w: "isn't", s: 13.111, e: 13.319 },
  { w: "just", s: 13.319, e: 13.512 },
  { w: "about", s: 13.512, e: 13.688 },
  { w: "looking", s: 13.816, e: 14.089 },
  { w: "athletic.", s: 14.201, e: 14.682 },
  { w: "It", s: 15.163, e: 15.243 },
  { w: "helps", s: 15.243, e: 15.483 },
  { w: "you", s: 15.483, e: 15.547 },
  { w: "move,", s: 15.659, e: 15.788 },
  { w: "maintain", s: 16.124, e: 16.525 },
  { w: "strength,", s: 16.525, e: 16.958, hi: "#FF8E7A" },
  { w: "perform", s: 17.342, e: 17.631 },
  { w: "everyday", s: 17.807, e: 18.144 },
  { w: "activities,", s: 18.144, e: 18.673 },
  { w: "and", s: 19.186, e: 19.41 },
  { w: "supports", s: 19.41, e: 19.827 },
  { w: "your", s: 19.827, e: 19.923 },
  { w: "overall", s: 20.051, e: 20.324 },
  { w: "metabolic", s: 20.324, e: 20.853, hi: "#C9AEFF" },
  { w: "health.", s: 20.853, e: 21.061, hi: "#84E4B8" },
  { w: "Now,", s: 21.83, e: 21.943 },
  { w: "here's", s: 22.327, e: 22.616 },
  { w: "where", s: 22.616, e: 22.712 },
  { w: "things", s: 22.712, e: 22.92 },
  { w: "get", s: 22.952, e: 23.177 },
  { w: "interesting.", s: 23.273, e: 23.626, hi: "#FFD45E" },
  { w: "GLP-1", s: 24.379, e: 24.988, hi: "#7CC8F8" },
  { w: "medications", s: 25.02, e: 25.645, hi: "#7CC8F8" },
  { w: "can", s: 25.757, e: 25.902 },
  { w: "help", s: 25.902, e: 26.11 },
  { w: "eligible", s: 26.238, e: 26.639, hi: "#7CC8F8" },
  { w: "people", s: 26.639, e: 26.96 },
  { w: "manage", s: 26.96, e: 27.344 },
  { w: "their", s: 27.36, e: 27.472 },
  { w: "weight.", s: 27.505, e: 27.745 },
  { w: "Partly", s: 28.082, e: 28.451 },
  { w: "by", s: 28.547, e: 28.692 },
  { w: "affecting", s: 28.708, e: 29.013 },
  { w: "appetite", s: 29.189, e: 29.751, hi: "#C9AEFF" },
  { w: "and", s: 29.751, e: 29.896 },
  { w: "how", s: 30.008, e: 30.201 },
  { w: "quickly", s: 30.249, e: 30.57 },
  { w: "the", s: 30.57, e: 30.666 },
  { w: "stomach", s: 30.666, e: 31.036, hi: "#C9AEFF" },
  { w: "empties.", s: 31.036, e: 31.309 },
  { w: "But", s: 32.015, e: 32.127 },
  { w: "losing", s: 32.32, e: 32.545 },
  { w: "weight", s: 32.657, e: 32.978, hi: "#FFD45E" },
  { w: "isn't", s: 32.994, e: 33.203 },
  { w: "the", s: 33.219, e: 33.364 },
  { w: "only", s: 33.444, e: 33.669 },
  { w: "thing", s: 33.845, e: 33.909 },
  { w: "worth", s: 34.022, e: 34.198 },
  { w: "paying", s: 34.247, e: 34.391 },
  { w: "attention", s: 34.439, e: 34.792 },
  { w: "to.", s: 34.824, e: 34.969 },
  { w: "How", s: 35.691, e: 35.9 },
  { w: "much", s: 36.029, e: 36.237 },
  { w: "of", s: 36.285, e: 36.398 },
  { w: "that", s: 36.43, e: 36.542 },
  { w: "weight", s: 36.59, e: 36.831, hi: "#FFD45E" },
  { w: "you're", s: 36.831, e: 36.912 },
  { w: "losing", s: 36.912, e: 37.201 },
  { w: "is", s: 37.538, e: 37.602 },
  { w: "also", s: 37.779, e: 38.035 },
  { w: "important.", s: 38.035, e: 38.453, hi: "#FFD45E" },
  { w: "Research", s: 39.223, e: 39.561, hi: "#7CC8F8" },
  { w: "has", s: 39.561, e: 39.689 },
  { w: "found", s: 39.721, e: 39.946 },
  { w: "that", s: 39.946, e: 40.058 },
  { w: "weight", s: 40.106, e: 40.235, hi: "#FFD45E" },
  { w: "loss", s: 40.283, e: 40.524, hi: "#FFD45E" },
  { w: "during", s: 40.524, e: 40.652 },
  { w: "treatment", s: 40.765, e: 41.134 },
  { w: "can", s: 41.311, e: 41.439 },
  { w: "include", s: 41.487, e: 41.856 },
  { w: "reductions", s: 41.872, e: 42.386 },
  { w: "in", s: 42.45, e: 42.499 },
  { w: "lean", s: 42.611, e: 42.82, hi: "#FF8E7A" },
  { w: "body", s: 42.852, e: 43.157 },
  { w: "mass,", s: 43.157, e: 43.382, hi: "#FF8E7A" },
  { w: "not", s: 43.895, e: 44.136 },
  { w: "just", s: 44.136, e: 44.329 },
  { w: "body", s: 44.377, e: 44.554 },
  { w: "fat.", s: 44.618, e: 44.826 },
  { w: "That's", s: 45.581, e: 45.822 },
  { w: "why", s: 45.822, e: 46.079 },
  { w: "a", s: 46.143, e: 46.223 },
  { w: "thoughtful", s: 46.223, e: 46.705 },
  { w: "weight", s: 46.705, e: 46.946, hi: "#FFD45E" },
  { w: "management", s: 46.946, e: 47.411 },
  { w: "plan", s: 47.411, e: 47.62 },
  { w: "should", s: 47.829, e: 48.005 },
  { w: "look", s: 48.053, e: 48.166 },
  { w: "beyond", s: 48.23, e: 48.728 },
  { w: "the", s: 48.728, e: 48.808 },
  { w: "number", s: 48.808, e: 49.097 },
  { w: "on", s: 49.097, e: 49.177 },
  { w: "the", s: 49.177, e: 49.257 },
  { w: "scale.", s: 49.257, e: 49.546, hi: "#FFD45E" },
  { w: "Adequate", s: 50.221, e: 50.558 },
  { w: "nutrition,", s: 50.558, e: 51.088, hi: "#84E4B8" },
  { w: "enough", s: 51.441, e: 51.666 },
  { w: "protein,", s: 51.682, e: 52.195, hi: "#84E4B8" },
  { w: "and", s: 52.549, e: 52.709 },
  { w: "resistance", s: 52.709, e: 53.127, hi: "#84E4B8" },
  { w: "training", s: 53.127, e: 53.416, hi: "#84E4B8" },
  { w: "can", s: 53.528, e: 53.689 },
  { w: "all", s: 53.833, e: 53.913 },
  { w: "play", s: 53.913, e: 54.17 },
  { w: "important", s: 54.17, e: 54.716 },
  { w: "roles", s: 54.716, e: 55.021 },
  { w: "in", s: 55.133, e: 55.182 },
  { w: "helping", s: 55.198, e: 55.471 },
  { w: "preserve", s: 55.535, e: 55.904, hi: "#84E4B8" },
  { w: "muscle", s: 55.936, e: 56.241, hi: "#FF8E7A" },
  { w: "during", s: 56.241, e: 56.386 },
  { w: "weight", s: 56.498, e: 56.61, hi: "#FFD45E" },
  { w: "loss.", s: 56.659, e: 56.867 },
  { w: "And", s: 57.606, e: 57.83 },
  { w: "if", s: 58.087, e: 58.183 },
  { w: "you're", s: 58.183, e: 58.343 },
  { w: "considering", s: 58.343, e: 58.792 },
  { w: "GLP-1", s: 58.888, e: 59.417, hi: "#7CC8F8" },
  { w: "treatment,", s: 59.465, e: 59.946, hi: "#7CC8F8" },
  { w: "these", s: 60.187, e: 60.395 },
  { w: "are", s: 60.491, e: 60.652 },
  { w: "exactly", s: 60.652, e: 61.197 },
  { w: "the", s: 61.229, e: 61.309 },
  { w: "kinds", s: 61.309, e: 61.549 },
  { w: "of", s: 61.549, e: 61.613 },
  { w: "questions", s: 61.629, e: 62.126 },
  { w: "worth", s: 62.174, e: 62.399 },
  { w: "discussing", s: 62.415, e: 62.8 },
  { w: "with", s: 62.832, e: 62.944 },
  { w: "a", s: 62.976, e: 63.056 },
  { w: "qualified", s: 63.056, e: 63.441, hi: "#7CC8F8" },
  { w: "healthcare", s: 63.457, e: 63.794, hi: "#7CC8F8" },
  { w: "provider.", s: 63.794, e: 64.21, hi: "#7CC8F8" },
  { w: "CoreAge", s: 64.996, e: 65.188, hi: "#84E4B8" },
  { w: "RX", s: 65.3, e: 65.942, hi: "#84E4B8" },
  { w: "offers", s: 66.022, e: 66.246 },
  { w: "online", s: 66.423, e: 66.647, hi: "#84E4B8" },
  { w: "access", s: 66.743, e: 67.032 },
  { w: "to", s: 67.16, e: 67.256 },
  { w: "weight", s: 67.304, e: 67.432, hi: "#FFD45E" },
  { w: "management", s: 67.481, e: 67.913 },
  { w: "treatments", s: 67.945, e: 68.426 },
  { w: "through", s: 68.426, e: 68.539 },
  { w: "its", s: 68.539, e: 68.667 },
  { w: "healthcare", s: 68.667, e: 69.003, hi: "#7CC8F8" },
  { w: "platform.", s: 69.003, e: 69.468, hi: "#84E4B8" },
  { w: "But", s: 70.11, e: 70.222 },
  { w: "remember,", s: 70.27, e: 70.687 },
  { w: "treatment", s: 70.831, e: 71.312 },
  { w: "isn't", s: 71.328, e: 71.552 },
  { w: "one-size-fits-all.", s: 71.633, e: 72.354, hi: "#FF8E7A" },
  { w: "A", s: 72.691, e: 72.739 },
  { w: "licensed", s: 72.771, e: 73.171, hi: "#7CC8F8" },
  { w: "provider", s: 73.171, e: 73.652 },
  { w: "needs", s: 73.652, e: 73.861 },
  { w: "to", s: 73.893, e: 73.973 },
  { w: "determine", s: 73.973, e: 74.39 },
  { w: "whether", s: 74.454, e: 74.678 },
  { w: "it's", s: 74.694, e: 74.791 },
  { w: "appropriate", s: 74.791, e: 75.32, hi: "#7CC8F8" },
  { w: "for", s: 75.32, e: 75.416 },
  { w: "you.", s: 75.416, e: 75.624 },
  { w: "Because", s: 76.281, e: 76.506 },
  { w: "the", s: 76.538, e: 76.618 },
  { w: "goal", s: 76.618, e: 76.73 },
  { w: "shouldn't", s: 76.842, e: 77.115 },
  { w: "simply", s: 77.115, e: 77.484 },
  { w: "be", s: 77.484, e: 77.644 },
  { w: "to", s: 77.644, e: 77.804 },
  { w: "weigh", s: 77.804, e: 78.061 },
  { w: "less.", s: 78.125, e: 78.349 },
  { w: "It", s: 78.959, e: 79.023 },
  { w: "should", s: 79.023, e: 79.167 },
  { w: "be", s: 79.183, e: 79.279 },
  { w: "to", s: 79.423, e: 79.648 },
  { w: "take", s: 79.648, e: 79.824 },
  { w: "care", s: 79.824, e: 80.033 },
  { w: "of", s: 80.081, e: 80.209 },
  { w: "your", s: 80.209, e: 80.289 },
  { w: "health", s: 80.289, e: 80.546 },
  { w: "along", s: 80.61, e: 80.754 },
  { w: "the", s: 80.786, e: 80.866 },
  { w: "way.", s: 80.866, e: 81.027 },
  { w: "Learn", s: 81.748, e: 81.956 },
  { w: "more", s: 81.988, e: 82.101 },
  { w: "about", s: 82.229, e: 82.453 },
  { w: "CoreAge", s: 82.469, e: 82.662, hi: "#84E4B8" },
  { w: "RX.", s: 82.71, e: 83.287, hi: "#84E4B8" },
];

interface CaptionGroup { start: number; end: number; words: WordTiming[]; }
const CAPTION_GROUPS: CaptionGroup[] = (() => {
  const groups: CaptionGroup[] = [];
  let bucket: WordTiming[] = [];
  for (let i = 0; i < WORDS.length; i++) {
    const cur = WORDS[i];
    const prev = bucket[bucket.length - 1];
    const gap = prev ? cur.s - prev.e : 0;
    const endsSentence = prev ? /[.?!:]$/.test(prev.w) : false;
    const charLen = bucket.reduce((acc, item) => acc + item.w.length + 1, 0);
    if (bucket.length > 0 && (gap > 0.28 || endsSentence || bucket.length >= 4 || charLen + cur.w.length > 22)) {
      groups.push({ start: bucket[0].s, end: bucket[bucket.length - 1].e, words: bucket });
      bucket = [];
    }
    bucket.push(cur);
  }
  if (bucket.length > 0) groups.push({ start: bucket[0].s, end: bucket[bucket.length - 1].e, words: bucket });
  return groups;
})();

interface SfxCue { at: number; src: string; vol: number; dur?: number; }
const SFX_CUES: SfxCue[] = [
  { at: 0.2, src: SFX.pop, vol: 0.22 },
  { at: 4.17, src: SFX.whoosh, vol: 0.18 },
  { at: 8.62, src: SFX.impact, vol: 0.24 },
  { at: 12.22, src: SFX.whoosh, vol: 0.18 },
  { at: 17.0, src: SFX.sparkle, vol: 0.2 },
  { at: 21.67, src: SFX.whoosh, vol: 0.22 },
  { at: 22.4, src: SFX.pop, vol: 0.24 },
  { at: 24.32, src: SFX.whoosh, vol: 0.18 },
  { at: 28.1, src: SFX.chime, vol: 0.2 },
  { at: 31.82, src: SFX.whoosh, vol: 0.18 },
  { at: 38.97, src: SFX.riser, vol: 0.22 },
  { at: 39.3, src: SFX.typing, vol: 0.28, dur: 1.2 },
  { at: 43.9, src: SFX.stamp, vol: 0.26 },
  { at: 45.4, src: SFX.whoosh, vol: 0.2 },
  { at: 50.02, src: SFX.whoosh, vol: 0.18 },
  { at: 53.6, src: SFX.chime, vol: 0.2 },
  { at: 57.37, src: SFX.whoosh, vol: 0.18 },
  { at: 64.77, src: SFX.whoosh, vol: 0.22 },
  { at: 65.1, src: SFX.typing, vol: 0.3, dur: 1.0 },
  { at: 66.2, src: SFX.click, vol: 0.28 },
  { at: 66.4, src: SFX.pop, vol: 0.24 },
  { at: 70.02, src: SFX.impact, vol: 0.24 },
  { at: 71.7, src: SFX.stamp, vol: 0.24 },
  { at: 76.12, src: SFX.whoosh, vol: 0.18 },
  { at: 81.52, src: SFX.whoosh, vol: 0.22 },
  { at: 82.0, src: SFX.chime, vol: 0.24 },
  { at: 83.2, src: SFX.click, vol: 0.26 },
];

const FONT_SANS = '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_MONO = '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

const KickerBadge: React.FC<{ label: string; accent: string }> = ({ label, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 18, stiffness: 210, mass: 0.7 } });
  const y = interpolate(pop, [0, 1], [-18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 74, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", opacity, transform: `translateY(${y}px)` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 24px", borderRadius: 999, backgroundColor: "#FFFFFF", border: "2.5px solid #18181B", boxShadow: "0 6px 18px rgba(24, 24, 27, 0.08)" }}>
        <span style={{ width: 13, height: 13, borderRadius: "50%", backgroundColor: accent, border: "2px solid #18181B" }} />
        <span style={{ fontFamily: FONT_SANS, fontSize: 23, fontWeight: 800, letterSpacing: "0.08em", color: "#18181B" }}>{label}</span>
      </div>
    </div>
  );
};

const WhiteboardClipScene: React.FC<{ scene: WhiteboardSceneSpec }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sceneSeconds = durationInFrames / fps;
  const playbackRate = Number(Math.max(0.5, (scene.clipDuration - 0.08) / sceneSeconds).toFixed(4));
  const progress = frame / Math.max(1, durationInFrames - 1);
  const enterOpacity = scene.id === 1 ? 1 : interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const payoffZoom = interpolate(progress, [0, 0.78, 1], [1, 1, 1.028], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: enterOpacity }}>
      <AbsoluteFill style={{ transform: `scale(${payoffZoom})`, transformOrigin: "50% 46%" }}>
        <OffthreadVideo src={scene.clipUrl} playbackRate={playbackRate} muted={PENCIL_CLIP_VOLUME <= 0} volume={PENCIL_CLIP_VOLUME} style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#FFFFFF" }} />
      </AbsoluteFill>
      {scene.kicker && <KickerBadge label={scene.kicker} accent={scene.accent || "#7CC8F8"} />}
    </AbsoluteFill>
  );
};

const DoodleDoctorAvatar: React.FC<{ coatColor: string; accent: string }> = ({ coatColor, accent }) => (
  <svg width="92" height="92" viewBox="0 0 96 96" fill="none">
    <circle cx="48" cy="48" r="44" fill={accent} stroke="#18181B" strokeWidth="3" />
    <path d="M22 84 C24 65, 72 65, 74 84" fill={coatColor} stroke="#18181B" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M36 67 C36 78, 60 78, 60 67" stroke="#18181B" strokeWidth="2.8" fill="none" />
    <circle cx="54" cy="77" r="4.5" fill="#FFD45E" stroke="#18181B" strokeWidth="2.5" />
    <circle cx="48" cy="43" r="22" fill="#FFFFFF" stroke="#18181B" strokeWidth="3.2" />
    <circle cx="40.5" cy="41" r="2.8" fill="#18181B" />
    <circle cx="55.5" cy="41" r="2.8" fill="#18181B" />
    <path d="M41.5 49.5 Q48 55 54.5 49.5" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" fill="none" />
  </svg>
);

const InterestingPivotScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const pop = spring({ frame, fps, config: { damping: 16, stiffness: 200, mass: 0.7 } });
  const cardY = interpolate(pop, [0, 1], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glpIn = interpolate(localT, [1.35, 1.75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glpY = interpolate(localT, [1.35, 1.75], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const balanceTilt = interpolate(localT, [0.4, 1.2], [-4, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#D4D8E2 1.8px, transparent 1.8px)", backgroundSize: "34px 34px", opacity: 0.55 }} />
      <KickerBadge label="THE PIVOT" accent="#FFD45E" />
      <div style={{ position: "absolute", top: 230, left: 64, right: 64, transform: `translateY(${cardY}px)`, opacity: cardOpacity, backgroundColor: "#FFFFFF", borderRadius: 34, border: "3.5px solid #18181B", boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)", padding: "48px 40px 44px", textAlign: "center" }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 800, letterSpacing: "0.14em", color: "#64748B" }}>NOW, HERE IS WHERE THINGS GET</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 92, fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.04em", color: "#18181B", marginTop: 16 }}>INTERESTING<span style={{ color: "#FF8E7A" }}>.</span></div>
        <div style={{ marginTop: 36, display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `rotate(${balanceTilt}deg)`, display: "flex", alignItems: "center", gap: 18, padding: "18px 28px", borderRadius: 24, backgroundColor: "#FFF6D6", border: "3px solid #18181B" }}>
            <span style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 900, color: "#18181B" }}>FAT</span>
            <span style={{ width: 54, height: 6, borderRadius: 999, backgroundColor: "#18181B" }} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 900, color: "#18181B" }}>MUSCLE</span>
          </div>
        </div>
        <div style={{ opacity: glpIn, transform: `translateY(${glpY}px)`, marginTop: 28, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 30px", borderRadius: 999, backgroundColor: "#EAF6FF", border: "3px solid #18181B" }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#7CC8F8", border: "2px solid #18181B" }} />
            <span style={{ fontFamily: FONT_SANS, fontSize: 34, fontWeight: 900, color: "#18181B" }}>GLP-1</span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 700, color: "#475569" }}>comes next</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ResearchBeyondScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const isStageB = localT >= 6.4;
  const stageBLocal = Math.max(0, localT - 6.4);
  const fatH = interpolate(localT, [0.6, 3.2], [340, 190], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const leanH = interpolate(localT, [0.9, 3.8], [340, 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const stampScale = interpolate(localT, [4.55, 4.95], [1.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampOpacity = interpolate(localT, [4.55, 4.75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scaleX = interpolate(stageBLocal, [0, 0.9], [0, -260], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pillars = [
    { title: "MUSCLE", sub: "Preserve lean mass", bg: "#FFEAE5", accent: "#FF8E7A" },
    { title: "STRENGTH", sub: "Move with confidence", bg: "#E9FBF3", accent: "#84E4B8" },
    { title: "METABOLIC HEALTH", sub: "Support overall health", bg: "#F3EEFF", accent: "#C9AEFF" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#D4D8E2 1.8px, transparent 1.8px)", backgroundSize: "34px 34px", opacity: 0.55 }} />
      <KickerBadge label={isStageB ? "BEYOND THE SCALE" : "CLINICAL RESEARCH"} accent={isStageB ? "#84E4B8" : "#7CC8F8"} />
      {!isStageB ? (
        <div style={{ position: "absolute", top: 210, left: 64, right: 64, backgroundColor: "#FFFFFF", borderRadius: 34, border: "3.5px solid #18181B", boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)", padding: "40px 40px 44px" }}>
          <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 800, letterSpacing: "0.12em", color: "#64748B", textAlign: "center" }}>RESEARCH HAS FOUND</div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 44, fontWeight: 900, lineHeight: 1.12, color: "#18181B", textAlign: "center", marginTop: 12 }}>Weight loss can include<br />reductions in lean mass</div>
          <div style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 48, alignItems: "flex-end", height: 380 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 190, height: fatH, borderRadius: "22px 22px 12px 12px", backgroundColor: "#FFD45E", border: "3.5px solid #18181B" }} />
              <span style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 900, color: "#18181B" }}>BODY FAT</span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 22, fontWeight: 700, color: "#64748B" }}>down arrow</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 190, height: leanH, borderRadius: "22px 22px 12px 12px", backgroundColor: "#FF8E7A", border: "3.5px solid #18181B" }} />
              <span style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 900, color: "#18181B" }}>LEAN MASS</span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 22, fontWeight: 700, color: "#64748B" }}>also down</span>
            </div>
          </div>
          <div style={{ opacity: stampOpacity, transform: `scale(${stampScale}) rotate(-6deg)`, marginTop: 28, display: "flex", justifyContent: "center" }}>
            <div style={{ padding: "14px 34px", borderRadius: 16, backgroundColor: "#18181B", color: "#FFFFFF", fontFamily: FONT_SANS, fontSize: 32, fontWeight: 900, letterSpacing: "0.06em" }}>NOT JUST BODY FAT</div>
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", top: 210, left: 64, right: 64 }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 34, border: "3.5px solid #18181B", boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)", padding: "36px 36px 30px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ transform: `translateX(${scaleX}px)`, padding: "16px 28px", borderRadius: 20, backgroundColor: "#F1F5F9", border: "3px solid #18181B", fontFamily: FONT_MONO, fontSize: 40, fontWeight: 800, color: "#18181B" }}>SCALE 000</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 34, fontWeight: 900, color: "#18181B", lineHeight: 1.1 }}>Look beyond<br />the number</div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            {pillars.map((p, i) => {
              const appear = Math.max(0, stageBLocal - 0.3 - i * 0.35);
              const s = spring({ frame: appear * fps, fps, config: { damping: 16, stiffness: 220, mass: 0.68 } });
              const x = interpolate(s, [0, 1], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const o = interpolate(appear, [0, 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ opacity: o, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 20, padding: "24px 28px", borderRadius: 26, backgroundColor: p.bg, border: "3.5px solid #18181B" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: p.accent, border: "3px solid #18181B" }} />
                  <div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 34, fontWeight: 900, color: "#18181B" }}>{p.title}</div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 700, color: "#475569", marginTop: 4 }}>{p.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const CoreAgeRxTelehealthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const isStageB = localT >= 5.25;
  const stageBLocal = Math.max(0, localT - 5.25);
  const query = "CoreAge RX";
  const typedCount = Math.floor(interpolate(localT, [0.3, 1.3], [0, query.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const typedText = query.slice(0, typedCount);
  const caretVisible = Math.floor(frame / 8) % 2 === 0;
  const clickFrame = Math.round(1.55 * fps);
  const isOpen = frame >= clickFrame + 3;
  const cursorX = interpolate(localT, [0.2, 1.25, 1.55, 3.2, 4.2], [840, 760, 625, 740, 545], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const cursorY = interpolate(localT, [0.2, 1.25, 1.55, 3.2, 4.2], [960, 640, 600, 1060, 1255], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const winOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const winY = interpolate(spring({ frame, fps, config: { damping: 18, stiffness: 195, mass: 0.75 } }), [0, 1], [65, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampOpacity = interpolate(stageBLocal, [1.1, 1.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampScale = interpolate(stageBLocal, [1.1, 1.5], [1.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: winOpacity, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#D4D8E2 1.8px, transparent 1.8px)", backgroundSize: "34px 34px", opacity: 0.55 }} />
      <KickerBadge label={isStageB ? "PERSONALIZED CARE" : "COREGAGE RX ONLINE"} accent="#84E4B8" />
      {!isStageB ? (
        <div style={{ position: "absolute", top: 195, left: 64, right: 64, transform: `translateY(${winY}px)`, backgroundColor: "#FFFFFF", borderRadius: 34, border: "3.5px solid #18181B", boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", backgroundColor: "#F8FAFC", borderBottom: "3px solid #18181B" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#FF8E7A", border: "2px solid #18181B" }} />
              <span style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#FFD45E", border: "2px solid #18181B" }} />
              <span style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#84E4B8", border: "2px solid #18181B" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 22px", borderRadius: 999, backgroundColor: "#FFFFFF", border: "2px solid #18181B", fontFamily: FONT_MONO, fontSize: 21, fontWeight: 700, color: "#18181B" }}>
              <span style={{ color: "#10B981" }}>●</span><span>{isOpen ? "coreagerx.com" : "search · telehealth"}</span>
            </div>
            <div style={{ width: 58 }} />
          </div>
          {!isOpen ? (
            <div style={{ padding: "48px 44px 56px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 30 }}>
                <DoodleDoctorAvatar coatColor="#7CC8F8" accent="#FFF6D6" />
                <div style={{ marginTop: 14, fontFamily: FONT_SANS, fontSize: 34, fontWeight: 800, color: "#18181B" }}>Online weight management</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px", borderRadius: 24, backgroundColor: "#FFFFFF", border: "3.5px solid #18181B" }}>
                <span style={{ fontFamily: FONT_SANS, fontSize: 40, fontWeight: 800, color: typedText ? "#18181B" : "#94A3B8" }}>{typedText || "Search CoreAge RX..."}{caretVisible ? <span style={{ display: "inline-block", width: 4, height: 40, marginLeft: 4, verticalAlign: "middle", backgroundColor: "#6366F1" }} /> : null}</span>
                <div style={{ padding: "12px 26px", borderRadius: 16, backgroundColor: typedCount >= 4 ? "#6366F1" : "#E2E8F0", border: "2.5px solid #18181B", fontFamily: FONT_SANS, fontSize: 24, fontWeight: 800, color: typedCount >= 4 ? "#FFFFFF" : "#64748B" }}>Search</div>
              </div>
              {typedCount >= 2 && (
                <div style={{ marginTop: 18, borderRadius: 22, border: "3px solid #18181B", backgroundColor: "#EEF2FF", padding: "20px 26px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 800, color: "#18181B" }}>CoreAge RX · Healthcare Platform</span>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 800, color: "#6366F1" }}>Open</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "36px 38px 40px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 20, borderBottom: "2.5px solid #E2E8F0" }}>
                <div style={{ fontFamily: FONT_SANS, fontSize: 39, fontWeight: 900, color: "#18181B" }}>CoreAge <span style={{ color: "#6366F1" }}>RX</span></div>
                <div style={{ padding: "10px 20px", borderRadius: 999, backgroundColor: "#E9FBF3", border: "2.5px solid #18181B", fontFamily: FONT_SANS, fontSize: 21, fontWeight: 800, color: "#18181B" }}>Online Access</div>
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 800, color: "#18181B", lineHeight: 1.3 }}>Weight management treatments through its healthcare platform.</div>
              <div style={{ marginTop: 24, display: "flex", gap: 14 }}>
                <div style={{ flex: 1, padding: "18px 20px", borderRadius: 20, backgroundColor: "#EAF6FF", border: "3px solid #18181B", fontFamily: FONT_SANS, fontSize: 24, fontWeight: 800, color: "#18181B", textAlign: "center" }}>Online visits</div>
                <div style={{ flex: 1, padding: "18px 20px", borderRadius: 20, backgroundColor: "#E9FBF3", border: "3px solid #18181B", fontFamily: FONT_SANS, fontSize: 24, fontWeight: 800, color: "#18181B", textAlign: "center" }}>Licensed care</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ position: "absolute", top: 210, left: 64, right: 64 }}>
          <div style={{ opacity: stampOpacity, transform: `scale(${stampScale}) rotate(-4deg)`, display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ padding: "16px 36px", borderRadius: 18, backgroundColor: "#18181B", color: "#FFFFFF", fontFamily: FONT_SANS, fontSize: 36, fontWeight: 900, letterSpacing: "0.04em" }}>NOT ONE-SIZE-FITS-ALL</div>
          </div>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 34, border: "3.5px solid #18181B", boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)", padding: "36px 36px 40px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}><DoodleDoctorAvatar coatColor="#84E4B8" accent="#EAF6FF" /></div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 38, fontWeight: 900, color: "#18181B", marginTop: 18, lineHeight: 1.15 }}>A licensed provider<br />determines appropriateness</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: "#475569", marginTop: 14, lineHeight: 1.4 }}>Personalized eligibility review for you.</div>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 12 }}>
              <span style={{ padding: "10px 22px", borderRadius: 999, backgroundColor: "#E9FBF3", border: "2.5px solid #18181B", fontFamily: FONT_SANS, fontSize: 22, fontWeight: 800, color: "#18181B" }}>1-on-1 review</span>
              <span style={{ padding: "10px 22px", borderRadius: 999, backgroundColor: "#FFF6D6", border: "2.5px solid #18181B", fontFamily: FONT_SANS, fontSize: 22, fontWeight: 800, color: "#18181B" }}>For you</span>
            </div>
          </div>
        </div>
      )}
      {!isStageB && (
        <div style={{ position: "absolute", left: cursorX, top: cursorY, transform: "scale(1)", transformOrigin: "top left", pointerEvents: "none" }}>
          <svg width="58" height="58" viewBox="0 0 36 36" fill="none"><path d="M7 4L29 16.5L18.5 19.5L14 30L7 4Z" fill="#18181B" stroke="#FFFFFF" strokeWidth="2.8" strokeLinejoin="round" /></svg>
        </div>
      )}
    </AbsoluteFill>
  );
};

const CoreAgeRxOutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localT = frame / fps;
  const pop = spring({ frame, fps, config: { damping: 16, stiffness: 200, mass: 0.7 } });
  const cardY = interpolate(pop, [0, 1], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaPulse = interpolate(localT, [1.6, 1.95, 2.3, 2.65], [1, 1.05, 1.01, 1.035], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(localT, [0.2, 1.4, 1.85], [840, 620, 540], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const cursorY = interpolate(localT, [0.2, 1.4, 1.85], [960, 980, 1180], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#D4D8E2 1.8px, transparent 1.8px)", backgroundSize: "34px 34px", opacity: 0.55 }} />
      <div style={{ position: "absolute", top: 260, left: 64, right: 64, transform: `translateY(${cardY}px)`, opacity: cardOpacity, backgroundColor: "#FFFFFF", borderRadius: 36, border: "3.5px solid #18181B", boxShadow: "0 24px 60px rgba(24, 24, 27, 0.12)", padding: "52px 40px 48px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><DoodleDoctorAvatar coatColor="#7CC8F8" accent="#E9FBF3" /></div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 800, letterSpacing: "0.14em", color: "#64748B", marginTop: 22 }}>LEARN MORE ABOUT</div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em", color: "#18181B", marginTop: 10, lineHeight: 1 }}>CoreAge <span style={{ color: "#6366F1" }}>RX</span></div>
        <div style={{ marginTop: 34, display: "flex", justifyContent: "center" }}>
          <div style={{ transform: `scale(${ctaPulse})`, padding: "20px 40px", borderRadius: 22, background: "linear-gradient(90deg, #6366F1 0%, #4DB8A8 100%)", border: "3px solid #18181B", fontFamily: FONT_SANS, fontSize: 32, fontWeight: 900, color: "#FFFFFF" }}>Learn more about CoreAge RX</div>
        </div>
        <div style={{ marginTop: 28, fontFamily: FONT_SANS, fontSize: 24, fontWeight: 700, color: "#475569" }}>Online healthcare platform · Licensed providers</div>
      </div>
      <div style={{ position: "absolute", left: cursorX, top: cursorY, pointerEvents: "none" }}>
        <svg width="58" height="58" viewBox="0 0 36 36" fill="none"><path d="M7 4L29 16.5L18.5 19.5L14 30L7 4Z" fill="#18181B" stroke="#FFFFFF" strokeWidth="2.8" strokeLinejoin="round" /></svg>
      </div>
    </AbsoluteFill>
  );
};

const DynamicCaptions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  let groupIndex = -1;
  for (let i = 0; i < CAPTION_GROUPS.length; i++) {
    const g = CAPTION_GROUPS[i];
    const nextStart = i + 1 < CAPTION_GROUPS.length ? CAPTION_GROUPS[i + 1].start : 9999;
    const winStart = g.start - 0.05;
    const winEnd = Math.min(g.end + 0.2, nextStart - 0.01);
    if (t >= winStart && t < winEnd) { groupIndex = i; break; }
  }
  if (groupIndex === -1) return null;
  const group = CAPTION_GROUPS[groupIndex];
  const groupAgeFrames = Math.max(0, (t - (group.start - 0.05)) * fps);
  const rise = interpolate(groupAgeFrames, [0, 5], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(groupAgeFrames, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let activeWordIdx = -1;
  for (let i = 0; i < group.words.length; i++) { if (t >= group.words[i].s - 0.03) activeWordIdx = i; }
  return (
    <div style={{ position: "absolute", left: 56, right: 56, bottom: 295, display: "flex", justifyContent: "center", pointerEvents: "none", opacity, transform: `translateY(${rise}px)` }}>
      <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px 14px", padding: "18px 30px", borderRadius: 26, backgroundColor: "rgba(255, 255, 255, 0.96)", border: "3.5px solid #18181B", boxShadow: "0 12px 30px rgba(24, 24, 27, 0.12)", maxWidth: 940 }}>
        {group.words.map((word, idx) => {
          const isCurrent = idx === activeWordIdx && t <= word.e + 0.22;
          const highlightColor = word.hi || "#FFD45E";
          return (
            <span key={idx} style={{ display: "inline-block", padding: isCurrent ? "4px 14px" : "4px 4px", borderRadius: 14, backgroundColor: isCurrent ? highlightColor : "transparent", border: isCurrent ? "2.5px solid #18181B" : "2.5px solid transparent", fontFamily: FONT_SANS, fontSize: 50, fontWeight: 900, lineHeight: 1.12, letterSpacing: "-0.025em", color: "#18181B", transform: isCurrent ? "translateY(-3px) scale(1.04)" : "none" }}>{word.w}</span>
          );
        })}
      </div>
    </div>
  );
};

const TopProgressStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = interpolate(frame, [0, durationInFrames - 1], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, backgroundColor: "rgba(24, 24, 27, 0.07)", pointerEvents: "none" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6366F1 0%, #5ED9B3 100%)" }} />
    </div>
  );
};

export default function CoreAgeRxMuscleShort() {
  const { fps, durationInFrames } = useVideoConfig();
  const pivotStart = Math.round(21.65 * fps);
  const pivotEnd = Math.round(24.3 * fps);
  const researchStart = Math.round(38.95 * fps);
  const researchEnd = Math.round(50.0 * fps);
  const teleStart = Math.round(64.75 * fps);
  const teleEnd = Math.round(76.1 * fps);
  const outroStart = Math.round(81.5 * fps);
  const outroEnd = Math.round(84.8 * fps);
  const musicCrossFrame = Math.round(47.0 * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      {WHITEBOARD_SCENES.map((scene) => {
        const from = Math.round(scene.start * fps);
        const to = Math.round(scene.end * fps);
        const dur = Math.max(1, to - from);
        return (
          <Sequence key={scene.id} from={from} durationInFrames={dur} name={`Scene-${String(scene.id).padStart(2, "0")}`}>
            <WhiteboardClipScene scene={scene} />
          </Sequence>
        );
      })}
      <Sequence from={pivotStart} durationInFrames={pivotEnd - pivotStart} name="InterestingPivotScene"><InterestingPivotScene /></Sequence>
      <Sequence from={researchStart} durationInFrames={researchEnd - researchStart} name="ResearchBeyondScaleScene"><ResearchBeyondScaleScene /></Sequence>
      <Sequence from={teleStart} durationInFrames={teleEnd - teleStart} name="CoreAgeRxTelehealthScene"><CoreAgeRxTelehealthScene /></Sequence>
      <Sequence from={outroStart} durationInFrames={outroEnd - outroStart} name="CoreAgeRxOutroCard"><CoreAgeRxOutroCard /></Sequence>
      {SHOW_CAPTIONS && <DynamicCaptions />}
      <TopProgressStrip />
      <Audio src={VOICE_URL} volume={1} />
      <Sequence from={0} durationInFrames={musicCrossFrame + Math.round(3 * fps)} name="Music-Act1">
        <Audio src={MUSIC_A_URL} volume={(f) => {
          const sec = f / fps;
          const fade = interpolate(sec, [47, 50], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return MUSIC_BASE_VOLUME * fade;
        }} />
      </Sequence>
      <Sequence from={musicCrossFrame} durationInFrames={durationInFrames - musicCrossFrame} name="Music-Act2">
        <Audio src={MUSIC_B_URL} volume={(f) => {
          const sec = f / fps;
          const endSec = durationInFrames / fps;
          const fadeIn = interpolate(sec, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fadeOut = interpolate(sec, [endSec - musicCrossFrame / fps - 1.5, endSec - musicCrossFrame / fps], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return MUSIC_BASE_VOLUME * fadeIn * fadeOut;
        }} />
      </Sequence>
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
