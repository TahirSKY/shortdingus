/* REMOTION_CONFIG = { fps: 30, durationInFrames: 7020, width: 1920, height: 1080 } */
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const HUB = 'https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=';
const A = (id: string) => HUB + id;

// CoreAgeRX pitch — 234.0s, 7020 frames @ 30fps, horizontal 1920x1080.
const VOICE = A('eef9c8cd-4be3-4a89-a702-232c7244d4c2'); // 233.36s, 748 words

const FPS = 30;
const W = 1920;
const H = 1080;

const INK = '#1A1A1A';
const AMBER = '#F2CE72';

// The engine's pencil noise is random; keep it felt, not heard.
const PEN_VOLUME = 0.07;

// Bed: docu-pluck — pizzicato + marimba over a soft pad, built to sit under a
// spoken voiceover: no build-ups, no drops, no foreground melody. 63.033s, so
// it loops 4x across the cut with short fades at the seams.
// Set MUSIC_VOLUME to 0 for a voice-and-pencil-only version.
const MUSIC = A('f4a1ed94-671d-4de6-ba60-43370bfafe68');
const MUSIC_LEN = 63.033;
const MUSIC_VOLUME = 0.13;

const WHOOSH = A('c7811cc8-f24c-441e-ba5e-8f1ac3fb0a0e'); // whoosh.soft, 0.37s
const POP = A('71c06f8c-9e2a-4c26-bbd1-2d952fa68771'); // dragon-studio-pop, 0.72s
const THOCK = A('cd778eba-82c9-478b-b40d-8b6e3125ec0b'); // soft_punk_impact, 0.5s

// ---------------------------------------------------------------------------
// Layout
//
// Drawings are white paper with thin ink, so the frame is white. Art plays in
// the band ABOVE a caption strip: no drawing is ever covered by a caption, and
// because every PNG was normalised to exactly 1920x1080 with the art centred,
// the band crops only empty paper.
// ---------------------------------------------------------------------------
const BAND_H = 888;
const CAP_H = H - BAND_H;
const V_PAD = 22;

// The whole 1920x1080 art canvas is scaled into the band, so typeset numerals
// can use plain 1920x1080 coordinates that line up with the drawings.
const ART_S = (BAND_H - V_PAD * 2) / H; // 0.84444…
const ART_W = W * ART_S;
const ART_LEFT = (W - ART_W) / 2;
const ART_TOP = V_PAD;

// whiteboard-animate paints the source PNG back into its own canvas at
//   m = round(min(w,h) * 0.08)      scale = min((w-2m)/w, (h-2m)/h)
// so a 1920x1080 source comes back at 1614x908 inside 1920x1080. Scaling the
// clip element up by the inverse about the same centre puts the drawing exactly
// where the still will be — the clip→still hand-off cannot jump a pixel.
const CLIP_ART_SCALE = 0.84074;
const CLIP_K = 1 / CLIP_ART_SCALE;

// ---------------------------------------------------------------------------
// Scenes — 47 drawings. Every scene is a clip; when a scene runs longer than
// its 7s clip, the identical still takes over from the clip's own last frame.
// ---------------------------------------------------------------------------
type Row = [start: number, clip: string, still: string];

const ROWS: Row[] = [
  [0.0, '56d6322a-afef-47b4-b2d0-554c2039df4f', '9bf3c3c5-dc82-46a4-9702-ea2d7829c64d'],
  [2.6, 'a719363d-c24e-47da-aa31-3d11771b6974', '5ff0b1a0-a680-4820-9f93-868aa6bdfd3c'],
  [7.0, '5a0b5adc-f5f3-48dc-8021-73fc0aff9997', '81f719ea-1ba4-42b0-b9fd-c5f87440cd27'],
  [12.3, 'eb497dc9-bac3-452c-8381-7dc40136133d', 'dc0cf28a-fdf1-4682-a7d8-ccdea79e696b'],
  [17.3, '8cd92a9f-1669-44b3-8cb1-bd4cfe4826fb', 'b585bd68-cb0c-447c-a105-b0cdaa627f70'],
  [24.3, '06b727f8-ae1a-4700-8697-614436db690f', '52099918-80fc-4c9b-a4f0-c2b8c5cadcd8'],
  [29.4, 'e0543d92-66b5-4024-ac6d-5c4840f38969', '6a778e23-5ce2-4d33-9dcd-16661bba0197'],
  [33.2, '4f6ffbdc-f820-429a-b31d-2c4076b9a967', 'ed9f4831-2e11-4e57-8e6b-644a402516fc'],
  [36.9, '956c0479-c617-416a-a75b-619d2e800238', '6924def1-2d7b-4c1d-b476-8f9a18c99bda'],
  [40.8, '29178509-e89b-4fda-8c61-cf955fb0e569', 'b330d2e4-4b64-4f6f-b374-d445d78b7421'],
  [44.1, 'd78fda1d-5dcd-44db-895a-398183af9e17', '7d3ade57-4c66-4fc0-a8e1-9ae3b3e4f616'],
  [49.6, '1b8b4c62-eacb-40f7-a537-2cb7de4d6fa2', '3471cc34-d0bb-4182-acd6-62a952e6061d'],
  [53.1, '38c54a03-4bdb-4ca2-a4fb-a46b8fe43a08', 'e3351cf0-5eaa-48e3-8c19-992047983d16'],
  [60.8, '6f7230f6-db3b-4751-b11d-81f38332bb55', '505b05f1-dfd2-49ec-ad0d-51c3a96688ec'],
  [68.3, '0f2c9d7c-193e-4f02-bef2-1b70e2ee6787', '50e6a013-95c5-4bb5-bc76-a032e2945d28'],
  [71.1, '5b006924-0248-4c35-9ee5-a06a7d0f18c3', '6a86ae5b-bda3-4337-9edb-8b7677b3646a'],
  [75.6, '31d70c3f-f29a-427e-9700-1d0f1ae8e4a5', '0750b187-3538-4f1e-9a17-799afdd88f93'],
  [81.2, '62800d61-ee58-4535-98a0-a3b496c20e3e', 'b7726293-d0e5-4cd5-8031-7c4116eaba95'],
  [85.2, '5e902ff9-5881-4ab4-8911-b367460835f7', 'a0a28b65-8248-47aa-aa2c-72d13d6daed8'],
  [88.2, '12068900-920b-4cdb-bc94-43739a272e74', 'a5393af3-29eb-4c25-b060-3f76e9ec1036'],
  [91.1, 'fc5a6d8b-3465-4262-8112-9f7ac8b32ff6', '123b2310-76eb-461f-8ce8-d1004ddca29e'],
  [97.2, '9094e260-eb63-47ff-9dad-966a69dfcbb0', 'c8352c84-1e1f-418f-80a4-36554447b9eb'],
  [101.6, '752b9b43-091e-45c9-9876-f72841765897', 'a660e4f4-9902-4bfb-8586-318c684775a6'],
  [107.0, 'cf4d14f3-bad0-439f-9c6e-d14ab862a9b4', 'ce4128a4-a567-4436-b26c-3e06841772c0'],
  [112.1, '01446e86-d9b8-409d-a266-fd836531cfa6', '7d6b9ea7-3574-447d-8698-619b4e5d2fe9'],
  [116.3, 'fbff0be3-9e80-463b-8075-35a1512a2c5a', '2fd6b231-6f00-4b27-a340-0b8210f78cb5'],
  [119.2, '712ee250-fa46-401c-a78a-811c3c906a01', 'eb1fa567-7411-4564-86b6-b27ac0f85ec2'],
  [123.6, '30a72f5a-48a0-44d8-906a-cd7900bae96b', '13e751ea-c0e5-4679-a66f-27242b0044ab'],
  [127.5, 'e9f1aa1e-c0cd-4e03-b1f2-6e5ea0bc93f3', '010dd1b6-f3be-441b-ab86-63f47a039df7'],
  [133.2, '397b0b5a-be3a-4719-a725-b5d6af5da8ca', '3cbaa85a-d57a-41f4-9092-4c0aac6b0f67'],
  [138.8, 'bc0fded8-73a2-4bb6-a59e-c9fb72bb8b0e', 'fa5489d3-ef06-4e55-9852-dd2b9ca2f444'],
  [142.3, '77e43e40-6366-4fb7-87d9-f5b9eb9d2ba4', '5c27ed13-d6eb-4095-8ae4-4bd5775bc69f'],
  [150.6, '55ef9214-89c4-4c27-8d32-dae62f572973', '5e6783d4-2435-4b72-89a1-f8712060ff9f'],
  [155.8, '381ed654-96aa-4c41-bd99-f47c8d346a91', '36bd8ec2-103c-4bd0-9eab-143e2a6e6400'],
  [162.3, '04c89a65-bc06-4b8f-8125-71671ca7e840', '9000c8c4-3d4c-4b75-9217-c7fe32d268a7'],
  [168.4, 'f561b56b-8bd5-4e97-b462-1113823b2ec9', '34a7f30b-d4fc-4a6e-9b62-72b063ed7911'],
  [175.2, '5dc59969-6d94-4207-8241-9dbe21ffda5b', 'b4476ce1-af07-4b4b-a1eb-dcff0c56336a'],
  [180.2, '6c7b0cf2-3c3e-471e-beee-7852bfd67192', 'c9639317-eaea-4686-b2b1-ec493354bd84'],
  [184.0, 'df0475a1-3028-4297-8b70-e3b4507fa51a', 'b3b6c3f2-f3eb-4879-af23-804eae21e0a2'],
  [188.2, '1d9ed1a8-61ba-48ab-bf49-840e6ec2ab9b', '14f47c7b-9538-46e7-a869-7fffa36ecc05'],
  [193.8, '665416c2-1449-483a-b272-23544ee8b3fc', 'd1e0cbc7-44f5-4712-b12b-e47b07672e53'],
  [200.0, '', '6a93f11c-fbe7-4d60-a667-0ae49586fbbf'],
  [206.4, '8307c998-058d-4cbd-a27b-00c047771188', '8a1a11ac-43c2-4181-80f2-0e0cb646e2e3'],
  [213.3, '82782c02-edbf-4123-b375-80c7be8435fe', '68e11127-6e99-46b8-9d70-1a8eaf4ba867'],
  [215.9, '4e2c79cf-ac08-46d3-8f44-4403f39ae77f', 'd95a49cc-6274-43c0-b903-30294730037d'],
  [220.9, 'cb0a8f9e-00d7-4f5a-b949-fd57904e3968', '141910fd-d6b1-4383-92d5-f87d2969c26f'],
  [227.4, '9e645441-e926-4e79-ad41-db1e226964a6', '5faf3334-3be7-4bec-9dc8-16517a442651'],
];

const TOTAL_SECONDS = 234.0;
const TOTAL_FRAMES = Math.round(TOTAL_SECONDS * FPS); // 7020

const DRAW = 6; // seconds of pencil in every clip

type Scene = {
  idx: number;
  start: number;
  len: number;
  from: number;
  frames: number;
  rate: number;
  videoFrames: number;
  clip: string;
  still: string;
};

/**
 * A drawing is never cut mid-draw. Speed is the variable: the clip plays fast
 * enough that the pencil finishes ~0.35s before the scene ends, then the
 * finished drawing stays on screen — first the clip's own 1s tail, then the
 * identical still. Never slower than 1x, so a long scene holds instead of
 * crawling the pencil.
 */
const plan = (row: Row, idx: number, nextStart?: number): Scene => {
  const [start, clip, still] = row;
  const end = nextStart ?? TOTAL_SECONDS;
  const len = Math.max(0.1, end - start);
  const frames = Math.round(len * FPS);
  const from = Math.round(start * FPS);

  if (idx === 0 || idx === 41) {
    // s01 opens on the finished drawing. s42's clip ID was rejected by the hub
    // ("Asset not found") — its still ID is valid, so show the still from frame 0.
    return { idx, start, len, from, frames, rate: 1, videoFrames: 0, clip, still };
  }

  const hold = Math.min(0.8, Math.max(0.3, len * 0.25));
  const raw = Math.max((DRAW + 1) / len, DRAW / Math.max(0.1, len - hold));
  // Round UP, never down: rounding down nudges the last stroke past the hold
  // point, which is the failure this function exists to prevent.
  const rate = Math.max(1, Math.ceil(raw * 100) / 100);
  const spoken = (DRAW + 1) / rate;
  const videoFrames = Math.min(frames, Math.max(1, Math.round(spoken * FPS)));

  return { idx, start, len, from, frames, rate, videoFrames, clip, still };
};

const TIMELINE: Scene[] = ROWS.map((row, i) =>
  plan(row, i, i + 1 < ROWS.length ? ROWS[i + 1][0] : undefined),
);

// ---------------------------------------------------------------------------
// Typeset numerals
//
// No digits are baked into the artwork — every price and duration is drawn here
// on the word that says it. Coordinates are 1920x1080, the drawings' own space,
// and these ride inside the same block as the art so they never drift.
// ---------------------------------------------------------------------------
type Num = {
  scene: number;
  at: number;
  text: string;
  x: number;
  y: number;
  size: number;
  sticker?: boolean;
  rot?: number;
};

const NUMS: Num[] = [
  // inside the stopwatch dial, in the gap the hand leaves below the pivot
  { scene: 31, at: 141.572, text: '20', x: 960, y: 745, size: 112 },
  // above the five cards, clear of the frame edge
  { scene: 38, at: 181.326, text: '$97', x: 1420, y: 150, size: 104, sticker: true, rot: -2 },
  // in the empty left margin of the thirty-card grid
  { scene: 39, at: 185.02, text: '$497', x: 195, y: 520, size: 96, sticker: true, rot: 2 },
  // written on the empty explainer screen
  { scene: 40, at: 190.304, text: '$147', x: 960, y: 450, size: 120, sticker: true, rot: -2 },
  { scene: 40, at: 192.81, text: '8\u201312 min', x: 960, y: 605, size: 70 },
  // below the clock's hands
  { scene: 46, at: 226.338, text: '48', x: 1560, y: 650, size: 100 },
];

// ---------------------------------------------------------------------------
// Captions — timecoded phrases from the voiceover transcript, just like Gala.
// Each phrase starts at its scene start (already aligned to the VO's word
// timings) and runs long enough for its words at a natural speaking pace,
// capped before the next scene. Words inside a phrase are spread by length so
// the amber swash lands on the word actually being spoken.
// ---------------------------------------------------------------------------
type Word = { w: string; s: number; e: number };

const WORD_TIMES: Word[] = [
  {w: "Hey,", s: 0.18, e: 0.5},
  {w: "Core", s: 0.5, e: 0.82},
  {w: "H", s: 0.82, e: 1.06},
  {w: "R", s: 1.06, e: 1.14},
  {w: "X", s: 1.14, e: 1.32},
  {w: "team.", s: 1.32, e: 2.28},
  {w: "I've", s: 2.28, e: 2.42},
  {w: "been", s: 2.42, e: 2.52},
  {w: "taking", s: 2.52, e: 2.82},
  {w: "a", s: 2.82, e: 2.84},
  {w: "look", s: 2.84, e: 3},
  {w: "at", s: 3, e: 3.06},
  {w: "your", s: 3.06, e: 3.24},
  {w: "business,", s: 3.24, e: 3.79},
  {w: "and", s: 3.79, e: 4.11},
  {w: "I", s: 4.11, e: 4.19},
  {w: "wanted", s: 4.19, e: 4.38},
  {w: "to", s: 4.38, e: 4.51},
  {w: "reach", s: 4.51, e: 4.69},
  {w: "out", s: 4.69, e: 4.83},
  {w: "because", s: 4.83, e: 5.07},
  {w: "I", s: 5.07, e: 5.09},
  {w: "think", s: 5.09, e: 5.25},
  {w: "there's", s: 5.25, e: 5.55},
  {w: "a", s: 5.55, e: 5.81},
  {w: "big", s: 5.81, e: 6.19},
  {w: "opportunity", s: 6.19, e: 6.69},
  {w: "for", s: 6.69, e: 6.85},
  {w: "you", s: 6.85, e: 6.93},
  {w: "to", s: 6.93, e: 7.01},
  {w: "use", s: 7.01, e: 7.32},
  {w: "educational", s: 7.32, e: 7.82},
  {w: "video", s: 7.82, e: 8.14},
  {w: "content", s: 8.14, e: 8.54},
  {w: "to", s: 8.54, e: 8.68},
  {w: "build", s: 8.68, e: 8.84},
  {w: "more", s: 8.84, e: 9.08},
  {w: "awareness,", s: 9.08, e: 9.64},
  {w: "credibility,", s: 9.64, e: 10.37},
  {w: "and", s: 10.37, e: 10.62},
  {w: "organic", s: 10.62, e: 11.11},
  {w: "interest", s: 11.11, e: 11.43},
  {w: "in", s: 11.43, e: 11.51},
  {w: "your", s: 11.51, e: 11.6},
  {w: "services.", s: 11.6, e: 12.94},
  {w: "Here's", s: 12.94, e: 13.11},
  {w: "what", s: 13.11, e: 13.26},
  {w: "caught", s: 13.26, e: 13.43},
  {w: "my", s: 13.43, e: 13.51},
  {w: "attention.", s: 13.51, e: 14.54},
  {w: "Core", s: 14.54, e: 14.86},
  {w: "H", s: 14.86, e: 15.04},
  {w: "R", s: 15.04, e: 15.18},
  {w: "X", s: 15.18, e: 15.44},
  {w: "isn't", s: 15.44, e: 15.66},
  {w: "just", s: 15.66, e: 15.82},
  {w: "offering", s: 15.82, e: 16.24},
  {w: "one", s: 16.24, e: 16.56},
  {w: "product.", s: 16.56, e: 17.28},
  {w: "You're", s: 17.28, e: 17.45},
  {w: "building", s: 17.45, e: 17.75},
  {w: "an", s: 17.75, e: 17.99},
  {w: "online", s: 17.99, e: 18.31},
  {w: "healthcare", s: 18.31, e: 18.73},
  {w: "and", s: 18.73, e: 18.81},
  {w: "wellness", s: 18.81, e: 19.13},
  {w: "platform", s: 19.13, e: 19.61},
  {w: "covering", s: 19.61, e: 19.93},
  {w: "things", s: 19.93, e: 20.16},
  {w: "like", s: 20.16, e: 20.4},
  {w: "GLP-1", s: 20.4, e: 21.04},
  {w: "weight", s: 21.04, e: 21.22},
  {w: "management,", s: 21.22, e: 21.86},
  {w: "skincare,", s: 21.86, e: 22.64},
  {w: "and", s: 22.64, e: 22.74},
  {w: "longevity", s: 22.74, e: 23.22},
  {w: "treatments.", s: 23.22, e: 24.27},
  {w: "And", s: 24.27, e: 24.41},
  {w: "when", s: 24.41, e: 24.51},
  {w: "a", s: 24.51, e: 24.59},
  {w: "business", s: 24.59, e: 24.97},
  {w: "offers", s: 24.97, e: 25.23},
  {w: "services", s: 25.23, e: 25.71},
  {w: "in", s: 25.71, e: 25.87},
  {w: "areas", s: 25.87, e: 26.13},
  {w: "like", s: 26.13, e: 26.35},
  {w: "these,", s: 26.35, e: 27.06},
  {w: "education", s: 27.06, e: 27.64},
  {w: "becomes", s: 27.64, e: 28.04},
  {w: "incredibly", s: 28.04, e: 28.84},
  {w: "important.", s: 28.84, e: 29.8},
  {w: "People", s: 29.8, e: 30.03},
  {w: "don't", s: 30.03, e: 30.19},
  {w: "just", s: 30.19, e: 30.35},
  {w: "want", s: 30.35, e: 30.49},
  {w: "to", s: 30.49, e: 30.52},
  {w: "see", s: 30.52, e: 30.68},
  {w: "an", s: 30.68, e: 30.91},
  {w: "advertisement", s: 30.91, e: 31.57},
  {w: "telling", s: 31.57, e: 31.87},
  {w: "them", s: 31.87, e: 31.97},
  {w: "to", s: 31.97, e: 32.05},
  {w: "sign", s: 32.05, e: 32.51},
  {w: "up.", s: 32.51, e: 33.07},
  {w: "They", s: 33.07, e: 33.23},
  {w: "want", s: 33.23, e: 33.33},
  {w: "to", s: 33.33, e: 33.49},
  {w: "understand", s: 33.49, e: 34.13},
  {w: "what", s: 34.13, e: 34.21},
  {w: "they're", s: 34.21, e: 34.44},
  {w: "looking", s: 34.44, e: 34.69},
  {w: "at.", s: 34.69, e: 35.08},
  {w: "They", s: 35.08, e: 35.24},
  {w: "want", s: 35.24, e: 35.56},
  {w: "answers", s: 35.56, e: 35.82},
  {w: "to", s: 35.82, e: 35.91},
  {w: "their", s: 35.91, e: 36.06},
  {w: "questions.", s: 36.06, e: 36.86},
  {w: "They", s: 36.86, e: 36.94},
  {w: "want", s: 36.94, e: 37.12},
  {w: "to", s: 37.12, e: 37.18},
  {w: "understand", s: 37.18, e: 37.57},
  {w: "how", s: 37.57, e: 37.74},
  {w: "treatments", s: 37.74, e: 38.22},
  {w: "work,", s: 38.22, e: 38.61},
  {w: "what", s: 38.61, e: 38.77},
  {w: "the", s: 38.77, e: 38.93},
  {w: "differences", s: 38.93, e: 39.49},
  {w: "are,", s: 39.49, e: 39.75},
  {w: "what", s: 39.75, e: 39.83},
  {w: "the", s: 39.83, e: 39.99},
  {w: "process", s: 39.99, e: 40.47},
  {w: "looks", s: 40.47, e: 40.69},
  {w: "like,", s: 40.69, e: 41.27},
  {w: "and", s: 41.27, e: 41.35},
  {w: "what", s: 41.35, e: 41.51},
  {w: "they", s: 41.51, e: 41.59},
  {w: "should", s: 41.59, e: 41.82},
  {w: "consider", s: 41.82, e: 42.23},
  {w: "before", s: 42.23, e: 42.55},
  {w: "making", s: 42.55, e: 42.89},
  {w: "a", s: 42.89, e: 42.95},
  {w: "decision.", s: 42.95, e: 44.08},
  {w: "And", s: 44.08, e: 44.32},
  {w: "I", s: 44.32, e: 44.48},
  {w: "think", s: 44.48, e: 44.64},
  {w: "there's", s: 44.64, e: 44.86},
  {w: "a", s: 44.86, e: 44.88},
  {w: "way", s: 44.88, e: 45.04},
  {w: "to", s: 45.04, e: 45.12},
  {w: "communicate", s: 45.12, e: 45.91},
  {w: "all", s: 45.91, e: 46.07},
  {w: "of", s: 46.07, e: 46.15},
  {w: "that", s: 46.15, e: 46.4},
  {w: "without", s: 46.4, e: 46.73},
  {w: "making", s: 46.73, e: 47.05},
  {w: "every", s: 47.05, e: 47.22},
  {w: "piece", s: 47.22, e: 47.38},
  {w: "of", s: 47.38, e: 47.51},
  {w: "content", s: 47.51, e: 47.93},
  {w: "feel", s: 47.93, e: 47.99},
  {w: "like", s: 47.99, e: 48.18},
  {w: "an", s: 48.18, e: 48.31},
  {w: "advertisement.", s: 48.31, e: 49.68},
  {w: "Think", s: 49.68, e: 49.85},
  {w: "about", s: 49.85, e: 50.09},
  {w: "the", s: 50.09, e: 50.24},
  {w: "whiteboard", s: 50.24, e: 50.64},
  {w: "videos", s: 50.64, e: 51.04},
  {w: "like", s: 51.04, e: 51.62},
  {w: "the", s: 51.62, e: 51.7},
  {w: "one", s: 51.7, e: 51.84},
  {w: "you're", s: 51.84, e: 51.92},
  {w: "watching", s: 51.92, e: 52.18},
  {w: "right", s: 52.18, e: 52.27},
  {w: "now.", s: 52.27, e: 53.14},
  {w: "There's", s: 53.14, e: 53.33},
  {w: "something", s: 53.33, e: 53.61},
  {w: "familiar", s: 53.61, e: 54.18},
  {w: "about", s: 54.18, e: 54.41},
  {w: "watching", s: 54.41, e: 54.74},
  {w: "an", s: 54.74, e: 54.83},
  {w: "idea", s: 54.83, e: 55.15},
  {w: "get", s: 55.15, e: 55.37},
  {w: "drawn", s: 55.37, e: 55.77},
  {w: "out", s: 55.77, e: 55.96},
  {w: "step", s: 55.96, e: 56.19},
  {w: "by", s: 56.19, e: 56.35},
  {w: "step.", s: 56.35, e: 57.15},
  {w: "It's", s: 57.15, e: 57.47},
  {w: "the", s: 57.47, e: 57.55},
  {w: "kind", s: 57.55, e: 57.79},
  {w: "of", s: 57.79, e: 57.94},
  {w: "visual", s: 57.94, e: 58.27},
  {w: "explanation", s: 58.27, e: 58.98},
  {w: "many", s: 58.98, e: 59.22},
  {w: "of", s: 59.22, e: 59.3},
  {w: "us", s: 59.3, e: 59.4},
  {w: "have", s: 59.4, e: 59.54},
  {w: "been", s: 59.54, e: 59.64},
  {w: "drawn", s: 59.64, e: 59.89},
  {w: "to", s: 59.89, e: 60.05},
  {w: "since", s: 60.05, e: 60.28},
  {w: "childhood.", s: 60.28, e: 61.29},
  {w: "There's", s: 61.29, e: 61.47},
  {w: "something", s: 61.47, e: 61.72},
  {w: "naturally", s: 61.72, e: 62.28},
  {w: "engaging", s: 62.28, e: 62.76},
  {w: "about", s: 62.76, e: 63},
  {w: "seeing", s: 63, e: 63.24},
  {w: "a", s: 63.24, e: 63.33},
  {w: "complicated", s: 63.33, e: 63.9},
  {w: "idea", s: 63.9, e: 64.29},
  {w: "broken", s: 64.29, e: 64.61},
  {w: "down", s: 64.61, e: 64.99},
  {w: "into", s: 64.99, e: 65.18},
  {w: "simple", s: 65.18, e: 65.57},
  {w: "explanations,", s: 65.57, e: 66.45},
  {w: "illustrations,", s: 66.45, e: 67.17},
  {w: "and", s: 67.17, e: 67.25},
  {w: "stories.", s: 67.25, e: 68.23},
  {w: "It", s: 68.23, e: 68.29},
  {w: "gives", s: 68.29, e: 68.53},
  {w: "complicated", s: 68.53, e: 69.08},
  {w: "topics", s: 69.08, e: 69.56},
  {w: "room", s: 69.56, e: 69.74},
  {w: "to", s: 69.74, e: 69.9},
  {w: "breathe.", s: 69.9, e: 70.76},
  {w: "And", s: 70.76, e: 71.1},
  {w: "especially", s: 71.1, e: 71.56},
  {w: "when", s: 71.56, e: 71.72},
  {w: "we're", s: 71.72, e: 71.82},
  {w: "talking", s: 71.82, e: 72.14},
  {w: "about", s: 72.14, e: 72.36},
  {w: "health", s: 72.36, e: 72.64},
  {w: "and", s: 72.64, e: 72.7},
  {w: "weight", s: 72.7, e: 72.92},
  {w: "loss", s: 72.92, e: 73.1},
  {w: "content,", s: 73.1, e: 73.66},
  {w: "clarity", s: 73.66, e: 74.46},
  {w: "really", s: 74.46, e: 74.77},
  {w: "matters.", s: 74.77, e: 75.91},
  {w: "Imagine", s: 75.91, e: 76.31},
  {w: "short,", s: 76.31, e: 76.87},
  {w: "engaging,", s: 76.87, e: 77.57},
  {w: "whiteboard-style", s: 77.57, e: 78.21},
  {w: "videos", s: 78.21, e: 78.63},
  {w: "that", s: 78.63, e: 78.78},
  {w: "break", s: 78.78, e: 78.97},
  {w: "down", s: 78.97, e: 79.34},
  {w: "interesting", s: 79.34, e: 79.74},
  {w: "health", s: 79.74, e: 79.91},
  {w: "and", s: 79.91, e: 79.99},
  {w: "wellness", s: 79.99, e: 80.3},
  {w: "topics.", s: 80.3, e: 81.11},
  {w: "For", s: 81.11, e: 81.24},
  {w: "example,", s: 81.24, e: 81.74},
  {w: "we", s: 81.74, e: 81.84},
  {w: "could", s: 81.84, e: 81.98},
  {w: "explain", s: 81.98, e: 82.38},
  {w: "how", s: 82.38, e: 82.7},
  {w: "GLP-1", s: 82.7, e: 83.36},
  {w: "medications", s: 83.36, e: 84},
  {w: "affect", s: 84, e: 84.39},
  {w: "appetite,", s: 84.39, e: 85.14},
  {w: "explore", s: 85.14, e: 85.59},
  {w: "the", s: 85.59, e: 85.67},
  {w: "science", s: 85.67, e: 86},
  {w: "behind", s: 86, e: 86.31},
  {w: "skin", s: 86.31, e: 86.71},
  {w: "aging,", s: 86.71, e: 87.27},
  {w: "or", s: 87.27, e: 87.51},
  {w: "break", s: 87.51, e: 87.69},
  {w: "down", s: 87.69, e: 87.91},
  {w: "what", s: 87.91, e: 88.1},
  {w: "NAD+", s: 88.1, e: 88.87},
  {w: "is", s: 88.87, e: 89.11},
  {w: "and", s: 89.11, e: 89.21},
  {w: "why", s: 89.21, e: 89.37},
  {w: "people", s: 89.37, e: 89.61},
  {w: "are", s: 89.61, e: 89.75},
  {w: "interested", s: 89.75, e: 90.11},
  {w: "in", s: 90.11, e: 90.19},
  {w: "it.", s: 90.19, e: 90.89},
  {w: "We", s: 90.89, e: 91.04},
  {w: "could", s: 91.04, e: 91.2},
  {w: "also", s: 91.2, e: 91.37},
  {w: "create", s: 91.37, e: 91.61},
  {w: "videos", s: 91.61, e: 91.95},
  {w: "around", s: 91.95, e: 92.26},
  {w: "common", s: 92.26, e: 92.64},
  {w: "misconceptions,", s: 92.64, e: 93.61},
  {w: "frequently", s: 93.61, e: 94.02},
  {w: "asked", s: 94.02, e: 94.17},
  {w: "questions,", s: 94.17, e: 94.83},
  {w: "and", s: 94.83, e: 94.99},
  {w: "the", s: 94.99, e: 95.13},
  {w: "things", s: 95.13, e: 95.31},
  {w: "people", s: 95.31, e: 95.55},
  {w: "are", s: 95.55, e: 95.78},
  {w: "already", s: 95.78, e: 96.11},
  {w: "searching", s: 96.11, e: 96.58},
  {w: "for.", s: 96.58, e: 97.16},
  {w: "The", s: 97.16, e: 97.3},
  {w: "idea", s: 97.3, e: 97.57},
  {w: "is", s: 97.57, e: 97.72},
  {w: "to", s: 97.72, e: 97.8},
  {w: "make", s: 97.8, e: 98.02},
  {w: "someone", s: 98.02, e: 98.26},
  {w: "stop", s: 98.26, e: 98.62},
  {w: "scrolling", s: 98.62, e: 99.16},
  {w: "because", s: 99.16, e: 99.42},
  {w: "they're", s: 99.42, e: 99.63},
  {w: "genuinely", s: 99.63, e: 100.29},
  {w: "interested", s: 100.29, e: 100.69},
  {w: "in", s: 100.69, e: 100.77},
  {w: "what", s: 100.77, e: 100.85},
  {w: "they're", s: 100.85, e: 101.01},
  {w: "learning.", s: 101.01, e: 101.89},
  {w: "Then,", s: 101.89, e: 102.3},
  {w: "as", s: 102.3, e: 102.46},
  {w: "the", s: 102.46, e: 102.54},
  {w: "video", s: 102.54, e: 102.86},
  {w: "develops,", s: 102.86, e: 103.56},
  {w: "CoreageRx", s: 103.56, e: 104.46},
  {w: "becomes", s: 104.46, e: 104.87},
  {w: "part", s: 104.87, e: 105.19},
  {w: "of", s: 105.19, e: 105.25},
  {w: "the", s: 105.25, e: 105.33},
  {w: "conversation", s: 105.33, e: 105.99},
  {w: "in", s: 105.99, e: 106.07},
  {w: "a", s: 106.07, e: 106.09},
  {w: "natural", s: 106.09, e: 106.55},
  {w: "way.", s: 106.55, e: 107.42},
  {w: "This", s: 107.42, e: 107.6},
  {w: "is", s: 107.6, e: 107.76},
  {w: "especially", s: 107.76, e: 108.46},
  {w: "useful", s: 108.46, e: 108.8},
  {w: "for", s: 108.8, e: 108.94},
  {w: "a", s: 108.94, e: 108.96},
  {w: "business", s: 108.96, e: 109.27},
  {w: "like", s: 109.27, e: 109.44},
  {w: "yours", s: 109.44, e: 110.02},
  {w: "because", s: 110.02, e: 110.15},
  {w: "content", s: 110.15, e: 110.57},
  {w: "can", s: 110.57, e: 110.65},
  {w: "do", s: 110.65, e: 111.13},
  {w: "more", s: 111.13, e: 111.29},
  {w: "generate", s: 111.29, e: 111.68},
  {w: "views.", s: 111.68, e: 112.33},
  {w: "It", s: 112.33, e: 112.4},
  {w: "can", s: 112.4, e: 112.5},
  {w: "help", s: 112.5, e: 112.66},
  {w: "people", s: 112.66, e: 112.98},
  {w: "understand", s: 112.98, e: 113.54},
  {w: "your", s: 113.54, e: 113.7},
  {w: "services", s: 113.7, e: 114.25},
  {w: "before", s: 114.25, e: 114.44},
  {w: "they", s: 114.44, e: 114.73},
  {w: "even", s: 114.73, e: 114.9},
  {w: "visit", s: 114.9, e: 115.14},
  {w: "your", s: 115.14, e: 115.29},
  {w: "website.", s: 115.29, e: 116.41},
  {w: "And", s: 116.41, e: 116.66},
  {w: "I'd", s: 116.66, e: 116.73},
  {w: "like", s: 116.73, e: 116.9},
  {w: "to", s: 116.9, e: 117.07},
  {w: "offer", s: 117.07, e: 117.23},
  {w: "to", s: 117.23, e: 117.31},
  {w: "handle", s: 117.31, e: 117.62},
  {w: "the", s: 117.62, e: 117.72},
  {w: "entire", s: 117.72, e: 118.28},
  {w: "process", s: 118.28, e: 118.68},
  {w: "for", s: 118.68, e: 118.76},
  {w: "you.", s: 118.76, e: 119.39},
  {w: "I", s: 119.39, e: 119.48},
  {w: "research", s: 119.48, e: 119.87},
  {w: "your", s: 119.87, e: 119.96},
  {w: "business,", s: 119.96, e: 120.52},
  {w: "understand", s: 120.52, e: 120.92},
  {w: "your", s: 120.92, e: 121.15},
  {w: "audience,", s: 121.15, e: 121.65},
  {w: "find", s: 121.65, e: 121.89},
  {w: "topics", s: 121.89, e: 122.29},
  {w: "that", s: 122.29, e: 122.38},
  {w: "are", s: 122.38, e: 122.51},
  {w: "relevant", s: 122.51, e: 122.85},
  {w: "and", s: 122.85, e: 123.01},
  {w: "interesting", s: 123.01, e: 123.41},
  {w: "to", s: 123.41, e: 123.55},
  {w: "them,", s: 123.55, e: 124.11},
  {w: "write", s: 124.11, e: 124.29},
  {w: "the", s: 124.29, e: 124.37},
  {w: "scripts,", s: 124.37, e: 125},
  {w: "and", s: 125, e: 125.24},
  {w: "turn", s: 125.24, e: 125.49},
  {w: "those", s: 125.49, e: 125.72},
  {w: "scripts", s: 125.72, e: 125.97},
  {w: "into", s: 125.97, e: 126.22},
  {w: "finished", s: 126.22, e: 126.53},
  {w: "videos.", s: 126.53, e: 127.51},
  {w: "If", s: 127.51, e: 127.58},
  {w: "your", s: 127.58, e: 127.72},
  {w: "team", s: 127.72, e: 127.98},
  {w: "already", s: 127.98, e: 128.2},
  {w: "has", s: 128.2, e: 128.54},
  {w: "scripts,", s: 128.54, e: 129.02},
  {w: "campaign", s: 129.02, e: 129.49},
  {w: "ideas,", s: 129.49, e: 129.92},
  {w: "or", s: 129.92, e: 130.05},
  {w: "particular", s: 130.05, e: 130.46},
  {w: "services", s: 130.46, e: 131.01},
  {w: "you'd", s: 131.01, e: 131.07},
  {w: "like", s: 131.07, e: 131.25},
  {w: "to", s: 131.25, e: 131.33},
  {w: "promote,", s: 131.33, e: 131.91},
  {w: "you", s: 131.91, e: 132},
  {w: "can", s: 132, e: 132.15},
  {w: "send", s: 132.15, e: 132.31},
  {w: "those", s: 132.31, e: 132.55},
  {w: "over", s: 132.55, e: 132.77},
  {w: "too.", s: 132.77, e: 133.73},
  {w: "We", s: 133.73, e: 133.83},
  {w: "can", s: 133.83, e: 133.99},
  {w: "create", s: 133.99, e: 134.31},
  {w: "short-form", s: 134.31, e: 134.85},
  {w: "videos", s: 134.85, e: 135.19},
  {w: "for", s: 135.19, e: 135.34},
  {w: "reach,", s: 135.34, e: 135.9},
  {w: "but", s: 135.9, e: 136.07},
  {w: "I", s: 136.07, e: 136.3},
  {w: "also", s: 136.3, e: 136.54},
  {w: "want", s: 136.54, e: 136.62},
  {w: "to", s: 136.62, e: 136.72},
  {w: "explore", s: 136.72, e: 137.2},
  {w: "longer", s: 137.2, e: 137.61},
  {w: "educational", s: 137.61, e: 138.22},
  {w: "videos.", s: 138.22, e: 138.96},
  {w: "Because", s: 138.96, e: 139.38},
  {w: "sometimes", s: 139.38, e: 140.15},
  {w: "a", s: 140.15, e: 140.16},
  {w: "topic", s: 140.16, e: 140.63},
  {w: "needs", s: 140.63, e: 140.88},
  {w: "more", s: 140.88, e: 141.19},
  {w: "than", s: 141.19, e: 141.28},
  {w: "20", s: 141.28, e: 141.6},
  {w: "seconds.", s: 141.6, e: 142.49},
  {w: "A", s: 142.49, e: 142.63},
  {w: "longer", s: 142.63, e: 142.9},
  {w: "video", s: 142.9, e: 143.35},
  {w: "gives", s: 143.35, e: 143.53},
  {w: "us", s: 143.53, e: 143.61},
  {w: "the", s: 143.61, e: 143.77},
  {w: "opportunity", s: 143.77, e: 144.33},
  {w: "to", s: 144.33, e: 144.41},
  {w: "tell", s: 144.41, e: 144.65},
  {w: "a", s: 144.65, e: 144.67},
  {w: "story,", s: 144.67, e: 145.47},
  {w: "explain", s: 145.47, e: 145.92},
  {w: "a", s: 145.92, e: 146},
  {w: "concept", s: 146, e: 146.49},
  {w: "properly,", s: 146.49, e: 147.22},
  {w: "address", s: 147.22, e: 147.52},
  {w: "questions,", s: 147.52, e: 148.16},
  {w: "and", s: 148.16, e: 148.34},
  {w: "introduce", s: 148.34, e: 148.72},
  {w: "your", s: 148.72, e: 148.82},
  {w: "service", s: 148.82, e: 149.2},
  {w: "without", s: 149.2, e: 149.52},
  {w: "rushing", s: 149.52, e: 149.84},
  {w: "the", s: 149.84, e: 149.89},
  {w: "message.", s: 149.89, e: 150.81},
  {w: "And", s: 150.81, e: 151.05},
  {w: "here's", s: 151.05, e: 151.3},
  {w: "what", s: 151.3, e: 151.63},
  {w: "makes", s: 151.63, e: 151.78},
  {w: "straightforward", s: 151.78, e: 152.43},
  {w: "for", s: 152.43, e: 152.57},
  {w: "your", s: 152.57, e: 152.67},
  {w: "team:", s: 152.67, e: 153.38},
  {w: "the", s: 153.38, e: 153.53},
  {w: "finished", s: 153.53, e: 153.79},
  {w: "videos", s: 153.79, e: 154.26},
  {w: "are", s: 154.26, e: 154.35},
  {w: "yours", s: 154.35, e: 154.66},
  {w: "to", s: 154.66, e: 154.82},
  {w: "own", s: 154.82, e: 155.08},
  {w: "and", s: 155.08, e: 155.24},
  {w: "publish.", s: 155.24, e: 155.94},
  {w: "You", s: 155.94, e: 156.04},
  {w: "can", s: 156.04, e: 156.18},
  {w: "post", s: 156.18, e: 156.38},
  {w: "them", s: 156.38, e: 156.5},
  {w: "across", s: 156.5, e: 156.75},
  {w: "your", s: 156.75, e: 156.86},
  {w: "social", s: 156.86, e: 157.13},
  {w: "media", s: 157.13, e: 157.4},
  {w: "channels,", s: 157.4, e: 157.97},
  {w: "use", s: 157.97, e: 158.13},
  {w: "them", s: 158.13, e: 158.22},
  {w: "on", s: 158.22, e: 158.35},
  {w: "your", s: 158.35, e: 158.45},
  {w: "website,", s: 158.45, e: 159.4},
  {w: "and", s: 159.4, e: 159.57},
  {w: "build", s: 159.57, e: 159.75},
  {w: "a", s: 159.75, e: 159.81},
  {w: "collection", s: 159.81, e: 160.2},
  {w: "of", s: 160.2, e: 160.36},
  {w: "educational", s: 160.36, e: 160.86},
  {w: "content", s: 160.86, e: 161.27},
  {w: "around", s: 161.27, e: 161.51},
  {w: "your", s: 161.51, e: 161.64},
  {w: "brand.", s: 161.64, e: 162.56},
  {w: "If", s: 162.56, e: 162.64},
  {w: "certain", s: 162.64, e: 162.94},
  {w: "videos", s: 162.94, e: 163.22},
  {w: "start", s: 163.22, e: 163.43},
  {w: "performing", s: 163.43, e: 163.83},
  {w: "particularly", s: 163.83, e: 164.37},
  {w: "well", s: 164.37, e: 164.61},
  {w: "organically,", s: 164.61, e: 165.5},
  {w: "you", s: 165.5, e: 165.58},
  {w: "can", s: 165.58, e: 165.82},
  {w: "also", s: 165.82, e: 166.01},
  {w: "decide", s: 166.01, e: 166.35},
  {w: "to", s: 166.35, e: 166.4},
  {w: "use", s: 166.4, e: 166.56},
  {w: "those", s: 166.56, e: 166.78},
  {w: "creatives", s: 166.78, e: 167.2},
  {w: "in", s: 167.2, e: 167.28},
  {w: "paid", s: 167.28, e: 167.52},
  {w: "campaigns.", s: 167.52, e: 168.63},
  {w: "That", s: 168.63, e: 168.74},
  {w: "means", s: 168.74, e: 168.95},
  {w: "you're", s: 168.95, e: 169.04},
  {w: "getting", s: 169.04, e: 169.27},
  {w: "content", s: 169.27, e: 169.69},
  {w: "you", s: 169.69, e: 169.77},
  {w: "can", s: 169.77, e: 169.93},
  {w: "continue", s: 169.93, e: 170.63},
  {w: "using,", s: 170.63, e: 171.29},
  {w: "rather", s: 171.29, e: 171.55},
  {w: "than", s: 171.55, e: 171.76},
  {w: "simply", s: 171.76, e: 172.08},
  {w: "paying", s: 172.08, e: 172.4},
  {w: "for", s: 172.4, e: 172.5},
  {w: "a", s: 172.5, e: 172.58},
  {w: "post", s: 172.58, e: 172.8},
  {w: "that", s: 172.8, e: 172.98},
  {w: "disappears", s: 172.98, e: 173.44},
  {w: "from", s: 173.44, e: 173.54},
  {w: "the", s: 173.54, e: 173.68},
  {w: "conversation", s: 173.68, e: 174.25},
  {w: "after", s: 174.25, e: 174.42},
  {w: "a", s: 174.42, e: 174.5},
  {w: "day.", s: 174.5, e: 175.47},
  {w: "Now,", s: 175.47, e: 175.79},
  {w: "to", s: 175.79, e: 175.87},
  {w: "make", s: 175.87, e: 176.03},
  {w: "getting", s: 176.03, e: 176.27},
  {w: "started", s: 176.27, e: 176.73},
  {w: "easy,", s: 176.73, e: 177.25},
  {w: "I'm", s: 177.25, e: 177.46},
  {w: "currently", s: 177.46, e: 177.86},
  {w: "offering", s: 177.86, e: 178.84},
  {w: "discounted", s: 178.84, e: 179.32},
  {w: "packages.", s: 179.32, e: 180.28},
  {w: "5", s: 180.28, e: 180.76},
  {w: "short", s: 180.76, e: 181.18},
  {w: "are", s: 181.18, e: 181.33},
  {w: "$97", s: 181.33, e: 182.23},
  {w: "if", s: 182.23, e: 182.31},
  {w: "you'd", s: 182.31, e: 182.43},
  {w: "like", s: 182.43, e: 182.53},
  {w: "to", s: 182.53, e: 182.68},
  {w: "test", s: 182.68, e: 182.92},
  {w: "the", s: 182.92, e: 183},
  {w: "style.", s: 183, e: 183.9},
  {w: "30", s: 183.9, e: 184.14},
  {w: "short", s: 184.14, e: 184.44},
  {w: "videos", s: 184.44, e: 184.84},
  {w: "are", s: 184.84, e: 185.02},
  {w: "$497", s: 185.02, e: 185.81},
  {w: "if", s: 185.81, e: 185.89},
  {w: "you're", s: 185.89, e: 185.98},
  {w: "ready", s: 185.98, e: 186.22},
  {w: "to", s: 186.22, e: 186.31},
  {w: "build", s: 186.31, e: 186.48},
  {w: "a", s: 186.48, e: 186.55},
  {w: "consistent", s: 186.55, e: 187.03},
  {w: "publishing", s: 187.03, e: 187.44},
  {w: "schedule.", s: 187.44, e: 188.46},
  {w: "Or", s: 188.46, e: 188.63},
  {w: "if", s: 188.63, e: 188.7},
  {w: "you", s: 188.7, e: 188.79},
  {w: "want", s: 188.79, e: 188.96},
  {w: "something", s: 188.96, e: 189.2},
  {w: "more", s: 189.2, e: 189.37},
  {w: "substantial,", s: 189.37, e: 190.3},
  {w: "1", s: 190.3, e: 190.71},
  {w: "8", s: 190.71, e: 190.8},
  {w: "to", s: 190.8, e: 190.88},
  {w: "12", s: 190.88, e: 191.19},
  {w: "minute", s: 191.19, e: 191.53},
  {w: "educational", s: 191.53, e: 192.09},
  {w: "explainer", s: 192.09, e: 192.65},
  {w: "is", s: 192.65, e: 192.81},
  {w: "$147", s: 192.81, e: 194.18},
  {w: "That", s: 194.18, e: 194.34},
  {w: "includes", s: 194.34, e: 194.88},
  {w: "research,", s: 194.88, e: 195.48},
  {w: "scripting", s: 195.48, e: 195.94},
  {w: "where", s: 195.94, e: 196.04},
  {w: "needed,", s: 196.04, e: 196.58},
  {w: "voiceover,", s: 196.58, e: 197.29},
  {w: "animation,", s: 197.29, e: 197.87},
  {w: "captions,", s: 197.87, e: 198.51},
  {w: "and", s: 198.51, e: 198.66},
  {w: "finished", s: 198.66, e: 198.99},
  {w: "video", s: 198.99, e: 199.23},
  {w: "files.", s: 199.23, e: 200.1},
  {w: "You", s: 200.1, e: 200.15},
  {w: "don't", s: 200.15, e: 200.28},
  {w: "need", s: 200.28, e: 200.42},
  {w: "to", s: 200.42, e: 200.5},
  {w: "commit", s: 200.5, e: 200.82},
  {w: "to", s: 200.82, e: 200.92},
  {w: "a", s: 200.92, e: 201.06},
  {w: "long-term", s: 201.06, e: 201.48},
  {w: "agreement.", s: 201.48, e: 202.29},
  {w: "You", s: 202.29, e: 202.37},
  {w: "can", s: 202.37, e: 202.51},
  {w: "start", s: 202.51, e: 202.7},
  {w: "with", s: 202.7, e: 202.93},
  {w: "5", s: 202.93, e: 203.23},
  {w: "videos,", s: 203.23, e: 203.81},
  {w: "see", s: 203.81, e: 203.97},
  {w: "how", s: 203.97, e: 204.13},
  {w: "you", s: 204.13, e: 204.21},
  {w: "like", s: 204.21, e: 204.39},
  {w: "the", s: 204.39, e: 204.52},
  {w: "work,", s: 204.52, e: 204.86},
  {w: "and", s: 204.86, e: 204.94},
  {w: "decide", s: 204.94, e: 205.34},
  {w: "where", s: 205.34, e: 205.43},
  {w: "to", s: 205.43, e: 205.51},
  {w: "go", s: 205.51, e: 205.64},
  {w: "from", s: 205.64, e: 205.8},
  {w: "there.", s: 205.8, e: 206.43},
  {w: "And", s: 206.43, e: 206.54},
  {w: "getting", s: 206.54, e: 206.78},
  {w: "started", s: 206.78, e: 207.18},
  {w: "doesn't", s: 207.18, e: 207.5},
  {w: "need", s: 207.5, e: 207.65},
  {w: "to", s: 207.65, e: 207.74},
  {w: "involve", s: 207.74, e: 208.06},
  {w: "a", s: 208.06, e: 208.13},
  {w: "complicated", s: 208.13, e: 208.63},
  {w: "process.", s: 208.63, e: 209.67},
  {w: "No", s: 209.67, e: 209.83},
  {w: "calls,", s: 209.83, e: 210.55},
  {w: "no", s: 210.55, e: 210.79},
  {w: "lengthy", s: 210.79, e: 211.11},
  {w: "meetings,", s: 211.11, e: 211.75},
  {w: "no", s: 211.75, e: 211.99},
  {w: "complicated", s: 211.99, e: 212.62},
  {w: "onboarding.", s: 212.62, e: 213.58},
  {w: "If", s: 213.58, e: 213.66},
  {w: "you're", s: 213.66, e: 213.82},
  {w: "interested,", s: 213.82, e: 214.38},
  {w: "reply", s: 214.38, e: 214.64},
  {w: "to", s: 214.64, e: 214.73},
  {w: "this", s: 214.73, e: 214.94},
  {w: "message.", s: 214.94, e: 215.58},
  {w: "We", s: 215.58, e: 215.68},
  {w: "can", s: 215.68, e: 215.76},
  {w: "discuss", s: 215.76, e: 216.14},
  {w: "what", s: 216.14, e: 216.3},
  {w: "you'd", s: 216.3, e: 216.4},
  {w: "like", s: 216.4, e: 216.56},
  {w: "to", s: 216.56, e: 216.64},
  {w: "create,", s: 216.64, e: 217.12},
  {w: "and", s: 217.12, e: 217.2},
  {w: "you", s: 217.2, e: 217.35},
  {w: "can", s: 217.35, e: 217.46},
  {w: "send", s: 217.46, e: 217.68},
  {w: "over", s: 217.68, e: 217.99},
  {w: "any", s: 217.99, e: 218.23},
  {w: "ideas", s: 218.23, e: 218.71},
  {w: "or", s: 218.71, e: 218.87},
  {w: "existing", s: 218.87, e: 219.22},
  {w: "scripts", s: 219.22, e: 219.53},
  {w: "you", s: 219.53, e: 219.61},
  {w: "want", s: 219.61, e: 219.77},
  {w: "us", s: 219.77, e: 219.85},
  {w: "to", s: 219.85, e: 219.99},
  {w: "use.", s: 219.99, e: 220.71},
  {w: "Once", s: 220.71, e: 220.89},
  {w: "we've", s: 220.89, e: 221.05},
  {w: "agreed", s: 221.05, e: 221.29},
  {w: "on", s: 221.29, e: 221.43},
  {w: "everything", s: 221.43, e: 221.93},
  {w: "and", s: 221.93, e: 222.01},
  {w: "payment", s: 222.01, e: 222.33},
  {w: "is", s: 222.33, e: 222.41},
  {w: "processed,", s: 222.41, e: 223.05},
  {w: "I", s: 223.05, e: 223.2},
  {w: "can", s: 223.2, e: 223.29},
  {w: "get", s: 223.29, e: 223.39},
  {w: "your", s: 223.39, e: 223.53},
  {w: "first", s: 223.53, e: 223.92},
  {w: "video", s: 223.92, e: 224.17},
  {w: "production", s: 224.17, e: 224.57},
  {w: "underway", s: 224.57, e: 225.3},
  {w: "with", s: 225.3, e: 225.44},
  {w: "delivery", s: 225.44, e: 225.92},
  {w: "within", s: 225.92, e: 226.34},
  {w: "48", s: 226.34, e: 226.8},
  {w: "hours.", s: 226.8, e: 227.6},
  {w: "I'd", s: 227.6, e: 227.86},
  {w: "love", s: 227.86, e: 228.09},
  {w: "to", s: 228.09, e: 228.18},
  {w: "work", s: 228.18, e: 228.34},
  {w: "with", s: 228.34, e: 228.49},
  {w: "Core", s: 228.49, e: 228.65},
  {w: "H", s: 228.65, e: 228.82},
  {w: "R", s: 228.82, e: 228.97},
  {w: "X", s: 228.97, e: 229.46},
  {w: "and", s: 229.46, e: 229.61},
  {w: "help", s: 229.61, e: 229.77},
  {w: "you", s: 229.77, e: 229.85},
  {w: "create", s: 229.85, e: 230.1},
  {w: "content", s: 230.1, e: 230.57},
  {w: "that", s: 230.57, e: 230.67},
  {w: "people", s: 230.67, e: 231.05},
  {w: "actually", s: 231.05, e: 231.45},
  {w: "want", s: 231.45, e: 231.55},
  {w: "to", s: 231.55, e: 231.63},
  {w: "watch.", s: 231.63, e: 232.41},
  {w: "Thanks", s: 232.41, e: 232.59},
  {w: "for", s: 232.59, e: 232.65},
  {w: "your", s: 232.65, e: 232.77},
  {w: "time.", s: 232.77, e: 233.27},
];

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let activeIdx = -1;
  for (let i = 0; i < WORD_TIMES.length; i++) {
    if (t >= WORD_TIMES[i].s && t <= WORD_TIMES[i].e) {
      activeIdx = i;
      break;
    }
  }
  if (activeIdx < 0) {
    let best = -1, bestDiff = Infinity;
    for (let i = 0; i < WORD_TIMES.length; i++) {
      const diff = Math.abs(t - WORD_TIMES[i].s);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    activeIdx = best;
  }

  const WINDOW = 5;
  const lo = Math.max(0, activeIdx - WINDOW);
  const hi = Math.min(WORD_TIMES.length - 1, activeIdx + WINDOW);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: BAND_H,
        height: CAP_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1560,
          textAlign: "center",
          fontFamily: "\"Arial Black\", \"Helvetica Neue\", Arial, sans-serif",
          fontWeight: 900,
          fontSize: 58,
          lineHeight: 1.16,
          letterSpacing: -1.2,
          color: INK,
        }}
      >
        {WORD_TIMES.slice(lo, hi + 1).map((word, i) => {
          const absIdx = lo + i;
          const isActive = absIdx === activeIdx;

          const fadeIn = interpolate(t, [word.s - 0.05, word.s + 0.10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(t, [word.e - 0.01, word.e + 0.10], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const opacity = Math.min(fadeIn, fadeOut);

          return (
            <span
              key={absIdx}
              style={{
                display: "inline-block",
                opacity,
                boxShadow: isActive ? `inset 0 -0.3em 0 ${AMBER}` : "none",
              }}
            >
              {word.w}
              {i < hi - lo ? "\u00A0" : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// One scene: clip while the pencil is moving, the identical still after.
// Both are placed by the same two numbers, so the hand-off is invisible.
// ---------------------------------------------------------------------------
const SceneArt: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const nums = NUMS.filter((n) => n.scene === scene.idx + 1);
  const showClip = frame < scene.videoFrames;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        height: H,
        transform: `scale(${ART_S})`,
        transformOrigin: 'top left',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        {showClip ? (
          <OffthreadVideo
            src={A(scene.clip)}
            playbackRate={scene.rate}
            volume={PEN_VOLUME}
            style={{
              position: 'absolute',
              left: -(W * (CLIP_K - 1)) / 2,
              top: -(H * (CLIP_K - 1)) / 2,
              width: W * CLIP_K,
              height: H * CLIP_K,
            }}
          />
        ) : (
          <Img
            src={A(scene.still)}
            style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}
          />
        )}

        {nums.map((n, i) => {
          const local = Math.round((n.at - scene.start) * FPS);
          if (frame < local) return null;
          const p = interpolate(frame, [local, local + 9], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.back(2.2)),
          });
          return (
            <div
              key={`n-${i}`}
              style={{
                position: 'absolute',
                left: n.x,
                top: n.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                style={{
                  transform: `scale(${0.55 + 0.45 * p}) rotate(${n.rot ?? 0}deg)`,
                  opacity: Math.min(1, p * 2.2),
                  backgroundColor: n.sticker ? '#FFFFFF' : 'transparent',
                  border: n.sticker ? `7px solid ${INK}` : 'none',
                  borderRadius: n.sticker ? 20 : 0,
                  padding: n.sticker ? '8px 34px 18px' : 0,
                  boxShadow: n.sticker ? '10px 10px 0 rgba(26,26,26,0.12)' : 'none',
                  color: INK,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                    fontWeight: 900,
                    fontSize: n.size,
                    lineHeight: 1,
                    letterSpacing: n.sticker ? -3 : -2,
                  }}
                >
                  {n.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sound
//
// Voice leads. The pencil is baked into every clip and left quiet. The bed
// loops with fades at each seam and a long tail on the last pass. Effects are
// placed by their peak, not their first sample, so they land on the word.
// ---------------------------------------------------------------------------
type Cue = {
  src: string;
  at: number;
  vol: number;
  trimStart: number;
  trimEnd: number;
  peak: number;
};

const CUES: Cue[] = [
  // section turns
  { src: WHOOSH, at: 12.3, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 29.4, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 49.6, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 75.6, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 97.2, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 116.3, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 150.6, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 175.2, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  { src: WHOOSH, at: 200.0, vol: 0.09, trimStart: 0.04, trimEnd: 0.35, peak: 0.21 },
  // the five numbers, on the word that says them
  { src: POP, at: 141.572, vol: 0.16, trimStart: 0.19, trimEnd: 0.27, peak: 0.2 },
  { src: POP, at: 181.326, vol: 0.16, trimStart: 0.19, trimEnd: 0.27, peak: 0.2 },
  { src: POP, at: 185.02, vol: 0.16, trimStart: 0.19, trimEnd: 0.27, peak: 0.2 },
  { src: POP, at: 190.304, vol: 0.16, trimStart: 0.19, trimEnd: 0.27, peak: 0.2 },
  { src: POP, at: 226.338, vol: 0.16, trimStart: 0.19, trimEnd: 0.27, peak: 0.2 },
  // the packages land
  { src: THOCK, at: 175.2, vol: 0.1, trimStart: 0, trimEnd: 0.17, peak: 0.01 },
  { src: THOCK, at: 227.4, vol: 0.12, trimStart: 0, trimEnd: 0.17, peak: 0.01 },
];

const MusicBed: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const segFrames = Math.round(MUSIC_LEN * FPS);
  const loopCount = Math.ceil(durationInFrames / segFrames);

  return (
    <>
      {Array.from({ length: loopCount }, (_, i) => {
        const from = i * segFrames;
        const frames = Math.min(segFrames, durationInFrames - from);
        return (
          <Sequence key={`music-${i}`} from={from} durationInFrames={frames} name={`music-${i}`}>
            <Audio
              src={MUSIC}
              volume={(f) => {
                // 0.8s hand-off at every seam, 3s tail on the last pass.
                const fade = Math.round(0.8 * FPS);
                const tail = Math.round(3 * FPS);
                const out = Math.min(fade, frames);
                const head = interpolate(f, [0, fade], [0, MUSIC_VOLUME], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                if (i === loopCount - 1 && frames > tail) {
                  return Math.min(
                    head,
                    interpolate(f, [frames - tail, frames], [MUSIC_VOLUME, 0], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }),
                  );
                }
                return Math.min(
                  head,
                  interpolate(f, [frames - out, frames], [MUSIC_VOLUME, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                );
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
const CoreAgeRX: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
      {TIMELINE.map((sc) => (
        <Sequence key={`s${sc.idx}`} from={sc.from} durationInFrames={sc.frames} name={`s${sc.idx + 1}`}>
          <SceneArt scene={sc} />
        </Sequence>
      ))}

      <Captions />

      <Audio src={VOICE} />
      <MusicBed />

      {CUES.map((c, i) => {
        const from = Math.round((c.at - (c.peak - c.trimStart)) * FPS);
        const frames = Math.max(2, Math.ceil((c.trimEnd - c.trimStart) * FPS));
        return (
          <Sequence key={`sfx-${i}`} from={from} durationInFrames={frames} name={`sfx-${i}`}>
            <Audio src={c.src} startFrom={c.trimStart} volume={c.vol} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default CoreAgeRX;
