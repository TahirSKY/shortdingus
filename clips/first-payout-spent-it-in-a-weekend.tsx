/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 1376, "width": 1080, "height": 1920 } */

/* FIRST PAYOUT? SPENT IT IN A WEEKEND — clipping hub
 * Source: "9. 5 Traders, $500,000 On The Line" (id 51aabf2b…) — same source as the trick-question clip.
 * 45.87s = 1376 frames @30fps (the three segments tile exactly: 60 + 981 + 335).
 *
 * STRUCTURE (3 segments, hook stitched from inside segment 2's range)
 *   seg HOOK  source 1931.47–1933.47  plays 0.00–2.00   "yeah, get girls drunk" — punchline first, full-bleed face
 *   seg 1     source 1900.82–1933.53  plays 2.00–34.71  the payout confession
 *   seg 2     source 1963.66–1974.84  plays 34.71–45.87 the weekend payoff + the unbothered twist
 *
 * BEAT MAP (clip seconds, all derived from real transcript word times)
 *   0.00  cold open: full-bleed F + headline + $1,350 → GONE, "LIT" stamp on 0.74
 *   2.00  white flash, wide, "⏪ 30 SECONDS EARLIER"
 *   5.95  "50K."        → $50K ACCOUNT tag
 *   6.62  "1.5K"        → cash-counter B-roll in the band + $1,500 counter + MAX PAYOUT CAP clamp
 *   9.50  tracked full-bleed punch on F (a breath, graphics off)
 *   10.48 "after splits"→ split arrows, counter rolls $1,500 → $1,350, BALANCE CHIP pins (the protagonist)
 *   13.72 "how many accounts?" → 5 slots, 1 lights up → "1 ACCOUNT"
 *   15.56 "first ever payout"  → ROOKIE badge
 *   16.90 "What'd you do with it?" → question card slam + comment bait
 *   17.82 "spend that shit"    → MISSION: SPEND IT stamp + make-it-rain meme
 *   18.82 "I got lit"          → nightclub B-roll in the band + LIT type
 *   19.48 "I'm gonna be real"  → confession vignette
 *   20.50 "at least he's honest" → reaction chips
 *   21.56 "I'm gonna blame you"  → BLAME → YOU arrow
 *   22.43 "Respectable"        → VERDICT: RESPECTABLE stamp
 *   25.17 "everyone says…family" → compare lanes (WHAT THEY SAY / WHAT THEY DO)
 *   27.67 "first payout, you've got to get lit" → thesis type (callback to the hook)
 *   29.87 "How'd you get lit?" → a breath; 30.69 "Explain." → demand card
 *   32.69 "Yeah, get girls drunk" → music hard-cuts to 0 (the record stop)
 *   33.39 "drunk." → stamp + shake; 33.45 → B&W freeze replay, scanlines, HIM arrow
 *   34.71 white flash → "⏩ 30 SECONDS LATER", ledger card + FRI/SAT/SUN bar
 *   37.93 "yeah, about a weekend" → THE DRAIN: $1,350 → $0
 *   38.85 "It was gone." → paper receipt; 39.23 "gone." → TOTAL $0.00 + GONE
 *   39.93 "And then—" → his caption gets struck through (cut off)
 *   40.25 "reinvesting into matched betting?" → REINVEST ✗ vs SPEND ✓
 *   42.57 "No, because I had savings" → SAVINGS: INTACT vault card
 *   43.57 "Don't worry" → lost-for-words meme; 44.37 → HE'S FINE stamp; 44.60 → end CTA
 *
 * BUILD OUTLINE
 * 1.  Imports + Montserrat font gate
 * 2.  Core constants: FPS, SOURCE, ASSETS, COLORS, LAYOUT, SEGMENTS, CAMERA
 * 3.  WORDS per segment (source seconds) → clip time, with a transcript-timing repair pass
 * 4.  Caption paging + key-word colouring
 * 5.  ZOOM_KEYS + zoomAt()  (drives ClipCamera's zoom → punch-ins crop INSIDE the tracked window)
 * 6.  SFX list + music volume curve (incl. the record-stop duck)
 * 7.  Motion helpers
 * 8.  ClipCamera (canonical helper — pasted verbatim between the markers, do not edit)
 * 9.  Terminal background (grid, scrolling candles, vignette)
 * 10. BalanceChip — the protagonist object
 * 11. Captions layer (+ strike-through)
 * 12. Cold open
 * 13. The payout numbers + cash-counter band insert
 * 14. Accounts slots + rookie badge
 * 15. The question + spend stamp + rain meme
 * 16. LIT band insert
 * 17. Confession, reaction chips, blame, verdict
 * 18. Compare lanes
 * 19. Thesis + explain demand
 * 20. Punchline stamp + freeze replay
 * 21. Ledger, weekend bar, the drain
 * 22. Receipt + GONE
 * 23. Reinvest vs spend
 * 24. Savings vault + meme + HE'S FINE + end CTA
 * 25. Audio layer
 * 26. Main component FirstPayoutWeekendClip
 */

import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Easing, Freeze, OffthreadVideo, Sequence, Video, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

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

// ─────────────────────────────────────────────────────────────
// 2. CORE CONSTANTS
// ─────────────────────────────────────────────────────────────

const FPS = 30;
const DURATION = 1376;
const WIDTH = 1080;
const HEIGHT = 1920;

const assetUrl = (id) => `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=${id}`;

const SOURCE = assetUrl("51aabf2b-198c-458c-a61d-6e51867b21e5");
const SOURCE_ASPECT = 1920 / 1080;

const ASSETS = {
  cashCounter: assetUrl("f329f918-30e6-4980-a6b7-9966a37e821c"),
  nightclub: assetUrl("bfb79017-6e19-4572-bebb-eac6fb276b3d"),
  rainMeme: assetUrl("a6bb2f6b-acd2-414a-abf7-8a381879290b"),
  lostForWordsMeme: assetUrl("c7e487de-a071-4b65-822e-302558a893fc"),
  music: assetUrl("6352a623-f2b1-490f-a85c-76c4eb683b34"),
  sfx: {
    trapSnap: assetUrl("28d53569-0414-4832-83fe-0406bc97aac3"),
    whooshReverse: assetUrl("80e6e5be-4def-45d8-a36a-b3a7da5c7a3b"),
    popReveal: assetUrl("c52d697f-f404-484e-881d-0349bc9d3b69"),
    clockTick: assetUrl("4205bf00-25d2-457b-a974-07049914196a"),
    uiClick: assetUrl("b4bb2b99-a6c9-42f3-b3d6-816cca355aad"),
    uiToggleOn: assetUrl("aabeb8f0-a7f1-4ab0-ad37-96400b3f90f6"),
    whooshSoft: assetUrl("8000d709-85ee-4aa4-aad0-9fc84130d93b"),
    riserSoft: assetUrl("377b15fe-2f65-42df-9c9a-0830ea894bf9"),
    impactSoft: assetUrl("599a8103-6cc7-4b36-8b2c-159af900165a"),
    glitchZap: assetUrl("2cc421c1-88d4-49bd-bf96-cbbbab9f26b7"),
    impactDeep: assetUrl("995ca7bb-0444-4f5e-9f27-1f4c8b44472f"),
    stampHit: assetUrl("72187c30-49d0-4a52-821c-ae1cf92be0be"),
    chimeReward: assetUrl("e0021584-0f5b-4f03-9847-7798617996d4"),
    pageFlip: assetUrl("bd1da89a-d920-406c-a3d6-5a42c9e1c773"),
  },
};

const COLORS = {
  bg: "#07090d",
  white: "#FFFFFF",
  yellow: "#FFE600",
  red: "#FF3B3B",
  green: "#00E676",
  panel: "#0f141c",
  panelBorder: "rgba(255,255,255,0.08)",
  gridLine: "rgba(0,230,118,0.06)",
  paper: "#f4f1e8",
  ink: "#111111",
  shadow: "0 24px 60px rgba(0,0,0,0.65), 0 6px 18px rgba(0,0,0,0.5)",
};

// Zones never collide: chip / cards / picture band / captions.
// videoTop+videoHeight matches ClipCamera's wide mode exactly: (1920 - 1080/(16/9)) * 0.4 = 525.
const LAYOUT = {
  chipTop: 100,
  cardTop: 214,
  cardBottom: 512,
  videoTop: 525,
  videoHeight: 608,
  captionTop: 1180,
  captionBottom: 1500,
  ctaTop: 548,
};

// Play order. The hook is stitched from inside segment 1's source range (1931.47–1933.47),
// which the prepared cut already covers (cut-clip pads ranges by 1.5s), so no re-cut is needed.
const SEGMENTS = [
  { in: 1931.47, out: 1933.47 },
  { in: 1900.82, out: 1933.53 },
  { in: 1963.66, out: 1974.84 },
];

const SEGMENT_OFFSETS = SEGMENTS.reduce((acc, seg, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + (SEGMENTS[i - 1].out - SEGMENTS[i - 1].in));
  return acc;
}, []);

// Real face track (browser MediaPipe), shifted by the 2.00s hook. Only speaker F was matched
// to a tracked face, so the base is wide with three full-bleed punches on him.
// If faces get re-tracked, replace this array — nothing else in the file depends on it.
const CAMERA = [
  { m: "s", a: [0.428, 0, 0.316, 1], t: 0, cut: 1 }, // hook: rect sampled at source 1931.82, inside the hook
  { m: "w", t: 2.0, cut: 1 },
  { m: "s", a: [0.431, 0.065, 0.222, 0.703], t: 9.5, cut: 1 },
  { m: "w", t: 10.25, cut: 1 },
  { m: "s", a: [0.428, 0, 0.316, 1], t: 33.0 },
  { m: "w", t: 34.25, cut: 1 },
];

// ─────────────────────────────────────────────────────────────
// 3. WORDS — [word, sourceStart, sourceEnd, speaker] in SOURCE seconds
//    Two diarization fixes (captions only, the audio is untouched):
//      "Only one."  is labelled A but is F answering "how many accounts?"  → F
//      "Explain."   is labelled F but is A continuing "How'd you get lit?" → A
// ─────────────────────────────────────────────────────────────

const HOOK_WORDS = [
  ["Yeah,", 1931.51, 1931.69, "F"],
  ["get", 1931.69, 1931.73, "F"],
  ["girls", 1931.73, 1932.21, "F"],
  ["drunk.", 1932.21, 1933.41, "F"],
];

const SEG1_WORDS = [
  ["Okay,", 1900.9, 1901.16, "F"],
  ["so", 1901.16, 1901.48, "F"],
  ["my", 1901.48, 1901.62, "F"],
  ["first", 1901.62, 1901.84, "F"],
  ["payout", 1901.84, 1902.28, "F"],
  ["was", 1902.28, 1902.66, "F"],
  ["a", 1902.66, 1902.78, "F"],
  ["uh", 1902.78, 1902.86, "F"],
  ["max", 1902.98, 1903.12, "F"],
  ["payout", 1903.12, 1903.44, "F"],
  ["on", 1903.44, 1903.6, "F"],
  ["the", 1903.6, 1903.82, "F"],
  ["zero", 1903.82, 1904.02, "F"],
  ["account,", 1904.02, 1904.44, "F"],
  ["50K.", 1904.77, 1905.22, "F"],
  ["It", 1905.22, 1905.34, "F"],
  ["was", 1905.34, 1905.44, "F"],
  ["1.5K", 1905.44, 1906.14, "F"],
  ["actually", 1906.14, 1906.36, "F"],
  ["because", 1906.36, 1906.54, "F"],
  ["you", 1906.54, 1906.66, "F"],
  ["can", 1906.66, 1906.74, "F"],
  ["only", 1906.74, 1906.88, "F"],
  ["get", 1906.88, 1907.02, "F"],
  ["1.5.", 1907.02, 1908.58, "F"],
  ["So,", 1908.58, 1909.03, "F"],
  ["um,", 1909.06, 1909.3, "F"],
  ["after", 1909.3, 1909.54, "F"],
  ["splits", 1909.54, 1909.72, "F"],
  ["it", 1909.72, 1909.84, "F"],
  ["was", 1909.84, 1909.96, "F"],
  ["1.35", 1909.96, 1911.28, "F"],
  ["or", 1911.28, 1911.54, "F"],
  ["something", 1911.54, 1911.68, "F"],
  ["like", 1911.68, 1912, "F"],
  ["that.", 1912, 1912.16, "F"],
  ["Okay,", 1912.16, 1912.54, "A"],
  ["how", 1912.54, 1912.76, "A"],
  ["many", 1912.76, 1912.92, "A"],
  ["accounts?", 1912.92, 1913.58, "A"],
  ["Only", 1913.58, 1913.82, "F"],
  ["one.", 1913.82, 1914.38, "F"],
  ["This", 1914.38, 1914.56, "F"],
  ["is", 1914.56, 1914.66, "F"],
  ["my", 1914.66, 1914.74, "F"],
  ["first", 1914.74, 1914.96, "F"],
  ["ever", 1914.96, 1915.14, "F"],
  ["payout.", 1915.14, 1915.59, "F"],
  ["What'd", 1915.72, 1915.74, "E"],
  ["you", 1915.74, 1915.76, "E"],
  ["do", 1915.76, 1915.86, "E"],
  ["with", 1915.86, 1916.02, "E"],
  ["it?", 1916.02, 1916.22, "E"],
  ["I", 1916.22, 1916.32, "F"],
  ["was", 1916.32, 1916.42, "F"],
  ["trying", 1916.42, 1916.5, "F"],
  ["to", 1916.5, 1916.64, "F"],
  ["spend", 1916.64, 1916.68, "F"],
  ["that", 1916.68, 1916.92, "F"],
  ["shit.", 1916.92, 1917.14, "F"],
  ["I", 1917.14, 1917.2, "F"],
  ["was", 1917.2, 1917.22, "F"],
  ["like,", 1917.22, 1917.46, "F"],
  ["I", 1917.46, 1917.52, "F"],
  ["got", 1917.52, 1917.64, "F"],
  ["lit,", 1917.64, 1917.76, "F"],
  ["you", 1917.76, 1917.9, "F"],
  ["know", 1917.9, 1917.96, "F"],
  ["what", 1917.96, 1918.14, "F"],
  ["I'm", 1918.14, 1918.2, "F"],
  ["saying?", 1918.2, 1918.3, "F"],
  ["Okay,", 1918.3, 1918.48, "F"],
  ["I'm", 1918.48, 1918.78, "F"],
  ["gonna", 1918.78, 1918.9, "F"],
  ["be", 1918.9, 1919.08, "F"],
  ["real.", 1919.08, 1919.32, "F"],
  ["At", 1919.32, 1919.44, "E"],
  ["least", 1919.44, 1919.46, "E"],
  ["he's", 1919.46, 1919.48, "E"],
  ["honest.", 1919.48, 1919.5, "E"],
  ["We", 1919.5, 1919.52, "B"],
  ["love", 1919.52, 1919.54, "B"],
  ["I'm", 1920.38, 1920.83, "B"],
  ["gonna", 1920.83, 1920.91, "B"],
  ["blame", 1920.91, 1921.15, "B"],
  ["you.", 1921.15, 1921.25, "B"],
  ["Respectable.", 1921.25, 1921.63, "A"],
  ["Listen,", 1921.7, 1922.15, "A"],
  ["you're", 1922.15, 1922.27, "A"],
  ["a", 1922.27, 1922.43, "A"],
  ["respectable", 1922.43, 1922.67, "A"],
  ["man", 1922.67, 1922.85, "A"],
  ["for", 1922.85, 1922.99, "A"],
  ["that.", 1922.99, 1923.44, "A"],
  ["I", 1923.45, 1923.47, "A"],
  ["don't", 1923.47, 1923.49, "A"],
  ["blame", 1923.49, 1923.51, "A"],
  ["you.", 1923.51, 1923.99, "A"],
  ["Everyone", 1923.99, 1924.01, "F"],
  ["says", 1924.01, 1924.21, "F"],
  ["they", 1924.21, 1924.31, "F"],
  ["want", 1924.31, 1924.41, "F"],
  ["to", 1924.41, 1924.49, "F"],
  ["give", 1924.49, 1924.53, "F"],
  ["back", 1924.53, 1924.67, "F"],
  ["to", 1924.67, 1924.77, "F"],
  ["their", 1924.77, 1924.87, "F"],
  ["family,", 1924.87, 1925.12, "F"],
  ["and", 1925.27, 1925.31, "F"],
  ["that", 1925.31, 1925.43, "F"],
  ["comes", 1925.43, 1925.61, "F"],
  ["with", 1925.61, 1925.79, "F"],
  ["time.", 1925.79, 1926.24, "F"],
  ["First", 1926.49, 1926.55, "F"],
  ["payout,", 1926.55, 1926.89, "F"],
  ["you've", 1926.89, 1926.95, "F"],
  ["got", 1926.95, 1927.05, "F"],
  ["to", 1927.05, 1927.17, "F"],
  ["get", 1927.17, 1927.21, "F"],
  ["lit,", 1927.21, 1927.79, "F"],
  ["you", 1927.79, 1927.81, "F"],
  ["know?", 1927.81, 1928.06, "F"],
  ["I,", 1928.09, 1928.27, "A"],
  ["I", 1928.27, 1928.39, "A"],
  ["agree.", 1928.39, 1928.69, "A"],
  ["How'd", 1928.69, 1928.89, "A"],
  ["you", 1928.89, 1928.93, "A"],
  ["get", 1928.93, 1929.05, "A"],
  ["lit?", 1929.05, 1929.51, "A"],
  ["Explain.", 1929.51, 1930.23, "A"],
  ["Um,", 1930.23, 1930.41, "B"],
  ["what", 1930.41, 1930.45, "B"],
  ["is", 1930.45, 1930.59, "B"],
  ["lit", 1930.59, 1930.79, "B"],
  ["to", 1930.79, 1931.03, "B"],
  ["you?", 1931.03, 1931.51, "B"],
  ["Yeah,", 1931.51, 1931.69, "F"],
  ["get", 1931.69, 1931.73, "F"],
  ["girls", 1931.73, 1932.21, "F"],
  ["drunk.", 1932.21, 1933.41, "F"],
];

const SEG2_WORDS = [
  ["So", 1963.74, 1963.8, "B"],
  ["you", 1963.8, 1963.92, "B"],
  ["spent", 1963.92, 1964.14, "B"],
  ["your", 1964.14, 1964.28, "B"],
  ["whole", 1964.28, 1964.46, "B"],
  ["payout,", 1964.46, 1964.7, "B"],
  ["would", 1964.7, 1964.8, "B"],
  ["you", 1964.8, 1964.94, "B"],
  ["say,", 1964.94, 1965.18, "B"],
  ["in", 1965.18, 1965.24, "B"],
  ["one", 1965.24, 1965.28, "B"],
  ["night,", 1965.28, 1965.53, "B"],
  ["one", 1965.72, 1965.86, "B"],
  ["weekend?", 1965.86, 1966.7, "B"],
  ["Uh,", 1966.7, 1966.88, "F"],
  ["yeah,", 1966.88, 1967.02, "F"],
  ["about", 1967.02, 1967.16, "F"],
  ["a", 1967.16, 1967.24, "F"],
  ["weekend.", 1967.24, 1967.59, "F"],
  ["It", 1967.82, 1967.98, "B"],
  ["was", 1967.98, 1968.18, "B"],
  ["gone.", 1968.18, 1968.68, "B"],
  ["And", 1968.88, 1968.9, "F"],
  ["then—", 1968.9, 1969.2, "F"],
  ["but", 1969.2, 1969.34, "B"],
  ["then", 1969.34, 1969.5, "B"],
  ["you", 1969.5, 1969.56, "B"],
  ["didn't", 1969.56, 1969.78, "B"],
  ["think", 1969.78, 1970.18, "B"],
  ["about", 1970.32, 1970.72, "B"],
  ["reinvesting", 1970.72, 1971.28, "B"],
  ["into", 1971.28, 1971.44, "B"],
  ["matched", 1971.44, 1971.52, "B"],
  ["betting?", 1971.52, 1971.76, "B"],
  ["No,", 1971.52, 1971.76, "F"],
  ["because", 1971.76, 1971.88, "F"],
  ["I", 1971.88, 1971.96, "F"],
  ["had", 1971.96, 1972.14, "F"],
  ["savings.", 1972.14, 1972.52, "F"],
  ["Don't", 1972.52, 1972.66, "F"],
  ["worry,", 1972.66, 1972.86, "F"],
  ["I've", 1972.86, 1973.04, "F"],
  ["still", 1973.04, 1973.14, "F"],
  ["got", 1973.14, 1973.32, "F"],
  ["savings", 1973.32, 1973.62, "F"],
  ["to", 1973.62, 1973.82, "F"],
  ["reinvest", 1973.82, 1974.16, "F"],
  ["in", 1974.16, 1974.3, "F"],
  ["accounts.", 1974.3, 1974.72, "F"],
];

// Transcript repair: AssemblyAI compressed a few reactions into 20ms word slots
// ("At least he's honest", "I don't blame you", "We love"). Spread those runs evenly across
// the real gap to the next solid word so the caption highlight doesn't strobe, then enforce
// a minimum duration and no overlaps (capped at 0.4s of push so nothing drifts far).
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

// Source seconds → clip seconds for one segment.
const toClipWords = (list, segIndex) => {
  const shift = SEGMENTS[segIndex].in - SEGMENT_OFFSETS[segIndex];
  return repairWords(list).map((w) => ({ text: w.text, start: +(w.s - shift).toFixed(3), end: +(w.e - shift).toFixed(3), speaker: w.speaker }));
};

// The hook's own words, and seg2's leading fragment "turn." (source 1963.42, before the
// segment's in-point) is dropped: the audio never plays it.
const WORDS = [...toClipWords(HOOK_WORDS, 0), ...toClipWords(SEG1_WORDS, 1), ...toClipWords(SEG2_WORDS, 2)].filter((w) => w.start >= 0 && w.start < DURATION / FPS);

// ─────────────────────────────────────────────────────────────
// 4. CAPTION PAGING + KEY-WORD COLOURS
// ─────────────────────────────────────────────────────────────

// Semantic colour map (same system as the trick-question clip):
//   red   = money going out, danger, the roast
//   green = money coming in, the payout, savings, the verdict
const RED_WORDS = new Set(["spend", "shit", "lit", "gone", "girls", "drunk", "weekend", "night", "only", "no", "blame"]);
const GREEN_WORDS = new Set(["payout", "50k", "1.5k", "1.5", "1.35", "savings", "respectable", "reinvest", "accounts", "agree"]);

const normalizeWord = (w) =>
  w
    .toLowerCase()
    .replace(/[^a-z0-9$%.]/g, "")
    .replace(/^\.+|\.+$/g, "");

const keyColorFor = (w) => {
  const n = normalizeWord(w);
  if (RED_WORDS.has(n)) return COLORS.red;
  if (GREEN_WORDS.has(n)) return COLORS.green;
  return null;
};

const speakerTag = (speaker) => (speaker === "F" ? "TRADER" : "JUDGE");

const MAX_WORDS_PER_PAGE = 4;
const PAGE_GAP_BREAK = 0.45;

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

const CAPTION_PAGES = buildPages(WORDS);

// Full-frame takeovers hide the captions; the freeze replay shows the line as a stamp instead.
const CAPTION_HIDE_RANGES = [[33.45, 34.71]];
const isFreeze = (t) => CAPTION_HIDE_RANGES.some(([a, b]) => t >= a && t < b);
// "And then—" gets struck through: he is cut off mid-sentence.
const CAPTION_STRIKE = { start: 39.93, end: 40.6 };

// ─────────────────────────────────────────────────────────────
// 5. ZOOM — one pure function of the frame, fed to ClipCamera's zoom prop.
//    CropView divides the tracked rect by zoom, so a punch-in crops INSIDE the window and
//    can never bleed into the cards or the captions.
// ─────────────────────────────────────────────────────────────

const ZOOM_KEYS = [
  { t: 0, z: 1.1, dur: 0, ease: "smooth" }, // cold open on his face
  { t: 0.74, z: 1.2, dur: 0.14, ease: "snap" }, // "girls"
  { t: 2.0, z: 1.0, dur: 0, ease: "smooth" }, // rewind cut → wide
  { t: 2.1, z: 1.06, dur: 4.0, ease: "linear" }, // slow push through the setup
  { t: 6.62, z: 1.16, dur: 0.16, ease: "snap" }, // "1.5K"
  { t: 9.5, z: 1.0, dur: 0, ease: "smooth" }, // tracked full-bleed punch
  { t: 10.25, z: 1.06, dur: 3.0, ease: "linear" },
  { t: 11.14, z: 1.16, dur: 0.14, ease: "snap" }, // "1.35"
  { t: 13.72, z: 1.0, dur: 0.3, ease: "smooth" }, // punch out for the question
  { t: 14.76, z: 1.12, dur: 0.16, ease: "snap" }, // "Only one."
  { t: 16.9, z: 1.18, dur: 0.16, ease: "snap" }, // "What'd you do with it?"
  { t: 17.82, z: 1.24, dur: 0.14, ease: "snap" }, // "spend that shit"
  { t: 19.48, z: 1.04, dur: 0.5, ease: "smooth" }, // confession
  { t: 19.6, z: 1.14, dur: 5.0, ease: "linear" }, // slow push through the verdicts
  { t: 22.43, z: 1.2, dur: 0.14, ease: "snap" }, // "Respectable."
  { t: 25.17, z: 1.06, dur: 0.4, ease: "smooth" }, // compare lanes
  { t: 27.67, z: 1.16, dur: 2.2, ease: "linear" }, // thesis push
  { t: 30.69, z: 1.2, dur: 1.6, ease: "linear" }, // "Explain." tension
  { t: 32.69, z: 1.24, dur: 0.12, ease: "snap" }, // punchline
  { t: 33.0, z: 1.06, dur: 0, ease: "smooth" }, // tracked full-bleed
  { t: 34.71, z: 1.0, dur: 0, ease: "smooth" }, // seg 2
  { t: 34.85, z: 1.08, dur: 4.0, ease: "linear" }, // ledger push
  { t: 37.93, z: 1.2, dur: 0.14, ease: "snap" }, // THE DRAIN
  { t: 38.87, z: 1.1, dur: 0.4, ease: "smooth" }, // "It was gone."
  { t: 40.25, z: 1.04, dur: 0.5, ease: "smooth" }, // the question he dodges
  { t: 42.57, z: 1.16, dur: 0.14, ease: "snap" }, // "No, because I had savings."
  { t: 43.57, z: 1.22, dur: 2.0, ease: "linear" }, // twist push to the end
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

// ─────────────────────────────────────────────────────────────
// 6. SFX + MUSIC
// ─────────────────────────────────────────────────────────────

const SFX = [
  { at: 0.0, src: ASSETS.sfx.impactDeep, vol: 0.8 }, // frame-0 headline
  { at: 0.74, src: ASSETS.sfx.stampHit, vol: 0.75 }, // LIT stamp
  { at: 1.86, src: ASSETS.sfx.whooshReverse, vol: 0.6 }, // into the rewind
  { at: 2.1, src: ASSETS.sfx.uiClick, vol: 0.5 }, // rewind chip
  { at: 3.02, src: ASSETS.sfx.popReveal, vol: 0.5 }, // FIRST EVER PAYOUT kicker
  { at: 5.95, src: ASSETS.sfx.uiClick, vol: 0.6 }, // $50K tag
  { at: 6.62, src: ASSETS.sfx.chimeReward, vol: 0.7 }, // the payout number (the "cash" cue)
  { at: 6.66, src: ASSETS.sfx.popReveal, vol: 0.55 },
  { at: 8.2, src: ASSETS.sfx.impactSoft, vol: 0.7 }, // MAX PAYOUT CAP clamps down
  { at: 10.48, src: ASSETS.sfx.whooshSoft, vol: 0.5 }, // split arrows
  { at: 11.14, src: ASSETS.sfx.uiClick, vol: 0.55 }, // counter rolls to 1,350
  { at: 11.3, src: ASSETS.sfx.uiClick, vol: 0.55 },
  { at: 12.46, src: ASSETS.sfx.popReveal, vol: 0.6 }, // balance chip pins
  { at: 13.72, src: ASSETS.sfx.clockTick, vol: 0.45 }, // "how many accounts?"
  { at: 14.76, src: ASSETS.sfx.uiToggleOn, vol: 0.65 }, // the one slot lights up
  { at: 15.56, src: ASSETS.sfx.popReveal, vol: 0.55 }, // ROOKIE badge
  { at: 16.9, src: ASSETS.sfx.riserSoft, vol: 0.55 }, // the question
  { at: 17.82, src: ASSETS.sfx.stampHit, vol: 0.8 }, // MISSION: SPEND IT
  { at: 17.9, src: ASSETS.sfx.trapSnap, vol: 0.6 },
  { at: 18.82, src: ASSETS.sfx.whooshSoft, vol: 0.55 }, // nightclub band insert
  { at: 19.48, src: ASSETS.sfx.impactSoft, vol: 0.5 }, // confession vignette
  { at: 20.5, src: ASSETS.sfx.popReveal, vol: 0.5 }, // reaction chip 1
  { at: 21.56, src: ASSETS.sfx.uiClick, vol: 0.55 }, // BLAME → YOU
  { at: 22.43, src: ASSETS.sfx.impactDeep, vol: 0.75 }, // VERDICT: RESPECTABLE
  { at: 25.17, src: ASSETS.sfx.pageFlip, vol: 0.55 }, // compare lanes wipe
  { at: 27.67, src: ASSETS.sfx.riserSoft, vol: 0.5 }, // thesis build
  { at: 30.69, src: ASSETS.sfx.uiClick, vol: 0.6 }, // EXPLAIN card
  { at: 31.59, src: ASSETS.sfx.clockTick, vol: 0.4 }, // tension
  { at: 33.39, src: ASSETS.sfx.stampHit, vol: 0.8 }, // GET GIRLS DRUNK
  { at: 33.43, src: ASSETS.sfx.impactDeep, vol: 0.75 },
  { at: 33.45, src: ASSETS.sfx.whooshReverse, vol: 0.55 }, // freeze replay
  { at: 34.71, src: ASSETS.sfx.whooshSoft, vol: 0.55 }, // flash into seg 2
  { at: 34.85, src: ASSETS.sfx.uiClick, vol: 0.55 }, // ledger card
  { at: 35.6, src: ASSETS.sfx.clockTick, vol: 0.45 }, // FRI
  { at: 36.4, src: ASSETS.sfx.clockTick, vol: 0.45 }, // SAT
  { at: 37.2, src: ASSETS.sfx.clockTick, vol: 0.45 }, // SUN
  { at: 37.93, src: ASSETS.sfx.impactDeep, vol: 0.8 }, // THE DRAIN
  { at: 38.2, src: ASSETS.sfx.glitchZap, vol: 0.5 }, // digits go red
  { at: 38.85, src: ASSETS.sfx.pageFlip, vol: 0.6 }, // receipt paper lands
  { at: 39.23, src: ASSETS.sfx.stampHit, vol: 0.8 }, // GONE (on the word)
  { at: 39.93, src: ASSETS.sfx.glitchZap, vol: 0.55 }, // "And then—" struck through
  { at: 41.77, src: ASSETS.sfx.uiToggleOn, vol: 0.65 }, // ✗ / ✓ marks land
  { at: 42.57, src: ASSETS.sfx.popReveal, vol: 0.6 }, // SAVINGS: INTACT
  { at: 43.57, src: ASSETS.sfx.popReveal, vol: 0.6 }, // lost-for-words meme
  { at: 44.37, src: ASSETS.sfx.stampHit, vol: 0.7 }, // HE'S FINE
  { at: 44.6, src: ASSETS.sfx.whooshSoft, vol: 0.5 }, // end CTA
  { at: 45.4, src: ASSETS.sfx.impactDeep, vol: 0.7 }, // final hit
];

const MUSIC_BASE = 0.07;
const MUSIC_HOT = 0.1;
const MUSIC_END = 0.11;

// The library has no record-scratch, so the punchline stop is done with silence:
// the bed drops to zero exactly on "Yeah," (32.69) and stays out through the freeze.
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
  const duck = Math.min(
    duckFor(2.0, 2.22), // rewind cut
    duckFor(32.69, 34.71, 0.04), // the record stop
  );
  let level = t < 0.9 ? MUSIC_HOT : MUSIC_BASE; // hot under the hook
  if (t >= 18.82 && t < 20.0) level = 0.095; // lift for "I got lit"
  if (t >= 44.0) level = lerp(MUSIC_BASE, MUSIC_END, clamp01((t - 44.0) / 0.4));
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

// ─────────────────────────────────────────────────────────────
// 8. ClipCamera — canonical helper (render-video replaces everything between these markers)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 10. BALANCE CHIP — the protagonist object.
//     Pins at 12.46 with $1,350, drains to $0 at 37.93, then stays red to the end.
//     The joke at the finish: SAVINGS INTACT while this still reads $0.00.
// ─────────────────────────────────────────────────────────────

const MONEY = {
  payout: 1500,
  afterSplits: 1350,
  chipIn: 12.46,
  drainStart: 37.93,
  drainFrames: 15,
};

const balanceAt = (t) => {
  if (t < MONEY.chipIn) return null;
  if (t < MONEY.drainStart) return MONEY.afterSplits;
  const p = clamp01((t - MONEY.drainStart) / (MONEY.drainFrames / FPS));
  return Math.round(lerp(MONEY.afterSplits, 0, Easing.in(Easing.cubic)(p)));
};

const money = (v) => `$${v.toLocaleString("en-US")}`;

const BalanceChip = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const value = balanceAt(t);
  // The freeze replay is a full-frame takeover: nothing else may sit on top of it.
  if (value === null || isFreeze(t)) return null;
  const enter = springAt(frame, MONEY.chipIn, SPRING_STAMP);
  const drained = t >= MONEY.drainStart + MONEY.drainFrames / FPS;
  const drainHit = springAt(frame, MONEY.drainStart, SPRING_SNAP);
  const shake = shakeAt(frame, MONEY.drainStart, 8, 10);
  const pulse = 1 + Math.sin(frame / 11) * 0.012;
  const color = drained ? COLORS.red : COLORS.green;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: LAYOUT.chipTop,
        display: "flex",
        justifyContent: "center",
        opacity: clamp01(enter * 3),
        transform: `translate(${shake.x}px, ${shake.y + interpolate(enter, [0, 1], [-40, 0])}px) scale(${interpolate(enter, [0, 1], [1.6, 1]) * (drained ? 1 : pulse)})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 30px",
          borderRadius: 999,
          background: "rgba(15,20,28,0.94)",
          border: `3px solid ${color}`,
          boxShadow: `${COLORS.shadow}, 0 0 ${drained ? 44 : 26}px ${drained ? "rgba(255,59,59,0.5)" : "rgba(0,230,118,0.35)"}`,
        }}
      >
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>BALANCE</div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 62,
            lineHeight: 1,
            color,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${drained ? interpolate(drainHit, [0, 0.4, 1], [1, 1.18, 1]) : 1})`,
          }}
        >
          {money(value)}
        </div>
      </div>
    </div>
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
// 12. COLD OPEN (0–2.0s) — full-bleed face, headline readable at frame 0
// ─────────────────────────────────────────────────────────────

const COLD = {
  stamp: 0.74,
  flash: 1.9,
  cut: 2.0,
  chipIn: 2.06,
  chipOut: 3.2,
};

const HookHeadline = () => {
  const frame = useCurrentFrame();
  // Already most of the way in at frame 0 — frame 0 is the thumbnail.
  const enter = spring({ frame: frame + 7, fps: FPS, config: SPRING_IN });
  const line2 = spring({ frame: frame + 2, fps: FPS, config: SPRING_IN });
  const out = exitAt(frame, COLD.cut, 5);
  const bob = Math.sin(frame / 9) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top: 200,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 900,
        opacity: out,
        transform: `translateY(${interpolate(enter, [0, 1], [-46, 0]) + bob}px)`,
      }}
    >
      <div style={{ fontSize: 40, letterSpacing: 8, color: COLORS.white, opacity: 0.85, ...strokeText(8) }}>HIS FIRST EVER PAYOUT</div>
      <div style={{ fontSize: 96, lineHeight: 1.02, color: COLORS.yellow, marginTop: 6, ...strokeText(12) }}>$1,350 → GONE</div>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontSize: 52,
          color: COLORS.red,
          ...strokeText(10),
          transform: `translateY(${interpolate(line2, [0, 1], [26, 0])}px)`,
          opacity: clamp01(line2 * 2),
        }}
      >
        IN ONE WEEKEND <FlameGlyph size={44} />
      </div>
    </div>
  );
};

const LitStamp = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, COLD.stamp, COLD.cut)) return null;
  const s = springAt(frame, COLD.stamp, SPRING_STAMP);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 980, display: "flex", justifyContent: "center", opacity: clamp01(s * 3) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          transform: `rotate(-5deg) scale(${interpolate(s, [0, 1], [2.1, 1])})`,
          padding: "14px 34px",
          border: `9px solid ${COLORS.red}`,
          borderRadius: 18,
          background: "rgba(7,9,13,0.6)",
          color: COLORS.red,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 84,
          letterSpacing: 3,
          textShadow: "0 0 24px rgba(255,59,59,0.45)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.6), inset 0 0 30px rgba(255,59,59,0.25)",
        }}
      >
        HE GOT LIT <FlameGlyph size={54} />
      </div>
    </div>
  );
};

const WhiteFlash = ({ at, frames = 4, peak = 0.95 }) => {
  const frame = useCurrentFrame();
  const local = frame - sec(at);
  if (local < 0 || local >= frames) return null;
  return <AbsoluteFill style={{ background: COLORS.white, opacity: peak * (1 - local / frames) }} />;
};

const RewindChip = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, COLD.chipIn, COLD.chipOut)) return null;
  const enter = springAt(frame, COLD.chipIn, SPRING_SNAP);
  const out = exitAt(frame, COLD.chipOut, 6);
  const blink = Math.floor(frame / 8) % 2 === 0 ? 1 : 0.25;
  const jitter = Math.sin(frame * 1.7) * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: LAYOUT.videoTop + 22,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px",
        background: "rgba(0,0,0,0.8)",
        borderRadius: 10,
        fontFamily: MONO_FONT,
        fontWeight: 700,
        fontSize: 32,
        color: COLORS.white,
        letterSpacing: 2,
        opacity: out * clamp01(enter * 2),
        transform: `translateX(${interpolate(enter, [0, 1], [-70, 0]) + jitter}px)`,
        textShadow: "2px 0 rgba(255,59,59,0.7), -2px 0 rgba(0,230,118,0.6)",
      }}
    >
      <div style={{ width: 16, height: 16, borderRadius: 8, background: COLORS.red, opacity: blink }} />
      <RewindGlyph size={26} /> 30 SECONDS EARLIER
    </div>
  );
};

const ColdOpenSection = () => (
  <>
    <HookHeadline />
    <LitStamp />
    <WhiteFlash at={COLD.flash} frames={4} />
    <RewindChip />
  </>
);

// ─────────────────────────────────────────────────────────────
// 13. THE PAYOUT NUMBERS (5.95–12.46) + cash-counter band insert
//     "50K." → "It was 1.5K, you can only get 1.5" → "after splits it was 1.35"
// ─────────────────────────────────────────────────────────────

const NUMBERS = {
  account: 5.95,
  accountOut: 8.4,
  payoutIn: 6.62,
  cap: 8.2,
  brollIn: 6.5,
  brollOut: 9.4,
  splitsIn: 10.48,
  result: 11.14,
  out: 12.46,
};

// B-roll that takes over the picture band only — the speaker keeps talking underneath.
const BandInsert = ({ at, out, src, label, labelColor = COLORS.yellow }) => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, SPRING_SNAP);
  const exit = exitAt(frame, out, 6);
  const push = interpolate(frame, [sec(at), sec(out)], [1.04, 1.16], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: LAYOUT.videoTop,
        width: WIDTH,
        height: LAYOUT.videoHeight,
        overflow: "hidden",
        opacity: exit,
        transform: `scale(${interpolate(enter, [0, 1], [0.86, 1])})`,
        boxShadow: "0 0 0 4px rgba(255,255,255,0.14), 0 24px 60px rgba(0,0,0,0.7)",
      }}
    >
      <Sequence from={sec(at)} layout="none">
        <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${push})` }} />
      </Sequence>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 22,
          padding: "8px 20px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.75)",
          border: `2px solid ${labelColor}`,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: 4,
          color: labelColor,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const AccountTag = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, NUMBERS.account, NUMBERS.accountOut)) return null;
  const enter = springAt(frame, NUMBERS.account, SPRING_SNAP);
  const out = exitAt(frame, NUMBERS.accountOut, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: 214,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 28px 12px 22px",
        background: COLORS.green,
        borderRadius: "14px 40px 40px 14px",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 50,
        color: COLORS.bg,
        boxShadow: "0 10px 28px rgba(0,230,118,0.35)",
        opacity: out * clamp01(enter * 2),
        transform: `translateX(${interpolate(enter, [0, 1], [-260, 0])}px)`,
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: 9, background: COLORS.bg }} />
      $50K ACCOUNT
    </div>
  );
};

// The cap: a gauge that fills to $1,500 and hits a red ceiling he can't pass.
const PayoutCapGauge = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, NUMBERS.payoutIn, NUMBERS.out)) return null;
  const enter = springAt(frame, NUMBERS.payoutIn, SPRING_IN);
  const out = exitAt(frame, NUMBERS.out, 6);
  const fill = clamp01((t - NUMBERS.payoutIn) / 0.7);
  const capHit = springAt(frame, NUMBERS.cap, SPRING_STAMP);
  const capDrop = interpolate(capHit, [0, 1], [-90, 0]);
  const splitP = clamp01((t - NUMBERS.splitsIn) / 0.3);
  const rollP = clamp01((frame - sec(NUMBERS.result)) / 12);
  const shown = t >= NUMBERS.result ? Math.round(lerp(MONEY.payout, MONEY.afterSplits, Easing.out(Easing.cubic)(rollP))) : MONEY.payout;
  const split = t >= NUMBERS.splitsIn;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 296,
        ...panelStyle,
        padding: "20px 30px 24px",
        opacity: out * clamp01(enter * 2),
        transform: `translateY(${interpolate(enter, [0, 1], [-46, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>{split ? "AFTER SPLITS" : "MAX PAYOUT"}</div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 86,
            lineHeight: 1,
            color: split ? COLORS.yellow : COLORS.green,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${split ? interpolate(capHit, [0, 1], [1.25, 1]) : interpolate(enter, [0, 1], [1.5, 1])})`,
            transformOrigin: "right center",
          }}
        >
          {money(shown)}
        </div>
      </div>
      <div style={{ position: "relative", height: 30, marginTop: 14, borderRadius: 15, background: "rgba(255,255,255,0.07)" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 30,
            width: `${fill * (split ? 84 : 100)}%`,
            borderRadius: 15,
            background: split ? `linear-gradient(90deg, ${COLORS.yellow}, #ffd400)` : `linear-gradient(90deg, ${COLORS.green}, #7CFFB2)`,
            boxShadow: `0 0 18px ${split ? "rgba(255,230,0,0.5)" : "rgba(0,230,118,0.5)"}`,
          }}
        />
        {/* the ceiling: you can only ever get 1.5 */}
        <div
          style={{
            position: "absolute",
            left: "84%",
            top: -14 + (t >= NUMBERS.cap ? capDrop : -90),
            width: 6,
            height: 58,
            background: COLORS.red,
            borderRadius: 3,
            boxShadow: "0 0 16px rgba(255,59,59,0.8)",
            opacity: t >= NUMBERS.cap ? clamp01(capHit * 3) : 0,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: 2,
          color: split ? COLORS.yellow : COLORS.red,
          opacity: split ? splitP : clamp01(capHit * 2),
          transform: `translateX(${interpolate(capHit, [0, 1], [24, 0])}px)`,
        }}
      >
        {split ? (
          <>
            <div style={{ width: 0, height: 0, borderLeft: "14px solid rgba(255,255,255,0.5)", borderTop: "9px solid transparent", borderBottom: "9px solid transparent" }} />
            <div style={{ width: 0, height: 0, borderLeft: "14px solid rgba(255,255,255,0.5)", borderTop: "9px solid transparent", borderBottom: "9px solid transparent" }} />
            THE FIRM'S SPLIT TAKES $150
          </>
        ) : (
          'CAP: "YOU CAN ONLY GET 1.5"'
        )}
      </div>
    </div>
  );
};

const NumbersSection = () => (
  <>
    <BandInsert at={NUMBERS.brollIn} out={NUMBERS.brollOut} src={ASSETS.cashCounter} label="THE PAYOUT" labelColor={COLORS.green} />
    <AccountTag />
    <PayoutCapGauge />
  </>
);

// ─────────────────────────────────────────────────────────────
// 14. ACCOUNTS (13.72–16.8) — five slots, one lights up; then the rookie badge
// ─────────────────────────────────────────────────────────────

const ACCOUNTS = { in: 13.72, one: 14.76, badge: 15.56, out: 16.85 };

const AccountsCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, ACCOUNTS.in, ACCOUNTS.out)) return null;
  const enter = springAt(frame, ACCOUNTS.in, SPRING_IN);
  const out = exitAt(frame, ACCOUNTS.out, 6);
  const litP = springAt(frame, ACCOUNTS.one, SPRING_STAMP);
  const badgeP = springAt(frame, ACCOUNTS.badge, SPRING_SNAP);
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.cardTop + 20,
        ...panelStyle,
        padding: "22px 30px 26px",
        opacity: out * clamp01(enter * 2),
        transform: `translateY(${interpolate(enter, [0, 1], [-46, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>HOW MANY ACCOUNTS?</div>
        {t >= ACCOUNTS.one ? (
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 74,
              lineHeight: 1,
              color: COLORS.yellow,
              transform: `scale(${interpolate(litP, [0, 1], [1.9, 1])})`,
              opacity: clamp01(litP * 3),
              ...strokeText(7),
            }}
          >
            1
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const on = i === 0 && t >= ACCOUNTS.one;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 74,
                borderRadius: 14,
                border: `3px solid ${on ? COLORS.green : "rgba(255,255,255,0.14)"}`,
                background: on ? "rgba(0,230,118,0.18)" : "rgba(255,255,255,0.04)",
                boxShadow: on ? `0 0 26px rgba(0,230,118,0.5)` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 26,
                color: on ? COLORS.green : "rgba(255,255,255,0.22)",
                transform: `scale(${on ? interpolate(litP, [0, 1], [1.3, 1]) : 1})`,
              }}
            >
              {on ? "$50K" : "—"}
            </div>
          );
        })}
      </div>
      {t >= ACCOUNTS.badge ? (
        <div
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 22px",
            borderRadius: 999,
            background: COLORS.yellow,
            color: COLORS.bg,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 32,
            letterSpacing: 3,
            transform: `rotate(-2deg) scale(${interpolate(badgeP, [0, 1], [1.7, 1])})`,
            opacity: clamp01(badgeP * 3),
          }}
        >
          ★ FIRST EVER PAYOUT
        </div>
      ) : null}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 15. THE QUESTION + THE CONFESSION (16.9–19.4)
// ─────────────────────────────────────────────────────────────

const SPEND = { q: 16.9, stamp: 17.82, meme: 17.9, out: 18.7 };

const WhatDidYouDoCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, SPEND.q, SPEND.out)) return null;
  const enter = springAt(frame, SPEND.q, SPRING_STAMP);
  const out = exitAt(frame, SPEND.out, 6);
  const stampP = springAt(frame, SPEND.stamp, SPRING_STAMP);
  const shake = shakeAt(frame, SPEND.stamp, 6, 12);
  const bob = Math.sin(frame / 12) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 360,
        top: LAYOUT.cardTop + 10,
        opacity: out * clamp01(enter * 3),
        transform: `translate(${shake.x}px, ${shake.y + bob}px) scale(${interpolate(enter, [0, 1], [1.5, 1])}) rotate(-1.5deg)`,
        ...panelStyle,
        border: `3px solid ${COLORS.yellow}`,
        padding: "22px 30px 26px",
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 6, color: COLORS.yellow }}>"WHAT'D YOU DO WITH IT?"</div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16, fontFamily: FONT, fontWeight: 900, fontSize: 26, color: "rgba(255,255,255,0.7)" }}>
        <ArrowDownGlyph size={28} /> guess before he says it
      </div>
      {t >= SPEND.stamp ? (
        <div
          style={{
            marginTop: 14,
            display: "inline-block",
            padding: "12px 26px",
            background: COLORS.red,
            color: COLORS.white,
            borderRadius: 16,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 58,
            letterSpacing: 1,
            textShadow: "0 4px 0 rgba(0,0,0,0.35)",
            transform: `rotate(-3deg) scale(${interpolate(stampP, [0, 1], [1.9, 1])})`,
            opacity: clamp01(stampP * 3),
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          }}
        >
          MISSION: SPEND IT
        </div>
      ) : null}
    </div>
  );
};

// Meme card pinned right, over the band's top edge — never covers the caption zone.
const MemeCard = ({ at, out, src, size = 300, right = 44, top = 232, rotate = 6, label = null, labelAt = null }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, SPRING_STAMP);
  const exit = exitAt(frame, out, 7);
  const wobble = Math.sin(frame / 8) * 1.4;
  const labelP = labelAt && t >= labelAt ? springAt(frame, labelAt, SPRING_STAMP) : 0;
  return (
    <div
      style={{
        position: "absolute",
        right,
        top,
        width: size,
        opacity: exit,
        transform: `translateX(${interpolate(enter, [0, 1], [560, 0])}px) rotate(${rotate + wobble}deg) scale(${interpolate(exit, [0, 1], [0.85, 1])})`,
      }}
    >
      <div style={{ width: size, height: size, border: `8px solid ${COLORS.white}`, borderRadius: 16, overflow: "hidden", background: "#000", boxShadow: COLORS.shadow }}>
        <Sequence from={sec(at)} layout="none">
          <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      </div>
      {label && labelP > 0 ? (
        <div
          style={{
            position: "absolute",
            left: -30,
            bottom: -40,
            padding: "10px 22px",
            background: COLORS.red,
            color: COLORS.white,
            borderRadius: 14,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 38,
            whiteSpace: "nowrap",
            transform: `rotate(-7deg) scale(${interpolate(labelP, [0, 1], [1.8, 1])})`,
            opacity: clamp01(labelP * 3),
            boxShadow: COLORS.shadow,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

const SpendSection = () => (
  <>
    <WhatDidYouDoCard />
    <MemeCard at={SPEND.meme} out={SPEND.out} src={ASSETS.rainMeme} size={270} top={252} rotate={7} label="MAKE IT RAIN" labelAt={18.3} />
  </>
);

// ─────────────────────────────────────────────────────────────
// 16. "I GOT LIT" (18.82–19.48) — nightclub B-roll in the band + LIT type
// ─────────────────────────────────────────────────────────────

const LIT = { broll: 18.7, brollOut: 20.4, type: 18.82, typeOut: 19.45 };

const LitType = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, LIT.type, LIT.typeOut)) return null;
  const enter = springAt(frame, LIT.type, SPRING_STAMP);
  const out = exitAt(frame, LIT.typeOut, 5);
  const flicker = 0.86 + 0.14 * Math.sin(frame * 1.9);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: LAYOUT.cardTop + 30, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, opacity: out * clamp01(enter * 3) }}>
      <FlameGlyph size={72} />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 150,
          lineHeight: 1,
          color: COLORS.yellow,
          opacity: flicker,
          transform: `scale(${interpolate(enter, [0, 1], [2.2, 1])}) rotate(-3deg)`,
          ...strokeText(13),
        }}
      >
        LIT
      </div>
      <FlameGlyph size={72} />
    </div>
  );
};

const LitSection = () => (
  <>
    <BandInsert at={LIT.broll} out={LIT.brollOut} src={ASSETS.nightclub} label="WHAT 'LIT' LOOKS LIKE" labelColor={COLORS.red} />
    <LitType />
  </>
);

// ─────────────────────────────────────────────────────────────
// 17. CONFESSION + THE JUDGES' VERDICT (19.48–25.1)
// ─────────────────────────────────────────────────────────────

const VERDICT = {
  confess: 19.48,
  confessOut: 21.5,
  react1: 20.5,
  react2: 21.0,
  blame: 21.56,
  blameOut: 22.4,
  stamp: 22.43,
  out: 25.1,
};

const ConfessionVignette = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, VERDICT.confess, VERDICT.confessOut)) return null;
  const p = clamp01((frame - sec(VERDICT.confess)) / 10);
  const out = exitAt(frame, VERDICT.confessOut, 8);
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 22%, rgba(0,0,0,0.72) 78%)", opacity: p * out, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: LAYOUT.cardTop + 4, display: "flex", justifyContent: "center", opacity: out * clamp01(p * 2) }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 26px",
            borderRadius: 999,
            background: "rgba(255,59,59,0.14)",
            border: `2px solid ${COLORS.red}`,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 6,
            color: COLORS.red,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, background: COLORS.red, opacity: 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame / 4)) }} />
          HE'S BEING HONEST
        </div>
      </div>
    </>
  );
};

const ReactionChip = ({ at, out, text, side, color, top }) => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, at, out)) return null;
  const enter = springAt(frame, at, SPRING_SNAP);
  const exit = exitAt(frame, out, 6);
  const from = side === "left" ? -320 : 320;
  return (
    <div
      style={{
        position: "absolute",
        [side]: 50,
        top,
        padding: "12px 24px",
        borderRadius: 16,
        background: "rgba(15,20,28,0.95)",
        border: `3px solid ${color}`,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 38,
        color,
        opacity: exit * clamp01(enter * 2),
        transform: `translateX(${interpolate(enter, [0, 1], [from, 0])}px) rotate(${side === "left" ? -4 : 4}deg)`,
        boxShadow: COLORS.shadow,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

const VerdictStamp = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, VERDICT.stamp, VERDICT.out)) return null;
  const enter = springAt(frame, VERDICT.stamp, SPRING_STAMP);
  const out = exitAt(frame, VERDICT.out, 6);
  const shake = shakeAt(frame, VERDICT.stamp, 6, 12);
  const bob = Math.sin(frame / 13) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.cardTop + 26,
        opacity: out * clamp01(enter * 3),
        transform: `translate(${shake.x}px, ${shake.y + bob}px) scale(${interpolate(enter, [0, 1], [1.7, 1])}) rotate(-2deg)`,
        ...panelStyle,
        border: `4px solid ${COLORS.green}`,
        padding: "20px 30px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, letterSpacing: 6, color: "rgba(255,255,255,0.6)" }}>THE JUDGES' VERDICT</div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <CheckGlyph size={54} />
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 82, lineHeight: 1, color: COLORS.green, ...strokeText(8) }}>RESPECTABLE</div>
      </div>
      <div style={{ marginTop: 8, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: "rgba(255,255,255,0.7)" }}>"you're a respectable man for that"</div>
    </div>
  );
};

const VerdictSection = () => (
  <>
    <ConfessionVignette />
    <ReactionChip at={VERDICT.react1} out={VERDICT.blame} top={290} text={`"AT LEAST HE'S HONEST"`} side="left" color={COLORS.yellow} />
    <ReactionChip at={VERDICT.react2} out={VERDICT.blame} top={374} text={`"WE LOVE THAT"`} side="right" color={COLORS.green} />
    <ReactionChip at={VERDICT.blame} out={VERDICT.stamp} top={300} text="I'M GONNA BLAME YOU →" side="left" color={COLORS.red} />
    <VerdictStamp />
  </>
);

// ─────────────────────────────────────────────────────────────
// 18. COMPARE LANES (25.17–27.6) — what they say vs what they do
// ─────────────────────────────────────────────────────────────

const COMPARE = { in: 25.17, flip: 26.3, out: 27.6 };

const CompareLanes = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, COMPARE.in, COMPARE.out)) return null;
  const enter = springAt(frame, COMPARE.in, SPRING_IN);
  const out = exitAt(frame, COMPARE.out, 6);
  const flip = springAt(frame, COMPARE.flip, SPRING_SNAP);
  const lane = (label, value, color, active, delay) => {
    const p = springAt(frame, COMPARE.in + delay, SPRING_SNAP);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 22px",
          borderRadius: 18,
          background: active ? "rgba(255,230,0,0.1)" : "rgba(255,255,255,0.04)",
          border: `3px solid ${active ? color : "rgba(255,255,255,0.12)"}`,
          opacity: active ? 1 : clamp01(p * 2) * (t >= COMPARE.flip ? interpolate(flip, [0, 1], [1, 0.45]) : 1),
          transform: `translateX(${interpolate(p, [0, 1], [active ? 260 : -260, 0])}px) scale(${active ? interpolate(flip, [0, 1], [0.96, 1]) : 1})`,
        }}
      >
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 24, letterSpacing: 4, color: "rgba(255,255,255,0.55)", minWidth: 190 }}>{label}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: active ? 46 : 38, lineHeight: 1.05, color: active ? color : "rgba(255,255,255,0.75)" }}>{value}</div>
      </div>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.cardTop + 6,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: out * clamp01(enter * 2),
        transform: `translateY(${interpolate(enter, [0, 1], [-40, 0])}px)`,
      }}
    >
      {lane("WHAT THEY SAY", "GIVE BACK TO FAMILY", COLORS.white, false, 0)}
      {lane("WHAT THEY DO", "FIRST PAYOUT = LIT", COLORS.yellow, t >= COMPARE.flip, 0.18)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 19. THESIS + THE DEMAND (27.67–32.6)
// ─────────────────────────────────────────────────────────────

const THESIS = { start: 27.67, end: 29.8, demand: 30.69, demandOut: 32.6 };

const ThesisType = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, THESIS.start, THESIS.end)) return null;
  const enter = springAt(frame, THESIS.start, SPRING_STAMP);
  const out = exitAt(frame, THESIS.end, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        top: LAYOUT.cardTop + 20,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 900,
        opacity: out * clamp01(enter * 3),
        transform: `scale(${interpolate(enter, [0, 1], [1.5, 1])}) rotate(-1.5deg)`,
      }}
    >
      <div style={{ fontSize: 44, color: COLORS.white, ...strokeText(9) }}>FIRST PAYOUT?</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 4 }}>
        <div style={{ fontSize: 88, lineHeight: 1, color: COLORS.yellow, ...strokeText(11) }}>YOU'VE GOT TO</div>
        <FlameGlyph size={62} />
      </div>
      <div style={{ fontSize: 120, lineHeight: 1, color: COLORS.red, ...strokeText(12) }}>GET LIT</div>
    </div>
  );
};

const ExplainCard = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, THESIS.demand, THESIS.demandOut)) return null;
  const enter = springAt(frame, THESIS.demand, SPRING_STAMP);
  const out = exitAt(frame, THESIS.demandOut, 5);
  const bob = Math.sin(frame / 7) * 4;
  const pulse = 1 + Math.sin(frame / 5) * 0.02;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.cardTop + 40,
        opacity: out * clamp01(enter * 3),
        transform: `translateY(${bob}px) scale(${interpolate(enter, [0, 1], [1.7, 1]) * (t > 31.5 ? pulse : 1)}) rotate(-2deg)`,
        ...panelStyle,
        border: `4px solid ${COLORS.red}`,
        padding: "24px 30px 28px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 6, color: "rgba(255,255,255,0.6)" }}>THE JUDGE WON'T LET IT GO</div>
      <div style={{ marginTop: 10, fontFamily: FONT, fontWeight: 900, fontSize: 92, lineHeight: 1, color: COLORS.red, ...strokeText(10) }}>"EXPLAIN." 🎤</div>
      <div style={{ marginTop: 12, fontFamily: FONT, fontWeight: 900, fontSize: 34, color: COLORS.yellow }}>"WHAT IS LIT TO YOU?"</div>
    </div>
  );
};

const ThesisSection = () => (
  <>
    <ThesisType />
    <ExplainCard />
  </>
);

// ─────────────────────────────────────────────────────────────
// 20. THE PUNCHLINE (32.69–34.71) — stamp, then a B&W freeze replay
//     The frozen frame is the tracked full-bleed rect [0.428, 0, 0.316, 1] pre-computed
//     through CropView's own maths: w=100/0.316%, left=-(0.428/0.316*100)%.
// ─────────────────────────────────────────────────────────────

const PUNCH = {
  in: 32.69,
  stamp: 33.39,
  freeze: 33.45,
  out: 34.71,
  freezeSourceTime: 1932.6,
};

const GirlsDrunkStamp = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, PUNCH.stamp, PUNCH.out)) return null;
  const s = springAt(frame, PUNCH.stamp, SPRING_STAMP);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: clamp01(s * 3) }}>
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 960,
          margin: "0 auto",
          width: "fit-content",
          transform: `rotate(-6deg) scale(${interpolate(s, [0, 1], [2.4, 1])})`,
          padding: "18px 36px",
          border: `12px solid ${COLORS.red}`,
          borderRadius: 22,
          background: "rgba(7,9,13,0.72)",
          color: COLORS.red,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 104,
          lineHeight: 0.98,
          textAlign: "center",
          letterSpacing: 2,
          textShadow: "0 0 30px rgba(255,59,59,0.5)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.7), inset 0 0 40px rgba(255,59,59,0.3)",
        }}
      >
        GET GIRLS
        <br />
        DRUNK 🍸
      </div>
    </AbsoluteFill>
  );
};

const FreezeReplay = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, PUNCH.freeze, PUNCH.out)) return null;
  const local = frame - sec(PUNCH.freeze);
  const push = interpolate(local, [0, 6], [1.0, 1.14], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const drift = 1 + local * 0.002;
  const chipIn = springAt(frame, PUNCH.freeze, SPRING_SNAP);
  const arrowIn = springAt(frame, PUNCH.freeze + 0.1, SPRING_STAMP);
  const arrowBob = Math.sin(frame / 2.5) * 10;
  const blink = Math.floor(frame / 5) % 2 === 0 ? 1 : 0.3;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#000" }} />
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Sequence from={sec(PUNCH.freeze)} layout="none">
          <Freeze frame={0}>
            <Video
              src={SOURCE}
              startFrom={Math.round(PUNCH.freezeSourceTime * FPS)}
              muted
              style={{
                position: "absolute",
                width: "316.46%",
                height: "100%",
                left: "-135.44%",
                top: 0,
                objectFit: "fill",
                maxWidth: "none",
                filter: "grayscale(1) contrast(1.25)",
                transform: `scale(${push * drift})`,
                transformOrigin: "50% 38%",
              }}
            />
          </Freeze>
        </Sequence>
        <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 6px)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 150,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 26px",
          background: COLORS.red,
          borderRadius: 12,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 46,
          color: COLORS.white,
          transform: `scale(${interpolate(chipIn, [0, 1], [1.6, 1])}) rotate(-3deg)`,
          opacity: clamp01(chipIn * 3),
          boxShadow: COLORS.shadow,
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: COLORS.white, opacity: blink }} />
        <RewindGlyph size={26} /> INSTANT REPLAY
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1280,
          display: "flex",
          justifyContent: "center",
          opacity: clamp01(arrowIn * 3),
          transform: `translateY(${arrowBob}px) scale(${interpolate(arrowIn, [0, 1], [0.4, 1])})`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT, fontWeight: 900, fontSize: 96, color: COLORS.yellow, ...strokeText(12) }}>
          THAT'S HIM
          <div style={{ transform: "rotate(180deg)" }}>
            <ArrowDownGlyph size={70} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PunchlineSection = () => (
  <>
    <FreezeReplay />
    <GirlsDrunkStamp />
  </>
);

// ─────────────────────────────────────────────────────────────
// 21. THE WEEKEND LEDGER + THE DRAIN (34.71–38.87)
// ─────────────────────────────────────────────────────────────

const WEEKEND = { in: 34.71, laterChip: 34.78, fri: 35.6, sat: 36.4, sun: 37.2, out: 38.85 };

const LaterChip = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, WEEKEND.laterChip, WEEKEND.laterChip + 1.2)) return null;
  const enter = springAt(frame, WEEKEND.laterChip, SPRING_SNAP);
  const out = exitAt(frame, WEEKEND.laterChip + 1.2, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: LAYOUT.videoTop + 22,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px",
        background: "rgba(0,0,0,0.8)",
        borderRadius: 10,
        fontFamily: MONO_FONT,
        fontWeight: 700,
        fontSize: 32,
        letterSpacing: 2,
        color: COLORS.white,
        opacity: out * clamp01(enter * 2),
        transform: `translateX(${interpolate(enter, [0, 1], [70, 0])}px)`,
        textShadow: "2px 0 rgba(0,230,118,0.7), -2px 0 rgba(255,59,59,0.6)",
      }}
    >
      <div style={{ width: 0, height: 0, borderLeft: "18px solid #fff", borderTop: "11px solid transparent", borderBottom: "11px solid transparent" }} />
      <div style={{ width: 6, height: 22, background: "#fff" }} />
      30 SECONDS LATER
    </div>
  );
};

const WeekendLedger = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, WEEKEND.in, WEEKEND.out)) return null;
  const enter = springAt(frame, WEEKEND.in, SPRING_IN);
  const out = exitAt(frame, WEEKEND.out, 6);
  const days = [
    { label: "FRI", at: WEEKEND.fri },
    { label: "SAT", at: WEEKEND.sat },
    { label: "SUN", at: WEEKEND.sun },
  ];
  const spent = days.filter((d) => t >= d.at).length;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.cardTop + 16,
        ...panelStyle,
        padding: "20px 30px 24px",
        opacity: out * clamp01(enter * 2),
        transform: `translateY(${interpolate(enter, [0, 1], [-46, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, letterSpacing: 5, color: "rgba(255,255,255,0.6)" }}>"IN ONE NIGHT, ONE WEEKEND?"</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: spent === 3 ? COLORS.red : COLORS.yellow }}>{spent}/3 DAYS</div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
        {days.map((d) => {
          const on = t >= d.at;
          const p = on ? springAt(frame, d.at, SPRING_SNAP) : 0;
          return (
            <div
              key={d.label}
              style={{
                flex: 1,
                height: 86,
                borderRadius: 16,
                border: `3px solid ${on ? COLORS.red : "rgba(255,255,255,0.14)"}`,
                background: on ? "rgba(255,59,59,0.18)" : "rgba(255,255,255,0.04)",
                boxShadow: on ? "0 0 26px rgba(255,59,59,0.45)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transform: `scale(${on ? interpolate(p, [0, 1], [1.25, 1]) : 1})`,
              }}
            >
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 3, color: on ? COLORS.white : "rgba(255,255,255,0.3)" }}>{d.label}</div>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 22, color: on ? COLORS.red : "rgba(255,255,255,0.2)" }}>{on ? "SPENT" : "—"}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 22, marginTop: 16, borderRadius: 11, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 22,
            width: `${(spent / 3) * 100}%`,
            borderRadius: 11,
            background: `linear-gradient(90deg, ${COLORS.red}, #ff7a59)`,
            boxShadow: "0 0 16px rgba(255,59,59,0.5)",
          }}
        />
      </div>
    </div>
  );
};

const WeekendSection = () => (
  <>
    <WhiteFlash at={34.71} frames={4} peak={0.9} />
    <LaterChip />
    <WeekendLedger />
  </>
);

// ─────────────────────────────────────────────────────────────
// 22. THE RECEIPT (38.87–40.6) — paper prop, same family as the last clip
// ─────────────────────────────────────────────────────────────

const RECEIPT = { in: 38.85, gone: 39.23, out: 40.25 };

const LossReceipt = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, RECEIPT.in, RECEIPT.out)) return null;
  const enter = springAt(frame, RECEIPT.in, SPRING_IN);
  const out = exitAt(frame, RECEIPT.out, 7);
  const shake = shakeAt(frame, RECEIPT.in, 7, 12);
  const lineIn = (i) => springAt(frame, RECEIPT.in + 0.06 * i, SPRING_SNAP);
  const goneP = springAt(frame, RECEIPT.gone, SPRING_STAMP);
  const rows = [
    { label: "MAX PAYOUT", value: "$1,500", color: COLORS.ink },
    { label: "AFTER SPLITS", value: "$1,350", color: COLORS.ink },
    { label: "THE WEEKEND", value: "−$1,350", color: COLORS.red },
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: LAYOUT.cardTop - 4,
        opacity: out * clamp01(enter * 2),
        transform: `translate(${shake.x}px, ${interpolate(enter, [0, 1], [-70, 0]) + shake.y}px) rotate(1.5deg)`,
        background: COLORS.paper,
        borderRadius: 16,
        padding: "20px 30px 26px",
        boxShadow: COLORS.shadow,
        fontFamily: MONO_FONT,
        color: COLORS.ink,
        clipPath:
          "polygon(0 0, 100% 0, 100% 94%, 95% 100%, 90% 94%, 85% 100%, 80% 94%, 75% 100%, 70% 94%, 65% 100%, 60% 94%, 55% 100%, 50% 94%, 45% 100%, 40% 94%, 35% 100%, 30% 94%, 25% 100%, 20% 94%, 15% 100%, 10% 94%, 5% 100%, 0 94%)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: 6, opacity: 0.6, textAlign: "center" }}>── WEEKEND RECEIPT ──</div>
      {rows.map((r, i) => (
        <div
          key={r.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 10,
            fontWeight: 700,
            fontSize: 32,
            opacity: clamp01(lineIn(i) * 2),
            transform: `translateX(${interpolate(lineIn(i), [0, 1], [26, 0])}px)`,
          }}
        >
          <span>{r.label}</span>
          <span style={{ color: r.color, fontFamily: FONT, fontWeight: 900, fontSize: 38 }}>{r.value}</span>
        </div>
      ))}
      <div style={{ borderTop: "3px dashed rgba(0,0,0,0.3)", margin: "14px 0 8px" }} />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 30, letterSpacing: 3 }}>TOTAL LEFT</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 92, lineHeight: 1, color: COLORS.red, transform: `scale(${interpolate(goneP, [0, 1], [1.35, 1])})`, transformOrigin: "right center" }}>
          $0.00
        </div>
      </div>
      {t >= RECEIPT.gone ? (
        <div style={{ marginTop: 4, textAlign: "right", fontFamily: FONT, fontWeight: 900, fontSize: 38, color: COLORS.ink, opacity: clamp01(goneP * 2) }}>
          IT WAS <span style={{ color: COLORS.red }}>GONE</span> 💀
        </div>
      ) : null}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 23. REINVEST vs SPEND (40.25–42.57)
// ─────────────────────────────────────────────────────────────

const CHOICE = { in: 40.25, answer: 41.77, out: 42.57 };

const ReinvestChoice = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (!isBetween(frame, CHOICE.in, CHOICE.out)) return null;
  const enter = springAt(frame, CHOICE.in, SPRING_IN);
  const out = exitAt(frame, CHOICE.out, 6);
  const rowP = springAt(frame, CHOICE.answer, SPRING_SNAP);
  const row = (label, value, mark, markColor, p) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 22px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.04)",
        border: `3px solid ${mark ? markColor : "rgba(255,255,255,0.12)"}`,
        opacity: clamp01(p * 2),
        transform: `translateX(${interpolate(p, [0, 1], [-240, 0])}px)`,
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 4, color: "rgba(255,255,255,0.55)", minWidth: 210 }}>{label}</div>
      <div style={{ flex: 1, fontFamily: FONT, fontWeight: 900, fontSize: 42, color: COLORS.white }}>{value}</div>
      {mark ? <div style={{ transform: `scale(${interpolate(p, [0, 1], [2, 1])})` }}>{mark}</div> : null}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.cardTop + 6,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: out * clamp01(enter * 2),
        transform: `translateY(${interpolate(enter, [0, 1], [-40, 0])}px)`,
      }}
    >
      {row("OPTION A", "REINVEST → MATCHED BETTING", t >= CHOICE.answer ? <CrossGlyph size={44} /> : null, COLORS.red, rowP)}
      {row("WHAT HE DID", "SPEND → GET LIT", t >= CHOICE.answer ? <CheckGlyph size={44} /> : null, COLORS.green, springAt(frame, CHOICE.answer + 0.12, SPRING_SNAP))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 24. THE TWIST (42.57–end) — savings intact, balance still $0, he's fine
// ─────────────────────────────────────────────────────────────

const ENDING = {
  vault: 42.57,
  vaultOut: 44.3,
  meme: 43.57,
  fine: 44.37,
  cta: 44.6,
};

const SavingsVault = () => {
  const frame = useCurrentFrame();
  if (!isBetween(frame, ENDING.vault, ENDING.vaultOut)) return null;
  const enter = springAt(frame, ENDING.vault, SPRING_STAMP);
  const out = exitAt(frame, ENDING.vaultOut, 6);
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: LAYOUT.cardTop + 20,
        opacity: out * clamp01(enter * 3),
        transform: `scale(${interpolate(enter, [0, 1], [1.7, 1])}) rotate(-2.5deg)`,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "20px 30px",
        borderRadius: 22,
        background: COLORS.green,
        color: COLORS.bg,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 58,
        lineHeight: 1.05,
        boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 40px rgba(0,230,118,0.4)",
      }}
    >
      <CheckGlyph size={52} color={COLORS.bg} />
      SAVINGS: INTACT
    </div>
  );
};

const HesFineStamp = () => {
  const frame = useCurrentFrame();
  if (frame < sec(ENDING.fine)) return null;
  const s = springAt(frame, ENDING.fine, SPRING_STAMP);
  const pulse = 1 + Math.sin(frame / 7) * 0.015;
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        top: LAYOUT.cardTop + 26,
        opacity: clamp01(s * 3),
        transform: `scale(${interpolate(s, [0, 1], [2.2, 1]) * pulse}) rotate(-4deg)`,
        padding: "16px 32px",
        borderRadius: 20,
        background: COLORS.red,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 84,
        color: COLORS.white,
        whiteSpace: "nowrap",
        textShadow: "0 4px 0 rgba(0,0,0,0.35)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,59,59,0.5)",
      }}
    >
      HE'S FINE 😌
    </div>
  );
};

const EndCTA = () => {
  const frame = useCurrentFrame();
  if (frame < sec(ENDING.cta)) return null;
  const s = springAt(frame, ENDING.cta, SPRING_SNAP);
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: LAYOUT.ctaTop,
        display: "flex",
        justifyContent: "center",
        opacity: clamp01(s * 2),
        transform: `translateY(${interpolate(s, [0, 1], [-40, 0])}px) scale(${interpolate(s, [0, 1], [0.85, 1])})`,
      }}
    >
      <div style={{ ...panelStyle, border: `3px solid ${COLORS.yellow}`, padding: "18px 30px", fontFamily: FONT, fontWeight: 900, fontSize: 46, lineHeight: 1.12, color: COLORS.white, textAlign: "center" }}>
        FIRST $1,350: <span style={{ color: COLORS.yellow }}>LIT</span> OR <span style={{ color: COLORS.green }}>REINVEST</span>?
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 6, fontSize: 30, color: "rgba(255,255,255,0.75)" }}>
          tell us <ArrowDownGlyph size={28} />
        </div>
      </div>
    </div>
  );
};

const EndingSection = () => (
  <>
    <SavingsVault />
    <MemeCard at={ENDING.meme} out={DURATION / FPS + 1} src={ASSETS.lostForWordsMeme} size={300} right={44} top={228} rotate={7} />
    <HesFineStamp />
    <EndCTA />
  </>
);

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

// ─────────────────────────────────────────────────────────────
// 26. MAIN
// ─────────────────────────────────────────────────────────────

const SHAKES = [
  { at: 0.0, frames: 5, amp: 12 },
  { at: 17.82, frames: 6, amp: 14 },
  { at: 22.43, frames: 6, amp: 12 },
  { at: 33.39, frames: 4, amp: 16 },
  { at: 37.93, frames: 8, amp: 18 },
  { at: 38.87, frames: 6, amp: 12 },
];

const screenShakeAt = (frame) =>
  SHAKES.reduce(
    (acc, s) => {
      const d = shakeAt(frame, s.at, s.frames, s.amp);
      return { x: acc.x + d.x, y: acc.y + d.y };
    },
    { x: 0, y: 0 },
  );

const SHAKE_PAD = 1.035; // hides the edges the shake would otherwise reveal

const FirstPayoutWeekendClip = () => {
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
        <ColdOpenSection />
        <NumbersSection />
        <AccountsCard />
        <SpendSection />
        <LitSection />
        <VerdictSection />
        <CompareLanes />
        <ThesisSection />
        <WeekendSection />
        <LossReceipt />
        <ReinvestChoice />
        <EndingSection />

        {/* Full-frame takeover: the punchline freeze */}
        <PunchlineSection />

        <BalanceChip />
        <CaptionsLayer />
      </AbsoluteFill>

      <AudioLayer />
    </AbsoluteFill>
  );
};

// Self-audit contract for tools/clipcheck/verify.mjs. Declaring the beat windows is what lets the
// checker PROVE two cards never occupy the same pixels, and that every beat lands on a real word.
// lane = which vertical slot the beat owns, so deliberate stacks (a corner flag above a panel)
// are not reported as collisions.
const BLOCKS = [
  ["hook headline", 0, COLD.cut, "card"],
  ["50k flag", NUMBERS.account, NUMBERS.accountOut, "flag"],
  ["payout gauge", NUMBERS.payoutIn, NUMBERS.out, "card"],
  ["accounts", ACCOUNTS.in, ACCOUNTS.out, "card"],
  ["question", SPEND.q, SPEND.out, "card"],
  ["lit type", LIT.type, LIT.typeOut, "card"],
  ["confession", VERDICT.confess, VERDICT.confessOut, "card"],
  ["verdict", VERDICT.stamp, VERDICT.out, "card"],
  ["compare lanes", COMPARE.in, COMPARE.out, "card"],
  ["thesis", THESIS.start, THESIS.end, "card"],
  ["explain", THESIS.demand, THESIS.demandOut, "card"],
  ["weekend ledger", WEEKEND.in, WEEKEND.out, "card"],
  ["receipt", RECEIPT.in, RECEIPT.out, "card"],
  ["reinvest choice", CHOICE.in, CHOICE.out, "card"],
  ["savings vault", ENDING.vault, ENDING.vaultOut, "card"],
  ["hes fine", ENDING.fine, DURATION / FPS, "card"],
];

export const CLIP_AUDIT = {
  fps: FPS,
  duration: DURATION,
  layout: LAYOUT,
  srcAspect: SOURCE_ASPECT,
  segments: SEGMENTS,
  offsetFrames: SEGMENT_OFFSETS.map((t) => Math.round(t * FPS)),
  camera: CAMERA,
  words: WORDS,
  pages: CAPTION_PAGES,
  zoomAt,
  musicVolumeAt,
  sfx: SFX,
  blocks: BLOCKS,
  hide: CAPTION_HIDE_RANGES,
  silences: [
    [2.0, 2.22],
    [32.69, 34.71],
  ],
};

export default FirstPayoutWeekendClip;
