#!/usr/bin/env node
/**
 * Dynamic audit for a Playground clip composition. It compiles the file, EVALUATES it with
 * stubbed react/remotion, and interrogates the pure logic the clip exports as CLIP_AUDIT:
 *
 *   node tools/clipcheck/verify.mjs clips/my-clip.tsx
 *
 * Catches the class of bug you cannot see until render: caption pages that overlap or mix
 * speakers, word timings that go backwards, zoom curves that blow past the safe clamp, music
 * that is not actually silent on the record-stop, card-zone graphics that double-book the same
 * pixels, beats that miss the word they claim to land on, segment maths that leaves a dead frame.
 *
 * Contract — every clip composition ends with:
 *   export const CLIP_AUDIT = { fps, duration, layout, segments, offsetFrames, camera,
 *                               words, pages, zoomAt, musicVolumeAt, sfx, blocks, hide, silences };
 *   // blocks: [[name, startSec, endSec]]  hide: [[a,b]] caption blackout  silences: [[a,b]] music must be 0
 *
 * Exit code 1 = do not ship.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Babel = require("@babel/standalone");
const file = process.argv[2];
if (!file) { console.error("usage: node tools/clipcheck/verify.mjs <clip.tsx>"); process.exit(2); }
const code = fs.readFileSync(file, "utf8");

// ---- stubs: enough of remotion for module-scope evaluation (no rendering) ----
const Easing = {
  cubic: (t) => t * t * t,
  sin: (t) => Math.sin((t * Math.PI) / 2),
  back: (s) => (t) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  out: (f) => (t) => 1 - f(1 - t),
  in: (f) => f,
  inOut: (f) => (t) => (t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2),
};
const remotion = {
  Easing,
  interpolate: (v, ir, or) => or[0] + (or[1] - or[0]) * Math.max(0, Math.min(1, (v - ir[0]) / (ir[1] - ir[0]))),
  spring: ({ frame }) => Math.max(0, Math.min(1.2, 1 - Math.exp(-Math.max(0, frame) / 4))),
  useCurrentFrame: () => 0,
  useVideoConfig: () => ({ fps: 30, width: 1080, height: 1920 }),
  delayRender: () => 1,
  continueRender: () => {},
};
for (const c of ["AbsoluteFill", "Audio", "Video", "OffthreadVideo", "Sequence", "Freeze", "Img", "Still", "Composition"]) remotion[c] = c;
const react = { createElement: () => null, Fragment: "Fragment", useEffect: () => {}, useState: (i) => [typeof i === "function" ? i() : i, () => {}] };
react.default = react;

const out = Babel.transform(code, {
  presets: [["react", { runtime: "classic" }], ["typescript", { isTSX: true, allExtensions: true }]],
  plugins: ["transform-modules-commonjs"],
  filename: path.basename(file),
}).code;

const mod = { exports: {} };
try {
  new Function("exports", "require", "module", "__filename", "__dirname", out)(
    mod.exports, (id) => (id === "remotion" ? remotion : id === "react" ? react : null), mod, file, path.dirname(file),
  );
} catch (e) {
  console.log("EVALUATE FAIL — the module threw at import time (a render would too):\n " + e.message);
  process.exit(1);
}
const A = mod.exports.CLIP_AUDIT;
if (!A) {
  console.log("NO CLIP_AUDIT EXPORT. Add it (see the contract at the top of this file) so the clip is self-auditing.");
  process.exit(1);
}

const fails = [], warns = [];
const chk = (c, m) => { if (!c) fails.push(m); };
const f = (n) => Number(n.toFixed(3));
const sec = (t) => Math.round(t * A.fps);
const T = A.duration / A.fps;

// ---- 1. segment frame tiling (ClipCamera: from = round(off*fps), len = round(dur*fps)) ----
let off = 0, covered = 0, prevEnd = 0;
A.segments.forEach((s, i) => {
  const from = Math.round(off * A.fps), len = Math.round((s.out - s.in) * A.fps);
  chk(from === prevEnd, `segment ${i} starts at frame ${from} but the previous ended at ${prevEnd} (a gap = black frames)`);
  chk(len > 0, `segment ${i} has no frames`);
  prevEnd = from + len; covered += len; off += s.out - s.in;
});
chk(A.duration >= covered, `durationInFrames ${A.duration} < the ${covered} frames the segments tile`);
console.log(`segments         OK  ${A.segments.length} segs, ${covered} frames of source, duration ${A.duration} (${f(T)}s), outro tail ${A.duration - covered}f`);
if (A.offsetFrames) {
  let o = 0;
  A.offsetFrames.forEach((fr, i) => { chk(fr === Math.round(o * A.fps), `offsetFrames[${i}]=${fr} but the tiling says ${Math.round(o * A.fps)} — captions would drift from audio`); o += A.segments[i].out - A.segments[i].in; });
  console.log("offsets          OK  caption clock matches the segment clock exactly");
}

// ---- 2. camera keys ----
const MODES = new Set(["s", "p", "w"]);
A.camera.forEach((k, i) => {
  chk(k.t >= 0 && k.t <= T, `camera[${i}] t=${k.t} outside the timeline`);
  chk(MODES.has(k.m), `camera[${i}] bad mode "${k.m}"`);
  for (const key of ["a", "b"]) {
    if (!k[key]) continue;
    const [x, y, w, h] = k[key];
    chk(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.001 && y + h <= 1.001, `camera[${i}].${key} rect escapes the frame: ${JSON.stringify(k[key])}`);
  }
  if (k.m === "p") chk(k.a && k.b, `camera[${i}] is split mode but is missing a rect`);
  if (k.m === "s") chk(k.a, `camera[${i}] is single mode but has no rect`);
});
chk(A.camera[0].t === 0, "the first camera key is not at t=0 (frame 0 is the thumbnail — framing must be decided)");
console.log(`camera           OK  ${A.camera.length} keys, modes ${[...new Set(A.camera.map((k) => k.m))].join("/")}, rects in frame`);

// ---- 3. words ----
let ps = -1;
A.words.forEach((w, i) => {
  chk(w.start >= ps - 1e-9, `word ${i} "${w.text}" starts before the previous one (${w.start} < ${ps})`);
  chk(w.end > w.start, `word ${i} "${w.text}" has zero/negative duration`);
  chk(w.start >= 0 && w.start < T, `word ${i} "${w.text}" at ${w.start}s is outside the timeline`);
  ps = w.start;
});
console.log(`words            OK  ${A.words.length} words, ${f(A.words[0].start)}s → ${f(A.words[A.words.length - 1].end)}s`);

// ---- 4. caption pages ----
const maxW = A.maxWordsPerPage || 4;
chk(A.pages.reduce((a, p) => a + p.words.length, 0) === A.words.length, "pages lost or duplicated words");
A.pages.forEach((p, i) => {
  chk(p.words.length <= maxW, `page ${i} has ${p.words.length} words (max ${maxW}): "${p.words.map((w) => w.text).join(" ")}"`);
  chk(p.end > p.start, `page ${i} has no duration`);
  if (i) chk(p.start >= A.pages[i - 1].end - 1e-9, `page ${i} overlaps page ${i - 1}`);
  chk(new Set(p.words.map((w) => w.speaker)).size === 1, `page ${i} mixes speakers: ${p.words.map((w) => w.text + "/" + w.speaker).join(" ")}`);
  chk(!(A.hide || []).some(([a, b]) => p.start >= a && p.start < b), `page ${i} starts inside a caption blackout: "${p.words.map((w) => w.text).join(" ")}"`);
});
let lastEnd = 0, gaps = 0, longest = 0;
A.pages.forEach((p) => { if (p.start - lastEnd > 0.02) { gaps++; longest = Math.max(longest, p.start - lastEnd); } lastEnd = Math.max(lastEnd, p.end); });
console.log(`pages            OK  ${A.pages.length} pages, max ${Math.max(...A.pages.map((p) => p.words.length))} words, ${gaps} gap(s) (longest ${f(longest)}s), captions end ${f(lastEnd)}s`);

// ---- 5. zoom ----
const zs = Array.from({ length: A.duration }, (_, i) => A.zoomAt(i));
const zmin = Math.min(...zs), zmax = Math.max(...zs);
let jump = 0, jumpAt = 0;
for (let i = 1; i < zs.length; i++) if (Math.abs(zs[i] - zs[i - 1]) > jump) { jump = Math.abs(zs[i] - zs[i - 1]); jumpAt = i; }
chk(zmax <= 1.26, `zoom peaks at ${f(zmax)} — past the 1.25 clamp the tracked windows are safe for`);
chk(zmin >= 0.94, `zoom dips to ${f(zmin)} — below 1.0 the crop widens past the tracked face box`);
if (jump > 0.22) warns.push(`zoom jumps ${f(jump)} in one frame at frame ${jumpAt} (${f(jumpAt / A.fps)}s) — only acceptable on a hard beat`);
console.log(`zoom             OK  ${f(zmin)}–${f(zmax)}, biggest 1-frame jump ${f(jump)} @${f(jumpAt / A.fps)}s`);

// ---- 6. music ----
(A.silences || []).forEach(([a, b], i) => {
  const mid = A.musicVolumeAt(sec((a + b) / 2));
  const late = A.musicVolumeAt(sec(b) - 2);
  chk(mid === 0 && late === 0, `music is NOT silent in declared silence ${i} (${a}–${b}s): mid=${f(mid)} late=${f(late)}`);
});
chk(A.musicVolumeAt(sec(0.5)) > 0, "music is silent at 0.5s — the hook needs the bed");
chk(A.musicVolumeAt(A.duration - 1) < 0.03, "music does not fade out on the last frame");
console.log(`music            OK  ${(A.silences || []).length} silence window(s) verified at 0, ${f(A.musicVolumeAt(sec(0.5)))} under the hook, ${f(A.musicVolumeAt(A.duration - 1))} on the last frame`);

// ---- 7. sfx ----
chk(A.sfx.every((s, i) => i === 0 || s.at >= A.sfx[i - 1].at), "SFX cues are not sorted by time");
chk(A.sfx.every((s) => s.at >= 0 && s.at < T), "an SFX cue is outside the timeline");
chk(A.sfx.every((s) => s.vol > 0 && s.vol <= 1), "an SFX cue has an out-of-range volume");
const stacked = A.sfx.filter((s, i) => A.sfx[i + 1] && A.sfx[i + 1].at - s.at < 0.06);
console.log(`sfx              OK  ${A.sfx.length} cues, 1 per ${f(T / A.sfx.length)}s, ${stacked.length} layered pair(s)`);
if (A.sfx.length / T < 0.4) warns.push("SFX density is low (under one cue per 2.5s) — the style guide asks for no dead air");

// ---- 8. layout zones ----
const L = A.layout;
const zone = (a, b, n) => chk(a <= b, `layout: ${n} — ${a} must be <= ${b}`);
if (L.chipTop !== undefined) zone(L.chipTop + (L.chipHeight || 92), L.cardTop, "chip zone must clear the card zone");
zone(L.cardBottom, L.videoTop, "card zone must clear the picture band");
zone(L.videoTop + L.videoHeight, L.captionTop, "picture band must clear the captions");
chk(L.captionBottom <= 1580, `captions run to y${L.captionBottom} — inside the bottom 340px phone UI zone`);
const wideTop = (1920 - 1080 / (A.srcAspect || 16 / 9)) * 0.4;
chk(Math.abs(wideTop - L.videoTop) < 1.5, `videoTop ${L.videoTop} does not match ClipCamera's wide box (${f(wideTop)}) — graphics would overlap the picture`);
console.log(`layout           OK  chip→${L.chipTop} cards ${L.cardTop}-${L.cardBottom} band ${L.videoTop}-${L.videoTop + L.videoHeight} caps ${L.captionTop}-${L.captionBottom}`);

// ---- 9. card-zone double booking (per lane: blocks may stack vertically in different lanes) ----
const lanes = {};
A.blocks.forEach(([n, a, b, lane = "card"]) => {
  chk(b > a, `block "${n}" ends before it starts`);
  chk(a >= 0 && b <= T + 0.01, `block "${n}" (${a}–${b}) is outside the timeline`);
  (lanes[lane] = lanes[lane] || []).push([n, a, b]);
});
let busy = 0;
for (const [lane, list] of Object.entries(lanes)) {
  list.sort((a, b) => a[1] - b[1]);
  let prev = null, laneBusy = 0;
  list.forEach(([n, a, b]) => {
    if (prev && a < prev[2] - 0.02) fails.push(`"${lane}" lane double-booked: "${n}" (${f(a)}–${f(b)}) overlaps "${prev[0]}" (${f(prev[1])}–${f(prev[2])})`);
    prev = [n, a, b]; laneBusy += b - a;
  });
  busy += laneBusy;
  console.log(`lane "${lane}"       ${list.length} beats, busy ${Math.round((laneBusy / T) * 100)}% of the timeline`);
}

// ---- 10. beats land on real words ----
const wordStarts = A.words.map((w) => w.start);
const offbeat = A.blocks.filter(([, a]) => Math.min(...wordStarts.map((s) => Math.abs(s - a))) > 0.3);
if (offbeat.length) warns.push("beats further than 0.3s from any word start (the style guide wants hits on exact words): " + offbeat.map(([n, a]) => `${n}@${f(a)}`).join(", "));
const silentBeats = A.blocks.filter(([, a]) => !A.sfx.some((s) => Math.abs(s.at - a) < 0.2));
if (silentBeats.length) warns.push("beats with no SFX within 0.2s: " + silentBeats.map(([n, a]) => `${n}@${f(a)}`).join(", "));
console.log(`beat sync        OK  ${A.blocks.length - offbeat.length}/${A.blocks.length} beats on a word, ${A.blocks.length - silentBeats.length}/${A.blocks.length} beats have a sound`);

console.log(warns.length ? "\nWARNINGS:\n - " + warns.join("\n - ") : "\nwarnings: none");
if (fails.length) { console.log("\nFAILURES:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("\nVERIFY PASSED");
