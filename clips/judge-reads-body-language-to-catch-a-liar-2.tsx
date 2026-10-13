/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1258, "width": 1080, "height": 1920 } */

/* JUDGE "READS BODY LANGUAGE" TO CATCH A LIAR — Alpha Futures / clipping hub
 * Source: "9. 5 Traders, $500,000 On The Line" (id 51aabf2b…) | cut 3ef9a47f (range 198–239.48)
 * 41.93s = 1258 frames @30fps. Segments tile 83 + 1130 = 1213 frames, then a 45-frame freeze outro.
 * Both segments sit inside the cut's single range, so no re-cut is needed.
 *
 * STRUCTURE
 *   HOOK  source 211.96–214.74  plays 0.000–2.767   "you are kind of looking up and to the left"
 *   MAIN  source 199.59–237.26  plays 2.767–40.433  the whole roast, in order
 *   OUTRO freeze of source 237.20  plays 40.433–41.933  the verdict + comment bait
 * The tail after 237.26 (a second "that was a big one") is dropped: the clip buttons on the
 * judge's deadpan "Set and forget." instead of repeating the same line twice.
 *
 * FRAMING — this source range has almost no detectable faces. The sibling project
 * (judge-reads-body-language-to-catch-a-liar) ran the real MediaPipe track over the IDENTICAL
 * segment (199.59–237.94): 154 samples, faces found in only 10 of them, all inside local
 * 14.5–17.25s. So the honest base layer is WIDE, with the three real tracked keys reused at the
 * source times they were measured at (nothing here is a guessed crop):
 *     src 214.09 → single [0.098,0.257,0.174,0.55]   (clip 17.267)
 *     src 215.34 → single [0.296,0,0.316,1]          (clip 18.517)
 *     src 216.84 → back to wide                      (clip 20.017)
 * Because 'w' ignores ClipCamera's zoom, the wide picture gets its own slow push (pushAt, max
 * 1.05, scaled about the band centre so it can never reach the cards or the captions) plus snap
 * bumps on the hero words. The card lane is deliberately EMPTY for the 3s of full-bleed
 * punch-ins (17.267–20.267): that is the only time this clip shows a face, so nothing covers it.
 *
 * BEAT MAP (clip seconds — every one sits on a real transcript word)
 *   0.00  cold open: THE JUDGE "READS" YOUR BODY LANGUAGE + "UP AND TO THE LEFT" = YOU'RE LYING
 *   1.36  "left," slams (the hook line the whole clip is named after)
 *   2.77  white flash + "REWIND: 15 SECONDS EARLIER" (214.74 → 199.59 is 15.15s)
 *   3.69  "I just don't feel like…" → 5.24 "you're fully developed" → 6.30 "MENTALLY." slams
 *   7.97  "I don't even have enough—" — he abandons the sentence mid-roast
 *   9.34  "one thing I'm picking up… from a PSYCHOLOGICAL perspective" → scan card
 *   12.73 "you fail to look at either one of us in the eye" → EYE CONTACT 0%
 *   15.14 "and you are kind of looking up and to the left" → the 3×3 GAZE GRID lights top-left
 *   17.27 face punch-in (tracked) — card lane empty on purpose
 *   18.52 second face punch-in (tracked)  20.02 back to wide
 *   20.27 "a strong signal" → polygraph spike → 21.24 "MAKING THINGS UP" → 21.86 FABRICATING stamp
 *   22.02 "my fine squire." sticker  22.78 laugh track (the room goes)
 *   24.53 "I have a hard time…" → 25.75 "150R," + the caption gets STRUCK THROUGH → 27.43 "right off the table" (red cross slams over the number)
 *   29.09 "the words coming out of your mouth…" → 31.73 "…OUT OF THE OTHER END" + meme + HP 6%
 *   32.67 "Wait, here it is." → tape-rewind card  33.17 "He's flipped up."
 *   34.59 "He said set and forget." → contradiction board, lane 1
 *   37.59 "he day trades." → lane 2   38.35 "WE CAUGHT HIM." → cross slam, flash, music OUT, among-us reveal
 *   38.95 "That was a big one." flag + laugh track under the button
 *   40.43 freeze: CAUGHT. + IS "UP AND TO THE LEFT" A REAL LIE TELL? → MYTH / FACT
 *
 * SPINE — two persistent readouts carry the story between cards:
 *   ROAST DAMAGE bar (under the picture, y1133–1180): 100% → 0% in 9 drops, each on a word
 *   LIE DETECTOR chip (top-left, y100–192): SCANNING → EYE CONTACT 0% → GAZE UP+LEFT →
 *     SIGNAL STRONG → VERDICT FABRICATING → EVIDENCE 1/2 → 2/2 → STATUS CAUGHT
 *
 * BRAND: the Alpha Futures stamp (asset 448984fa…) is on screen from frame 0 to the last frame,
 * top-right, outside the shake wrapper so it stays steady like a broadcast bug. Sized by STAMP
 * below — one constant to make it bigger or smaller.
 */

import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, Video, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ── CORE ──────────────────────────────────────────────────────
const FPS = 30;
const DURATION = 1258;
const WIDTH = 1080;
const HEIGHT = 1920;

const assetUrl = (id) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;

const SOURCE = assetUrl("51aabf2b-198c-458c-a61d-6e51867b21e5");
const SOURCE_ASPECT = 1920 / 1080;

const ASSETS = {
  brandStamp: assetUrl("448984fa-9232-4602-ae6c-61eb1c571e78"), // Alpha Futures Clip Stamp (1).png
  lostForWordsMeme: assetUrl("c7e487de-a071-4b65-822e-302558a893fc"), // hub library
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
    vineBoom: assetUrl("481c86b6-b771-451d-b2db-2bc32d40ef0c"),
    laughTrack: assetUrl("2d4512c6-6881-46c4-a60f-fd8ad2d355bc"), // comedy: sitcom laugh
    amongUsReveal: assetUrl("b0027941-d193-41f5-983c-6a8e608f5d97"), // comedy: the impostor reveal
    emotionalDamage: assetUrl("4d36c65e-9ec6-4e3b-9afa-b57a4cf54606"), // comedy: "the other end"
    sadTrombone: assetUrl("14c3a7fd-0f2d-4431-bb38-31469e94c23e"), // comedy: 150R dismissed
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

// ── LAYOUT ────────────────────────────────────────────────────
// videoTop/videoHeight is exactly ClipCamera's wide box: (1920 - 1080/(16/9)) * 0.4 = 525.
// cardTop 244 and cardBottom 488 are set by the BRAND STAMP and the wide push:
//   · the stamp box runs y20→230 on the right (and it sits outside the shake wrapper, so it does
//     not move), which is why cards start at 244;
//   · pushAt scales the picture about the band centre by up to 1.05, and the shake wrapper adds
//     scale(1.035) about the canvas centre — together they lift the band's top edge to y493.7,
//     so cards must end above that. 488 leaves 5.7px of slack.
// The HUD chip owns y100–192 on the LEFT (x40→~300); the stamp owns x448→1048. They never meet.
// The ROAST DAMAGE bar owns the y1133–1180 gap between the picture and the captions.
const LAYOUT = { chipTop: 100, chipHeight: 92, cardTop: 244, cardBottom: 488, videoTop: 525, videoHeight: 608, captionTop: 1180, captionBottom: 1500, ctaTop: 548, flagTop: 543, hpTop: 1133, hpHeight: 47, stampTop: 20, stampRight: 32 };

// THE BRAND BUG. One place to change if it is still not big enough: STAMP.w / STAMP.h are the
// box, objectFit:contain fits whatever the PNG's real aspect ratio is inside it. At 600×210 the
// box is 55% of the frame width and 11% of its height (the previous clip used 280×130).
const STAMP = { top: LAYOUT.stampTop, right: LAYOUT.stampRight, w: 600, h: 210 };

// ── SEGMENTS / CLOCK ──────────────────────────────────────────
// Source seconds → clip seconds happens through OFFSET_FRAMES, the same frame clock ClipCamera
// uses, so a caption can never drift from the audio it belongs to.
const HOOK_IN = 211.96;
const HOOK_OUT = 214.74;
const MAIN_IN = 199.59;
const MAIN_OUT = 237.26; // 237.25 is the smallest out-point whose AUDIO frame count
// (round(out*fps) - round(in*fps) = 1130) matches the VIDEO frame count round((out-in)*fps).
// At 237.24 they disagree by one frame and the source sound would stop 33ms before the picture.

const SEGMENTS = [
  { in: HOOK_IN, out: HOOK_OUT },
  { in: MAIN_IN, out: MAIN_OUT },
];

const HOOK_FRAMES = Math.round((HOOK_OUT - HOOK_IN) * FPS); // 83
const MAIN_FRAMES = Math.round((MAIN_OUT - MAIN_IN) * FPS); // 1130
const SEG_TOTAL_FRAMES = HOOK_FRAMES + MAIN_FRAMES; // 1213
const OUTRO_FRAMES = 45;
const OFFSET_FRAMES = [0, HOOK_FRAMES];
const MAIN_OFFSET = HOOK_FRAMES / FPS; // 2.7667

// clip time from a source time, per segment
const HT = (src) => src - HOOK_IN; // inside the hook
const MT = (src) => MAIN_OFFSET + (src - MAIN_IN); // inside the main segment

const OUTRO = { start: SEG_TOTAL_FRAMES / FPS, end: DURATION / FPS, freezeSourceTime: 237.2, rect: [0, 0, 1, 1] };

// ── CAMERA ────────────────────────────────────────────────────
// Every non-wide key is a REAL tracked rect measured on this exact source time (see FRAMING).
const CAMERA = [
  { t: 0, m: "w", cut: 1 },
  { t: MAIN_OFFSET, m: "w", cut: 1 }, // the rewind: hard cut back to the top of the roast
  { t: MT(214.09), m: "s", a: [0.098, 0.257, 0.174, 0.55], cut: 1 }, // tracked face, "gives me—"
  { t: MT(215.34), m: "s", a: [0.296, 0, 0.316, 1], cut: 1 }, // tracked face, "gives me a…"
  { t: MT(216.84), m: "w", cut: 1 }, // tracked wide again for "that you may be making things up"
];

// ── BEAT TIMES (all derived from source seconds, never hand-typed) ──
const HOOK = { slam: HT(213.32), cut: MAIN_OFFSET }; // 1.36 / 2.7667
const REWIND = { at: MAIN_OFFSET, out: MAIN_OFFSET + 1.15 }; // "15 SECONDS EARLIER"
const OPEN = { at: MT(200.51), developed: MT(202.06), mental: MT(203.12), stall: MT(204.79), out: MT(206.16) };
const PSYCH = { at: MT(206.16), word: MT(207.47), out: MT(209.55) };
const EYE = { at: MT(209.55), zero: MT(211.62), out: MT(211.96) };
const GAZE = { at: MT(211.96), up: MT(212.82), left: MT(213.32), out: MT(214.09) };
const PUNCH = { a: MT(214.09), b: MT(215.34), out: MT(216.84) }; // camera-only window: no cards
const FAKE = { at: MT(217.09), making: MT(218.06), stamp: MT(218.68), out: MT(220.52) };
const SQUIRE = { at: MT(218.84), laugh: MT(219.6), out: MT(220.52) };
const DENY = { at: MT(221.35), r: MT(222.57), off: MT(224.25), strikeEnd: MT(225.23), out: MT(225.91) };
const OTHER = { at: MT(225.91), mouth: MT(227.51), end: MT(228.55), out: MT(229.49) };
const TAPE = { at: MT(229.49), flipped: MT(229.99), out: MT(231.41) };
const BOARD = { at: MT(231.41), swings: MT(232.25), day: MT(234.57), caught: MT(235.17), out: MT(235.77) };
const CAUGHT = { at: MT(235.77), forget: MT(236.67), out: OUTRO.start };


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


// ── WORDS ─────────────────────────────────────────────────────
// Verbatim from the source transcript (assembly-transcript), [text, source_start, source_end,
// speaker]. Nothing invented, nothing re-timed: these are the real word slots, so a caption can
// only ever be as right as the transcript is.
const HOOK_WORDS = [
  ["you", 211.96, 212.1, "A"],["are", 212.1, 212.13, "A"],["kind", 212.13, 212.42, "A"],["of", 212.42, 212.47, "A"],
  ["looking", 212.5, 212.72, "A"],["up", 212.82, 212.93, "A"],["and", 213, 213.09, "A"],["to", 213.09, 213.22, "A"],
  ["the", 213.22, 213.3, "A"],["left,", 213.32, 213.51, "A"],["which", 213.62, 213.77, "A"],["gives", 214.12, 214.41, "A"],
  ["me—", 214.46, 214.62, "A"],
];

// Speaker A is the judge doing the roasting; B, E and F are the rest of the panel chiming in.
// The contestant never speaks in this range — the whole 38s is the panel talking about him.
const MAIN_WORDS = [
  ["Absolutely.", 199.67, 200.03, "A"],["And", 200.07, 200.24, "A"],["I", 200.24, 200.31, "A"],["just", 200.31, 200.51, "A"],
  ["don't", 200.51, 200.72, "A"],["feel", 200.72, 200.8, "A"],["like", 200.8, 201.04, "A"],["you're", 201.66, 202, "A"],
  ["fully", 202.06, 202.32, "A"],["developed", 202.32, 202.9, "A"],["there", 202.95, 203.12, "A"],["mentally.", 203.12, 203.65, "A"],
  ["And", 204.31, 204.47, "A"],["I", 204.47, 204.49, "A"],["feel", 204.55, 204.73, "A"],["like—", 204.73, 204.79, "A"],
  ["I", 204.79, 204.86, "A"],["don't", 204.92, 205.05, "A"],["even", 205.05, 205.2, "A"],["have", 205.2, 205.31, "A"],
  ["enough—", 205.52, 205.92, "A"],["And", 205.92, 206.13, "A"],["also,", 206.16, 206.42, "A"],["one", 206.48, 206.56, "A"],
  ["thing", 206.58, 206.69, "A"],["I'm", 206.69, 206.82, "A"],["picking", 206.82, 207.01, "A"],["up", 207.06, 207.14, "A"],
  ["here", 207.14, 207.3, "A"],["from", 207.3, 207.46, "A"],["a", 207.46, 207.47, "A"],["psychological", 207.47, 208.17, "A"],
  ["perspective", 208.18, 208.71, "A"],["is", 208.92, 209.03, "A"],["that", 209.05, 209.19, "A"],["you", 209.29, 209.42, "A"],
  ["fail", 209.55, 209.9, "A"],["to", 210.27, 210.37, "A"],["look", 210.37, 210.59, "A"],["at", 210.59, 210.77, "A"],
  ["either", 210.81, 210.96, "A"],["one", 211.06, 211.15, "A"],["of", 211.15, 211.23, "A"],["us", 211.23, 211.39, "A"],
  ["in", 211.39, 211.46, "A"],["the", 211.46, 211.62, "A"],["eye,", 211.62, 211.67, "A"],["and", 211.86, 211.96, "A"],
  ["you", 211.96, 212.1, "A"],["are", 212.1, 212.13, "A"],["kind", 212.13, 212.42, "A"],["of", 212.42, 212.47, "A"],
  ["looking", 212.5, 212.72, "A"],["up", 212.82, 212.93, "A"],["and", 213, 213.09, "A"],["to", 213.09, 213.22, "A"],
  ["the", 213.22, 213.3, "A"],["left,", 213.32, 213.51, "A"],["which", 213.62, 213.77, "A"],["gives", 214.12, 214.41, "A"],
  ["me—", 214.46, 214.62, "A"],["gives", 215.34, 215.53, "A"],["me", 215.65, 215.84, "A"],["a", 216.43, 216.45, "A"],
  ["strong", 216.45, 217.06, "A"],["signal", 217.09, 217.46, "A"],["that", 217.49, 217.62, "A"],["you", 217.65, 217.81, "A"],
  ["may", 217.81, 217.97, "A"],["be", 217.97, 218.06, "A"],["making", 218.06, 218.33, "A"],["things", 218.38, 218.68, "A"],
  ["up,", 218.68, 218.76, "A"],["my", 218.84, 218.89, "A"],["fine", 219, 219.26, "A"],["squire.", 219.26, 219.6, "A"],
  ["Okay,", 220.52, 220.87, "A"],["so", 220.87, 220.87, "A"],["I", 220.87, 221.07, "A"],["have", 221.07, 221.21, "A"],
  ["a", 221.21, 221.35, "A"],["hard", 221.35, 221.49, "A"],["time.", 221.49, 221.84, "A"],["And", 221.87, 221.89, "A"],
  ["first", 221.89, 222.09, "A"],["of", 222.09, 222.35, "A"],["all,", 222.35, 222.49, "A"],["with", 222.49, 222.57, "A"],
  ["150R,", 222.57, 223.87, "A"],["yeah,", 223.87, 224.25, "A"],["right", 224.25, 224.61, "A"],["off", 224.61, 224.81, "A"],
  ["the", 224.81, 224.93, "A"],["table.", 224.93, 225.23, "A"],["I", 225.23, 225.23, "A"],["think", 225.23, 225.77, "A"],
  ["the", 225.77, 225.91, "A"],["words", 225.91, 226.63, "A"],["that", 226.63, 226.91, "A"],["are", 226.91, 227.09, "A"],
  ["coming", 227.09, 227.17, "A"],["out", 227.17, 227.33, "A"],["of", 227.33, 227.45, "A"],["your", 227.45, 227.51, "A"],
  ["mouth", 227.51, 227.71, "A"],["may", 227.71, 227.95, "A"],["be", 227.95, 228.07, "A"],["coming", 228.07, 228.23, "A"],
  ["out", 228.23, 228.39, "A"],["of", 228.39, 228.53, "A"],["the", 228.53, 228.55, "A"],["other", 228.55, 228.75, "A"],
  ["end", 228.75, 228.97, "A"],["here.", 228.97, 229.47, "A"],["Wait,", 229.49, 229.67, "B"],["here", 229.67, 229.67, "B"],
  ["it", 229.67, 229.81, "B"],["is.", 229.81, 229.99, "B"],["He's", 229.99, 230.19, "A"],["flipped", 230.19, 230.35, "A"],
  ["up.", 230.35, 230.63, "A"],["You", 230.63, 230.65, "A"],["know", 230.65, 230.73, "A"],["where", 230.73, 230.79, "A"],
  ["he's", 230.79, 230.87, "A"],["flipped", 230.87, 231.01, "A"],["up?", 231.01, 231.21, "A"],["He", 231.41, 231.43, "F"],
  ["said", 231.43, 231.43, "F"],["set", 231.43, 231.61, "F"],["and", 231.61, 231.69, "F"],["forget.", 231.69, 231.89, "F"],
  ["She", 232.25, 232.27, "B"],["just", 232.27, 232.61, "B"],["swings.", 232.61, 233.31, "B"],["That", 233.31, 233.31, "E"],
  ["is", 233.31, 233.49, "E"],["right.", 233.49, 233.94, "E"],["Exactly.", 234.13, 234.25, "A"],["He", 234.25, 234.39, "A"],
  ["says", 234.39, 234.41, "A"],["he", 234.41, 234.57, "A"],["day", 234.57, 234.71, "A"],["trades.", 234.71, 235.06, "A"],
  ["We", 235.15, 235.17, "A"],["caught", 235.17, 235.39, "A"],["him.", 235.39, 235.77, "A"],["That", 235.77, 235.85, "E"],
  ["was", 235.85, 236.29, "E"],["a", 236.29, 236.43, "E"],["big", 236.43, 236.43, "E"],["one.", 236.43, 236.67, "E"],
  ["Set", 236.67, 236.67, "A"],["and", 236.67, 236.81, "A"],["forget.", 236.81, 237.16, "A"],
];

const MAX_WORDS_PER_PAGE = 4;
const PAGE_GAP_BREAK = 0.45;

// Colour is meaning: green = the "tell" and the numbers, red = the accusation and the damage.
const RED_WORDS = new Set(["fail", "eye", "making", "hard", "other", "end", "caught", "squire", "table", "day", "trades", "wait", "flipped"]);
const GREEN_WORDS = new Set(["up", "left", "150r", "psychological", "signal", "strong", "set", "forget", "swings", "exactly"]);

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


// ── CAPTION CLOCK ─────────────────────────────────────────────
// Source seconds → clip seconds, on the SAME frame clock ClipCamera uses (OFFSET_FRAMES).
const toClipWords = (list, i) => {
  const shift = SEGMENTS[i].in - OFFSET_FRAMES[i] / FPS;
  return repairWords(list).map((w) => ({ text: w.text, start: +(w.s - shift).toFixed(3), end: +(w.e - shift).toFixed(3), speaker: w.speaker }));
};

const WORDS = [...toClipWords(HOOK_WORDS, 0), ...toClipWords(MAIN_WORDS, 1)].filter((w) => w.start >= 0 && w.start < DURATION / FPS);

const keyColorFor = (w) => {
  const n = normalizeWord(w);
  if (RED_WORDS.has(n)) return COLORS.red;
  if (GREEN_WORDS.has(n)) return COLORS.green;
  return null;
};

// A is the judge doing the roasting; B/E/F are the rest of the panel. The kit's SpeakerChip dots
// the lead judge yellow and everyone else green, so the panel changes read at a glance.
const speakerTag = (speaker) => ({ A: "JUDGE", B: "JUDGE 2", E: "JUDGE 3", F: "JUDGE 4" })[speaker] || "JUDGE";

const CAPTION_PAGES = buildPages(WORDS);

// The freeze outro is a full-frame takeover: no captions over it.
const CAPTION_HIDE_RANGES = [[OUTRO.start, OUTRO.end]];
const isFreeze = (t) => CAPTION_HIDE_RANGES.some(([a, b]) => t >= a && t < b);

// The strike-through runs across the caption while the judge throws the 150R claim out:
// "with 150R, yeah, right off the table." The words he is dismissing literally get crossed out.
const CAPTION_STRIKE = { start: MT(222.57), end: MT(225.23) };

// ── ZOOM ──────────────────────────────────────────────────────
// ClipCamera's zoom only bites in "s"/"p" windows — and this clip has exactly two of them, both
// tracked faces at 17.267–20.017. So the zoom curve is quiet everywhere else and does its work
// there; the wide picture is pushed by pushAt() below instead (see part 8).
const ZOOM_KEYS = [
  { t: 0, z: 1.0, dur: 0, ease: "smooth" },
  { t: MT(214.09), z: 1.06, dur: 0.5, ease: "smooth" }, // settle into the first tracked face
  { t: MT(215.34), z: 1.0, dur: 0, ease: "smooth" }, // hard cut to the second window
  { t: MT(215.34) + 0.06, z: 1.1, dur: 0.6, ease: "smooth" }, // slow push on "a strong signal"
  { t: MT(216.84), z: 1.0, dur: 0, ease: "smooth" }, // hard cut back to wide
];

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


// ── 8. THE WIDE PUSH ──────────────────────────────────────────
// ClipCamera's zoom prop is ignored in "w" mode, and 38 of this clip's 41.9 seconds are wide.
// A letterboxed picture that never moves reads as unproduced, so the wide shot gets its own push:
// a slow 2% drift plus a 3% snap bump on the hero words, capped at 1.05 and applied to a wrapper
// OUTSIDE the ClipCamera marker block, scaled about the centre of the picture band so the band's
// top edge can never climb above y509.8 (cards end at 505) and its bottom edge never reaches the
// captions at 1180. It returns exactly 1 in "s" mode, where the picture is already full-bleed.
const PUSH_MAX = 1.05;
const PUSH_RESETS = [0, MAIN_OFFSET, PUNCH.out]; // every hard camera cut restarts the drift
const PUSH_SNAPS = [MT(203.12), MT(212.82), MT(222.57), MT(228.55), MT(235.17)];
const PUSH_ORIGIN = `${((LAYOUT.videoTop + LAYOUT.videoHeight / 2) / HEIGHT) * 100}%`;

const pushAt = (frame) => {
  const t = frame / FPS;
  if (camAt(CAMERA, t).m !== "w") return 1;
  let start = PUSH_RESETS[0];
  for (const r of PUSH_RESETS) if (t >= r) start = r;
  const drift = 0.02 * clamp01((t - start) / 6);
  let snap = 0;
  for (const s of PUSH_SNAPS) {
    const d = t - s;
    if (d >= 0 && d < 0.8) snap = Math.max(snap, 0.03 * clamp01(d / 0.1) * clamp01((0.8 - d) / 0.5));
  }
  return Math.min(PUSH_MAX, 1 + drift + snap);
};

// ── SFX ───────────────────────────────────────────────────────
// Every cue sits on a word start or a hard visual cut. Layered only on the three hero beats:
// "making things up" (21.24), "150R" (25.75) and "WE CAUGHT HIM" (38.35).
// The kit's AudioLayer caps each cue at 3s, so the 6.4s laugh track never runs away.
const SFX = [
  { at: 0.0, src: ASSETS.sfx.impactDeep, vol: 0.8 }, // frame-0 headline
  { at: HT(212.82), src: ASSETS.sfx.uiToggleOn, vol: 0.5 }, // "up"
  { at: HT(213.32), src: ASSETS.sfx.vineBoom, vol: 0.5 }, // "left," — the hook line
  { at: HT(213.32), src: ASSETS.sfx.stampHit, vol: 0.65 },
  { at: MAIN_OFFSET, src: ASSETS.sfx.whooshReverse, vol: 0.6 }, // the rewind
  { at: MT(199.67), src: ASSETS.sfx.uiClick, vol: 0.5 }, // "Absolutely." + rewind flag
  { at: MT(200.51), src: ASSETS.sfx.popReveal, vol: 0.5 }, // the opening roast card
  { at: MT(202.06), src: ASSETS.sfx.impactSoft, vol: 0.55 }, // "fully developed"
  { at: MT(203.12), src: ASSETS.sfx.vineBoom, vol: 0.6 }, // "MENTALLY." + damage 82%
  { at: MT(204.79), src: ASSETS.sfx.uiClick, vol: 0.4 }, // he abandons the sentence
  { at: MT(206.16), src: ASSETS.sfx.popReveal, vol: 0.5 }, // the psych card
  { at: MT(207.47), src: ASSETS.sfx.riserSoft, vol: 0.5 }, // "psychological"
  { at: MT(209.55), src: ASSETS.sfx.impactSoft, vol: 0.6 }, // "you fail" + damage 68%
  { at: MT(211.62), src: ASSETS.sfx.uiClick, vol: 0.5 }, // "eye," → 0%
  { at: MT(211.96), src: ASSETS.sfx.whooshSoft, vol: 0.45 }, // the gaze grid
  { at: MT(212.82), src: ASSETS.sfx.uiToggleOn, vol: 0.6 }, // grid: UP cell + damage 54%
  { at: MT(213.32), src: ASSETS.sfx.uiToggleOn, vol: 0.6 }, // grid: LEFT cell + the arrow
  { at: MT(214.09), src: ASSETS.sfx.impactDeep, vol: 0.5 }, // tracked punch-in A
  { at: MT(215.34), src: ASSETS.sfx.impactSoft, vol: 0.45 }, // tracked punch-in B
  { at: MT(216.45), src: ASSETS.sfx.clockTick, vol: 0.4 }, // HUD: SIGNAL STRONG
  { at: MT(216.84), src: ASSETS.sfx.whooshSoft, vol: 0.5 }, // back to wide
  { at: MT(217.09), src: ASSETS.sfx.popReveal, vol: 0.5 }, // "a strong signal" card
  { at: MT(218.06), src: ASSETS.sfx.vineBoom, vol: 0.7 }, // HERO: "making things up"
  { at: MT(218.06), src: ASSETS.sfx.impactDeep, vol: 0.6 },
  { at: MT(218.68), src: ASSETS.sfx.stampHit, vol: 0.7 }, // FABRICATING stamp
  { at: MT(218.84), src: ASSETS.sfx.popReveal, vol: 0.45 }, // "my fine squire." sticker
  { at: MT(219.6), src: ASSETS.sfx.laughTrack, vol: 0.35 }, // the room goes
  { at: MT(220.52), src: ASSETS.sfx.whooshSoft, vol: 0.4 }, // card out
  { at: MT(221.35), src: ASSETS.sfx.impactSoft, vol: 0.55 }, // "I have a hard time"
  { at: MT(222.57), src: ASSETS.sfx.vineBoom, vol: 0.75 }, // HERO: "150R," + caption strike
  { at: MT(222.57), src: ASSETS.sfx.stampHit, vol: 0.6 },
  { at: MT(224.25), src: ASSETS.sfx.uiClick, vol: 0.5 }, // "right off the table" → the cross slams
  { at: MT(224.93), src: ASSETS.sfx.sadTrombone, vol: 0.35 }, // the claim is gone
  { at: MT(225.91), src: ASSETS.sfx.riserSoft, vol: 0.5 }, // "the words that are coming out…"
  { at: MT(227.51), src: ASSETS.sfx.popReveal, vol: 0.5 }, // meme in
  { at: MT(228.55), src: ASSETS.sfx.emotionalDamage, vol: 0.6 }, // "…the other end" + damage 6%
  { at: MT(229.49), src: ASSETS.sfx.whooshReverse, vol: 0.6 }, // "Wait, here it is." → tape rewind
  { at: MT(229.99), src: ASSETS.sfx.uiClick, vol: 0.45 }, // "He's flipped up."
  { at: MT(231.41), src: ASSETS.sfx.popReveal, vol: 0.5 }, // board lane 1: "set and forget"
  { at: MT(232.25), src: ASSETS.sfx.uiClick, vol: 0.4 }, // "She just swings."
  { at: MT(234.57), src: ASSETS.sfx.impactSoft, vol: 0.6 }, // board lane 2: "he day trades"
  { at: MT(235.17), src: ASSETS.sfx.amongUsReveal, vol: 0.7 }, // HERO: "WE CAUGHT HIM" (music is out)
  { at: MT(235.17), src: ASSETS.sfx.vineBoom, vol: 0.8 },
  { at: MT(235.17), src: ASSETS.sfx.impactDeep, vol: 0.75 },
  { at: MT(235.77), src: ASSETS.sfx.laughTrack, vol: 0.45 }, // "That was a big one." — plays out under the button
  { at: OUTRO.start, src: ASSETS.sfx.impactDeep, vol: 0.7 }, // the freeze slams
  { at: OUTRO.start, src: ASSETS.sfx.stampHit, vol: 0.6 },
  { at: OUTRO.start + 0.5, src: ASSETS.sfx.uiClick, vol: 0.4 }, // CTA in
];

const MUSIC_BASE = 0.07;
const MUSIC_HOT = 0.1;
const MUSIC_HERO = 0.095;
const MUSIC_END = 0.11;
// Two dry windows: the rewind cut, and the gotcha. The library has no record-scratch, so the
// "stop" before WE CAUGHT HIM is silence — the bed leaves on the exact frame and the among-us
// reveal + laugh track carry the punchline with nothing under them.
const MUSIC_SILENCES = [
  [MAIN_OFFSET - 0.067, MAIN_OFFSET + 0.18],
  [MT(235.03), MT(236.3)],
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
  if (t >= BOARD.at && t < BOARD.caught) level = MUSIC_HERO; // lift while the evidence stacks
  if (t >= OUTRO.start + 0.2) level = lerp(MUSIC_BASE, MUSIC_END, clamp01((t - (OUTRO.start + 0.2)) / 0.4));
  return level * duck * fadeIn * fadeOut;
};

// ── THE TWO PERSISTENT READOUTS ───────────────────────────────
// The lie-detector chip (top-left) and the roast-damage bar (under the picture) are on screen
// from frame 0 to the freeze. Every change lands on a spoken word, so the graphics are always
// saying what the judge is saying.
const HUD_KEYS = [
  { at: 0, label: "LIE DETECTOR", value: "SCANNING", color: COLORS.green },
  { at: MT(209.55), label: "EYE CONTACT", value: "0%", color: COLORS.red },
  { at: MT(212.82), label: "GAZE", value: "UP + LEFT", color: COLORS.yellow },
  { at: MT(216.45), label: "SIGNAL", value: "STRONG", color: COLORS.yellow },
  { at: MT(218.06), label: "VERDICT", value: "FABRICATING", color: COLORS.red },
  { at: MT(231.43), label: "EVIDENCE", value: "1 OF 2", color: COLORS.green },
  { at: MT(234.57), label: "EVIDENCE", value: "2 OF 2", color: COLORS.yellow },
  { at: MT(235.17), label: "STATUS", value: "CAUGHT", color: COLORS.red },
];

const hudAt = (t) => {
  let s = HUD_KEYS[0];
  for (const k of HUD_KEYS) if (t >= k.at) s = k;
  return s;
};

const HP_KEYS = [
  { at: 0, v: 100, label: "CONTESTANT" },
  { at: MT(200.51), v: 92, label: "OOF" },
  { at: MT(203.12), v: 82, label: "MENTALLY?" },
  { at: MT(209.55), v: 68, label: "NO EYE CONTACT" },
  { at: MT(212.82), v: 54, label: "GAZE: UP + LEFT" },
  { at: MT(218.06), v: 38, label: "FABRICATING" },
  { at: MT(222.57), v: 22, label: "150R DENIED" },
  { at: MT(228.55), v: 6, label: "EMOTIONAL DAMAGE" },
  { at: MT(235.17), v: 0, label: "CAUGHT" },
];

const hpAt = (t) => {
  let i = 0;
  for (let j = 0; j < HP_KEYS.length; j++) if (t >= HP_KEYS[j].at) i = j;
  const k = HP_KEYS[i], p = HP_KEYS[i - 1];
  const v = p ? lerp(p.v, k.v, EASES.smooth(clamp01((t - k.at) / 0.25))) : k.v;
  return { v, label: k.label, at: k.at, drop: !!p };
};


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


// ── GLYPHS FOR THIS CLIP ──────────────────────────────────────
// Drawn, not emoji: the gaze grid, the polygraph trace, the dead eye, the scanner reticle.
// Every draw-on animation uses pathLength={1} so the dash maths is resolution-independent and
// deterministic per frame.

const ArrowUpLeftGlyph = ({ size = 60, color = COLORS.green, p = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <path d="M20 20 L5 5" stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
    <path d="M5 12 L5 5 L12 5" stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={clamp01(p * 2 - 1)} />
  </svg>
);

// The money shot: a 3×3 gaze grid. The top-middle cell lights on "up", the top-left on "left,",
// and the arrow draws from his eyes to that corner. Cells are divs (so they can glow and scale),
// the arrow is SVG on top.
const GAZE_CELLS = [0, 1, 2].reduce((acc, r) => acc.concat([0, 1, 2].map((c) => ({ c, r, key: `${c}-${r}` }))), []);

const GazeGrid = ({ up = 0, left = 0, size = 300 }) => {
  const sc = size / 320;
  return (
    <div style={{ position: "relative", width: size, height: 210 * sc }}>
      {GAZE_CELLS.map(({ c, r, key }) => {
        const on = clamp01(c === 1 && r === 0 ? up : c === 0 && r === 0 ? left : 0);
        return (
          <div
            key={key}
            style={{
              position: "absolute",
              left: (8 + c * 104) * sc,
              top: (7 + r * 68) * sc,
              width: 96 * sc,
              height: 60 * sc,
              borderRadius: 12 * sc,
              background: on > 0 ? `rgba(0,230,118,${(0.06 + 0.24 * on).toFixed(3)})` : "rgba(255,255,255,0.05)",
              border: `${3 * sc}px solid ${on > 0 ? COLORS.green : "rgba(255,255,255,0.14)"}`,
              boxShadow: on > 0 ? `0 0 ${(28 * on).toFixed(1)}px rgba(0,230,118,${(0.55 * on).toFixed(3)})` : "none",
              transform: `scale(${1 + 0.08 * on})`,
            }}
          />
        );
      })}
      <svg width={size} height={210 * sc} viewBox="0 0 320 210" style={{ position: "absolute", inset: 0 }}>
        <circle cx="160" cy="105" r="9" fill={COLORS.white} opacity="0.85" />
        <path d="M160 105 L56 37" stroke={COLORS.green} strokeWidth="5" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(left)} />
        <path d="M56 62 L56 37 L81 37" stroke={COLORS.green} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={clamp01(left * 2 - 1)} />
      </svg>
    </div>
  );
};

// Polygraph trace: flat-ish noise with one violent spike. `p` draws it left to right, `spike`
// decides whether the trace has gone off the rails yet.
const POLY_PATH = (() => {
  let d = "";
  for (let i = 0; i <= 58; i++) {
    const x = i * 10;
    const n = (seeded(i * 2.3) - 0.5) * 12;
    const inSpike = i >= 38 && i <= 46;
    const spike = inSpike ? Math.sin(((i - 38) / 8) * Math.PI) * 48 : 0;
    d += `${i ? " L" : "M"}${x} ${(64 + n - spike).toFixed(2)}`;
  }
  return d;
})();

const PolyTrace = ({ p = 1, width = 560, height = 84, color = COLORS.green }) => (
  <svg width={width} height={height} viewBox="0 0 580 90" preserveAspectRatio="none" style={{ display: "block" }}>
    <path d="M0 64 L580 64" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="6 8" />
    <path d={POLY_PATH} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
  </svg>
);

const EyeOffGlyph = ({ size = 46, color = COLORS.red }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 32 22" style={{ display: "block" }}>
    <path d="M2 11 C6 4 12 2 16 2 C20 2 26 4 30 11 C26 18 20 20 16 20 C12 20 6 18 2 11 Z" fill="none" stroke={color} strokeWidth="2.6" />
    <circle cx="16" cy="11" r="4.4" fill={color} />
    <path d="M4 20 L28 2" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

// Scanner reticle: four corners + a sweep line that runs on the frame clock.
const ScanGlyph = ({ size = 120, frame = 0, color = COLORS.green }) => {
  const sweep = ((frame * 1.6) % (size + 40)) - 20;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
        {[
          "M6 26 L6 6 L26 6",
          "M74 6 L94 6 L94 26",
          "M94 74 L94 94 L74 94",
          "M26 94 L6 94 L6 74",
        ].map((d, i) => (
          <path key={i} d={d} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 6, right: 6, top: sweep, height: 3, background: color, opacity: 0.75, boxShadow: `0 0 16px ${color}` }} />
    </div>
  );
};


// ── PRIMITIVES ────────────────────────────────────────────────
// Every beat in a clip is one of these six. That is what keeps the file small and the spacing
// consistent: a Panel always owns the card lane, a Flag always owns a corner of the picture.
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


// ── BRAND STAMP — Alpha Futures, on screen from frame 0 to the last frame. ──
// Static: a broadcast bug that slides in is not "on from frame one". Outside the shake wrapper so
// it stays dead steady while the edit moves. Top-right, clear of the bottom 340px and the right
// 160px phone-UI zones, and clear of the card lane (which is why cardTop is 244).
// objectFit:contain inside a fixed 600×210 box, so it cannot distort whatever the PNG's real
// aspect ratio is: a wide lockup fills the 600, a square mark fills the 210.
const BrandStamp = () => (
  <div style={{ position: "absolute", top: STAMP.top, right: STAMP.right, width: STAMP.w, height: STAMP.h, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", filter: "drop-shadow(0 10px 26px rgba(0,0,0,0.95))" }}>
    <Img src={ASSETS.brandStamp} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
  </div>
);

// ── AMBIENCE, DRAWN *AFTER* THE PICTURE ───────────────────────
// ClipCamera paints its own opaque background, so the kit's TerminalBackground (drawn before it,
// as in clips 1 and 2) never actually reaches the screen. This clip drives the kit's CandleStrip
// directly, in the two zones the letterboxed band does not occupy, and fades them out for the
// full-bleed punch-ins, where there is no room for ambience.
const BackdropLayer = () => {
  const frame = useCurrentFrame();
  const wide = camAt(CAMERA, frame / FPS).m === "w";
  const gridShift = (frame * 0.4) % 60;
  const bandBottom = LAYOUT.videoTop + LAYOUT.videoHeight;
  const zone = (key, top, height, candleY, speed, flip, candleOpacity) => (
    <div key={key} style={{ position: "absolute", left: 0, width: WIDTH, top, height, overflow: "hidden", background: COLORS.bg, opacity: wide ? 1 : 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.gridLine} 2px, transparent 2px), linear-gradient(90deg, ${COLORS.gridLine} 2px, transparent 2px)`,
          backgroundSize: "60px 60px",
          backgroundPosition: `${-gridShift}px 0px`,
        }}
      />
      <CandleStrip y={candleY} speed={speed} opacity={candleOpacity} flip={flip} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(0,230,118,0.05) 0%, rgba(0,0,0,0) 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)" }} />
    </div>
  );
  return (
    <>
      {zone("top", 0, LAYOUT.videoTop, -40, 0.6, true, 0.05)}
      {zone("bottom", bandBottom, HEIGHT - bandBottom, 200, 0.9, false, 0.08)}
    </>
  );
};


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


// ── 12. COLD OPEN (0 → 2.767) ─────────────────────────────────
// Frame 0 is the thumbnail: fully composed, the hook line already on screen, no fade from black.
const HookHeadline = () => {
  const frame = useCurrentFrame();
  if (frame >= sec(HOOK.cut)) return null;
  const t = frame / FPS;
  const enter = spring({ frame: frame + 7, fps: FPS, config: SPRING_IN }); // already most of the way in at frame 0
  const slammed = t >= HOOK.slam;
  const slam = springAt(frame, HOOK.slam, SPRING_STAMP);
  const verdict = t >= HT(213.62);
  const shake = shakeAt(frame, HOOK.slam, 6, 12);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: LAYOUT.cardTop + 6, textAlign: "center", opacity: exitAt(frame, HOOK.cut, 5), transform: `translate(${shake.x}px, ${interpolate(enter, [0, 1], [-46, 0]) + shake.y + Math.sin(frame / 9) * 2}px)` }}>
      {/* The hook line is on screen at frame 0 (frame 0 IS the thumbnail); it slams at 1.36 on
          "left," and the "= HE'S MAKING THINGS UP" reading lands at 1.66 on "which". */}
      <Kicker size={26} align="center">5 TRADERS. $500,000 ON THE LINE.</Kicker>
      <div style={{ marginTop: 4 }}>
        <Big size={40} color={COLORS.yellow} stroke={9} align="center">THE JUDGE SAYS YOU LOOKED</Big>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 2, transform: `scale(${slammed ? interpolate(slam, [0, 1], [1.45, 1]) : 1})` }}>
        <ArrowUpLeftGlyph size={50} color={COLORS.green} p={slammed ? interpolate(slam, [0, 1], [0.15, 1]) : 0.15} />
        <Big size={56} color={COLORS.green} stroke={11} align="center">"UP AND TO THE LEFT"</Big>
      </div>
      <div style={{ marginTop: 4, opacity: verdict ? clamp01((t - HT(213.62)) * 6) : 0 }}>
        <Big size={30} color={COLORS.red} stroke={7} align="center">= HE'S MAKING THINGS UP</Big>
      </div>
    </div>
  );
};

const RewindFlag = () => (
  <Flag at={REWIND.at} out={REWIND.out} top={LAYOUT.flagTop} left={50} color={COLORS.yellow} size={30}>
    <RewindGlyph size={30} color={COLORS.yellow} />
    15 SECONDS EARLIER
  </Flag>
);

// ── 13. THE ROAST (3.687 → 23.697) ────────────────────────────
const OpeningRoast = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, OPEN.at, OPEN.out)) return null;
  const dev = t >= OPEN.developed;
  const mental = t >= OPEN.mental;
  const stall = t >= OPEN.stall;
  const slam = springAt(frame, OPEN.mental, SPRING_STAMP);
  const shake = shakeAt(frame, OPEN.mental, 6, 12);
  return (
    <Panel at={OPEN.at} out={OPEN.out} border={mental || stall ? COLORS.red : COLORS.panelBorder}>
      <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        {stall ? (
          <>
            <Kicker size={22}>HE ABANDONS THE SENTENCE</Kicker>
            <div style={{ marginTop: 6 }}>
              <Big size={40} color="rgba(255,255,255,0.85)" stroke={8}>"I DON'T EVEN HAVE ENOUGH—"</Big>
            </div>
          </>
        ) : (
          <>
            <Kicker size={22} color={COLORS.red}>THE OPENING LINE</Kicker>
            <div style={{ marginTop: 6 }}>
              <Big size={44} stroke={9}>{dev ? "YOU'RE FULLY DEVELOPED" : "I JUST DON'T FEEL LIKE"}</Big>
            </div>
            {mental ? (
              <div style={{ transform: `scale(${interpolate(slam, [0, 1], [2.0, 1])})`, transformOrigin: "left center" }}>
                <Big size={60} color={COLORS.red} stroke={12}>MENTALLY.</Big>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  );
};

const PsychRead = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, PSYCH.at, PSYCH.out)) return null;
  const on = t >= PSYCH.word;
  return (
    <Panel at={PSYCH.at} out={PSYCH.out} border={on ? COLORS.green : COLORS.panelBorder}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ flex: 1 }}>
          <Kicker size={22} color={on ? COLORS.green : "rgba(255,255,255,0.6)"}>{on ? "\"FROM A PSYCHOLOGICAL PERSPECTIVE\"" : "\"ONE THING I'M PICKING UP HERE\""}</Kicker>
          <div style={{ marginTop: 8 }}>
            <Big size={44} color={on ? COLORS.green : COLORS.white} stroke={9}>{on ? "HE'S READING YOU" : "HE STARTS THE READ"}</Big>
          </div>
        </div>
        <ScanGlyph size={116} frame={frame} color={on ? COLORS.green : "rgba(255,255,255,0.45)"} />
      </div>
    </Panel>
  );
};

const EyeContact = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, EYE.at, EYE.out)) return null;
  const zero = t >= EYE.zero;
  const drain = EASES.smooth(clamp01((t - EYE.at) / (EYE.zero - EYE.at)));
  const pct = Math.round(100 - 100 * drain);
  return (
    <Panel at={EYE.at} out={EYE.out} border={zero ? COLORS.red : COLORS.panelBorder} cfg={SPRING_SNAP}>
      <Kicker size={22} color={COLORS.red}>EXHIBIT A — THE EYES</Kicker>
      <div style={{ marginTop: 6 }}>
        <Big size={40} stroke={9}>"YOU FAIL TO LOOK AT EITHER ONE OF US IN THE EYE"</Big>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10 }}>
        <EyeOffGlyph size={44} color={zero ? COLORS.red : "rgba(255,255,255,0.45)"} />
        <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 22, letterSpacing: 2, color: "rgba(255,255,255,0.6)" }}>EYE CONTACT</div>
        <div style={{ flex: 1, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ height: 18, width: `${pct}%`, borderRadius: 9, background: zero ? COLORS.red : COLORS.yellow, boxShadow: zero ? "0 0 18px rgba(255,59,59,0.6)" : "none" }} />
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, lineHeight: 1, color: zero ? COLORS.red : COLORS.white, fontVariantNumeric: "tabular-nums" }}>{pct}%</div>
      </div>
    </Panel>
  );
};

// The hook line, explained: the grid lights the cell he is supposedly looking at.
const GazeCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, GAZE.at, GAZE.out)) return null;
  const up = clamp01((t - GAZE.up) / 0.2);
  const left = clamp01((t - GAZE.left) / 0.35);
  return (
    <Panel at={GAZE.at} out={GAZE.out} border={COLORS.green} cfg={SPRING_SNAP}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: 1 }}>
          <Kicker size={22} color={COLORS.yellow}>EXHIBIT B — WHERE HE LOOKED</Kicker>
          <div style={{ marginTop: 6 }}>
            <Big size={36} stroke={8}>AND YOU ARE LOOKING…</Big>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, opacity: clamp01(up * 2) }}>
            <ArrowUpLeftGlyph size={44} color={COLORS.green} p={left} />
            <Big size={46} color={COLORS.green} stroke={10}>UP + LEFT</Big>
          </div>
        </div>
        <GazeGrid up={up} left={left} size={286} />
      </div>
    </Panel>
  );
};

// 17.267–20.267 is deliberately card-free: it is the only window where the tracked camera shows a
// face full-bleed, so nothing covers it. The HUD chip still moves (SIGNAL: STRONG at 19.627).
const Fabricating = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, FAKE.at, FAKE.out)) return null;
  const making = t >= FAKE.making;
  const stamped = t >= FAKE.stamp;
  const slam = springAt(frame, FAKE.stamp, SPRING_STAMP);
  const shake = shakeAt(frame, FAKE.making, 7, 14);
  const trace = clamp01((t - FAKE.at) / 1.6);
  return (
    <Panel at={FAKE.at} out={FAKE.out} border={making ? COLORS.red : COLORS.green}>
      <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Kicker size={22} color={making ? COLORS.red : COLORS.green}>{making ? "THE VERDICT" : "THE READ IS COMING"}</Kicker>
        <div style={{ margin: "8px 0 6px" }}>
          <PolyTrace p={trace} width={800} height={78} color={making ? COLORS.red : COLORS.green} />
        </div>
        {making ? <Big size={44} color={COLORS.red} stroke={10}>"YOU MAY BE MAKING THINGS UP"</Big> : <Big size={38} stroke={9}>THAT GIVES ME A STRONG SIGNAL</Big>}
      </div>
      {stamped ? (
        <div style={{ position: "absolute", top: 10, right: 18, padding: "8px 20px", background: COLORS.red, color: "#FFFFFF", borderRadius: 12, fontFamily: FONT, fontWeight: 900, fontSize: 34, letterSpacing: 3, whiteSpace: "nowrap", boxShadow: "0 10px 26px rgba(0,0,0,0.6)", transform: `rotate(-8deg) scale(${interpolate(slam, [0, 1], [2.4, 1])})` }}>
          FABRICATING
        </div>
      ) : null}
    </Panel>
  );
};

// Sticker over the picture (not the card lane): the judge's weird sign-off.
const SquireSticker = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, SQUIRE.at, SQUIRE.out)) return null;
  const enter = springAt(frame, SQUIRE.at, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", right: 40, top: LAYOUT.videoTop + 300, opacity: exitAt(frame, SQUIRE.out, 6) * clamp01(enter * 2), transform: `translateX(${interpolate(enter, [0, 1], [420, 0])}px) rotate(${7 + Math.sin(frame / 8) * 1.5}deg)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", background: COLORS.yellow, color: COLORS.bg, borderRadius: 14, fontFamily: FONT, fontWeight: 900, fontSize: 34, whiteSpace: "nowrap", boxShadow: COLORS.shadow }}>
        <FlameGlyph size={34} />
        MY FINE SQUIRE.
      </div>
    </div>
  );
};

// ── 14. 150R, DISMISSED (24.527 → 29.087) ─────────────────────
// The caption strike-through (CAPTION_STRIKE) runs under this card: the words he is throwing out
// get crossed out in the subtitle lane while the number gets crossed out here.
const Denied150 = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, DENY.at, DENY.out)) return null;
  const r = t >= DENY.r;
  const off = t >= DENY.off;
  const slam = springAt(frame, DENY.r, SPRING_STAMP);
  const cross = springAt(frame, DENY.off, SPRING_SNAP);
  const shake = shakeAt(frame, DENY.r, 7, 15);
  return (
    <Panel at={DENY.at} out={DENY.out} border={r ? COLORS.red : COLORS.panelBorder}>
      <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)`, textAlign: "center" }}>
        <Kicker size={22} align="center" color={COLORS.red}>THE 150R CLAIM COMES UP</Kicker>
        {r ? (
          <div style={{ position: "relative", display: "inline-block", marginTop: 4, transform: `scale(${interpolate(slam, [0, 1], [2.2, 1])})` }}>
            <Big size={88} color={COLORS.green} stroke={13} align="center">150R</Big>
            {off ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${interpolate(cross, [0, 1], [2.6, 1])}) rotate(-8deg)` }}>
                <CrossGlyph size={118} color={COLORS.red} />
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <Big size={44} stroke={9} align="center">"I HAVE A HARD TIME WITH…"</Big>
          </div>
        )}
        {off ? (
          <div style={{ marginTop: 2 }}>
            <Big size={38} color={COLORS.red} stroke={8} align="center">RIGHT OFF THE TABLE</Big>
          </div>
        ) : null}
      </div>
    </Panel>
  );
};

// ── 15. THE KILL SHOT (29.087 → 32.667) ───────────────────────
// Card owns x50→700, meme owns x796→1036. Same window, different pixels.
const OtherEnd = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, OTHER.at, OTHER.out)) return null;
  const end = t >= OTHER.end;
  const shake = shakeAt(frame, OTHER.end, 6, 13);
  return (
    <Panel at={OTHER.at} out={OTHER.out} right={380} border={end ? COLORS.red : COLORS.panelBorder}>
      <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Kicker size={22} color={COLORS.red}>THE KILL SHOT</Kicker>
        <div style={{ marginTop: 6 }}>
          <Big size={34} stroke={8}>"THE WORDS COMING OUT OF YOUR MOUTH…"</Big>
        </div>
        {end ? (
          <div style={{ marginTop: 4 }}>
            <Big size={34} color={COLORS.red} stroke={8}>…MAY BE COMING OUT OF THE OTHER END</Big>
          </div>
        ) : null}
      </div>
    </Panel>
  );
};

const StunnedMeme = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, OTHER.mouth, OTHER.out)) return null;
  const enter = springAt(frame, OTHER.mouth, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", right: 44, top: LAYOUT.cardTop, width: 240, opacity: exitAt(frame, OTHER.out, 7), transform: `translateX(${interpolate(enter, [0, 1], [520, 0])}px) rotate(${6 + Math.sin(frame / 8) * 1.4}deg)` }}>
      <div style={{ width: 240, height: 240, border: `8px solid ${COLORS.white}`, borderRadius: 16, overflow: "hidden", background: "#000", boxShadow: COLORS.shadow }}>
        <Sequence from={sec(OTHER.mouth)} layout="none">
          <OffthreadVideo src={ASSETS.lostForWordsMeme} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      </div>
      <div style={{ position: "absolute", left: -14, bottom: -20, padding: "6px 16px", background: COLORS.red, color: "#FFFFFF", borderRadius: 12, fontFamily: FONT, fontWeight: 900, fontSize: 26, whiteSpace: "nowrap", transform: "rotate(-7deg)", boxShadow: COLORS.shadow }}>
        SPEECHLESS
      </div>
    </div>
  );
};

// ── 16. THE GOTCHA (32.667 → 40.433) ──────────────────────────
const TapeRewind = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, TAPE.at, TAPE.out)) return null;
  const flipped = t >= TAPE.flipped;
  const sweep = (frame * 9) % 40;
  return (
    <Panel at={TAPE.at} out={TAPE.out} border={COLORS.yellow} cfg={SPRING_SNAP} from={1.7}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <RewindGlyph size={34} color={COLORS.yellow} />
          <Big size={46} color={COLORS.yellow} stroke={10}>"WAIT. HERE IT IS."</Big>
        </div>
        {flipped ? (
          <div style={{ marginTop: 6 }}>
            <Big size={40} stroke={9}>HE'S FLIPPED UP</Big>
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 2px, transparent 2px, transparent 8px)", backgroundPosition: `0 ${-sweep}px`, pointerEvents: "none" }} />
      </div>
    </Panel>
  );
};

const ContradictionBoard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BOARD.at, BOARD.out)) return null;
  const p1 = springAt(frame, BOARD.at, SPRING_SNAP);
  const p2 = springAt(frame, BOARD.day, SPRING_SNAP);
  const caught = t >= BOARD.caught;
  const slam = springAt(frame, BOARD.caught, SPRING_STAMP);
  const shake = shakeAt(frame, BOARD.caught, 8, 16);
  return (
    <Panel at={BOARD.at} out={BOARD.out} border={caught ? COLORS.red : COLORS.panelBorder}>
      <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Kicker size={20} align="center" color={caught ? COLORS.red : COLORS.yellow}>{caught ? "CONTRADICTION CONFIRMED" : "THE EVIDENCE"}</Kicker>
        <div style={{ position: "relative", marginTop: 4 }}>
          <Lane label="HE SAID" value={'"SET AND FORGET"'} mark={<CheckGlyph size={30} />} color={COLORS.green} p={p1} />
          <div style={{ height: 8 }} />
          <Lane label="HE ALSO SAID" value={'"HE DAY TRADES"'} mark={<CrossGlyph size={30} />} color={COLORS.yellow} p={p2} />
          {caught ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", marginTop: -50, display: "flex", justifyContent: "center", transform: `scale(${interpolate(slam, [0, 1], [3.2, 1])}) rotate(-8deg)` }}>
              <CrossGlyph size={100} color={COLORS.red} />
            </div>
          ) : (
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", marginTop: -13, display: "flex", justifyContent: "center", opacity: 0.35 }}>
              <CrossGlyph size={26} color={COLORS.white} />
            </div>
          )}
        </div>
      </div>
      {caught ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,59,59,0) 30%, rgba(255,59,59,0.3) 100%)", pointerEvents: "none", opacity: exitAt(frame, BOARD.caught + 1.1, 12) }} /> : null}
    </Panel>
  );
};

const CaughtCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, CAUGHT.at, CAUGHT.out)) return null;
  const forget = t >= CAUGHT.forget;
  const slam = springAt(frame, CAUGHT.at, SPRING_STAMP);
  const shake = shakeAt(frame, CAUGHT.at, 7, 14);
  return (
    <Panel at={CAUGHT.at} out={CAUGHT.out} border={COLORS.red} cfg={SPRING_STAMP} from={1.9}>
      <div style={{ transform: `translate(${shake.x}px, ${shake.y}px)`, textAlign: "center" }}>
        <div style={{ transform: `scale(${interpolate(slam, [0, 1], [2.1, 1])})` }}>
          <Big size={72} color={COLORS.red} stroke={12} align="center">WE CAUGHT HIM.</Big>
        </div>
        <div style={{ marginTop: 8, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 26, letterSpacing: 1, color: forget ? COLORS.yellow : "rgba(255,255,255,0.6)" }}>
          {forget ? '"SET AND FORGET." — THE JUDGE, AGAIN' : '"THAT WAS A BIG ONE."'}
        </div>
      </div>
    </Panel>
  );
};

const BigOneFlag = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, CAUGHT.at, CAUGHT.out)) return null;
  return (
    <Flag at={CAUGHT.at} out={CAUGHT.out} top={LAYOUT.flagTop} left={50} color={COLORS.green} size={30}>
      <CheckGlyph size={28} color={COLORS.green} />
      {t >= CAUGHT.forget ? "SWING vs DAY TRADES" : "THE PANEL LOSES IT"}
    </Flag>
  );
};

// ── 17. THE VERDICT FREEZE (40.433 → 41.933) ──────────────────
// Wide freeze of the last played frame (source 237.20): the tracked camera is wide here, so the
// freeze is the whole 16:9 frame in the band, letterboxed, with the verdict above and the
// comment bait in the caption zone (captions are blacked out during the freeze).
const FreezeOutro = () => {
  const frame = useCurrentFrame();
  if (frame < sec(OUTRO.start)) return null;
  const local = frame - sec(OUTRO.start);
  const push = 1 + local * 0.0022;
  const card = springAt(frame, OUTRO.start + 0.1, SPRING_SNAP);
  const cta = springAt(frame, OUTRO.start + 0.4, SPRING_SNAP);
  const bandH = WIDTH / SOURCE_ASPECT;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#000" }} />
      <div style={{ position: "absolute", left: 0, width: WIDTH, top: LAYOUT.videoTop, height: bandH, overflow: "hidden" }}>
        <Sequence from={sec(OUTRO.start)} layout="none">
          <Freeze frame={0}>
            <Video src={SOURCE} startFrom={Math.round(OUTRO.freezeSourceTime * FPS)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", filter: "saturate(0.55) contrast(1.15)", transform: `scale(${push})`, transformOrigin: "50% 50%" }} />
          </Freeze>
        </Sequence>
        <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 2px, transparent 2px, transparent 6px)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,59,59,0) 35%, rgba(255,59,59,0.3) 78%, rgba(0,0,0,0.85) 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 16, textAlign: "center", opacity: clamp01(card * 3), transform: `scale(${interpolate(card, [0, 1], [1.8, 1])}) rotate(-2deg)` }}>
        <Kicker size={24} align="center" color="rgba(255,255,255,0.7)">BODY LANGUAGE: BOGUS. THE GOTCHA:</Kicker>
        <div style={{ marginTop: 4 }}>
          <Big size={104} color={COLORS.red} stroke={13} align="center">CAUGHT.</Big>
        </div>
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.captionTop + 20, display: "flex", justifyContent: "center", opacity: clamp01(cta * 2), transform: `translateY(${interpolate(cta, [0, 1], [-40, 0])}px) scale(${interpolate(cta, [0, 1], [0.85, 1])})` }}>
        <div style={{ ...panelStyle, border: `3px solid ${COLORS.yellow}`, padding: "18px 30px", fontFamily: FONT, fontWeight: 900, fontSize: 40, textAlign: "center", color: COLORS.white }}>
          IS "UP AND TO THE LEFT" A REAL LIE TELL?
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 12, fontSize: 44 }}>
            <span style={{ color: COLORS.green }}>MYTH</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>/</span>
            <span style={{ color: COLORS.red }}>FACT</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8, fontSize: 26, color: "rgba(255,255,255,0.75)" }}>
            tell us <ArrowDownGlyph size={24} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 18. THE TWO PERSISTENT READOUTS ───────────────────────────
const HudChip = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (isFreeze(t)) return null;
  const s = hudAt(t);
  const enter = springAt(frame, s.at, SPRING_SNAP); // re-pops on every state change
  const blink = 0.45 + 0.55 * Math.abs(Math.sin(frame / 9));
  return (
    <div style={{ position: "absolute", left: 40, top: LAYOUT.chipTop, opacity: clamp01(enter * 3), transform: `translateX(${interpolate(enter, [0, 1], [-60, 0])}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 16, background: "rgba(15,20,28,0.94)", border: `3px solid ${s.color}`, boxShadow: `${COLORS.shadow}, 0 0 24px rgba(0,230,118,0.18)` }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: COLORS.red, opacity: blink, boxShadow: `0 0 12px ${COLORS.red}` }} />
        <div>
          <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: "rgba(255,255,255,0.55)" }}>{s.label}</div>
          <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 30, lineHeight: 1.1, letterSpacing: 1, color: s.color }}>{s.value}</div>
        </div>
      </div>
    </div>
  );
};

// Roast damage: the bar that drains under the picture, one notch per insult, each on a word.
const HpBar = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (isFreeze(t)) return null;
  const hp = hpAt(t);
  const shake = hp.drop ? shakeAt(frame, hp.at, 6, 7) : { x: 0, y: 0 };
  const color = hp.v > 60 ? COLORS.green : hp.v > 25 ? COLORS.yellow : COLORS.red;
  const dead = hp.v <= 0;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: LAYOUT.hpTop, height: LAYOUT.hpHeight, display: "flex", alignItems: "center", gap: 16, transform: `translate(${shake.x}px, ${shake.y}px)` }}>
      <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: "rgba(255,255,255,0.5)" }}>ROAST DAMAGE</div>
      <div style={{ flex: 1, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, hp.v).toFixed(2)}%`, borderRadius: 9, background: `linear-gradient(90deg, ${color}, ${dead ? COLORS.red : COLORS.white})`, boxShadow: `0 0 ${dead ? 26 : 14}px ${color}`, opacity: dead ? 0.35 + 0.65 * Math.abs(Math.sin(frame / 5)) : 1 }} />
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, lineHeight: 1, color, fontVariantNumeric: "tabular-nums", minWidth: 76, textAlign: "right" }}>{Math.max(0, Math.round(hp.v))}%</div>
      <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 20, letterSpacing: 1, color: dead ? COLORS.red : "rgba(255,255,255,0.75)", minWidth: 210 }}>{hp.label}</div>
    </div>
  );
};

// ── 19. MAIN ──────────────────────────────────────────────────
const SHAKES = [
  { at: HOOK.slam, frames: 6, amp: 12 },
  { at: OPEN.mental, frames: 6, amp: 14 },
  { at: GAZE.left, frames: 5, amp: 10 },
  { at: FAKE.making, frames: 8, amp: 18 },
  { at: DENY.r, frames: 8, amp: 16 },
  { at: OTHER.end, frames: 6, amp: 14 },
  { at: BOARD.caught, frames: 8, amp: 20 },
  { at: CAUGHT.at, frames: 6, amp: 14 },
  { at: OUTRO.start, frames: 6, amp: 12 },
];

const screenShakeAt = (frame) => SHAKES.reduce((acc, s) => { const d = shakeAt(frame, s.at, s.frames, s.amp); return { x: acc.x + d.x, y: acc.y + d.y }; }, { x: 0, y: 0 });

const SHAKE_PAD = 1.035; // hides the edges the shake would otherwise reveal

const BodyLanguageLiarClip = () => {
  useMontserrat();
  const frame = useCurrentFrame();
  const zoom = zoomAt(frame);
  const push = pushAt(frame);
  const shake = screenShakeAt(frame);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <style>{FONT_CSS}</style>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) scale(${SHAKE_PAD})` }}>
        {/* Base layer: the source through the tracked camera. zoom crops INSIDE the tracked
            window; push only breathes the wide letterboxed picture (see part 8). */}
        <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `50% ${PUSH_ORIGIN}` }}>
          <ClipCamera src={SOURCE} segments={SEGMENTS} camera={CAMERA} srcAspect={SOURCE_ASPECT} zoom={zoom} />
        </AbsoluteFill>

        <BackdropLayer />

        {/* Creative layer */}
        <HookHeadline />
        <RewindFlag />
        <OpeningRoast />
        <PsychRead />
        <EyeContact />
        <GazeCard />
        <Fabricating />
        <SquireSticker />
        <Denied150 />
        <OtherEnd />
        <StunnedMeme />
        <TapeRewind />
        <ContradictionBoard />
        <CaughtCard />
        <BigOneFlag />

        {/* Full-frame takeover: the verdict freeze */}
        <FreezeOutro />

        <HudChip />
        <HpBar />
        <CaptionsLayer />

        <WhiteFlash at={HOOK.cut} />
        <WhiteFlash at={BOARD.caught} frames={5} peak={0.5} color={COLORS.red} />
        <WhiteFlash at={OUTRO.start} peak={0.9} />
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
  ["opening roast", OPEN.at, OPEN.out, "card"],
  ["psychological read", PSYCH.at, PSYCH.out, "card"],
  ["eye contact", EYE.at, EYE.out, "card"],
  ["gaze grid", GAZE.at, GAZE.out, "card"],
  ["fabricating", FAKE.at, FAKE.out, "card"],
  ["150R denied", DENY.at, DENY.out, "card"],
  ["the other end", OTHER.at, OTHER.out, "card"],
  ["tape rewind", TAPE.at, TAPE.out, "card"],
  ["contradiction board", BOARD.at, BOARD.out, "card"],
  ["we caught him", CAUGHT.at, CAUGHT.out, "card"],
  ["freeze outro", OUTRO.start, OUTRO.end, "card"],
  ["rewind flag", REWIND.at, REWIND.out, "flag"],
  ["big one flag", CAUGHT.at, CAUGHT.out, "flag"],
  ["fine squire sticker", SQUIRE.at, SQUIRE.out, "sticker"],
  ["stunned meme", OTHER.mouth, OTHER.out, "sticker"],
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
  pushAt,
  shakePad: SHAKE_PAD,
  musicVolumeAt,
  sfx: SFX,
  blocks: BLOCKS,
  hide: CAPTION_HIDE_RANGES,
  silences: MUSIC_SILENCES,
};

export default BodyLanguageLiarClip;
