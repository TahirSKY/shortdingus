/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1196, "width": 1080, "height": 1920 } */

/* HIGH SCHOOLER CLAIMS 150R TRADES — Alpha Futures / clipping hub
 * Source: "9. 5 Traders, $500,000 On The Line" (id 51aabf2b…) | cut 111630f2 (ranges 114–125.88, 154–186.4)
 * 39.87s = 1196 frames @30fps. Segments tile 71 + 255 + 825 = 1151 frames, then a 45-frame freeze outro.
 *
 * STRUCTURE
 *   HOOK  source 170.58–172.94  plays 0.000–2.367   "my highest is like 150 or something" — the claim first
 *   SEG 1 source 115.84–124.34  plays 2.367–10.867  the "high school" disbelief loop (6 repetitions)
 *   SEG 2 source 157.38–184.87  plays 10.867–38.367 the R:R interrogation and the roast
 *   OUTRO freeze of source 184.80  plays 38.367–39.867  buzzer verdict + CTA
 * The hook is stitched from inside the cut's second range, so no re-cut is needed.
 *
 * BEAT MAP (clip seconds — every one sits on a real transcript word)
 *   0.00  cold open: wide panel + "HIS BEST TRADE = 150R" + "HE'S IN HIGH SCHOOL"; 0.92 "150" slams
 *   2.37  white flash + "55 SECONDS EARLIER"
 *   3.09  "no school… wake up at 9 o'clock" → schedule card
 *   5.03  "School like university?" → question card + comment bait
 *   6.57  "High school." → HIGH SCHOOL counter starts; ticks at 7.45 / 8.11 / 8.63 / 9.27 / 9.97 (×6)
 *   10.95 "How high RR?" → the interrogation card
 *   12.17 "Average um 30, 40." → odometer 0→30R→40R; R CHIP pins at 12.75 and never leaves
 *   13.99 "Tight, I'm good." → reaction flag    17.57 "Really tight." → reaction flag
 *   18.23 "you're swing trading?" → SWING ✗ / INTRADAY ✓ lanes (20.67 "No, no, intraday.")
 *   21.65 "Intraday, 30R on it. That's your average trade?" → the judge repeats it back
 *   24.07 "my highest is like 150" → 24.99 HERO: 150R slam, flash, shake, vine boom, music dips
 *   26.43 stunned gap → lost-for-words meme; 26.91 "Your highest is 150?" → disbelief card
 *   28.77 "I'm gonna level you here, bud." → THE ROAST stamp
 *   30.20 "I've heard enough already." → verdict card
 *   33.21 "this is bad." → 33.73 "This is wrong." → glass shatter + red vignette
 *   35.71 "where's the red buzzer?" → music OUT, red buzzer slams at 36.65 and again at 37.69
 *   38.37 freeze outro: BUZZED? + "WOULD YOU FUND HIM?" CTA
 *
 * BRAND: the Alpha Futures stamp (asset 448984fa…) is on screen from frame 0 to the last frame,
 * top-right, outside the shake wrapper so it stays steady like a broadcast bug.
 */

import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, Video, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ── CORE ──────────────────────────────────────────────────────
const FPS = 30;
const DURATION = 1196;
const WIDTH = 1080;
const HEIGHT = 1920;

const assetUrl = (id) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;

const SOURCE = assetUrl("51aabf2b-198c-458c-a61d-6e51867b21e5");
const SOURCE_ASPECT = 1920 / 1080;

const ASSETS = {
  brandStamp: assetUrl("448984fa-9232-4602-ae6c-61eb1c571e78"), // Alpha Futures Clip Stamp (1).png
  lostForWordsMeme: assetUrl("c7e487de-a071-4b65-822e-302558a893fc"), // hub library (saved for the first-payout clip)
  music: assetUrl("6352a623-f2b1-490f-a85c-76c4eb683b34"),
  sfx: {
    impactDeep: assetUrl("995ca7bb-0444-4f5e-9f27-1f4c8b44472f"),
    impactSoft: assetUrl("599a8103-6cc7-4b36-8b2c-159af900165a"),
    stampHit: assetUrl("72187c30-49d0-4a52-821c-ae1cf92be0be"),
    popReveal: assetUrl("c52d697f-f404-484e-881d-0349bc9d3b69"),
    whooshSoft: assetUrl("8000d709-85ee-4aa4-aad0-9fc84130d93b"),
    whooshReverse: assetUrl("80e6e5be-4def-45d8-a36a-b3a7da5c7a3b"),
    riserSoft: assetUrl("377b15fe-2f65-42df-9c9a-0830ea894bf9"),
    clockTick: assetUrl("4205bf00-25d2-457b-a974-07049914196a"),
    uiClick: assetUrl("b4bb2b99-a6c9-42f3-b3d6-816cca355aad"),
    uiToggleOn: assetUrl("aabeb8f0-a7f1-4ab0-ad37-96400b3f90f6"),
    glitchZap: assetUrl("2cc421c1-88d4-49bd-bf96-cbbbab9f26b7"),
    pageFlip: assetUrl("bd1da89a-d920-406c-a3d6-5a42c9e1c773"),
    vineBoom: assetUrl("481c86b6-b771-451d-b2db-2bc32d40ef0c"), // comedy: the claim lands
    animeWow: assetUrl("5061384f-77c9-4b43-b281-6c5c6c62c443"), // comedy: "high school"
    glassShatter: assetUrl("f0f55f2e-a7fa-4d16-b3d6-5251c5e7c96e"), // comedy: "this is wrong"
  },
};

const COLORS = {
  bg: "#07090d",
  white: "#FFFFFF",
  yellow: "#FFE600",
  red: "#FF3B3B",
  green: "#00E676",
  gold: "#FFC53D",
  panel: "#0f141c",
  panelBorder: "rgba(255,255,255,0.08)",
  gridLine: "rgba(0,230,118,0.06)",
  shadow: "0 24px 60px rgba(0,0,0,0.65), 0 6px 18px rgba(0,0,0,0.5)",
};

// Zones never collide. videoTop/videoHeight is exactly ClipCamera's wide box: (1920 - 1080/(16/9)) * 0.4 = 525.
const LAYOUT = { chipTop: 100, chipHeight: 92, cardTop: 214, cardBottom: 512, videoTop: 525, videoHeight: 608, captionTop: 1180, captionBottom: 1500, ctaTop: 548, stampTop: 36, stampRight: 36 };

const SEGMENTS = [
  { in: 170.58, out: 172.94 },
  { in: 115.84, out: 124.34 },
  { in: 157.38, out: 184.87 },
];
// Frame-exact offsets (ClipCamera: from = round(off*fps)). Captions use the SAME clock as the audio.
const OFFSET_FRAMES = [0, 71, 326];
const SEG_TOTAL_FRAMES = 1151;
const OUTRO = { start: SEG_TOTAL_FRAMES / FPS, end: DURATION / FPS, freezeSourceTime: 184.8, rect: [0.456, 0.111, 0.281, 0.889] };

// Real face track (browser MediaPipe, 144 samples), shifted by the 71-frame hook.
// Speakers matched to faces: A→P3 (judge, right), G→P1 (the high schooler, left).
const CAMERA = [
  { m: "w", t: 0, cut: 1 }, // hook: the tracker has no face rect for source 170.6–172.9, so it is wide
  { m: "w", t: 2.367, cut: 1 },
  { m: "p", a: [0, 0.214, 0.347, 0.548], b: [0.632, 0.214, 0.339, 0.536], t: 4.867, cut: 1 },
  { m: "s", a: [0.698, 0.188, 0.206, 0.65], t: 6.117 },
  { m: "p", a: [0.002, 0.217, 0.338, 0.534], b: [0.621, 0.202, 0.363, 0.574], t: 7.367 },
  { m: "w", t: 7.617, cut: 1 },
  { m: "p", a: [0.259, 0.166, 0.399, 0.631], b: [0.569, 0.135, 0.431, 0.681], t: 10.867, cut: 1 },
  { m: "w", t: 11.867, cut: 1 },
  { m: "s", a: [0.383, 0.016, 0.24, 0.757], t: 13.117 },
  { m: "s", a: [0.379, 0.024, 0.309, 0.976], t: 13.867, cut: 1 },
  { m: "s", a: [0.337, 0, 0.316, 1], t: 15.867, cut: 1 },
  { m: "w", t: 16.867, cut: 1 },
  { m: "s", a: [0.283, 0, 0.315, 0.995], t: 26.867, cut: 1 },
  { m: "s", a: [0.299, 0, 0.316, 1], t: 28.117, cut: 1 },
  { m: "s", a: [0.299, 0.017, 0.308, 0.974], t: 28.867, cut: 1 },
  { m: "s", a: [0.368, 0.054, 0.299, 0.946], t: 31.867, cut: 1 },
  { m: "s", a: [0.32, 0.017, 0.311, 0.983], t: 32.617, cut: 1 },
  { m: "s", a: [0.336, 0.013, 0.289, 0.914], t: 34.367, cut: 1 },
  { m: "w", t: 36.617, cut: 1 },
  { m: "s", a: [0.387, 0.073, 0.293, 0.927], t: 36.867, cut: 1 },
  { m: "s", a: [0.456, 0.111, 0.281, 0.889], t: 37.617 },
];

// ── BEAT TIMES (clip seconds; each one is a real word start) ──
const HOOK = { slam: 0.92, flash: 2.28, cut: 2.367 };
const REWIND = { at: 2.447, out: 3.6 };
const SCHOOL = { card: 3.087, cardOut: 5.0, uni: 5.027, uniOut: 6.55, count: 6.567, countOut: 10.867, ticks: [6.567, 7.447, 8.107, 8.627, 9.267, 9.967] };
const RR = { q: 10.947, qOut: 12.15, avg: 12.167, thirty: 12.747, forty: 13.227, avgOut: 15.2 };
const FLAGS = { tight: 13.987, tightOut: 15.2, really: 17.567, reallyOut: 18.2 };
const SILENCE = { at: 15.35, out: 17.55 }; // source 162.14-164.08: nobody speaks for 1.9s
const STYLE = { lanes: 18.227, intraday: 20.667, lanesOut: 21.6 };
const BACK = { at: 21.647, average: 23.327, out: 24.05 };
const CLAIM = { at: 24.067, slam: 24.987, out: 26.4 };
const MEME = { at: 26.43, out: 28.8 };
const DOUBT = { at: 26.907, out: 28.75 };
const ROAST = { at: 28.767, out: 30.18 };
const ENOUGH = { at: 30.197, out: 33.2 };
const WRONG = { bad: 33.207, wrong: 33.727, out: 35.7 };
const BUZZER = { ask: 35.707, hit: 36.647, hit2: 37.687, out: OUTRO.start };
const CHIP = { pin: 12.747, forty: 13.227, best: 24.987 };

// ── WORDS [word, sourceStart, sourceEnd, speaker] in SOURCE seconds ──
// Four transcript fixes, captions only (the audio is never touched):
//   "like?" 115.54 and "whole—" 157.36 start before their segment's in-point → never audible, dropped
//   "Wake" 124.22 is cut off by the segment out-point → dropped
//   A's "Yeah, I have a tight." (162.14, five 20ms words) is ASR noise echoing C's "Tight, I'm good." → dropped
const HOOK_WORDS = [
  ["Yeah,", 170.58, 170.7, "G"], ["but", 170.7, 170.82, "G"], ["my", 170.82, 170.94, "G"], ["highest", 170.94, 171.12, "G"], ["is", 171.12, 171.42, "G"], ["like", 171.42, 171.5, "G"], ["150", 171.5, 172.52, "G"], ["or", 172.52, 172.64, "G"], ["something.", 172.64, 172.94, "G"],
];

const SEG1_WORDS = [
  ["So", 115.92, 116.02, "G"], ["if", 116.02, 116.2, "G"], ["I", 116.2, 116.3, "G"], ["don't", 116.3, 116.44, "G"], ["have", 116.44, 116.56, "G"], ["school,", 116.56, 117.08, "G"], ["wake", 117.08, 117.22, "G"], ["up", 117.22, 117.42, "G"], ["at", 117.42, 117.58, "G"], ["9", 117.58, 117.8, "G"], ["o'clock.", 117.8, 118.2, "G"],
  ["School", 118.5, 118.62, "A"], ["like", 118.62, 119.04, "A"], ["university?", 119.04, 120.04, "A"],
  ["High", 120.04, 120.14, "A"], ["school.", 120.14, 120.92, "A"],
  ["High", 120.92, 120.94, "C"], ["school?", 120.94, 120.94, "C"],
  ["College?", 120.94, 121.58, "B"],
  ["High", 121.58, 121.68, "G"], ["school,", 121.68, 122.08, "G"], ["like", 122.08, 122.1, "G"], ["high", 122.1, 122.3, "G"], ["school.", 122.3, 122.74, "G"],
  ["High", 122.74, 122.9, "A"], ["school?", 122.9, 123.44, "A"],
  ["High", 123.44, 123.52, "A"], ["school.", 123.52, 124.22, "A"], ["Yeah.", 124.22, 124.22, "A"],
];

const SEG2_WORDS = [
  ["How", 157.46, 157.68, "A"], ["high", 157.68, 157.92, "A"], ["RR?", 157.92, 158.52, "A"],
  ["Average", 158.68, 158.87, "G"], ["um", 158.87, 158.91, "G"], ["30,", 159.26, 159.74, "G"], ["40.", 159.74, 160.5, "G"],
  ["Tight,", 160.5, 160.92, "C"], ["I'm", 160.92, 161.08, "C"], ["good.", 161.08, 161.72, "C"],
  ["40R?", 161.72, 162.14, "G"],
  ["Really", 164.08, 164.32, "G"], ["tight.", 164.32, 164.74, "G"],
  ["But", 164.74, 164.88, "B"], ["you,", 164.88, 165.32, "B"], ["you're", 165.32, 165.48, "B"], ["gonna", 165.48, 165.48, "B"], ["mean", 165.48, 165.98, "B"], ["you're", 165.98, 166.4, "B"], ["swing", 166.4, 166.46, "B"], ["trading?", 166.46, 167.18, "B"],
  ["No,", 167.18, 167.42, "G"], ["no,", 167.42, 167.42, "G"], ["intraday.", 167.42, 168.02, "G"],
  ["Intraday,", 168.16, 168.6, "B"], ["30R", 168.6, 169.1, "B"], ["on", 169.1, 169.32, "B"], ["it.", 169.32, 169.6, "B"],
  ["That's", 169.6, 169.74, "B"], ["your", 169.74, 169.84, "B"], ["average", 169.84, 170.08, "B"], ["trade?", 170.08, 170.58, "B"],
  ["Yeah,", 170.58, 170.7, "G"], ["but", 170.7, 170.82, "G"], ["my", 170.82, 170.94, "G"], ["highest", 170.94, 171.12, "G"], ["is", 171.12, 171.42, "G"], ["like", 171.42, 171.5, "G"], ["150", 171.5, 172.52, "G"], ["or", 172.52, 172.64, "G"], ["something.", 172.64, 172.94, "G"],
  ["Your", 173.42, 173.48, "A"], ["highest", 173.48, 173.76, "A"], ["is", 173.76, 173.92, "A"], ["150?", 173.92, 174.5, "A"],
  ["Yeah.", 174.5, 175.28, "G"],
  ["I'm", 175.28, 175.44, "A"], ["gonna,", 175.44, 175.6, "A"], ["I'm", 175.6, 175.74, "A"], ["gonna", 175.74, 175.86, "A"], ["level", 175.86, 176.08, "A"], ["you", 176.08, 176.26, "A"], ["here,", 176.26, 176.4, "A"], ["bud.", 176.4, 176.5, "A"],
  ["Yeah,", 176.71, 177.26, "A"], ["I", 177.26, 177.26, "A"], ["think", 177.26, 177.46, "A"], ["I've", 177.46, 177.68, "A"], ["heard", 177.68, 177.72, "A"], ["enough", 177.72, 177.98, "A"], ["already.", 177.98, 178.53, "A"],
  ["Yeah,", 178.69, 179.24, "B"], ["you", 179.24, 179.26, "B"], ["know,", 179.26, 179.72, "B"], ["this", 179.72, 179.82, "B"], ["is", 179.82, 180.02, "B"], ["bad.", 180.02, 180.24, "B"],
  ["This", 180.24, 180.36, "A"], ["is", 180.36, 180.56, "A"], ["wrong.", 180.56, 180.86, "A"],
  ["I", 180.86, 180.96, "A"], ["think", 180.96, 181.1, "A"], ["I've", 181.1, 181.34, "A"], ["heard", 181.34, 181.38, "A"], ["enough", 181.38, 181.6, "A"], ["already.", 181.6, 182.15, "A"],
  ["I", 182.22, 182.24, "E"], ["mean,", 182.24, 182.38, "E"], ["I", 182.38, 182.38, "E"], ["mean,", 182.38, 183.16, "E"], ["where's", 183.16, 183.56, "E"], ["the", 183.56, 183.62, "E"], ["red", 183.62, 183.78, "E"], ["buzzer?", 183.78, 184.18, "E"],
  ["Where's", 184.2, 184.3, "E"], ["the", 184.3, 184.4, "E"], ["red", 184.4, 184.5, "E"], ["buzzer?", 184.5, 184.75, "E"],
];

const MAX_WORDS_PER_PAGE = 4;
const PAGE_GAP_BREAK = 0.45;

// Money-in / technical = green, danger / roast = red, hook words = yellow (house system).
const RED_WORDS = new Set(["high", "school", "college", "wrong", "bad", "buzzer", "red", "level", "no", "swing", "enough", "heard"]);
const GREEN_WORDS = new Set(["150", "30,", "40.", "30r", "40r", "intraday", "average", "highest", "tight,", "tight.", "good.", "really"]);

// ── FONT (kit, verbatim) ──

// ─────────────────────────────────────────────────────────────
// 1. FONT — Montserrat, loaded through the FontFace API and gated with delayRender.
//    A bare CSS @import can paint frames before the font arrives on Lambda and silently
//    fall back to Impact, so the render waits for the real woff2 (6s safety net).
// ─────────────────────────────────────────────────────────────

const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=block";
const FONT_CSS = `@import url('${FONT_CSS_URL}');`;
const FONT = "'Montserrat', Impact, sans-serif";
const MONO_FONT = '"Courier New", Courier, monospace';

const useMontserrat = () => {
  const [handle] = useState(() => delayRender("Loading Montserrat"));
  useEffect(() => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        continueRender(handle);
      }
    };
    const safety = setTimeout(done, 6000);
    (async () => {
      const css = await fetch(FONT_CSS_URL).then((r) => r.text());
      const jobs = [];
      (css.match(/@font-face\s*{[^}]*}/g) || []).forEach((block) => {
        if (/unicode-range/.test(block) && !/U\+0000-00FF/.test(block)) return; // latin subset only
        const weight = /font-weight:\s*(\d+)/.exec(block);
        const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block);
        if (!weight || !url) return;
        const face = new FontFace("Montserrat", `url(${url[1]})`, {
          weight: weight[1],
          style: "normal",
        });
        document.fonts.add(face);
        jobs.push(face.load());
      });
      await Promise.all(jobs);
      done();
    })().catch(done);
    return () => {
      clearTimeout(safety);
      done();
    };
  }, [handle]);
};

// ── TRANSCRIPT REPAIR + PAGING + ZOOM MATHS (kit, verbatim) ──
const repairWords = (list) => {
  const out = list.map(([text, s, e, speaker]) => ({ text, s, e, orig: s, speaker }));
  const solid = (w) => w.e - w.s >= 0.05;
  let i = 0;
  while (i < out.length) {
    if (!solid(out[i])) {
      let j = i;
      while (j + 1 < out.length && !solid(out[j + 1])) j++;
      const runStart = out[i].s;
      const next = out[j + 1];
      const runEnd = Math.max(out[j].e + 0.06, next ? next.s : out[j].e + 0.24);
      const step = (runEnd - runStart) / (j - i + 1);
      for (let k = i; k <= j; k++) {
        out[k].s = runStart + (k - i) * step;
        out[k].e = runStart + (k - i + 1) * step;
      }
      i = j + 1;
    } else i++;
  }
  for (let k = 0; k < out.length; k++) {
    if (k > 0 && out[k].s < out[k - 1].e) out[k].s = Math.min(out[k - 1].e, out[k].orig + 0.4);
    out[k].e = Math.max(out[k].e, out[k].s + 0.08);
  }
  return out;
};

const normalizeWord = (w) =>
  w
    .toLowerCase()
    .replace(/[^a-z0-9$%.]/g, "")
    .replace(/^\.+|\.+$/g, "");

const buildPages = (words) => {
  const pages = [];
  let current = [];
  words.forEach((word, i) => {
    const prev = words[i - 1];
    const breakHere =
      current.length > 0 &&
      (current.length >= MAX_WORDS_PER_PAGE || prev.speaker !== word.speaker || word.start - prev.end > PAGE_GAP_BREAK || /[.?!]$/.test(prev.text) || (current.length >= 3 && /[,—]$/.test(prev.text)));
    if (breakHere) {
      pages.push(current);
      current = [];
    }
    current.push(word);
  });
  if (current.length) pages.push(current);
  return pages.map((ws, i) => {
    const next = pages[i + 1];
    const last = ws[ws.length - 1];
    const holdEnd = next ? Math.min(next[0].start, last.end + 0.5) : last.end + 0.5;
    return { words: ws, start: ws[0].start, end: holdEnd, speaker: ws[0].speaker };
  });
};

const EASES = {
  snap: Easing.out(Easing.back(2.2)),
  smooth: Easing.inOut(Easing.cubic),
  linear: Easing.inOut(Easing.sin),
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, p) => a + (b - a) * p;

const zoomAt = (frame) => {
  const t = frame / FPS;
  if (t <= ZOOM_KEYS[0].t) return ZOOM_KEYS[0].z;
  let startVal = ZOOM_KEYS[0].z;
  for (let i = 0; i < ZOOM_KEYS.length; i++) {
    const key = ZOOM_KEYS[i];
    const next = ZOOM_KEYS[i + 1];
    const valueAt = (tau) => {
      const p = key.dur <= 0 ? 1 : clamp01((tau - key.t) / key.dur);
      return lerp(startVal, key.z, EASES[key.ease](p));
    };
    if (!next || t < next.t) return valueAt(t);
    startVal = valueAt(next.t);
  }
  return startVal;
};

// ── CAPTION CLOCK ─────────────────────────────────────────────
// Source seconds → clip seconds, on the SAME frame clock ClipCamera uses (OFFSET_FRAMES),
// so a caption can never drift from the audio it belongs to.
const toClipWords = (list, i) => {
  const shift = SEGMENTS[i].in - OFFSET_FRAMES[i] / FPS;
  return repairWords(list).map((w) => ({ text: w.text, start: +(w.s - shift).toFixed(3), end: +(w.e - shift).toFixed(3), speaker: w.speaker }));
};

const WORDS = [...toClipWords(HOOK_WORDS, 0), ...toClipWords(SEG1_WORDS, 1), ...toClipWords(SEG2_WORDS, 2)].filter((w) => w.start >= 0 && w.start < DURATION / FPS);

const keyColorFor = (w) => {
  const n = normalizeWord(w);
  if (RED_WORDS.has(n)) return COLORS.red;
  if (GREEN_WORDS.has(n)) return COLORS.green;
  return null;
};

// G is the high schooler (tracked face P1); A/B/C/E are the panel's judges.
const speakerTag = (speaker) => (speaker === "G" ? "KID" : "JUDGE");

const CAPTION_PAGES = buildPages(WORDS);

// The freeze outro is a full-frame takeover: no captions over it.
const CAPTION_HIDE_RANGES = [[OUTRO.start, OUTRO.end]];
const isFreeze = (t) => CAPTION_HIDE_RANGES.some(([a, b]) => t >= a && t < b);
const CAPTION_STRIKE = { start: -1, end: -1 }; // no strike-through beat in this clip

// ── ZOOM ──────────────────────────────────────────────────────
// One pure curve feeding ClipCamera's zoom. CropView divides the tracked rect by zoom, so a
// punch-in crops INSIDE the window and can never bleed into the cards or the captions.
// Kept modest (<=1.06) inside "p" split windows, harder (<=1.24) in wide/single windows.
const ZOOM_KEYS = [
  { t: 0, z: 1.0, dur: 0, ease: "smooth" },
  { t: 0.05, z: 1.14, dur: 2.2, ease: "linear" }, // slow push under the cold-open headline
  { t: 2.367, z: 1.0, dur: 0, ease: "smooth" }, // rewind cut → wide
  { t: 2.5, z: 1.06, dur: 2.2, ease: "linear" }, // drift through the high-school loop
  { t: 4.867, z: 1.04, dur: 0.3, ease: "smooth" }, // split
  { t: 6.117, z: 1.16, dur: 0.14, ease: "snap" }, // "university?"
  { t: 6.567, z: 1.2, dur: 0.14, ease: "snap" }, // "High school." — the reveal
  { t: 7.367, z: 1.04, dur: 0.25, ease: "smooth" }, // split
  { t: 7.617, z: 1.0, dur: 0.25, ease: "smooth" }, // wide
  { t: 8.107, z: 1.08, dur: 0.14, ease: "snap" }, // counter ×3
  { t: 9.967, z: 1.14, dur: 0.14, ease: "snap" }, // counter ×6
  { t: 10.867, z: 1.05, dur: 0.3, ease: "smooth" }, // split
  { t: 11.867, z: 1.0, dur: 0.3, ease: "smooth" }, // wide
  { t: 12.747, z: 1.12, dur: 0.14, ease: "snap" }, // "30,"
  { t: 13.227, z: 1.18, dur: 0.14, ease: "snap" }, // "40."
  { t: 13.867, z: 1.1, dur: 0.3, ease: "smooth" },
  { t: 15.207, z: 1.2, dur: 0.14, ease: "snap" }, // "40R?"
  { t: 15.867, z: 1.1, dur: 0.3, ease: "smooth" },
  { t: 16.867, z: 1.0, dur: 0.3, ease: "smooth" }, // wide for the interrogation
  { t: 19.887, z: 1.12, dur: 0.14, ease: "snap" }, // "swing trading?"
  { t: 20.667, z: 1.18, dur: 0.14, ease: "snap" }, // "No, no, intraday."
  { t: 22.087, z: 1.1, dur: 0.14, ease: "snap" }, // "30R on it"
  { t: 23.087, z: 1.04, dur: 0.4, ease: "smooth" }, // pull back before the claim
  { t: 24.987, z: 1.24, dur: 0.12, ease: "snap" }, // HERO: "150"
  { t: 26.427, z: 1.1, dur: 0.4, ease: "smooth" }, // stunned gap
  { t: 26.867, z: 1.16, dur: 0.14, ease: "snap" }, // "Your highest is 150?"
  { t: 28.767, z: 1.22, dur: 0.12, ease: "snap" }, // "level you here, bud"
  { t: 30.197, z: 1.1, dur: 0.3, ease: "smooth" },
  { t: 31.867, z: 1.16, dur: 0.14, ease: "snap" },
  { t: 33.207, z: 1.2, dur: 0.14, ease: "snap" }, // "this is bad"
  { t: 34.047, z: 1.24, dur: 0.12, ease: "snap" }, // "This is wrong."
  { t: 35.0, z: 1.1, dur: 0.4, ease: "smooth" }, // release before the buzzer
  { t: 36.647, z: 1.18, dur: 0.14, ease: "snap" }, // "where's the red buzzer?"
  { t: 37.687, z: 1.24, dur: 0.12, ease: "snap" }, // "Where's the red buzzer?"
];

// ── SFX ───────────────────────────────────────────────────────
// Every cue sits on a word start or a visual hit. Layered only on the three hero beats
// (the 150R claim, the roast, the buzzer).
const SFX = [
  { at: 0.0, src: ASSETS.sfx.impactDeep, vol: 0.8 }, // frame-0 headline
  { at: 0.92, src: ASSETS.sfx.vineBoom, vol: 0.7 }, // "150" slams
  { at: 0.94, src: ASSETS.sfx.stampHit, vol: 0.6 },
  { at: 2.28, src: ASSETS.sfx.whooshReverse, vol: 0.6 }, // into the rewind
  { at: 2.447, src: ASSETS.sfx.uiClick, vol: 0.5 }, // rewind flag
  { at: 3.087, src: ASSETS.sfx.popReveal, vol: 0.5 }, // schedule card
  { at: 5.027, src: ASSETS.sfx.uiClick, vol: 0.55 }, // "university?"
  { at: 6.567, src: ASSETS.sfx.animeWow, vol: 0.45 }, // "High school." — the reveal
  { at: 7.447, src: ASSETS.sfx.clockTick, vol: 0.45 }, // ×2
  { at: 8.107, src: ASSETS.sfx.clockTick, vol: 0.45 }, // ×3
  { at: 8.627, src: ASSETS.sfx.clockTick, vol: 0.45 }, // ×4
  { at: 9.267, src: ASSETS.sfx.clockTick, vol: 0.45 }, // ×5
  { at: 9.967, src: ASSETS.sfx.clockTick, vol: 0.5 }, // ×6
  { at: 9.98, src: ASSETS.sfx.vineBoom, vol: 0.55 }, // the loop peaks
  { at: 10.947, src: ASSETS.sfx.riserSoft, vol: 0.5 }, // "How high RR?"
  { at: 12.167, src: ASSETS.sfx.popReveal, vol: 0.55 }, // average odometer
  { at: 12.747, src: ASSETS.sfx.uiClick, vol: 0.55 }, // 30R + chip pins
  { at: 13.227, src: ASSETS.sfx.uiClick, vol: 0.55 }, // 40R
  { at: 13.987, src: ASSETS.sfx.popReveal, vol: 0.45 }, // "Tight, I'm good."
  { at: 15.35, src: ASSETS.sfx.riserSoft, vol: 0.45 }, // the room goes quiet
  { at: 17.567, src: ASSETS.sfx.uiClick, vol: 0.45 }, // "Really tight."
  { at: 18.227, src: ASSETS.sfx.whooshSoft, vol: 0.5 }, // swing/intraday lanes
  { at: 20.667, src: ASSETS.sfx.uiToggleOn, vol: 0.6 }, // "No, no, intraday." → ✓
  { at: 21.647, src: ASSETS.sfx.impactSoft, vol: 0.6 }, // "Intraday, 30R on it."
  { at: 23.087, src: ASSETS.sfx.riserSoft, vol: 0.55 }, // build to the claim
  { at: 24.067, src: ASSETS.sfx.whooshReverse, vol: 0.5 },
  { at: 24.987, src: ASSETS.sfx.vineBoom, vol: 0.8 }, // HERO: "150"
  { at: 25.0, src: ASSETS.sfx.impactDeep, vol: 0.75 },
  { at: 25.02, src: ASSETS.sfx.stampHit, vol: 0.6 },
  { at: 26.427, src: ASSETS.sfx.glitchZap, vol: 0.4 }, // stunned gap
  { at: 26.907, src: ASSETS.sfx.popReveal, vol: 0.55 }, // "Your highest is 150?"
  { at: 27.987, src: ASSETS.sfx.uiClick, vol: 0.5 }, // deadpan "Yeah."
  { at: 28.767, src: ASSETS.sfx.vineBoom, vol: 0.65 }, // THE ROAST
  { at: 28.78, src: ASSETS.sfx.stampHit, vol: 0.7 },
  { at: 30.197, src: ASSETS.sfx.impactSoft, vol: 0.6 }, // "I've heard enough"
  { at: 31.467, src: ASSETS.sfx.uiClick, vol: 0.45 },
  { at: 33.207, src: ASSETS.sfx.impactDeep, vol: 0.7 }, // "this is bad."
  { at: 33.727, src: ASSETS.sfx.glassShatter, vol: 0.5 }, // "This is wrong."
  { at: 34.347, src: ASSETS.sfx.whooshSoft, vol: 0.45 },
  { at: 35.707, src: ASSETS.sfx.riserSoft, vol: 0.55 }, // "where's the red buzzer?" (music is out)
  { at: 36.647, src: ASSETS.sfx.stampHit, vol: 0.85 }, // BUZZER slam
  { at: 36.66, src: ASSETS.sfx.impactDeep, vol: 0.8 },
  { at: 37.687, src: ASSETS.sfx.stampHit, vol: 0.85 }, // BUZZER again
  { at: 38.367, src: ASSETS.sfx.whooshReverse, vol: 0.5 }, // freeze outro
  { at: 38.6, src: ASSETS.sfx.uiClick, vol: 0.5 }, // CTA
  { at: 39.4, src: ASSETS.sfx.impactDeep, vol: 0.7 }, // final hit
];

// ── MUSIC ─────────────────────────────────────────────────────
const MUSIC_BASE = 0.07;
const MUSIC_HOT = 0.1;
const MUSIC_CLAIM = 0.095;
const MUSIC_END = 0.11;
// Two dry windows: the rewind cut, and the buzzer punchline (the library has no record-scratch,
// so the "stop" is silence — the bed leaves on the exact frame and the room tone carries the joke).
const MUSIC_SILENCES = [
  [2.367, 2.55],
  [36.6, 38.4],
];

const musicVolumeAt = (frame) => {
  const t = frame / FPS;
  const fadeIn = clamp01(frame / 8);
  const fadeOut = clamp01((DURATION - frame) / 15);
  const duckFor = (start, end, ramp = 0.06) => {
    if (t < start - ramp) return 1;
    if (t < start) return lerp(1, 0, (t - (start - ramp)) / ramp);
    if (t < end) return 0;
    if (t < end + 0.25) return (t - end) / 0.25;
    return 1;
  };
  const duck = MUSIC_SILENCES.reduce((acc, [a, b]) => Math.min(acc, duckFor(a, b, a > 30 ? 0.04 : 0.06)), 1);
  let level = MUSIC_BASE;
  if (t < 0.9) level = MUSIC_HOT; // hot under the cold open
  if (t >= CLAIM.at && t < CLAIM.out) level = MUSIC_CLAIM; // lift for the claim
  if (t >= OUTRO.start + 0.2) level = lerp(MUSIC_BASE, MUSIC_END, clamp01((t - (OUTRO.start + 0.2)) / 0.4));
  return level * duck * fadeIn * fadeOut;
};

// ── THE PERSISTENT CHIP (this clip's protagonist object) ──────
// Pins on "30," and never leaves: AVG 30R → AVG 40R → BEST 150R, then holds to the last frame.
const rChipAt = (t) => {
  if (t < CHIP.pin) return null;
  if (t < CHIP.forty) return { label: "AVG TRADE", value: "30R", color: COLORS.green };
  if (t < CHIP.best) return { label: "AVG TRADE", value: "40R", color: COLORS.green };
  return { label: "BEST TRADE", value: "150R", color: COLORS.gold };
};

// ── MOTION HELPERS + GLYPHS (kit, verbatim) ──

// ─────────────────────────────────────────────────────────────
// 7. MOTION HELPERS
// ─────────────────────────────────────────────────────────────

const sec = (t) => Math.round(t * FPS);

const SPRING_IN = { damping: 13, stiffness: 160, mass: 0.8 };
const SPRING_SNAP = { damping: 14, stiffness: 300, mass: 0.7 };
const SPRING_STAMP = { damping: 9, stiffness: 220, mass: 0.9 };

const springAt = (frame, t, config = SPRING_IN) => spring({ frame: frame - sec(t), fps: FPS, config });

const exitAt = (frame, t, frames = 7) =>
  interpolate(frame, [sec(t) - frames, sec(t)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const isBetween = (frame, a, b) => frame >= sec(a) && frame < sec(b);

const shakeAt = (frame, t, frames = 6, amp = 14) => {
  const local = frame - sec(t);
  if (local < 0 || local >= frames) return { x: 0, y: 0 };
  const decay = 1 - local / frames;
  return {
    x: Math.sin(local * 2.7 + 1.3) * amp * decay,
    y: Math.cos(local * 3.1 + 0.4) * amp * decay,
  };
};

const panelStyle = {
  background: COLORS.panel,
  border: `2px solid ${COLORS.panelBorder}`,
  borderRadius: 28,
  boxShadow: COLORS.shadow,
};

const strokeText = (strokePx = 10) => ({ WebkitTextStroke: `${strokePx}px #000`, paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(0,0,0,0.55), 0 10px 26px rgba(0,0,0,0.6)" });

// Small drawn icons (no emoji dependency): rewind arrows, a down arrow, a flame.
const RewindGlyph = ({ size = 30, color = COLORS.white }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 30 21" style={{ display: "block" }}>
    <path d="M14 2 L14 19 L2 10.5 Z" fill={color} />
    <path d="M28 2 L28 19 L16 10.5 Z" fill={color} />
  </svg>
);

const ArrowDownGlyph = ({ size = 34, color = COLORS.yellow }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M12 2 L12 17 M5 12 L12 20 L19 12" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FlameGlyph = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.3-2-.3-2 2 1.5 3.3 3.4 3.3 5.6A6 6 0 0 1 6 15c0-5 6-6 6-13z" fill="#FF7A18" />
    <path d="M12 12c.6 1.8-1.2 2.3-1.2 4a1.9 1.9 0 0 0 3.8 0c0-1.6-2.6-2.2-2.6-4z" fill={COLORS.yellow} />
  </svg>
);

const CheckGlyph = ({ size = 34, color = COLORS.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M4 13 L9.5 18.5 L20 6" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CrossGlyph = ({ size = 34, color = COLORS.red }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M5 5 L19 19 M19 5 L5 19" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" />
  </svg>
);

// ── ClipCamera (kit, verbatim — render-video replaces this block) ──
// ---- ClipCamera (paste as-is; do not rewrite the maths) ----
// Picture streams muted from the original; sound plays from the source's small audio copy (&part=audio).
// CAMERA keys: { t: clip seconds, m: "s" single | "p" split | "w" wide, a/b: [x,y,w,h] source fractions, cut?: 1 }
const lerpRect = (p, q, k) => p.map((v, i) => v + (q[i] - v) * k);
const camAt = (keys, t) => {
  let i = 0;
  for (let j = 0; j < keys.length; j++) { if (keys[j].t <= t) i = j; else break; }
  const k = keys[i], prev = keys[i - 1];
  if (!prev || k.cut || prev.m !== k.m || k.m === 'w') return k;
  const p = Math.min(1, (t - k.t) / 0.45), e = 1 - Math.pow(1 - p, 3);
  return { ...k, a: lerpRect(prev.a, k.a, e), b: k.b && prev.b ? lerpRect(prev.b, k.b, e) : k.b };
};
const CropView = ({ src, rect, startFrom, endAt, muted, style, zoom = 1 }) => {
  const [x, y, w, h] = rect;
  const cx = x + w / 2, cy = y + h / 2, zw = w / zoom, zh = h / zoom;
  const zx = Math.max(0, Math.min(1 - zw, cx - zw / 2)), zy = Math.max(0, Math.min(1 - zh, cy - zh / 2));
  return (
    <div style={{ position: 'absolute', overflow: 'hidden', ...style }}>
      <Video src={src} startFrom={startFrom} endAt={endAt} muted
        style={{ position: 'absolute', width: (100 / zw) + '%', height: (100 / zh) + '%', left: (-zx / zw * 100) + '%', top: (-zy / zh * 100) + '%', objectFit: 'fill', maxWidth: 'none' }} />
    </div>
  );
};
// zoom: optional extra punch-in (1 = none, 1.15 = punch). Stays inside the tracked window, never shows outside the frame.
const ClipCamera = ({ src, segments, camera, srcAspect = 16 / 9, zoom = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  let off = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b0b0f' }}>
      {segments.map((s, i) => {
        const from = Math.round(off * fps), len = Math.round((s.out - s.in) * fps);
        off += s.out - s.in;
        if (frame < from || frame >= from + len) return null;
        const t = frame / fps, k = camAt(camera, t);
        const sf = Math.round(s.in * fps), ea = Math.round(s.out * fps);
        const local = { startFrom: sf + (frame - from), endAt: ea };
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            <Audio src={src + '&part=audio'} startFrom={sf} endAt={ea} />
            {k.m === 's' && <CropView src={src} rect={k.a} startFrom={sf} endAt={ea} zoom={zoom} style={{ inset: 0 }} />}
            {k.m === 'p' && <>
              <CropView src={src} rect={k.a} startFrom={sf} endAt={ea} zoom={zoom} style={{ left: 0, top: 0, width: '100%', height: '50%' }} />
              <CropView src={src} rect={k.b} startFrom={sf} endAt={ea} zoom={zoom} muted style={{ left: 0, top: '50%', width: '100%', height: '50%' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 6, marginTop: -3, background: '#0b0b0f' }} />
            </>}
            {k.m === 'w' && <CropView src={src} rect={[0, 0, 1, 1]} startFrom={sf} endAt={ea} style={{ left: 0, width: '100%', top: (height - width / srcAspect) * 0.4, height: width / srcAspect }} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
// ---- end ClipCamera ----

// ── TERMINAL BACKGROUND (kit, verbatim) ──

// ─────────────────────────────────────────────────────────────
// 9. TERMINAL BACKGROUND — grid, scrolling candle silhouettes, vignette
// ─────────────────────────────────────────────────────────────

const seeded = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const CANDLE_COUNT = 40;
const CANDLE_SPACING = 36;
const CANDLE_STRIP_WIDTH = CANDLE_COUNT * CANDLE_SPACING;

const CANDLES = (() => {
  let mid = 0;
  return Array.from({ length: CANDLE_COUNT }, (_, i) => {
    const up = seeded(i * 3.1) > 0.45;
    const body = 24 + seeded(i * 7.7) * 110;
    const wick = body + 20 + seeded(i * 5.3) * 60;
    mid += (up ? -1 : 1) * body * 0.35;
    mid = Math.max(-70, Math.min(70, mid));
    return { up, body, wick, mid };
  });
})();

const CandleStrip = ({ y, speed, opacity, flip = false }) => {
  const frame = useCurrentFrame();
  const offset = -((frame * speed) % CANDLE_STRIP_WIDTH);
  const renderStrip = (key, dx) => (
    <div key={key} style={{ position: "absolute", left: dx, top: 0, width: CANDLE_STRIP_WIDTH, height: 300 }}>
      {CANDLES.map((c, i) => {
        const color = c.up ? COLORS.green : COLORS.red;
        const cx = i * CANDLE_SPACING + CANDLE_SPACING / 2;
        const cy = 150 + c.mid;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: cx - 1.5, top: cy - c.wick / 2, width: 3, height: c.wick, background: color }} />
            <div style={{ position: "absolute", left: cx - 11, top: cy - c.body / 2, width: 22, height: c.body, background: color, borderRadius: 3 }} />
          </React.Fragment>
        );
      })}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: WIDTH, height: 300, overflow: "hidden", opacity, transform: flip ? "scaleY(-1)" : undefined }}>
      {renderStrip("a", offset)}
      {renderStrip("b", offset + CANDLE_STRIP_WIDTH)}
    </div>
  );
};

const TerminalBackground = () => {
  const frame = useCurrentFrame();
  const gridShift = (frame * 0.4) % 60;
  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.gridLine} 2px, transparent 2px), linear-gradient(90deg, ${COLORS.gridLine} 2px, transparent 2px)`,
          backgroundSize: "60px 60px",
          backgroundPosition: `${-gridShift}px 0px`,
        }}
      />
      <CandleStrip y={1560} speed={0.9} opacity={0.09} />
      <CandleStrip y={-40} speed={0.6} opacity={0.05} flip />
      <div
        style={{
          position: "absolute",
          left: -100,
          right: -100,
          top: LAYOUT.videoTop - 120,
          height: LAYOUT.videoHeight + 240,
          background: "radial-gradient(ellipse at center, rgba(0,230,118,0.07) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)" }} />
    </AbsoluteFill>
  );
};

// ── CAPTIONS (kit, verbatim) ──

// ─────────────────────────────────────────────────────────────
// 11. CAPTIONS — speaker chip + word-by-word pages + the strike-through
// ─────────────────────────────────────────────────────────────

const SpeakerChip = ({ speaker }) => {
  const tag = speakerTag(speaker);
  const dot = tag === "JUDGE" ? COLORS.yellow : COLORS.green;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 20px",
        borderRadius: 999,
        background: "rgba(15,20,28,0.92)",
        border: `2px solid ${COLORS.panelBorder}`,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 26,
        letterSpacing: 4,
        color: COLORS.white,
        boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ width: 14, height: 14, borderRadius: 7, background: dot, boxShadow: `0 0 12px ${dot}` }} />
      {tag}
    </div>
  );
};

const CaptionWord = ({ word, active, spoken, frame }) => {
  const key = keyColorFor(word.text);
  const pop = active ? springAt(frame, word.start, SPRING_SNAP) : 0;
  const scale = active ? interpolate(pop, [0, 1], [1, 1.12]) : 1;
  const color = key ?? (active ? COLORS.yellow : COLORS.white);
  return (
    <span style={{ display: "inline-block", margin: "0 11px", transform: `scale(${scale}) translateY(${active ? -4 * pop : 0}px)`, color, opacity: spoken || active ? 1 : 0.88, ...strokeText(10) }}>
      {word.text.toUpperCase()}
    </span>
  );
};

const CaptionsLayer = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (isFreeze(t)) return null;
  const page = CAPTION_PAGES.find((p) => t >= p.start && t < p.end);
  if (!page) return null;

  const enter = springAt(frame, page.start, SPRING_SNAP);
  const pageScale = interpolate(enter, [0, 1], [0.88, 1]);
  const pageY = interpolate(enter, [0, 1], [22, 0]);
  const strikeP = t >= CAPTION_STRIKE.start && t < CAPTION_STRIKE.end ? clamp01((t - CAPTION_STRIKE.start) / 0.18) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top: LAYOUT.captionTop,
        height: LAYOUT.captionBottom - LAYOUT.captionTop,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        opacity: clamp01(enter * 1.6),
        transform: `translateY(${pageY}px) scale(${pageScale})`,
      }}
    >
      <SpeakerChip speaker={page.speaker} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", maxWidth: 980, fontFamily: FONT, fontWeight: 900, fontSize: 76, lineHeight: 1.12, textAlign: "center" }}>
          {page.words.map((w, i) => {
            const active = t >= w.start && t < Math.max(w.end, w.start + 0.12);
            const spoken = t >= w.end;
            return <CaptionWord key={`${page.start}-${i}`} word={w} active={active} spoken={spoken} frame={frame} />;
          })}
        </div>
        {strikeP > 0 ? (
          <div
            style={{
              position: "absolute",
              left: "-2%",
              top: "50%",
              height: 14,
              marginTop: -7,
              width: `${strikeP * 104}%`,
              background: COLORS.red,
              borderRadius: 7,
              transform: "rotate(-2deg)",
              boxShadow: "0 0 18px rgba(255,59,59,0.7)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

// ── AUDIO (kit, verbatim) ──

// ─────────────────────────────────────────────────────────────
// 25. AUDIO — music bed (ducked, incl. the record stop) + SFX hits
// ─────────────────────────────────────────────────────────────

const AudioLayer = () => (
  <>
    <Audio src={ASSETS.music} volume={(f) => musicVolumeAt(f)} />
    {SFX.map((fx, i) => (
      <Sequence key={`sfx-${i}`} from={sec(fx.at)} durationInFrames={Math.max(1, Math.min(sec(3), DURATION - sec(fx.at)))} layout="none">
        <Audio src={fx.src} volume={fx.vol} />
      </Sequence>
    ))}
  </>
);

// ── PRIMITIVES ────────────────────────────────────────────────
// Every beat in this clip is one of these five. That is what keeps the file small and the
// spacing consistent: a Panel always owns the card lane, a Flag always owns a band corner.
const Kicker = ({ children, color = "rgba(255,255,255,0.6)", size = 28, align = "left" }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: 5, color, textAlign: align }}>{children}</div>
);

const Big = ({ children, color = COLORS.white, size = 82, stroke = 9, align = "left" }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.03, color, textAlign: align, ...strokeText(stroke) }}>{children}</div>
);

const Panel = ({ at, out, top = LAYOUT.cardTop, left = 50, right = 50, border = COLORS.panelBorder, rotate = 0, cfg = SPRING_IN, from = 1.4, amp = 0, children }) => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, cfg);
  const shake = amp ? shakeAt(frame, at, 5, amp) : { x: 0, y: 0 };
  return (
    <div style={{ position: "absolute", left, right, top, opacity: exitAt(frame, out, 6) * clamp01(enter * 3), transform: `translate(${shake.x}px, ${shake.y}px) scale(${interpolate(enter, [0, 1], [from, 1])}) rotate(${rotate}deg)`, ...panelStyle, border: `3px solid ${border}`, padding: "20px 28px 24px" }}>
      {children}
    </div>
  );
};

const Flag = ({ at, out, top, left, right, color = COLORS.white, size = 30, from = -70, bg = "rgba(0,0,0,0.8)", children }) => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, SPRING_SNAP);
  return (
    <div style={{ position: "absolute", top, left, right, display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", background: bg, borderRadius: 12, border: `2px solid ${color}`, fontFamily: MONO_FONT, fontWeight: 700, fontSize: size, letterSpacing: 2, color, opacity: exitAt(frame, out, 6) * clamp01(enter * 2), transform: `translateX(${interpolate(enter, [0, 1], [from, 0])}px)`, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};

const Lane = ({ label, value, mark, color = COLORS.white, p, active = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", borderRadius: 18, background: active ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", border: `3px solid ${active ? color : "rgba(255,255,255,0.12)"}`, opacity: clamp01(p * 2), transform: `translateX(${interpolate(p, [0, 1], [active ? 240 : -240, 0])}px)` }}>
    <Kicker size={24} color="rgba(255,255,255,0.55)">{label}</Kicker>
    <div style={{ flex: 1, fontFamily: FONT, fontWeight: 900, fontSize: 42, color: active ? color : "rgba(255,255,255,0.7)" }}>{value}</div>
    {mark ? <div style={{ transform: `scale(${interpolate(p, [0, 1], [2, 1])})` }}>{mark}</div> : null}
  </div>
);

const WhiteFlash = ({ at, frames = 4, peak = 0.95, color = COLORS.white }) => {
  const frame = useCurrentFrame();
  const local = frame - sec(at);
  if (local < 0 || local >= frames) return null;
  return <AbsoluteFill style={{ background: color, opacity: peak * (1 - local / frames), pointerEvents: "none" }} />;
};

const ClockGlyph = ({ size = 48, color = COLORS.green }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="2.4" />
    <path d="M12 6.8 L12 12.4 L16 14.6" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// ── BRAND STAMP — Alpha Futures, on screen from frame 0 to the last frame.
// Static (no entrance animation: a broadcast bug that slides in is not "on from frame one"),
// outside the shake wrapper so it stays steady while the edit moves, top-right and clear of the
// bottom 340px / right 160px phone UI zones. objectFit:contain so it works whatever the PNG's
// aspect ratio turns out to be.
const BrandStamp = () => (
  <div style={{ position: "absolute", top: LAYOUT.stampTop, right: LAYOUT.stampRight, width: 280, height: 130, display: "flex", alignItems: "center", justifyContent: "flex-end", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.9))" }}>
    <Img src={ASSETS.brandStamp} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
  </div>
);

// ── 1. COLD OPEN (0–2.367) ────────────────────────────────────
const HookHeadline = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, 0, HOOK.cut)) return null;
  const enter = spring({ frame: frame + 7, fps: FPS, config: SPRING_IN }); // already most of the way in at frame 0
  const slam = springAt(frame, HOOK.slam, SPRING_STAMP);
  const slammed = frame >= sec(HOOK.slam);
  const shake = shakeAt(frame, HOOK.slam, 6, 12);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 200, textAlign: "center", opacity: exitAt(frame, HOOK.cut, 5), transform: `translate(${shake.x}px, ${interpolate(enter, [0, 1], [-46, 0]) + shake.y + Math.sin(frame / 9) * 3}px)` }}>
      <Kicker size={30} color={COLORS.white} align="center">5 TRADERS. $500,000 ON THE LINE.</Kicker>
      <div style={{ marginTop: 6, fontFamily: FONT, fontWeight: 900, fontSize: 52, color: COLORS.yellow, ...strokeText(10) }}>HIS BEST TRADE =</div>
      <div style={{ transform: `scale(${slammed ? interpolate(slam, [0, 1], [2.1, 1]) : 1})`, opacity: slammed ? 1 : clamp01(enter * 2) }}>
        <Big size={140} color={COLORS.green} stroke={13} align="center">150R</Big>
      </div>
      <div style={{ marginTop: 2, opacity: clamp01(enter * 2) }}>
        <Big size={38} color={COLORS.red} stroke={8} align="center">AND HE'S IN HIGH SCHOOL</Big>
      </div>
    </div>
  );
};

const RewindFlag = () => (
  <Flag at={REWIND.at} out={REWIND.out} top={LAYOUT.videoTop + 22} left={50} color={COLORS.white} from={-260}>
    <RewindGlyph size={26} /> 55 SECONDS EARLIER
  </Flag>
);

const ColdOpen = () => (
  <>
    <HookHeadline />
    <WhiteFlash at={HOOK.flash} frames={4} />
    <RewindFlag />
  </>
);

// ── 2. THE HIGH SCHOOL LOOP (3.087–10.867) ────────────────────
const ScheduleCard = () => (
  <Panel at={SCHOOL.card} out={SCHOOL.cardOut}>
    <Kicker>IF HE DOESN'T HAVE SCHOOL</Kicker>
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16 }}>
      <Big size={76} color={COLORS.green}>WAKE UP 9:00</Big>
      <ClockGlyph size={54} color={COLORS.green} />
    </div>
  </Panel>
);

const UniversityCard = () => (
  <Panel at={SCHOOL.uni} out={SCHOOL.uniOut} cfg={SPRING_SNAP} from={1.6} border={COLORS.yellow}>
    <Kicker color={COLORS.yellow}>THE JUDGE GUESSES</Kicker>
    <div style={{ marginTop: 8 }}>
      <Big size={68} color={COLORS.white}>SCHOOL LIKE UNIVERSITY?</Big>
    </div>
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontWeight: 900, fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
      <ArrowDownGlyph size={26} /> guess his answer
    </div>
  </Panel>
);

// Six people say "high school" in four seconds. Counting them IS the joke.
const HighSchoolCounter = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, SCHOOL.count, SCHOOL.countOut)) return null;
  const enter = springAt(frame, SCHOOL.count, SPRING_STAMP);
  const hits = SCHOOL.ticks.filter((x) => t >= x).length;
  const last = SCHOOL.ticks[hits - 1] ?? SCHOOL.count;
  const pop = springAt(frame, last, SPRING_SNAP);
  const done = hits >= SCHOOL.ticks.length;
  const shake = shakeAt(frame, SCHOOL.ticks[SCHOOL.ticks.length - 1], 6, 12);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 6, opacity: exitAt(frame, SCHOOL.countOut, 6) * clamp01(enter * 3), transform: `translate(${shake.x}px, ${shake.y}px) scale(${interpolate(enter, [0, 1], [1.6, 1])}) rotate(-1.5deg)`, ...panelStyle, border: `4px solid ${done ? COLORS.red : COLORS.yellow}`, padding: "20px 28px 24px" }}>
      <Kicker color={done ? COLORS.red : COLORS.yellow}>{done ? "THEY CANNOT GET PAST IT" : "WHAT HE ACTUALLY MEANT"}</Kicker>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <Big size={done ? 88 : 76} color={COLORS.white} stroke={11}>HIGH SCHOOL</Big>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, lineHeight: 1, color: done ? COLORS.red : COLORS.yellow, fontVariantNumeric: "tabular-nums", transform: `scale(${interpolate(pop, [0, 1], [1.7, 1])})`, ...strokeText(8) }}>
          ×{hits}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {SCHOOL.ticks.map((x, i) => (
          <div key={x} style={{ flex: 1, height: 14, borderRadius: 7, background: t >= x ? (done ? COLORS.red : COLORS.yellow) : "rgba(255,255,255,0.1)", boxShadow: t >= x ? `0 0 14px ${done ? "rgba(255,59,59,0.6)" : "rgba(255,230,0,0.5)"}` : "none" }} />
        ))}
      </div>
    </div>
  );
};

// ── 3. THE R:R INTERROGATION (10.947–15.2) ────────────────────
const RrCard = () => (
  <Panel at={RR.q} out={RR.qOut} cfg={SPRING_SNAP} from={1.6} border={COLORS.green}>
    <Kicker color={COLORS.green}>THE QUESTION THAT STARTS IT</Kicker>
    <div style={{ marginTop: 8 }}>
      <Big size={86} color={COLORS.white}>HOW HIGH R:R?</Big>
    </div>
  </Panel>
);

const AverageOdometer = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, RR.avg, RR.avgOut)) return null;
  const enter = springAt(frame, RR.avg, SPRING_IN);
  const roll1 = clamp01((t - RR.avg) / (RR.thirty - RR.avg));
  const roll2 = clamp01((t - RR.forty) / 0.38);
  const value = t < RR.thirty ? Math.round(lerp(0, 30, Easing.out(Easing.cubic)(roll1))) : t < RR.forty ? 30 : Math.round(lerp(30, 40, Easing.out(Easing.cubic)(roll2)));
  const pop = springAt(frame, t < RR.forty ? RR.thirty : RR.forty, SPRING_SNAP);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 10, opacity: exitAt(frame, RR.avgOut, 6) * clamp01(enter * 2), transform: `translateY(${interpolate(enter, [0, 1], [-46, 0])}px)`, ...panelStyle, padding: "20px 28px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Kicker>HIS AVERAGE TRADE</Kicker>
        <Kicker color={COLORS.green} size={24}>INTRADAY</Kicker>
      </div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 14 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 118, lineHeight: 1, color: COLORS.green, fontVariantNumeric: "tabular-nums", transform: `scale(${interpolate(pop, [0, 1], [1.25, 1])})`, transformOrigin: "left bottom" }}>
          {value}R
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: "rgba(255,255,255,0.6)" }}>PER TRADE</div>
      </div>
      <div style={{ position: "relative", height: 22, marginTop: 12, borderRadius: 11, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: 22, width: `${(value / 150) * 100}%`, borderRadius: 11, background: `linear-gradient(90deg, ${COLORS.green}, #7CFFB2)`, boxShadow: "0 0 18px rgba(0,230,118,0.5)" }} />
      </div>
      <div style={{ marginTop: 6, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 22, color: "rgba(255,255,255,0.45)" }}>scale: 0 ─────────── 150R (his best)</div>
    </div>
  );
};

const TightFlag = () => (
  <Flag at={FLAGS.tight} out={FLAGS.tightOut} top={1040} left={50} color={COLORS.green} from={-260}>
    JUDGE: "TIGHT, I'M GOOD"
  </Flag>
);

const ReallyTightFlag = () => (
  <Flag at={FLAGS.really} out={FLAGS.reallyOut} top={1040} right={50} color={COLORS.yellow} from={260}>
    "REALLY TIGHT"
  </Flag>
);

// Nobody speaks for 1.9 seconds after "40R?". Holding that silence on screen is funnier than filling it.
const SilenceCard = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, SILENCE.at, SILENCE.out)) return null;
  const enter = springAt(frame, SILENCE.at, SPRING_IN);
  const dots = [0, 1, 2].map((i) => (Math.sin((frame - i * 5) / 6) + 1) / 2);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 40, textAlign: "center", opacity: exitAt(frame, SILENCE.out, 6) * clamp01(enter * 2), transform: `translateY(${interpolate(enter, [0, 1], [-40, 0])}px)`, ...panelStyle, padding: "22px 28px 26px" }}>
      <Kicker align="center">NOBODY SAYS ANYTHING</Kicker>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
        {dots.map((d, i) => (
          <div key={i} style={{ width: 30, height: 30, borderRadius: 15, background: COLORS.white, opacity: 0.25 + 0.75 * d, transform: `translateY(${(1 - d) * 10}px)` }} />
        ))}
      </div>
      <div style={{ marginTop: 12, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: "rgba(255,255,255,0.5)" }}>1.9s OF SILENCE</div>
    </div>
  );
};

// ── 4. SWING vs INTRADAY (18.227–21.6) ────────────────────────
const StyleLanes = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, STYLE.lanes, STYLE.lanesOut)) return null;
  const enter = springAt(frame, STYLE.lanes, SPRING_IN);
  const flip = springAt(frame, STYLE.intraday, SPRING_SNAP);
  const answered = t >= STYLE.intraday;
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 6, display: "flex", flexDirection: "column", gap: 14, opacity: exitAt(frame, STYLE.lanesOut, 6) * clamp01(enter * 2), transform: `translateY(${interpolate(enter, [0, 1], [-40, 0])}px)` }}>
      <Kicker color={COLORS.yellow}>THE JUDGE CHECKS THE MATHS</Kicker>
      <Lane label="HIS GUESS" value="SWING TRADING?" mark={answered ? <CrossGlyph size={42} /> : null} color={COLORS.red} p={springAt(frame, STYLE.lanes, SPRING_SNAP)} active={answered} />
      <Lane label="THE ANSWER" value="INTRADAY" mark={answered ? <CheckGlyph size={42} /> : null} color={COLORS.green} p={springAt(frame, STYLE.lanes + 0.14, SPRING_SNAP)} active />
    </div>
  );
};

// ── 5. REPEATED BACK, THEN THE CLAIM (21.647–26.4) ────────────
const RepeatedBack = () => (
  <Panel at={BACK.at} out={BACK.out} border={COLORS.yellow} amp={8}>
    <Kicker color={COLORS.yellow}>HE REPEATS IT BACK, SLOWLY</Kicker>
    <div style={{ marginTop: 8 }}>
      <Big size={62} color={COLORS.white}>"INTRADAY, 30R ON IT.</Big>
    </div>
    <div style={{ marginTop: 4 }}>
      <Big size={62} color={COLORS.yellow}>THAT'S YOUR AVERAGE TRADE?"</Big>
    </div>
  </Panel>
);

const ClaimHero = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, CLAIM.at, CLAIM.out)) return null;
  const enter = springAt(frame, CLAIM.at, SPRING_IN);
  const slam = springAt(frame, CLAIM.slam, SPRING_STAMP);
  const slammed = frame >= sec(CLAIM.slam);
  const shake = shakeAt(frame, CLAIM.slam, 8, 18);
  return (
    <>
      <div style={{ position: "absolute", left: 40, right: 40, top: LAYOUT.cardTop, textAlign: "center", opacity: exitAt(frame, CLAIM.out, 6) * clamp01(enter * 2), transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Kicker size={32} color={COLORS.white} align="center">AND HIS HIGHEST IS</Kicker>
        <div style={{ transform: `scale(${slammed ? interpolate(slam, [0, 1], [2.4, 1]) : 0.9})`, opacity: slammed ? 1 : 0.35 }}>
          <Big size={196} color={COLORS.gold} stroke={16} align="center">150R</Big>
        </div>
        <div style={{ marginTop: 2, opacity: slammed ? clamp01(slam * 2) : 0 }}>
          <Big size={40} color={COLORS.red} stroke={8} align="center">ON ONE TRADE</Big>
        </div>
      </div>
      <WhiteFlash at={CLAIM.slam} frames={5} peak={0.9} />
    </>
  );
};

const DoubtCard = () => (
  <Panel at={DOUBT.at} out={DOUBT.out} right={360} cfg={SPRING_SNAP} from={1.6} border={COLORS.red} amp={10}>
    <Kicker color={COLORS.red}>THE JUDGE CANNOT MOVE ON</Kicker>
    <div style={{ marginTop: 8 }}>
      <Big size={58} color={COLORS.white}>"YOUR HIGHEST IS 150?"</Big>
    </div>
    <div style={{ marginTop: 6, fontFamily: FONT, fontWeight: 900, fontSize: 44, color: COLORS.yellow }}>
      {"…"} {"…"} {"…"}
    </div>
  </Panel>
);

const StunnedMeme = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, MEME.at, MEME.out)) return null;
  const enter = springAt(frame, MEME.at, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", right: 44, top: 232, width: 270, opacity: exitAt(frame, MEME.out, 7), transform: `translateX(${interpolate(enter, [0, 1], [560, 0])}px) rotate(${6 + Math.sin(frame / 8) * 1.4}deg)` }}>
      <div style={{ width: 270, height: 270, border: `8px solid ${COLORS.white}`, borderRadius: 16, overflow: "hidden", background: "#000", boxShadow: COLORS.shadow }}>
        <Sequence from={sec(MEME.at)} layout="none">
          <OffthreadVideo src={ASSETS.lostForWordsMeme} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      </div>
      <div style={{ position: "absolute", left: -18, bottom: -34, padding: "8px 18px", background: COLORS.yellow, color: COLORS.bg, borderRadius: 12, fontFamily: FONT, fontWeight: 900, fontSize: 30, whiteSpace: "nowrap", transform: "rotate(-7deg)", boxShadow: COLORS.shadow }}>
        NOBODY MOVES
      </div>
    </div>
  );
};

// ── 6. THE ROAST (28.767–35.7) ────────────────────────────────
const RoastCard = () => (
  <Panel at={ROAST.at} out={ROAST.out} cfg={SPRING_STAMP} from={1.9} border={COLORS.red} amp={16} rotate={-2}>
    <Kicker color={COLORS.red}>AND THEN HE LEVELS HIM</Kicker>
    <div style={{ marginTop: 8 }}>
      <Big size={66} color={COLORS.red} stroke={11}>"I'M GONNA LEVEL YOU HERE, BUD."</Big>
    </div>
  </Panel>
);

const HeardEnoughCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, ENOUGH.at, ENOUGH.out)) return null;
  const enter = springAt(frame, ENOUGH.at, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 16, opacity: exitAt(frame, ENOUGH.out, 6) * clamp01(enter * 3), transform: `scale(${interpolate(enter, [0, 1], [1.7, 1])}) rotate(-1.5deg)`, ...panelStyle, border: `4px solid ${COLORS.red}`, padding: "22px 28px 26px", textAlign: "center" }}>
      <Kicker color={COLORS.red} align="center">THE VERDICT IS IN</Kicker>
      <div style={{ marginTop: 8 }}>
        <Big size={80} color={COLORS.white} stroke={11} align="center">"I'VE HEARD ENOUGH"</Big>
      </div>
      <div style={{ marginTop: 10, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 26, letterSpacing: 2, color: t >= 31.467 ? COLORS.yellow : "rgba(255,255,255,0.5)" }}>
        {t >= 31.467 ? "AND HE IS NOT DONE" : "JUDGE, TO THE KID"}
      </div>
    </div>
  );
};

const WrongCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, WRONG.bad, WRONG.out)) return null;
  const enter = springAt(frame, WRONG.bad, SPRING_STAMP);
  const wrong = springAt(frame, WRONG.wrong, SPRING_STAMP);
  const again = springAt(frame, 34.347, SPRING_SNAP);
  const shake = shakeAt(frame, WRONG.wrong, 7, 14);
  const row = (p, text, size) => (
    <div style={{ opacity: clamp01(p * 3), transform: `scale(${interpolate(p, [0, 1], [1.8, 1])})`, marginTop: 6 }}>
      <Big size={size} color={COLORS.red} stroke={11} align="center">{text}</Big>
    </div>
  );
  return (
    <>
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 6, opacity: exitAt(frame, WRONG.out, 6) * clamp01(enter * 3), transform: `translate(${shake.x}px, ${shake.y}px)`, ...panelStyle, border: `4px solid ${COLORS.red}`, padding: "20px 28px 22px", textAlign: "center" }}>
        {row(springAt(frame, WRONG.bad, SPRING_SNAP), '"THIS IS BAD."', 62)}
        {t >= WRONG.wrong ? row(wrong, '"THIS IS WRONG."', 74) : null}
        {t >= 34.347 ? (
          <div style={{ marginTop: 8, opacity: clamp01(again * 3), fontFamily: FONT, fontWeight: 900, fontSize: 30, color: COLORS.yellow }}>
            "I'VE HEARD ENOUGH ALREADY." ×2
          </div>
        ) : null}
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(255,59,59,0) 40%, rgba(255,59,59,0.28) 100%)", opacity: clamp01(enter * 2) * exitAt(frame, WRONG.out, 6), pointerEvents: "none" }} />
    </>
  );
};

// ── 7. THE RED BUZZER (35.707–38.367) ─────────────────────────
// The payoff line asks for a red buzzer, so the edit gives him one — drawn, not emoji, so it
// cannot turn into a missing-glyph box on Lambda.
const BuzzerGlyph = ({ size = 200, pressed = 0 }) => (
  <svg width={size} height={size * 0.72} viewBox="0 0 200 144" style={{ display: "block" }}>
    <ellipse cx="100" cy="126" rx="86" ry="16" fill="rgba(0,0,0,0.55)" />
    <rect x="14" y="96" width="172" height="30" rx="12" fill="#2a0a0a" stroke="#5c1414" strokeWidth="4" />
    <path d="M40 96 Q40 34 100 34 Q160 34 160 96 Z" fill={COLORS.red} stroke="#8c1111" strokeWidth="5" />
    <path d="M62 84 Q64 52 96 48" stroke="rgba(255,255,255,0.55)" strokeWidth="12" fill="none" strokeLinecap="round" />
    <g transform={`translate(0, ${pressed * 12})`}>
      <rect x="70" y="18" width="60" height="22" rx="10" fill="#ff6b6b" stroke="#8c1111" strokeWidth="4" />
    </g>
  </svg>
);

const BuzzerTakeover = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BUZZER.ask, BUZZER.out)) return null;
  const enter = springAt(frame, BUZZER.ask, SPRING_IN);
  const hit1 = springAt(frame, BUZZER.hit, SPRING_STAMP);
  const hit2 = springAt(frame, BUZZER.hit2, SPRING_STAMP);
  const pressed = t >= BUZZER.hit2 ? interpolate(hit2, [0, 0.4, 1], [0, 1, 0.6]) : t >= BUZZER.hit ? interpolate(hit1, [0, 0.4, 1], [0, 1, 0.6]) : 0;
  const shake = { ...shakeAt(frame, BUZZER.hit, 6, 16) };
  const shake2 = shakeAt(frame, BUZZER.hit2, 6, 16);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 3);
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 42%, rgba(255,59,59,0) 30%, rgba(255,59,59,${0.2 + 0.22 * pulse}) 100%)`, opacity: clamp01(enter * 2), pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop - 6, textAlign: "center", opacity: exitAt(frame, BUZZER.out, 5) * clamp01(enter * 2), transform: `translate(${shake.x + shake2.x}px, ${shake.y + shake2.y}px)` }}>
        <Kicker size={30} color={COLORS.white} align="center">THE WHOLE PANEL LOSES IT</Kicker>
        <div style={{ marginTop: 4 }}>
          <Big size={62} color={COLORS.red} stroke={11} align="center">"WHERE'S THE RED BUZZER?"</Big>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", transform: `scale(${interpolate(Math.max(hit1, hit2), [0, 1], [1.9, 1])})`, filter: `drop-shadow(0 0 ${18 + 30 * pressed}px rgba(255,59,59,0.85))` }}>
          <BuzzerGlyph size={210} pressed={pressed} />
        </div>
        <div style={{ marginTop: 2, opacity: clamp01(Math.max(hit1, hit2) * 3), fontFamily: FONT, fontWeight: 900, fontSize: 40, letterSpacing: 8, color: COLORS.yellow, ...strokeText(8) }}>
          {t >= BUZZER.hit2 ? "×2" : "BUZZ"}
        </div>
      </div>
      <WhiteFlash at={BUZZER.hit} frames={3} peak={0.55} color={COLORS.red} />
      <WhiteFlash at={BUZZER.hit2} frames={3} peak={0.55} color={COLORS.red} />
    </>
  );
};

// ── 8. FREEZE OUTRO (38.367–39.867) ───────────────────────────
// Static crop of the tracked rect at the end of segment 2, computed with CropView's own maths so
// the frozen frame matches what the camera was showing (and stays inside the tracked window).
const FreezeOutro = () => {
  const frame = useCurrentFrame();
  if (frame < sec(OUTRO.start)) return null;
  const local = frame - sec(OUTRO.start);
  const [rx, ry, rw, rh] = OUTRO.rect;
  const zw = rw, zh = rh, cx = rx + rw / 2, cy = ry + rh / 2;
  const zx = Math.max(0, Math.min(1 - zw, cx - zw / 2));
  const zy = Math.max(0, Math.min(1 - zh, cy - zh / 2));
  const push = 1 + local * 0.0022;
  const card = springAt(frame, OUTRO.start + 0.12, SPRING_SNAP);
  const cta = springAt(frame, OUTRO.start + 0.42, SPRING_SNAP);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#000" }} />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Sequence from={sec(OUTRO.start)} layout="none">
          <Freeze frame={0}>
            <Video src={SOURCE} startFrom={Math.round(OUTRO.freezeSourceTime * FPS)} muted style={{ position: "absolute", width: `${100 / zw}%`, height: `${100 / zh}%`, left: `${(-zx / zw) * 100}%`, top: `${(-zy / zh) * 100}%`, objectFit: "fill", maxWidth: "none", filter: "saturate(0.55) contrast(1.15)", transform: `scale(${push})`, transformOrigin: "50% 40%" }} />
          </Freeze>
        </Sequence>
        <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 2px, transparent 2px, transparent 6px)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(255,59,59,0) 35%, rgba(255,59,59,0.3) 78%, rgba(0,0,0,0.8) 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: 196, textAlign: "center", opacity: clamp01(card * 3), transform: `scale(${interpolate(card, [0, 1], [1.8, 1])}) rotate(-2deg)` }}>
        <Big size={54} color={COLORS.white} stroke={10} align="center">A HIGH SCHOOLER. 150R.</Big>
        <div style={{ marginTop: 6 }}>
          <Big size={110} color={COLORS.red} stroke={13} align="center">BUZZED?</Big>
        </div>
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.ctaTop + 620, display: "flex", justifyContent: "center", opacity: clamp01(cta * 2), transform: `translateY(${interpolate(cta, [0, 1], [-40, 0])}px) scale(${interpolate(cta, [0, 1], [0.85, 1])})` }}>
        <div style={{ ...panelStyle, border: `3px solid ${COLORS.yellow}`, padding: "16px 28px", fontFamily: FONT, fontWeight: 900, fontSize: 44, textAlign: "center", color: COLORS.white }}>
          WOULD YOU FUND HIM? <span style={{ color: COLORS.yellow }}>YES</span> / <span style={{ color: COLORS.red }}>BUZZ</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 6, fontSize: 28, color: "rgba(255,255,255,0.75)" }}>
            tell us <ArrowDownGlyph size={26} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 9. THE PERSISTENT CHIP (12.747 → end) ─────────────────────
const RChip = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const state = rChipAt(t);
  if (!state || isFreeze(t)) return null;
  const enter = springAt(frame, CHIP.pin, SPRING_STAMP);
  const flip = springAt(frame, CHIP.best, SPRING_STAMP);
  const best = t >= CHIP.best;
  const pop = best ? interpolate(flip, [0, 1], [1.35, 1]) : 1;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: LAYOUT.chipTop, display: "flex", justifyContent: "center", opacity: clamp01(enter * 3), transform: `translateY(${interpolate(enter, [0, 1], [-40, 0])}px) scale(${pop * (1 + Math.sin(frame / 11) * 0.012)})` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 30px", borderRadius: 999, background: "rgba(15,20,28,0.94)", border: `3px solid ${state.color}`, boxShadow: `${COLORS.shadow}, 0 0 ${best ? 44 : 26}px ${best ? "rgba(255,197,61,0.5)" : "rgba(0,230,118,0.35)"}` }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>{state.label}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 62, lineHeight: 1, color: state.color, fontVariantNumeric: "tabular-nums" }}>{state.value}</div>
      </div>
    </div>
  );
};

// ── 10. MAIN ──────────────────────────────────────────────────
const SHAKES = [
  { at: 0.92, frames: 6, amp: 14 },
  { at: 9.967, frames: 6, amp: 12 },
  { at: 24.987, frames: 8, amp: 18 },
  { at: 28.767, frames: 6, amp: 14 },
  { at: 33.727, frames: 6, amp: 12 },
  { at: 36.647, frames: 6, amp: 16 },
  { at: 37.687, frames: 6, amp: 16 },
];

const screenShakeAt = (frame) => SHAKES.reduce((acc, s) => { const d = shakeAt(frame, s.at, s.frames, s.amp); return { x: acc.x + d.x, y: acc.y + d.y }; }, { x: 0, y: 0 });

const SHAKE_PAD = 1.035; // hides the edges the shake would otherwise reveal

const HighSchooler150RClip = () => {
  useMontserrat();
  const frame = useCurrentFrame();
  const zoom = zoomAt(frame);
  const shake = screenShakeAt(frame);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <style>{FONT_CSS}</style>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) scale(${SHAKE_PAD})` }}>
        <TerminalBackground />

        {/* Base layer: the source through the tracked camera. zoom crops INSIDE the tracked window. */}
        <ClipCamera src={SOURCE} segments={SEGMENTS} camera={CAMERA} srcAspect={SOURCE_ASPECT} zoom={zoom} />

        {/* Creative layer */}
        <ColdOpen />
        <ScheduleCard />
        <UniversityCard />
        <HighSchoolCounter />
        <RrCard />
        <AverageOdometer />
        <TightFlag />
        <ReallyTightFlag />
        <SilenceCard />
        <StyleLanes />
        <RepeatedBack />
        <ClaimHero />
        <DoubtCard />
        <StunnedMeme />
        <RoastCard />
        <HeardEnoughCard />
        <WrongCard />
        <BuzzerTakeover />

        {/* Full-frame takeover: the verdict freeze */}
        <FreezeOutro />

        <RChip />
        <CaptionsLayer />
      </AbsoluteFill>

      {/* Brand bug: steady, above the shake, on every single frame. */}
      <BrandStamp />

      <AudioLayer />
    </AbsoluteFill>
  );
};

// ── SELF-AUDIT (tools/clipcheck/verify.mjs reads this) ────────
// Declaring the beat windows is what lets the checker PROVE no two cards ever share pixels.
const BLOCKS = [
  ["hook headline", 0, HOOK.cut, "card"],
  ["schedule", SCHOOL.card, SCHOOL.cardOut, "card"],
  ["university?", SCHOOL.uni, SCHOOL.uniOut, "card"],
  ["high school counter", SCHOOL.count, SCHOOL.countOut, "card"],
  ["how high rr", RR.q, RR.qOut, "card"],
  ["average odometer", RR.avg, RR.avgOut, "card"],
  ["silence", SILENCE.at, SILENCE.out, "card"],
  ["swing/intraday", STYLE.lanes, STYLE.lanesOut, "card"],
  ["repeated back", BACK.at, BACK.out, "card"],
  ["150R claim", CLAIM.at, CLAIM.out, "card"],
  ["your highest?", DOUBT.at, DOUBT.out, "card"],
  ["the roast", ROAST.at, ROAST.out, "card"],
  ["heard enough", ENOUGH.at, ENOUGH.out, "card"],
  ["bad/wrong", WRONG.bad, WRONG.out, "card"],
  ["red buzzer", BUZZER.ask, BUZZER.out, "card"],
  ["freeze outro", OUTRO.start, OUTRO.end, "card"],
  ["rewind flag", REWIND.at, REWIND.out, "flag"],
  ["tight flag", FLAGS.tight, FLAGS.tightOut, "flag"],
  ["really tight flag", FLAGS.really, FLAGS.reallyOut, "flag"],
  ["stunned meme", MEME.at, MEME.out, "sticker"],
];

export const CLIP_AUDIT = {
  fps: FPS,
  duration: DURATION,
  layout: LAYOUT,
  srcAspect: SOURCE_ASPECT,
  segments: SEGMENTS,
  offsetFrames: OFFSET_FRAMES,
  camera: CAMERA,
  words: WORDS,
  pages: CAPTION_PAGES,
  zoomAt,
  musicVolumeAt,
  sfx: SFX,
  blocks: BLOCKS,
  hide: CAPTION_HIDE_RANGES,
  silences: MUSIC_SILENCES,
};

export default HighSchooler150RClip;
