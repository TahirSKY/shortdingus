/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1251, "width": 1080, "height": 1920 } */

/* LOSE A TRADE, ASK YOUR FRIEND TO BUY BREAKFAST — Alpha Futures / clipping hub
 * Source: "3.Day in the Life of a 22 Year Old Millionaire in Costa Rica .mp4" (id b50fd971…),
 * 3840×2160. This project has no clip-cut file (stage: idea), so ClipCamera streams the original
 * and the sound comes from the source's small audio copy (&part=audio) exactly as the helper does.
 * 41.70s = 1251 frames @30fps. Segments tile 97 + 1109 = 1206 frames, then a 45-frame freeze.
 *
 * STRUCTURE
 *   HOOK  source 813.86–817.10  plays 0.000–3.233   "Total is gonna be 66,440." — the bill itself
 *   MAIN  source 792.33–829.29  plays 3.233–40.200  the whole exchange, in order
 *   OUTRO freeze of source 829.20  plays 40.200–41.700  the verdict + comment bait
 * Two words are dropped from the captions, both defensibly: B's 20ms "Yeah." at 803.27 (an overlap
 * blip that would split a caption page across a third speaker) and C's "Uh" at 829.17 (the segment
 * out-point cuts it mid-syllable, so it would hang over the freeze). The leading "Yeah." at 791.63
 * is cut too — the story opens harder on "I lost my trade today."
 *
 * FRAMING — a real MediaPipe track over this exact range: 151 samples, faces in 104 of them,
 * speakers A→P2 and C→P4. All 46 keys are remapped from source seconds into clip time (they were
 * measured relative to 791.55, so hook keys map through HT and main keys through MT) and thinned to
 * 41 with a 0.35s minimum spacing; mode changes are never thinned, so every real cut survives.
 * Result: 26 single-face crops, 6 split screens (the A/C trading-lines exchanges early on) and 9
 * wide windows. Because 'w' ignores ClipCamera's zoom, the wide windows get their own push (pushAt,
 * max 1.05, scaled about the band centre) and the hero punches in the climax go through the push,
 * not the zoom: 29.2–38.7s — "Bezos", "break the bank", "I got you, bro." — is almost all wide.
 *
 * BEAT MAP (clip seconds — every one sits on a real transcript word)
 *   0.00  cold open: HE LOST $15,000 TODAY / THEN CAME THE BREAKFAST BILL + the receipt (66,440)
 *   1.10  the "≈ $130 USD · 0.13 BANDS" stamp lands, cash-counter ticks under the number
 *   2.69  the tracked camera pulls wide — the breath before the rewind
 *   3.23  white flash + "REWIND: HOW THE MORNING STARTED" (813.86 → 792.33 is 21.5s back)
 *   3.23  "I lost my trade today."   5.63 "Do you think you can get this?" → the ASK card
 *   7.71  "I got you." → 9.81 "fifteen" → 10.09 "bands." slams: 15 BANDS = $15,000
 *   11.37 "bank account's pretty low" + the rain sticker   12.54 "this is what friends are for."
 *   15.80 "you go have a little breakfast" → 16.54 "breakfast." + the coffee sticker
 *   17.75 "you look at the check" → 19.22 "it's like 40" → 19.47 "bands." + the caption gets
 *         STRUCK THROUGH: 40 bands is his guess, and the guess is about to be wrong
 *   21.07 "call Papa Spaghetti to come fix it." → the name tag
 *   23.82 "Total is gonna be" → 24.76 "66,440." THE RECEIPT: cash counter, impact, stamp
 *   26.30 "≈ $130 USD" lands  27.10 "TODAY'S LOSS WAS 115× THIS BILL"
 *   29.40 "You think I'm" → 30.15 "Bezos" (wide, push snap) → 31.02 "bro?" + laugh track
 *   33.36 "73,000 on the card" → 35.87 "break the bank": glass shatters, music OUT, flash
 *   37.72 "I got you, bro." — the BROKE-O-METER collapses from 100% to 4% on this word
 *   39.41 "Much love, man." (tight crop, the landing)
 *   40.20 freeze: FRIEND PAID. + WAS HE RIGHT TO PANIC OVER A $130 BREAKFAST? → YES / NO
 *
 * SPINE — two persistent readouts carry the story between cards:
 *   BROKE-O-METER (under the picture, y1133–1180): climbs 55 → 100% as the bill lands, then
 *     collapses to 4% the instant the friend says "I got you, bro." The payoff is a graph.
 *   COSTA RICA chip (top-left, y100–192, drawn flag): THE BILL → THIS MORNING → THE ASK →
 *     15 BANDS → HIS GUESS 40 BANDS → ACTUAL TOTAL 66,440 → NOT BEZOS → BANK BREAKING → COVERED
 *
 * COLOUR GRADE — new on this clip: a teal-shadow / amber-highlight cinema grade, crushed blacks,
 * vignette and a fine three-phase grain, applied to the FOOTAGE ONLY (see GRADE / GradeLayer). The
 * point is that every other clipper on this source ships the flat camera original; ours does not.
 *
 * MONEY RULES from the brief: the bill amounts are Costa Rican colones, never dollars — 66,440 and
 * 73,000 always carry the word COLONES, and the only dollar figures on screen are the labelled
 * conversions ("≈ $130 USD") and the loss, which genuinely is dollars ("15 BANDS = $15,000").
 *
 * BRAND: the Alpha Futures stamp (asset 448984fa…) is on screen from frame 0 to the last frame,
 * top-right, outside the shake wrapper so it stays steady like a broadcast bug, and above the grade
 * so it never gets tinted. Sized by STAMP below — one constant to make it bigger or smaller.
 */

import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, Video, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ── CORE ──────────────────────────────────────────────────────
const FPS = 30;
const DURATION = 1251;
const WIDTH = 1080;
const HEIGHT = 1920;

const assetUrl = (id) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;

// 4K source. A tracked 9:16 slice of it is ~1100 source pixels wide filling 1080, so the tight
// crops stay sharp instead of going soft the way the same crop off a 1080p source would.
const SOURCE = assetUrl("b50fd971-9d08-48dc-9015-2f707bca741f");
const SOURCE_ASPECT = 3840 / 2160;

const ASSETS = {
  brandStamp: assetUrl("448984fa-9232-4602-ae6c-61eb1c571e78"), // Alpha Futures Clip Stamp (1).png
  rainMeme: assetUrl("a6bb2f6b-acd2-414a-abf7-8a381879290b"), // hub library: "bank account's pretty low"
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
    cashCounter: assetUrl("f329f918-30e6-4980-a6b7-9966a37e821c"), // money: the total counting up
    chimeReward: assetUrl("e0021584-0f5b-4f03-9847-7798617996d4"), // the friend comes through
    glassShatter: assetUrl("f0f55f2e-a7fa-4d16-b3d6-5251c5e7c96e"), // "about to break the bank"
    pageFlip: assetUrl("bd1da89a-d920-406c-a3d6-5a42c9e1c773"), // the check / the receipt
    trapSnap: assetUrl("28d53569-0414-4832-83fe-0406bc97aac3"), // the 115× comparison
    laughTrack: assetUrl("2d4512c6-6881-46c4-a60f-fd8ad2d355bc"), // comedy: the table
    sadTrombone: assetUrl("14c3a7fd-0f2d-4431-bb38-31469e94c23e"), // comedy: the account is low
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
// The BROKE-O-METER owns the y1133–1180 gap between the picture and the captions.
const LAYOUT = { chipTop: 100, chipHeight: 92, cardTop: 244, cardBottom: 488, videoTop: 525, videoHeight: 608, captionTop: 1180, captionBottom: 1500, ctaTop: 548, flagTop: 543, hpTop: 1133, hpHeight: 47, stampTop: 20, stampRight: 32 };

// THE BRAND BUG. One place to change if it is still not big enough: STAMP.w / STAMP.h are the
// box, objectFit:contain fits whatever the PNG's real aspect ratio is inside it. At 600×210 the
// box is 55% of the frame width and 11% of its height (the previous clip used 280×130).
const STAMP = { top: LAYOUT.stampTop, right: LAYOUT.stampRight, w: 600, h: 210 };

// ── SEGMENTS / CLOCK ──────────────────────────────────────────
// Source seconds → clip seconds happens through OFFSET_FRAMES, the same frame clock ClipCamera
// uses, so a caption can never drift from the audio it belongs to.
// The cold open IS the bill: he reads the total, the receipt slams, then we rewind 21.5s to how the
// morning actually started. Repeating the number later (at 24.76) is the point — the second time it
// lands with the whole story behind it.
const HOOK_IN = 813.86; // the word "66,440." starts exactly here
const HOOK_OUT = 817.1; // 817.10 is the smallest out-point whose AUDIO frame count
// (round(out*fps) - round(in*fps) = 97) equals the VIDEO frame count round((out-in)*fps).
// tools/clipcheck/verify.mjs proves that identity for every segment on every run.
const MAIN_IN = 792.33; // "I lost my trade today." — the leading "Yeah." is a throat clear
const MAIN_OUT = 829.29; // plan.clip's out-point; the trailing "Uh" (829.17) is dropped from the
// captions because the segment cuts it off mid-syllable and it would hang over the freeze.

const SEGMENTS = [
  { in: HOOK_IN, out: HOOK_OUT },
  { in: MAIN_IN, out: MAIN_OUT },
];

const HOOK_FRAMES = Math.round((HOOK_OUT - HOOK_IN) * FPS); // 97
const MAIN_FRAMES = Math.round((MAIN_OUT - MAIN_IN) * FPS); // 1109
const SEG_TOTAL_FRAMES = HOOK_FRAMES + MAIN_FRAMES; // 1206
const OUTRO_FRAMES = 45;
const OFFSET_FRAMES = [0, HOOK_FRAMES];
const MAIN_OFFSET = HOOK_FRAMES / FPS; // 3.2333

// clip time from a source time, per segment
const HT = (src) => src - HOOK_IN; // inside the hook
const MT = (src) => MAIN_OFFSET + (src - MAIN_IN); // inside the main segment

const OUTRO = { start: SEG_TOTAL_FRAMES / FPS, end: DURATION / FPS, freezeSourceTime: 829.2, rect: [0, 0, 1, 1] };

// ── CAMERA ────────────────────────────────────────────────────
// Every non-wide key is a REAL tracked rect measured on this exact source range (151 samples,
// faces found in 104 of them, speakers A→P2 and C→P4). They were recorded as seconds after
// 791.55, so each one is mapped into clip time through HT/MT and then thinned to a 0.35s minimum
// spacing. Mode changes are never thinned, so every real cut and every split survives: 26 single
// crops, 6 split screens on the A/C exchanges, 9 wide windows. Nothing here is a guessed crop.
const CAMERA = [
  { t: 0.0, m: "s", a: [0.035, 0, 0.292, 0.924], cut: 1 },
  { t: 0.44, m: "s", a: [0.321, 0.166, 0.256, 0.808], cut: 1 },
  { t: 1.44, m: "s", a: [0.312, 0.217, 0.223, 0.705], cut: 1 },
  { t: 2.44, m: "s", a: [0.585, 0, 0.316, 1], cut: 1 },
  { t: 2.69, m: "w", cut: 1 },
  { t: 3.2333, m: "s", a: [0, 0.181, 0.2, 0.632], cut: 1 },
  { t: 4.2033, m: "p", a: [0, 0.06, 0.455, 0.719], b: [0.235, 0, 0.633, 1], cut: 1 },
  { t: 5.4533, m: "s", a: [0.376, 0, 0.316, 1] },
  { t: 6.4533, m: "w", cut: 1 },
  { t: 6.7033, m: "p", a: [0.369, 0.183, 0.385, 0.608], b: [0.521, 0, 0.479, 0.757], cut: 1 },
  { t: 7.4533, m: "p", a: [0.32, 0.204, 0.369, 0.584], b: [0.367, 0, 0.633, 1], cut: 1 },
  { t: 7.7033, m: "w", cut: 1 },
  { t: 8.2033, m: "s", a: [0.413, 0, 0.316, 1], cut: 1 },
  { t: 9.4533, m: "s", a: [0.181, 0.071, 0.241, 0.763], cut: 1 },
  { t: 9.9533, m: "p", a: [0.12, 0.182, 0.411, 0.649], b: [0.437, 0.085, 0.325, 0.513], cut: 1 },
  { t: 10.2033, m: "s", a: [0.241, 0.149, 0.252, 0.797], cut: 1 },
  { t: 11.7033, m: "p", a: [0.231, 0.124, 0.364, 0.575], b: [0.328, 0.126, 0.437, 0.691] },
  { t: 13.2033, m: "s", a: [0.267, 0.065, 0.216, 0.682] },
  { t: 13.9533, m: "s", a: [0.216, 0.05, 0.234, 0.739] },
  { t: 14.7033, m: "p", a: [0.03, 0.067, 0.493, 0.779], b: [0.359, 0.015, 0.526, 0.832], cut: 1 },
  { t: 15.9533, m: "s", a: [0.205, 0.032, 0.302, 0.955] },
  { t: 20.4533, m: "s", a: [0.212, 0.016, 0.282, 0.891], cut: 1 },
  { t: 23.2033, m: "s", a: [0.265, 0, 0.281, 0.888] },
  { t: 23.9533, m: "w", cut: 1 },
  { t: 24.4533, m: "s", a: [0, 0, 0.216, 0.682], cut: 1 },
  { t: 24.9533, m: "s", a: [0.184, 0, 0.294, 0.93], cut: 1 },
  { t: 26.2033, m: "s", a: [0.312, 0.217, 0.223, 0.705], cut: 1 },
  { t: 27.2033, m: "s", a: [0.585, 0, 0.316, 1], cut: 1 },
  { t: 27.4533, m: "w", cut: 1 },
  { t: 28.7033, m: "s", a: [0, 0.057, 0.249, 0.785], cut: 1 },
  { t: 29.2033, m: "w", cut: 1 },
  { t: 31.2033, m: "s", a: [0, 0, 0.238, 0.752] },
  { t: 31.4533, m: "w", cut: 1 },
  { t: 32.2033, m: "s", a: [0.004, 0.021, 0.234, 0.741], cut: 1 },
  { t: 32.7033, m: "w", cut: 1 },
  { t: 34.4533, m: "s", a: [0.465, 0, 0.316, 1], cut: 1 },
  { t: 34.9533, m: "s", a: [0.396, 0, 0.316, 1], cut: 1 },
  { t: 35.2033, m: "w", cut: 1 },
  { t: 38.7033, m: "s", a: [0.425, 0.06, 0.24, 0.758], cut: 1 },
  { t: 39.4533, m: "s", a: [0.411, 0.181, 0.234, 0.741], cut: 1 },
  { t: 39.9533, m: "s", a: [0.39, 0.099, 0.243, 0.767], cut: 1 },

];
// ── BEAT TIMES (all derived from source seconds, never hand-typed) ──
// Every `at` below is a real transcript word start; the sub-moments (usd, ratio, stamp) live inside
// long word slots — "66,440." alone spans 2.93s, which is exactly the room a receipt needs.
const HOOK = { at: 0, usd: HT(814.96), ratio: HT(816.0), wide: HT(816.55), cut: MAIN_OFFSET };
const REWIND = { at: MAIN_OFFSET, out: MAIN_OFFSET + 1.15 }; // "HOW THE MORNING STARTED"
const LOST = { at: MT(792.33), trade: MT(793.79), today: MT(793.95), out: MT(794.73) };
const ASK = { at: MT(794.73), get: MT(795.13), out: MT(796.81) }; // "Do you think you can get this?"
const GOT = { at: MT(796.81), you: MT(797.43), out: MT(798.91) }; // "I got you."
const BANDS = { at: MT(798.91), hit: MT(799.19), low: MT(799.95), pretty: MT(800.47), out: MT(801.64) };
const FRIENDS = { at: MT(801.64), for: MT(803.05), out: MT(804.9) }; // "this is what friends are for."
const BREAKFAST = { at: MT(804.9), word: MT(805.64), check: MT(806.85), out: MT(808.32) };
const FORTY = { at: MT(808.32), bands: MT(808.57), out: MT(810.17) }; // his guess: "like 40 bands"
const PAPA = { at: MT(810.17), name: MT(810.35), fix: MT(811.34), out: MT(812.92) };
const BILL = { at: MT(812.92), num: MT(813.86), usd: MT(815.4), ratio: MT(816.2), out: MT(818.5) };
const BEZOS = { at: MT(818.5), word: MT(819.25), bro: MT(820.12), not: MT(821.72), out: MT(822.46) };
const CARD = { at: MT(822.46), num: MT(823.92), break: MT(824.97), bank: MT(825.29), out: MT(826.82) };
const BRO = { at: MT(826.82), got: MT(826.9), love: MT(828.51), out: SEG_TOTAL_FRAMES / FPS };

// The two numbers the brief insists stay in colones, and the arithmetic the cards are allowed to
// show next to them. 66,440 CRC ≈ $130 at ~510/USD; a "band" is a $1,000 bundle, so the breakfast
// is 0.13 bands and today's $15,000 loss is 115x the bill. All three are stated on screen so nobody
// has to do the maths, and none of them puts a dollar sign on a colón amount.
const MONEY = { bill: "66,440", billUsd: "~ $130 USD", card: "73,000", loss: "$15,000", bands: "15", guessBands: "40", billBands: "0.13 BANDS", ratio: "115x" };

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
// The hook segment carries exactly one word — "66,440.", whose slot runs 2.93s because he reads
// the total slowly, which is all the room the receipt's staged reveals need.
const HOOK_WORDS = [
  ["66,440.", 813.86, 816.79, "A"],
];

// A is the trader who lost the money; C is the friend he asks to cover breakfast. The only two
// words left out of the whole transcript are B's 20ms "Yeah." at 803.27 and C's "Uh" at 829.17
// (the segment out-point cuts it mid-syllable). See STRUCTURE in the header.
const MAIN_WORDS = [
  ["I", 792.33, 792.33, "A"],["lost", 792.33, 793.55, "A"],
  ["my", 793.55, 793.79, "A"],["trade", 793.79, 793.95, "A"],
  ["today.", 793.95, 794.55, "A"],["Do", 794.73, 794.77, "A"],
  ["you", 794.77, 794.85, "A"],["think", 794.85, 794.87, "A"],
  ["you", 794.87, 795.01, "A"],["can", 795.01, 795.13, "A"],
  ["get", 795.13, 795.31, "A"],["this?", 795.31, 795.61, "A"],
  ["I", 796.81, 797.25, "C"],["got", 797.25, 797.43, "C"],
  ["you.", 797.43, 797.89, "C"],["Yeah.", 797.89, 798.27, "A"],
  ["I", 798.27, 798.59, "A"],["lost", 798.59, 798.77, "A"],
  ["like", 798.77, 798.91, "A"],["fifteen", 798.91, 799.19, "A"],
  ["bands.", 799.19, 799.65, "A"],["Like", 799.65, 799.83, "A"],
  ["the", 799.83, 799.95, "A"],["bank", 799.95, 800.13, "A"],
  ["account's", 800.13, 800.47, "A"],["pretty", 800.47, 800.55, "A"],
  ["low.", 800.55, 800.83, "A"],["Listen,", 801.64, 802.19, "C"],
  ["this", 802.19, 802.33, "C"],["is", 802.33, 802.49, "C"],
  ["what", 802.49, 802.57, "C"],["friends", 802.57, 802.81, "C"],
  ["are", 802.81, 803.05, "C"],["for.", 803.05, 803.27, "C"],
  ["Uh", 803.29, 803.75, "C"],["When", 803.75, 803.79, "C"],
  ["you", 803.79, 803.95, "C"],["lose", 803.95, 804.09, "C"],
  ["your", 804.09, 804.21, "C"],["trade.", 804.21, 804.56, "C"],
  ["Yeah,", 804.9, 805.08, "C"],["you", 805.09, 805.16, "C"],
  ["go", 805.16, 805.25, "C"],["have", 805.3, 805.42, "C"],
  ["a", 805.42, 805.43, "C"],["little", 805.43, 805.6, "C"],
  ["breakfast.", 805.64, 806.2, "C"],["Okay,", 806.29, 806.54, "C"],
  ["you", 806.85, 806.88, "C"],["look", 806.88, 807.04, "C"],
  ["at", 807.04, 807.11, "C"],["the", 807.11, 807.19, "C"],
  ["check,", 807.19, 807.51, "C"],["it's", 808.0, 808.14, "C"],
  ["like", 808.14, 808.26, "C"],["40", 808.32, 808.55, "C"],
  ["bands.", 808.57, 808.94, "C"],["Yeah,", 809.12, 809.33, "C"],
  ["call", 810.17, 810.35, "C"],["Papa", 810.35, 810.6, "C"],
  ["Spaghetti", 810.6, 811.05, "C"],["to", 811.07, 811.17, "C"],
  ["come", 811.17, 811.34, "C"],["fix", 811.34, 811.6, "C"],
  ["it.", 811.65, 811.8, "C"],["Thanks,", 811.98, 812.24, "A"],
  ["man.", 812.29, 812.43, "A"],["Total", 812.92, 813.18, "A"],
  ["is", 813.18, 813.27, "A"],["gonna", 813.27, 813.58, "A"],
  ["be", 813.58, 813.77, "A"],["66,440.", 813.86, 816.79, "A"],
  ["You", 818.5, 818.54, "C"],["think", 818.91, 819.04, "C"],
  ["I'm", 819.04, 819.13, "C"],["Bezos", 819.25, 819.7, "C"],
  ["out", 819.8, 819.85, "C"],["here,", 819.96, 820.07, "C"],
  ["bro?", 820.12, 820.3, "C"],["Yeah,", 820.6, 821.36, "C"],
  ["I'm", 821.61, 821.72, "C"],["not", 821.72, 821.88, "C"],
  ["Bezos.", 821.91, 822.41, "C"],["73,000", 822.46, 823.91, "C"],
  ["on", 823.92, 824.0, "C"],["the", 824.0, 824.09, "C"],
  ["card,", 824.15, 824.49, "C"],["it's", 824.5, 824.71, "C"],
  ["about", 824.71, 824.86, "C"],["to", 824.86, 824.91, "C"],
  ["break", 824.97, 825.21, "C"],["the", 825.21, 825.29, "C"],
  ["bank.", 825.29, 826.18, "C"],["I", 826.82, 826.87, "C"],
  ["got", 826.9, 827.19, "C"],["you,", 827.23, 827.3, "C"],
  ["bro.", 827.93, 828.37, "C"],["Much", 828.51, 828.64, "A"],
  ["love,", 828.74, 828.88, "A"],["man.", 829.14, 829.17, "A"],
];
const MAX_WORDS_PER_PAGE = 4;
const PAGE_GAP_BREAK = 0.45;

// Colour is meaning: green = money and the friend coming through, red = the loss and the panic.
// normalizeWord() strips commas and trailing dots, so "66,440." is keyed as "66440".
const RED_WORDS = new Set(["lost", "low", "check", "bezos", "not", "break", "bank"]);
const GREEN_WORDS = new Set(["fifteen", "bands", "40", "66440", "73000", "friends", "breakfast", "got", "bro", "love", "fix"]);

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

// A is the trader who lost the money; C is the friend he is asking to cover breakfast. B's 20ms
// "Yeah." at 803.27 is deliberately not in WORDS: a 20ms third-speaker blip would split a caption
// page in half for a single frame. SpeakerChip dots the trader yellow and the friend green, so a
// speaker change reads at a glance even when both faces are cropped tight.
const speakerTag = (speaker) => ({ A: "TRADER", C: "FRIEND" })[speaker] || "TRADER";
const SPEAKER_DOT = { TRADER: COLORS.yellow, FRIEND: COLORS.green };

const CAPTION_PAGES = buildPages(WORDS);

// The freeze outro is a full-frame takeover: no captions over it.
const CAPTION_HIDE_RANGES = [[OUTRO.start, OUTRO.end]];
const isFreeze = (t) => CAPTION_HIDE_RANGES.some(([a, b]) => t >= a && t < b);

// The strike-through runs while C guesses the check is "like 40 bands" — a joke number the real
// total contradicts by a factor of about 300 ($40,000 guessed vs ~$130 actual). His guess gets
// crossed out in the subtitle lane, the card labels it HIS GUESS, and the receipt lands five seconds
// later labelled ACTUAL.
const CAPTION_STRIKE = { start: MT(808.57), end: MT(810.17) };

// ── ZOOM ──────────────────────────────────────────────────────
// ClipCamera's zoom only bites in "s"/"p" windows, and this track has 26 single-face crops and 6
// splits, so the zoom curve does the punch-in work through the middle of the clip. The wide windows
// are pushed by pushAt() below instead — "w" ignores zoom entirely, and the whole climax
// (29.2-38.7s: "Bezos", "break the bank", "I got you, bro.") is wide, so those three heroes are
// push beats, not zoom beats. Every punch has a matching release key so nothing holds zoomed in.
const ZOOM_KEYS = [
  { t: 0, z: 1.0, dur: 0, ease: "smooth" },
  { t: 0.06, z: 1.07, dur: 2.4, ease: "smooth" }, // slow creep on the man reading the bill
  { t: MAIN_OFFSET, z: 1.0, dur: 0.3, ease: "smooth" }, // the rewind resets it
  { t: BANDS.hit, z: 1.1, dur: 0.5, ease: "snap" }, // "bands." = 15 BANDS = $15,000
  { t: BANDS.pretty + 0.3, z: 1.0, dur: 0.5, ease: "smooth" },
  { t: FRIENDS.for, z: 1.06, dur: 0.5, ease: "snap" }, // "this is what friends are for."
  { t: FRIENDS.out - 0.3, z: 1.0, dur: 0.4, ease: "smooth" },
  { t: BREAKFAST.word, z: 1.08, dur: 0.5, ease: "snap" }, // "breakfast."
  { t: BREAKFAST.check, z: 1.0, dur: 0.5, ease: "smooth" }, // "you look at the check"
  { t: FORTY.bands, z: 1.1, dur: 0.45, ease: "snap" }, // "40 bands." — the guess
  { t: FORTY.out - 0.3, z: 1.0, dur: 0.45, ease: "smooth" },
  { t: PAPA.name, z: 1.06, dur: 0.4, ease: "snap" }, // "Papa Spaghetti"
  { t: PAPA.fix, z: 1.0, dur: 0.4, ease: "smooth" },
  { t: BILL.num, z: 1.14, dur: 0.7, ease: "snap" }, // HERO: "66,440."
  { t: BILL.usd, z: 1.06, dur: 0.8, ease: "smooth" }, // hold while the conversion lands
  { t: BILL.out - 0.2, z: 1.0, dur: 0.3, ease: "smooth" },
  { t: CARD.num, z: 1.1, dur: 0.4, ease: "snap" }, // "on the card," — a 0.75s tight window
  { t: CARD.break - 0.1, z: 1.0, dur: 0.25, ease: "smooth" },
  { t: BRO.love, z: 1.06, dur: 0.6, ease: "smooth" }, // "Much love, man." — the landing
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
// ClipCamera ignores the zoom prop in "w" mode, and nine of this clip's windows are wide — including
// almost the entire climax. A letterboxed picture that never moves reads as unproduced, so the wide
// shot gets its own push: a slow 2% drift from the start of each wide window plus a 3% snap bump on
// the hero words, capped at 1.05 and applied to a wrapper OUTSIDE the ClipCamera marker block,
// scaled about the centre of the picture band. Composed with the shake wrapper's scale(1.035) about
// the CANVAS centre (two different origins, so the naive single-scale maths is wrong) the band spans
// y494.0-y1154.8 at maximum push: clear of the cards, which end at 488, and the captions, which
// start at 1180. verify.mjs section 5b re-proves both edges on every run. It returns exactly 1 in
// "s"/"p" mode, where the picture is already full-bleed.
const PUSH_MAX = 1.05;
const PUSH_RESETS = [0, HOOK.wide, MAIN_OFFSET, MT(795.55), MT(796.8), MT(813.05), MT(818.3), MT(820.55), MT(821.8), MT(824.3)];
const PUSH_SNAPS = [BEZOS.word, CARD.at, CARD.break, BRO.got]; // all four sit inside wide windows
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
// Every cue sits on a word start or a hard visual cut. Layered only on the three heroes: "bands."
// (10.09, the $15,000 loss), "66,440." (24.76, the bill) and "break the bank" (35.87, where the
// music is also out). The cash counter does the money work — it ticks under the cold open, counts
// the total up, and returns for the card — and the glass shatter is the only texture used under
// speech, which is why it is the one moment the bed goes silent for.
const SFX = [
  { at: 0.0, src: ASSETS.sfx.impactDeep, vol: 0.8 }, // frame-0 hook card
  { at: 0.0, src: ASSETS.sfx.cashCounter, vol: 0.5 }, // the total is already on screen
  { at: 0.06, src: ASSETS.sfx.clockTick, vol: 0.4 },
  { at: 0.14, src: ASSETS.sfx.clockTick, vol: 0.4 }, // counting under the held number
  { at: 0.22, src: ASSETS.sfx.clockTick, vol: 0.35 },
  { at: HOOK.usd, src: ASSETS.sfx.stampHit, vol: 0.6 }, // "= ~ $130 USD · 0.13 BANDS"
  { at: HOOK.usd, src: ASSETS.sfx.uiToggleOn, vol: 0.45 },
  { at: HOOK.ratio, src: ASSETS.sfx.trapSnap, vol: 0.45 }, // "TODAY'S LOSS = 115x THIS"
  { at: HOOK.wide, src: ASSETS.sfx.whooshSoft, vol: 0.5 }, // the tracked pull-out to wide
  { at: MAIN_OFFSET, src: ASSETS.sfx.whooshReverse, vol: 0.6 }, // the rewind (music is out)
  { at: MAIN_OFFSET, src: ASSETS.sfx.impactSoft, vol: 0.5 },
  { at: LOST.at, src: ASSETS.sfx.uiClick, vol: 0.45 }, // "I lost my trade today." + the flag
  { at: LOST.today, src: ASSETS.sfx.impactSoft, vol: 0.5 }, // "today."
  { at: ASK.at, src: ASSETS.sfx.popReveal, vol: 0.5 }, // the ASK card
  { at: ASK.get, src: ASSETS.sfx.uiClick, vol: 0.4 }, // "get this?"
  { at: GOT.at, src: ASSETS.sfx.popReveal, vol: 0.5 }, // "I got you."
  { at: GOT.you, src: ASSETS.sfx.uiToggleOn, vol: 0.5 }, // the meter moves
  { at: BANDS.at, src: ASSETS.sfx.riserSoft, vol: 0.5 }, // "I lost like fifteen…"
  { at: BANDS.hit, src: ASSETS.sfx.vineBoom, vol: 0.7 }, // HERO: "bands." = $15,000
  { at: BANDS.hit, src: ASSETS.sfx.impactDeep, vol: 0.6 },
  { at: BANDS.hit, src: ASSETS.sfx.cashCounter, vol: 0.45 },
  { at: BANDS.low, src: ASSETS.sfx.uiClick, vol: 0.4 }, // "bank account's"
  { at: BANDS.pretty, src: ASSETS.sfx.sadTrombone, vol: 0.35 }, // "pretty low." + the rain sticker
  { at: FRIENDS.at, src: ASSETS.sfx.popReveal, vol: 0.5 }, // "this is what friends are for."
  { at: FRIENDS.for, src: ASSETS.sfx.chimeReward, vol: 0.45 }, // "for." — the wholesome turn
  { at: BREAKFAST.at, src: ASSETS.sfx.whooshSoft, vol: 0.45 }, // card swap
  { at: BREAKFAST.word, src: ASSETS.sfx.popReveal, vol: 0.55 }, // "breakfast." + the coffee sticker
  { at: BREAKFAST.check, src: ASSETS.sfx.pageFlip, vol: 0.5 }, // "you look at the check"
  { at: FORTY.at, src: ASSETS.sfx.riserSoft, vol: 0.45 }, // "it's like 40…"
  { at: FORTY.bands, src: ASSETS.sfx.vineBoom, vol: 0.65 }, // "bands." + the caption strike starts
  { at: FORTY.bands, src: ASSETS.sfx.stampHit, vol: 0.55 },
  { at: FORTY.bands + 0.3, src: ASSETS.sfx.laughTrack, vol: 0.35 }, // the table
  { at: PAPA.at, src: ASSETS.sfx.whooshSoft, vol: 0.45 },
  { at: PAPA.name, src: ASSETS.sfx.popReveal, vol: 0.55 }, // "Papa Spaghetti"
  { at: PAPA.fix, src: ASSETS.sfx.uiClick, vol: 0.4 }, // "fix it."
  { at: PAPA.out, src: ASSETS.sfx.uiToggleOn, vol: 0.4 }, // "Thanks, man."
  { at: BILL.at, src: ASSETS.sfx.pageFlip, vol: 0.55 }, // the receipt turns over
  { at: BILL.at + 0.1, src: ASSETS.sfx.riserSoft, vol: 0.5 }, // "Total is gonna be…"
  { at: BILL.num, src: ASSETS.sfx.cashCounter, vol: 0.75 }, // HERO: the total counts up
  { at: BILL.num, src: ASSETS.sfx.impactDeep, vol: 0.75 },
  { at: BILL.num, src: ASSETS.sfx.stampHit, vol: 0.7 },
  { at: BILL.num + 0.3, src: ASSETS.sfx.clockTick, vol: 0.4 },
  { at: BILL.usd, src: ASSETS.sfx.uiToggleOn, vol: 0.45 }, // the conversion lands
  { at: BILL.ratio, src: ASSETS.sfx.trapSnap, vol: 0.5 }, // "115x THIS BILL"
  { at: BEZOS.at, src: ASSETS.sfx.whooshSoft, vol: 0.45 }, // wide window + a new card
  { at: BEZOS.word, src: ASSETS.sfx.vineBoom, vol: 0.6 }, // "Bezos" (push snap)
  { at: BEZOS.bro, src: ASSETS.sfx.laughTrack, vol: 0.4 }, // "bro?"
  { at: BEZOS.not, src: ASSETS.sfx.uiClick, vol: 0.45 }, // "I'm not Bezos."
  { at: CARD.at, src: ASSETS.sfx.popReveal, vol: 0.5 }, // "73,000"
  { at: CARD.num, src: ASSETS.sfx.cashCounter, vol: 0.5 }, // "on the card,"
  { at: CARD.break, src: ASSETS.sfx.glassShatter, vol: 0.75 }, // HERO: "break the bank", music OUT
  { at: CARD.break, src: ASSETS.sfx.impactDeep, vol: 0.7 },
  { at: CARD.bank, src: ASSETS.sfx.vineBoom, vol: 0.6 }, // "the bank." + the flag
  { at: BRO.at, src: ASSETS.sfx.chimeReward, vol: 0.6 }, // "I got you, bro." — meter collapses
  { at: BRO.got, src: ASSETS.sfx.stampHit, vol: 0.5 }, // the PAID stamp
  { at: BRO.love, src: ASSETS.sfx.chimeReward, vol: 0.4 }, // "Much love, man."
  { at: OUTRO.start, src: ASSETS.sfx.impactDeep, vol: 0.7 }, // the freeze slams
  { at: OUTRO.start, src: ASSETS.sfx.stampHit, vol: 0.6 },
  { at: OUTRO.start + 0.5, src: ASSETS.sfx.uiClick, vol: 0.4 }, // the CTA
];

const MUSIC_BASE = 0.07;
const MUSIC_HOT = 0.1;
const MUSIC_HERO = 0.095;
const MUSIC_END = 0.11;
// Two dry windows. The first is the rewind: the bed leaves one frame before the white flash so the
// cut into "I lost my trade today." arrives in silence and the reverse whoosh carries it. The second
// is the climax — the music drops out just before "break the bank" so the glass shatter lands naked,
// exactly where the BROKE-O-METER peaks at 100%. There is no record-scratch in the library; the
// silence IS the scratch.
const MUSIC_SILENCES = [
  [MAIN_OFFSET - 0.067, MAIN_OFFSET + 0.18],
  [CARD.num + 0.2, CARD.break + 0.55],
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
  if (t >= BILL.at && t < CARD.break) level = MUSIC_HERO; // lift while the bill and the panic stack
  if (t >= OUTRO.start + 0.2) level = lerp(MUSIC_BASE, MUSIC_END, clamp01((t - (OUTRO.start + 0.2)) / 0.4));
  return level * duck * fadeIn * fadeOut;
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
// Drawn, not emoji: the Costa Rica flag (the brief asks for a location label and the flag reads it in
// one glance), a banded cash stack, a coffee cup, a bank card, a receipt, a heart and a warning
// triangle. No <text> inside any SVG and no character outside Latin-1, so nothing depends on a font
// arriving — every shape is a path or a rect. Draw-on animations use pathLength={1} so the dash maths
// is resolution-independent and identical on every frame and every machine.

const FlagCRGlyph = ({ w = 44, h = 29 }) => (
  // Costa Rica: blue / white / red(double) / white / blue, six units of height.
  <svg width={w} height={h} viewBox="0 0 60 39" style={{ display: "block", borderRadius: 4, border: "2px solid rgba(255,255,255,0.4)", overflow: "hidden" }}>
    <rect x="0" y="0" width="60" height="39" fill="#0a2b6b" />
    <rect x="0" y="6.5" width="60" height="26" fill="#ffffff" />
    <rect x="0" y="13" width="60" height="13" fill="#ce1126" />
  </svg>
);

const CashStackGlyph = ({ size = 130, color = COLORS.green, p = 1 }) => (
  <svg width={size} height={size * 0.62} viewBox="0 0 140 87" fill="none" style={{ display: "block" }}>
    <rect x="10" y="30" width="122" height="50" rx="7" fill="#1d6b41" stroke="#06170f" strokeWidth="3" />
    <rect x="5" y="19" width="122" height="50" rx="7" fill="#2a9159" stroke="#06170f" strokeWidth="3" />
    <rect x="0" y="8" width="122" height="50" rx="7" fill={color} stroke="#06170f" strokeWidth="3" opacity={0.4 + 0.6 * clamp01(p)} />
    <rect x="46" y="8" width="30" height="72" fill="#f7ecd0" stroke="#06170f" strokeWidth="3" />
    <circle cx="61" cy="33" r="11" fill="#0b3a22" opacity="0.6" />
    <path d="M12 46 h24 M86 46 h24" stroke="#06170f" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    <path d="M12 22 h24 M86 22 h24" stroke="#06170f" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
  </svg>
);

const CoffeeGlyph = ({ size = 120, color = COLORS.gold, p = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: "block" }}>
    <path d="M20 40 h52 v26 a18 18 0 0 1 -18 18 h-16 a18 18 0 0 1 -18 -18 z" fill="#3a2a1c" stroke={color} strokeWidth="4" />
    <path d="M72 46 h8 a11 11 0 0 1 0 22 h-8" stroke={color} strokeWidth="4" />
    <rect x="14" y="88" width="64" height="6" rx="3" fill={color} opacity="0.75" />
    <path d="M32 32 q8 -9 0 -18 M48 32 q8 -9 0 -18 M64 32 q8 -9 0 -18" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.8" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
  </svg>
);

const CardGlyph = ({ size = 140, color = COLORS.red, p = 1 }) => (
  <svg width={size} height={size * 0.64} viewBox="0 0 140 90" fill="none" style={{ display: "block" }}>
    <rect x="4" y="10" width="132" height="72" rx="10" fill="#141c28" stroke={color} strokeWidth="4" />
    <rect x="4" y="26" width="132" height="13" fill={color} opacity="0.85" />
    <rect x="18" y="52" width="26" height="19" rx="4" fill={COLORS.gold} />
    <path d="M58 62 h64" stroke="rgba(255,255,255,0.6)" strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} />
  </svg>
);

const ReceiptGlyph = ({ size = 52, color = "#f4f1e6" }) => (
  <svg width={size * 0.62} height={size} viewBox="0 0 62 100" fill="none" style={{ display: "block" }}>
    <path d="M6 4 h50 v84 l-8 6 -8 -6 -9 6 -8 -6 -9 6 -8 -6 z" fill={color} stroke="#0b0e13" strokeWidth="3" />
    <path d="M16 24 h30 M16 38 h30 M16 52 h20 M16 70 h30" stroke="#8d8877" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const HeartGlyph = ({ size = 84, color = COLORS.red, p = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", transform: `scale(${0.65 + 0.35 * clamp01(p)})` }}>
    <path d="M50 88 C 8 58 10 20 33 16 C 44 14 50 25 50 31 C 50 25 56 14 67 16 C 90 20 92 58 50 88 Z" fill={color} stroke="#0b0e13" strokeWidth="5" />
  </svg>
);

const AlertGlyph = ({ size = 60, color = COLORS.red, p = 1 }) => (
  <svg width={size} height={size * 0.9} viewBox="0 0 100 90" fill="none" style={{ display: "block", opacity: clamp01(p * 2) }}>
    <path d="M50 6 L96 84 H4 Z" fill="#1a0d0d" stroke={color} strokeWidth="6" strokeLinejoin="round" />
    <rect x="45" y="30" width="10" height="30" rx="5" fill={color} />
    <circle cx="50" cy="71" r="6" fill={color} />
  </svg>
);

// ── COLOUR GRADE — the house look, FOOTAGE ONLY ───────────────
// Every other clipper on this source ships the flat camera original, so the grade is what makes ours
// ours at a glance: teal floor in the shadows, amber in the highlights, crushed-but-not-milky blacks,
// a vignette and a fine grain that moves in three deterministic phases.
// It is applied to the FOOTAGE ONLY — the wrapper carrying ClipCamera gets the filter, then four
// blend layers sit over the picture and UNDER the graphics, so cards, captions, the meter and the
// brand stamp stay pixel-clean instead of going muddy. Everything is flat CSS compositing (no SVG
// filters, no backdrop-filter), so it costs nothing on Lambda and is byte-identical frame to frame.
// To make it the house default on every future clip, copy GRADE + GradeLayer and the two wrapper
// styles; to go back to the flat original, set GRADE.filter to "none" and GRADE.off to true.
const GRADE = {
  filter: "saturate(1.14) contrast(1.11) brightness(0.985)",
  off: false,
  shadow: { color: "#0b3550", blend: "lighten", opacity: 0.14 },
  warm: { color: "#ff9a3c", blend: "overlay", opacity: 0.15 },
  vignette: 0.44,
  grain: 0.055,
  topWash: "rgba(255,190,120,0.07)",
  bottomWash: "rgba(20,60,90,0.1)",
};

const GradeLayer = () => {
  const frame = useCurrentFrame();
  if (GRADE.off) return null;
  const g = (frame % 3) - 1; // three-phase grain jitter: it moves, but only to three known states
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: GRADE.shadow.color, mixBlendMode: GRADE.shadow.blend, opacity: GRADE.shadow.opacity }} />
      <AbsoluteFill style={{ background: GRADE.warm.color, mixBlendMode: GRADE.warm.blend, opacity: GRADE.warm.opacity }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,${GRADE.vignette}) 100%)`, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)", backgroundSize: "4px 4px", backgroundPosition: `${g * 1.5}px ${-g}px`, mixBlendMode: "overlay", opacity: GRADE.grain }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${GRADE.topWash} 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 76%, ${GRADE.bottomWash} 100%)`, mixBlendMode: "soft-light" }} />
    </AbsoluteFill>
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
// ─────────────────────────────────────────────────────────────
// 11. CAPTIONS — speaker chip + word-by-word pages + the strike-through
// ─────────────────────────────────────────────────────────────

const SpeakerChip = ({ speaker }) => {
  const tag = speakerTag(speaker);
  const dot = SPEAKER_DOT[tag] || COLORS.white;
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


// ── 12. COLD OPEN (0 → 3.233) ─────────────────────────────────
// Frame 0 is the thumbnail and it is fully composed: the hook sentence AND the receipt with the real
// number are already up, because the cold-open audio is him reading that exact number. Two columns
// so the whole thing fits the 244px card lane. The staged reveals (the dollar conversion at 1.10,
// the 115x comparison at 2.14) are what hold the eye through a 3.2s cold open.
const HookHeadline = () => {
  const frame = useCurrentFrame();
  if (frame >= sec(HOOK.cut)) return null;
  const t = frame / FPS;
  const enter = spring({ frame: frame + 7, fps: FPS, config: SPRING_IN }); // mostly in at frame 0
  const usd = t >= HOOK.usd;
  const ratio = t >= HOOK.ratio;
  const stamp = springAt(frame, HOOK.usd, SPRING_STAMP);
  const shake = shakeAt(frame, 0, 7, 10);
  const mono = (size, color) => ({ fontFamily: MONO_FONT, fontWeight: 700, fontSize: size, letterSpacing: 1, color, textAlign: "center" });
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: LAYOUT.cardTop, opacity: exitAt(frame, HOOK.cut, 5), transform: `translate(${shake.x}px, ${interpolate(enter, [0, 1], [-46, 0]) + shake.y + Math.sin(frame / 9) * 2}px)` }}>
      <Kicker size={24} align="center">22-YEAR-OLD "MILLIONAIRE" · COSTA RICA</Kicker>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 20, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <Big size={40} color={COLORS.yellow} stroke={9}>HE LOST</Big>
          <Big size={40} color={COLORS.yellow} stroke={9}>{MONEY.loss} TODAY</Big>
          <div style={{ marginTop: 6 }}>
            <Big size={30} stroke={8}>THEN CAME THE</Big>
            <Big size={30} stroke={8}>BREAKFAST BILL</Big>
          </div>
        </div>
        {/* The receipt: real paper colours, so it is the brightest thing on the frame at a glance. */}
        <div style={{ width: 336, background: "#f4f1e6", border: "3px solid #0b0e13", borderRadius: 8, padding: "10px 14px 12px", boxShadow: COLORS.shadow, transform: `rotate(-2deg) scale(${interpolate(stamp, [0, 1], [1, 1.03])})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ReceiptGlyph size={28} />
            <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 17, letterSpacing: 2, color: "#5c5847" }}>BREAKFAST TOTAL</div>
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 50, lineHeight: 1.02, color: "#0d2f1c", textAlign: "center", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{MONEY.bill}</div>
          <div style={{ ...mono(18, "#3f3c31"), letterSpacing: 3 }}>COLONES</div>
          <div style={{ borderTop: "2px dashed #b9b3a0", margin: "7px 0 5px" }} />
          <div style={{ ...mono(18, "#1a4d2e"), opacity: usd ? clamp01((t - HOOK.usd) * 6) : 0, transform: `scale(${interpolate(stamp, [0, 1], [1.5, 1])})` }}>= ~ $130 USD · 0.13 BANDS</div>
          <div style={{ ...mono(17, "#b3261e"), marginTop: 2, opacity: ratio ? clamp01((t - HOOK.ratio) * 6) : 0 }}>TODAY'S LOSS = 115x THIS</div>
        </div>
      </div>
    </div>
  );
};

const RewindFlag = () => (
  <Flag at={REWIND.at} out={REWIND.out} top={LAYOUT.flagTop} left={50} color={COLORS.yellow} size={28}>
    <RewindGlyph size={28} color={COLORS.yellow} />
    HOW THE MORNING STARTED
  </Flag>
);

// ── 13. THE ASK AND THE LOSS (3.233 → 12.543) ─────────────────
// The loss flag holds the flag lane while the cards do the talking, so "$15,000" is still on screen
// when he asks for breakfast money — that contrast is the whole clip.
const LossFlag = () => (
  <Flag at={ASK.at} out={BANDS.at} top={LAYOUT.flagTop} left={50} color={COLORS.red} size={26}>
    TODAY'S LOSS: -$15,000
  </Flag>
);

const AskCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, ASK.at, ASK.out)) return null;
  const get = t >= ASK.get;
  return (
    <Panel at={ASK.at} out={ASK.out} border={COLORS.yellow}>
      <div style={{ textAlign: "center" }}>
        <Kicker size={22} align="center" color={COLORS.red}>HE JUST LOST. NOW HE ASKS HIS FRIEND:</Kicker>
        <div style={{ marginTop: 6 }}>
          <Big size={46} color={COLORS.yellow} stroke={10} align="center">"CAN YOU GET THIS?"</Big>
        </div>
        <div style={{ marginTop: 4, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 21, letterSpacing: 1, color: "rgba(255,255,255,0.72)", opacity: get ? 1 : 0 }}>= "WILL YOU BUY ME BREAKFAST?"</div>
      </div>
    </Panel>
  );
};

const GotYouCard = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, GOT.at, GOT.out)) return null;
  return (
    <Panel at={GOT.at} out={GOT.out} border={COLORS.green} cfg={SPRING_SNAP}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <CheckGlyph size={54} color={COLORS.green} />
        <div>
          <Kicker size={22} color="rgba(255,255,255,0.6)">THE FRIEND, WITHOUT HESITATING</Kicker>
          <Big size={56} color={COLORS.green} stroke={11}>"I GOT YOU."</Big>
        </div>
      </div>
    </Panel>
  );
};

// "fifteen bands" is trader slang for fifteen $1,000 bundles, so the card says both: the slang he
// used and the money it actually is. That is the number the hook promised.
const BandsCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BANDS.at, BANDS.out)) return null;
  const hit = t >= BANDS.hit;
  const low = t >= BANDS.pretty;
  const slam = springAt(frame, BANDS.hit, SPRING_STAMP);
  const shake = shakeAt(frame, BANDS.hit, 7, 13);
  return (
    <Panel at={BANDS.at} out={BANDS.out} border={hit ? COLORS.red : COLORS.panelBorder}>
      <div style={{ textAlign: "center", transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <Kicker size={22} align="center" color="rgba(255,255,255,0.6)">HOW MUCH HE LOST THIS MORNING</Kicker>
        {hit ? (
          <div style={{ marginTop: 2, transform: `scale(${interpolate(slam, [0, 1], [2.2, 1])})` }}>
            <Big size={74} color={COLORS.red} stroke={12} align="center">-{MONEY.bands} BANDS</Big>
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <Big size={42} stroke={9} align="center">"I LOST LIKE…"</Big>
          </div>
        )}
        <div style={{ marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 24, letterSpacing: 2, color: COLORS.yellow, opacity: hit ? 1 : 0 }}>= {MONEY.loss} GONE</div>
        <div style={{ marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 1, color: "rgba(255,255,255,0.72)", opacity: low ? 1 : 0 }}>"THE BANK ACCOUNT'S PRETTY LOW"</div>
      </div>
    </Panel>
  );
};

// ── STICKERS OVER THE PICTURE (never the card lane) ───────────
// Same pixels as the flag lane? No: the flag owns x50→~610 at y543, these own the right and lower
// corners of the picture band, so both can be on screen at once.
const CashSticker = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, BANDS.hit, BANDS.pretty)) return null;
  const enter = springAt(frame, BANDS.hit, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", right: 44, top: LAYOUT.videoTop + 34, opacity: exitAt(frame, BANDS.pretty, 5), transform: `rotate(6deg) scale(${interpolate(enter, [0, 1], [2.2, 1])})` }}>
      <CashStackGlyph size={200} p={interpolate(enter, [0, 1], [0.2, 1])} />
      <div style={{ marginTop: -8, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 21, letterSpacing: 1, color: COLORS.green, background: "rgba(0,0,0,0.85)", border: `2px solid ${COLORS.green}`, borderRadius: 10, padding: "4px 12px", textAlign: "center" }}>1 BAND = $1,000</div>
    </div>
  );
};

const RainSticker = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, BANDS.pretty, FRIENDS.at)) return null;
  const enter = springAt(frame, BANDS.pretty, SPRING_SNAP);
  return (
    <div style={{ position: "absolute", right: 44, top: LAYOUT.videoTop + 30, width: 240, opacity: exitAt(frame, FRIENDS.at, 5), transform: `rotate(-3deg) scale(${interpolate(enter, [0, 1], [1.7, 1])})` }}>
      <div style={{ ...panelStyle, padding: 8, border: `3px solid ${COLORS.panelBorder}` }}>
        <Img src={ASSETS.rainMeme} style={{ width: "100%", height: 196, objectFit: "cover", borderRadius: 8, display: "block" }} />
        <div style={{ marginTop: 6, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 18, letterSpacing: 1, color: "rgba(255,255,255,0.85)", textAlign: "center" }}>THE ACCOUNT RIGHT NOW</div>
      </div>
    </div>
  );
};

const CoffeeSticker = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, BREAKFAST.word, BREAKFAST.out)) return null;
  const enter = springAt(frame, BREAKFAST.word, SPRING_SNAP);
  const p = interpolate(enter, [0, 1], [0, 1]);
  return (
    <div style={{ position: "absolute", left: 46, top: LAYOUT.videoTop + 300, opacity: exitAt(frame, BREAKFAST.out, 5), transform: `rotate(-5deg) scale(${interpolate(enter, [0, 1], [1.8, 1])})` }}>
      <CoffeeGlyph size={150} p={p} />
      <div style={{ marginTop: -6, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 1, color: COLORS.gold, background: "rgba(0,0,0,0.85)", border: `2px solid ${COLORS.gold}`, borderRadius: 10, padding: "4px 12px", textAlign: "center" }}>A LITTLE BREAKFAST</div>
    </div>
  );
};

const PaidStamp = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, BRO.got, BRO.out)) return null;
  const enter = springAt(frame, BRO.got, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", right: 60, top: LAYOUT.videoTop + 320, opacity: exitAt(frame, BRO.out, 5) * clamp01(enter * 2), transform: `rotate(-11deg) scale(${interpolate(enter, [0, 1], [2.6, 1])})` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 250, height: 118, border: `6px solid ${COLORS.green}`, borderRadius: 14, background: "rgba(0,40,20,0.55)", boxShadow: "0 0 34px rgba(0,230,118,0.45)" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 62, letterSpacing: 6, color: COLORS.green, ...strokeText(8) }}>PAID</div>
      </div>
      <div style={{ marginTop: 6, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 1, color: COLORS.green, textAlign: "center" }}>BY THE FRIEND</div>
    </div>
  );
};

// ── 14. THE FRIEND'S RULES, AND HIS GUESS (12.543 → 23.823) ───
const FriendsCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, FRIENDS.at, FRIENDS.out)) return null;
  return (
    <Panel at={FRIENDS.at} out={FRIENDS.out} border={COLORS.green}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <HeartGlyph size={70} p={t >= FRIENDS.for ? 1 : 0.25} color={COLORS.green} />
        <div style={{ textAlign: "center" }}>
          <Kicker size={22} align="center" color={COLORS.green}>LISTEN,</Kicker>
          <Big size={44} stroke={10} align="center">THIS IS WHAT</Big>
          <Big size={44} color={COLORS.green} stroke={10} align="center">FRIENDS ARE FOR.</Big>
        </div>
      </div>
    </Panel>
  );
};

const BreakfastCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BREAKFAST.at, BREAKFAST.out)) return null;
  const word = t >= BREAKFAST.word;
  const check = t >= BREAKFAST.check;
  return (
    <Panel at={BREAKFAST.at} out={BREAKFAST.out} border={word ? COLORS.gold : COLORS.panelBorder}>
      <div style={{ textAlign: "center" }}>
        <Kicker size={22} align="center" color={COLORS.gold}>THE FRIEND'S RULES</Kicker>
        <div style={{ marginTop: 4 }}>
          <Big size={33} stroke={8} align="center">WHEN YOU LOSE YOUR TRADE,</Big>
          <Big size={33} color={word ? COLORS.gold : COLORS.white} stroke={8} align="center">YOU GO HAVE A LITTLE BREAKFAST.</Big>
        </div>
        <div style={{ marginTop: 4, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 21, letterSpacing: 1, color: COLORS.red, opacity: check ? clamp01((t - BREAKFAST.check) * 6) : 0 }}>THEN YOU LOOK AT THE CHECK…</div>
      </div>
    </Panel>
  );
};

// His guess gets denied twice at once: the caption strike-through runs under this card while the
// cross slams over the number. The real total lands 5.3s later and is about 300x smaller.
const FortyCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, FORTY.at, FORTY.out)) return null;
  const hit = t >= FORTY.bands;
  const wrong = t >= FORTY.bands + 0.4;
  const slam = springAt(frame, FORTY.bands, SPRING_STAMP);
  const cross = springAt(frame, FORTY.bands + 0.4, SPRING_SNAP);
  return (
    <Panel at={FORTY.at} out={FORTY.out} border={COLORS.yellow}>
      <div style={{ textAlign: "center" }}>
        <Kicker size={22} align="center" color="rgba(255,255,255,0.6)">HIS GUESS AT THE CHECK</Kicker>
        <div style={{ position: "relative", display: "inline-block", marginTop: 2, transform: `scale(${interpolate(slam, [0, 1], [2, 1])})` }}>
          <Big size={68} color={COLORS.yellow} stroke={12} align="center">{MONEY.guessBands} BANDS?</Big>
          {wrong ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${interpolate(cross, [0, 1], [2.4, 1])}) rotate(-8deg)` }}>
              <CrossGlyph size={100} color={COLORS.red} />
            </div>
          ) : null}
        </div>
        <div style={{ marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 20, letterSpacing: 1, color: "rgba(255,255,255,0.75)" }}>= $40,000 FOR BREAKFAST?</div>
      </div>
    </Panel>
  );
};

const PapaCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, PAPA.at, PAPA.out)) return null;
  const fix = t >= PAPA.fix;
  return (
    <Panel at={PAPA.at} out={PAPA.out} border={COLORS.gold} rotate={-1}>
      <div style={{ textAlign: "center" }}>
        <Kicker size={22} align="center" color="rgba(255,255,255,0.6)">IF THE CHECK IS TOO BIG, YOU CALL</Kicker>
        <div style={{ marginTop: 4 }}>
          <Big size={48} color={COLORS.gold} stroke={10} align="center">PAPA SPAGHETTI</Big>
        </div>
        <div style={{ marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 1, color: "rgba(255,255,255,0.72)", opacity: fix ? 1 : 0 }}>"TO COME FIX IT." (NOBODY EXPLAINS WHO)</div>
      </div>
    </Panel>
  );
};

// ── 15. THE BILL (23.823 → 29.403) ────────────────────────────
// The hero. The number counts up over 8 frames while the cash counter runs, then locks; the colón
// label is always attached to it (the brief: never present this amount as dollars), and the dollar
// figure only ever appears as a clearly-labelled conversion.
const withCommas = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const BillCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BILL.at, BILL.out)) return null;
  const num = t >= BILL.num;
  const usd = t >= BILL.usd;
  const ratio = t >= BILL.ratio;
  const slam = springAt(frame, BILL.num, SPRING_STAMP);
  const shake = shakeAt(frame, BILL.num, 8, 16);
  const counting = num && t - BILL.num < 0.27;
  const shown = num ? (counting ? withCommas(Math.round(interpolate(clamp01((t - BILL.num) / 0.27), [0, 1], [11200, 66440]))) : MONEY.bill) : "";
  const mono = (size, color, extra) => ({ fontFamily: MONO_FONT, fontWeight: 700, fontSize: size, letterSpacing: 2, color, textAlign: "center", ...extra });
  return (
    <Panel at={BILL.at} out={BILL.out} border={num ? COLORS.green : COLORS.panelBorder} cfg={SPRING_STAMP} from={1.7}>
      <div style={{ textAlign: "center", transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ReceiptGlyph size={28} />
          <Kicker size={22} align="center" color={num ? COLORS.green : "rgba(255,255,255,0.6)"}>{num ? "ACTUAL TOTAL" : "HE READS IT OUT"}</Kicker>
        </div>
        {num ? (
          <div style={{ transform: `scale(${interpolate(slam, [0, 1], [2.1, 1])})` }}>
            <Big size={76} color={COLORS.green} stroke={13} align="center">{shown}</Big>
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>
            <Big size={40} stroke={9} align="center">"TOTAL IS GONNA BE…"</Big>
          </div>
        )}
        <div style={mono(22, COLORS.white, { opacity: num ? 1 : 0 })}>COLONES</div>
        <div style={mono(19, COLORS.yellow, { opacity: usd ? clamp01((t - BILL.usd) * 6) : 0 })}>= ~ $130 USD · {MONEY.billBands}</div>
        <div style={mono(18, COLORS.red, { opacity: ratio ? clamp01((t - BILL.ratio) * 6) : 0 })}>TODAY'S LOSS WAS 115x THIS BILL</div>
      </div>
    </Panel>
  );
};

// ── 16. NOT BEZOS, AND THE CARD (29.403 → 37.723) ─────────────
// Both beats play over wide windows, so their punch is a pushAt snap, not a zoom — "w" ignores zoom.
const BezosCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BEZOS.at, BEZOS.out)) return null;
  const word = t >= BEZOS.word;
  const not = t >= BEZOS.not;
  const slam = springAt(frame, BEZOS.word, SPRING_STAMP);
  return (
    <Panel at={BEZOS.at} out={BEZOS.out} border={word ? COLORS.red : COLORS.panelBorder}>
      <div style={{ textAlign: "center" }}>
        <Kicker size={22} align="center" color="rgba(255,255,255,0.6)">THE FRIEND, ON PAYING FOR BREAKFAST</Kicker>
        <div style={{ marginTop: 2, transform: `scale(${word ? interpolate(slam, [0, 1], [1.9, 1]) : 1})` }}>
          <Big size={52} color={word ? COLORS.red : COLORS.white} stroke={11} align="center">"YOU THINK I'M BEZOS?"</Big>
        </div>
        <div style={{ marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 1, color: "rgba(255,255,255,0.75)", opacity: not ? 1 : 0 }}>"OUT HERE, BRO?" — "YEAH, I'M NOT BEZOS."</div>
      </div>
    </Panel>
  );
};

const SeventyThreeCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, CARD.at, CARD.out)) return null;
  const num = t >= CARD.num;
  const brk = t >= CARD.break;
  const slam = springAt(frame, CARD.break, SPRING_STAMP);
  const shake = shakeAt(frame, CARD.break, 8, 18);
  return (
    <Panel at={CARD.at} out={CARD.out} border={brk ? COLORS.red : COLORS.yellow}>
      <div style={{ textAlign: "center", transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <CardGlyph size={112} color={brk ? COLORS.red : COLORS.yellow} p={num ? 1 : 0.2} />
          <div>
            <Kicker size={21} color="rgba(255,255,255,0.6)">GOING ON THE CARD</Kicker>
            <Big size={60} color={COLORS.yellow} stroke={11}>{MONEY.card}</Big>
            <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 3, color: COLORS.white }}>COLONES</div>
          </div>
        </div>
        {brk ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 2, transform: `scale(${interpolate(slam, [0, 1], [1.8, 1])})` }}>
            <AlertGlyph size={38} p={1} />
            <Big size={32} color={COLORS.red} stroke={8} align="center">ABOUT TO BREAK THE BANK</Big>
          </div>
        ) : null}
      </div>
    </Panel>
  );
};

const BreakFlag = () => (
  <Flag at={CARD.break} out={BRO.at} top={LAYOUT.flagTop} left={50} color={COLORS.red} size={26} from={-90}>
    <AlertGlyph size={24} color={COLORS.red} />
    BANK STATUS: CRITICAL
  </Flag>
);

// ── 17. THE PAYOFF (37.723 → 40.200) ──────────────────────────
// He complains, then pays anyway. The BROKE-O-METER collapses from 100% to 4% on the word "got".
const BroCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, BRO.at, BRO.out)) return null;
  const got = t >= BRO.got;
  const love = t >= BRO.love;
  const slam = springAt(frame, BRO.at, SPRING_STAMP);
  return (
    <Panel at={BRO.at} out={BRO.out} border={COLORS.green} cfg={SPRING_STAMP} from={1.8}>
      <div style={{ textAlign: "center", transform: `scale(${interpolate(slam, [0, 1], [1.5, 1])})` }}>
        <Kicker size={22} align="center" color="rgba(255,255,255,0.6)">AND THEN, ANYWAY:</Kicker>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 2 }}>
          <HeartGlyph size={60} p={got ? 1 : 0.2} />
          <Big size={56} color={COLORS.green} stroke={11} align="center">"I GOT YOU, BRO."</Big>
        </div>
        <div style={{ marginTop: 2, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 23, letterSpacing: 1, color: COLORS.yellow, opacity: love ? 1 : 0 }}>"MUCH LOVE, MAN."</div>
      </div>
    </Panel>
  );
};

// ── 18. THE VERDICT FREEZE (40.200 → 41.700) ──────────────────
// Freeze of the last played frame (source 829.20) in the full 16:9 band, with the verdict above and
// the comment bait in the caption zone (captions are blacked out during the freeze). The frozen
// picture carries the same grade as the rest of the clip, merged into its own filter, so the freeze
// never looks like it came from a different video.
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
            <Video src={SOURCE} startFrom={Math.round(OUTRO.freezeSourceTime * FPS)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", filter: "saturate(0.66) contrast(1.2) brightness(0.98)", transform: `scale(${push})`, transformOrigin: "50% 50%" }} />
          </Freeze>
        </Sequence>
        <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 2px, transparent 2px, transparent 6px)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,230,118,0) 35%, rgba(0,230,118,0.22) 78%, rgba(0,0,0,0.85) 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.cardTop + 16, textAlign: "center", opacity: clamp01(card * 3), transform: `scale(${interpolate(card, [0, 1], [1.8, 1])}) rotate(-2deg)` }}>
        <Kicker size={23} align="center" color="rgba(255,255,255,0.72)">THE LOSS: $15,000 · THE BREAKFAST: 66,440</Kicker>
        <div style={{ marginTop: 4 }}>
          <Big size={98} color={COLORS.green} stroke={13} align="center">FRIEND PAID.</Big>
        </div>
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: LAYOUT.captionTop + 20, display: "flex", justifyContent: "center", opacity: clamp01(cta * 2), transform: `translateY(${interpolate(cta, [0, 1], [-40, 0])}px) scale(${interpolate(cta, [0, 1], [0.85, 1])})` }}>
        <div style={{ ...panelStyle, border: `3px solid ${COLORS.yellow}`, padding: "18px 30px", fontFamily: FONT, fontWeight: 900, fontSize: 38, textAlign: "center", color: COLORS.white }}>
          WHICH ONE WOULD HURT YOU MORE?
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 12, fontSize: 40 }}>
            <span style={{ color: COLORS.red }}>THE $15K LOSS</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>/</span>
            <span style={{ color: COLORS.green }}>THE $130 BILL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8, fontSize: 26, color: "rgba(255,255,255,0.75)" }}>
            tell us <ArrowDownGlyph size={24} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 19. THE TWO PERSISTENT READOUTS ───────────────────────────
// Top-left: the Costa Rica flag the brief asks for, plus the state of the story. It re-pops on every
// change so the eye keeps finding it.
const LocationChip = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (isFreeze(t)) return null;
  const s = hudAt(t);
  const enter = springAt(frame, s.at, SPRING_SNAP);
  const blink = 0.45 + 0.55 * Math.abs(Math.sin(frame / 9));
  return (
    <div style={{ position: "absolute", left: 40, top: LAYOUT.chipTop, opacity: clamp01(enter * 3), transform: `translateX(${interpolate(enter, [0, 1], [-60, 0])}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderRadius: 16, background: "rgba(15,20,28,0.94)", border: `3px solid ${s.color}`, boxShadow: `${COLORS.shadow}, 0 0 24px rgba(0,230,118,0.16)` }}>
        <FlagCRGlyph w={40} h={26} />
        <div>
          <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 17, letterSpacing: 2, color: "rgba(255,255,255,0.55)" }}>{s.label}</div>
          <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 28, lineHeight: 1.1, letterSpacing: 1, color: s.color }}>{s.value}</div>
        </div>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: COLORS.red, opacity: blink, boxShadow: `0 0 12px ${COLORS.red}` }} />
      </div>
    </div>
  );
};

// Under the picture: the BROKE-O-METER. Inverted from a health bar on purpose — filling up is bad,
// so it goes green to yellow to red, flashes at 100%, and the label turns green when it collapses.
const BrokeMeter = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (isFreeze(t)) return null;
  const hp = hpAt(t);
  const shake = hp.drop ? shakeAt(frame, hp.at, 6, 7) : { x: 0, y: 0 };
  const color = hp.v > 75 ? COLORS.red : hp.v > 45 ? COLORS.yellow : COLORS.green;
  const maxed = hp.v >= 99;
  const saved = hp.v <= 5;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: LAYOUT.hpTop, height: LAYOUT.hpHeight, display: "flex", alignItems: "center", gap: 16, transform: `translate(${shake.x}px, ${shake.y}px)` }}>
      <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: "rgba(255,255,255,0.5)" }}>BROKE-O-METER</div>
      <div style={{ flex: 1, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, hp.v).toFixed(2)}%`, borderRadius: 9, background: `linear-gradient(90deg, ${COLORS.green}, ${color})`, boxShadow: `0 0 ${maxed ? 26 : 14}px ${color}`, opacity: maxed ? 0.5 + 0.5 * Math.abs(Math.sin(frame / 4)) : 1 }} />
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, lineHeight: 1, color, fontVariantNumeric: "tabular-nums", minWidth: 76, textAlign: "right" }}>{Math.max(0, Math.round(hp.v))}%</div>
      <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: 19, letterSpacing: 1, color: saved ? COLORS.green : maxed ? COLORS.red : "rgba(255,255,255,0.75)", minWidth: 234 }}>{saved ? "COVERED BY A FRIEND" : hp.label}</div>
    </div>
  );
};

// ── 20. MAIN ──────────────────────────────────────────────────
const SHAKES = [
  { at: 0, frames: 7, amp: 10 }, // the frame-0 hook
  { at: HOOK.usd, frames: 5, amp: 8 }, // the dollar conversion stamps in
  { at: MAIN_OFFSET, frames: 6, amp: 9 }, // the rewind
  { at: BANDS.hit, frames: 6, amp: 13 }, // 15 BANDS = $15,000
  { at: FORTY.bands, frames: 6, amp: 11 }, // "40 bands." — the guess
  { at: BILL.num, frames: 8, amp: 16 }, // HERO: 66,440
  { at: BEZOS.word, frames: 6, amp: 11 }, // "Bezos"
  { at: CARD.break, frames: 8, amp: 18 }, // HERO: "break the bank"
  { at: BRO.got, frames: 6, amp: 9 }, // "I got you, bro." — the meter collapses
  { at: OUTRO.start, frames: 7, amp: 12 }, // the freeze slams
];

const screenShakeAt = (frame) => SHAKES.reduce((acc, s) => { const d = shakeAt(frame, s.at, s.frames, s.amp); return { x: acc.x + d.x, y: acc.y + d.y }; }, { x: 0, y: 0 });

const SHAKE_PAD = 1.035; // hides the edges the shake would otherwise reveal

const BreakfastBillClip = () => {
  useMontserrat();
  const frame = useCurrentFrame();
  const zoom = zoomAt(frame);
  const push = pushAt(frame);
  const shake = screenShakeAt(frame);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <style>{FONT_CSS}</style>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) scale(${SHAKE_PAD})` }}>
        {/* Base layer: the 4K source through the tracked camera, inside the grade's filter and the
            wide push. zoom crops INSIDE the tracked window and only bites in s/p mode; push only
            breathes the wide letterboxed picture (see part 8). */}
        <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `50% ${PUSH_ORIGIN}`, filter: GRADE.filter }}>
          <ClipCamera src={SOURCE} segments={SEGMENTS} camera={CAMERA} srcAspect={SOURCE_ASPECT} zoom={zoom} />
        </AbsoluteFill>

        <BackdropLayer />

        {/* The colour grade sits over the footage and under every graphic, so the picture is ours
            but the cards, captions, meter and stamp stay pixel-clean. */}
        <GradeLayer />

        {/* Creative layer */}
        <HookHeadline />
        <RewindFlag />
        <LossFlag />
        <AskCard />
        <GotYouCard />
        <BandsCard />
        <CashSticker />
        <RainSticker />
        <FriendsCard />
        <BreakfastCard />
        <CoffeeSticker />
        <FortyCard />
        <PapaCard />
        <BillCard />
        <BezosCard />
        <SeventyThreeCard />
        <BreakFlag />
        <BroCard />
        <PaidStamp />

        {/* Full-frame takeover: the verdict freeze */}
        <FreezeOutro />

        <LocationChip />
        <BrokeMeter />
        <CaptionsLayer />

        <WhiteFlash at={HOOK.cut} />
        <WhiteFlash at={CARD.break} frames={5} peak={0.5} color={COLORS.red} />
        <WhiteFlash at={OUTRO.start} peak={0.9} />
      </AbsoluteFill>

      {/* Brand bug: steady, above the shake and above the grade, on every single frame. */}
      <BrandStamp />

      <AudioLayer />
    </AbsoluteFill>
  );
};

// ── SELF-AUDIT (tools/clipcheck/verify.mjs reads this) ────────
// Declaring the beat windows is what lets the checker PROVE no two cards ever share pixels, that
// every beat lands on a real word and a real sound, and that the push never lifts the picture into
// the card lane or down into the captions.
const BLOCKS = [
  ["hook headline", 0, HOOK.cut, "card"],
  ["the ask", ASK.at, ASK.out, "card"],
  ["i got you", GOT.at, GOT.out, "card"],
  ["15 bands", BANDS.at, BANDS.out, "card"],
  ["friends are for", FRIENDS.at, FRIENDS.out, "card"],
  ["little breakfast", BREAKFAST.at, BREAKFAST.out, "card"],
  ["40 bands guess", FORTY.at, FORTY.out, "card"],
  ["papa spaghetti", PAPA.at, PAPA.out, "card"],
  ["the bill", BILL.at, BILL.out, "card"],
  ["not bezos", BEZOS.at, BEZOS.out, "card"],
  ["73,000 on the card", CARD.at, CARD.out, "card"],
  ["i got you bro", BRO.at, BRO.out, "card"],
  ["freeze outro", OUTRO.start, OUTRO.end, "card"],
  ["rewind flag", REWIND.at, REWIND.out, "flag"],
  ["loss flag", ASK.at, BANDS.at, "flag"],
  ["break flag", CARD.break, BRO.at, "flag"],
  ["cash stack", BANDS.hit, BANDS.pretty, "sticker"],
  ["rain meme", BANDS.pretty, FRIENDS.at, "sticker"],
  ["coffee", BREAKFAST.word, BREAKFAST.out, "sticker"],
  ["paid stamp", BRO.got, BRO.out, "sticker"],
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

export default BreakfastBillClip;
