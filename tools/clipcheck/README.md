# tools/clipcheck — the clip gate, and tools/clipkit — the reusable half of a clip

Two things that make a new clip fast **without** making it worse:

1. `clipcheck` proves the clip is correct before anyone spends a Lambda render on it.
2. `clipkit` is the machinery that is byte-identical in every clip, so a new composition is
   ~30 KB of real decisions instead of ~100 KB of retyping.

Measured on the first two clipping-hub builds: 101 KB / 2,500 lines → 68 KB / 1,379 lines
with *more* beats (16 → 20 blocks), because the creative layer is built from five primitives
(`Panel`, `Flag`, `Lane`, `Kicker`, `Big`) instead of bespoke markup per beat.

## Run the gate

```bash
cd tools/clipcheck && npm i --no-save @babel/standalone   # once (node_modules is gitignored)
node tools/clipcheck/check.mjs  clips/<project-slug>.tsx  # static: compiles, render rules, traps
node tools/clipcheck/verify.mjs clips/<project-slug>.tsx  # dynamic: evaluates and audits the logic
```

Both exit non-zero on failure. Warnings are judgement calls; failures are not shippable.

`check.mjs` catches, statically:
- does not compile under the Playground's exact Babel config (`src/lib/code-evaluator.ts`)
- `/* REMOTION_CONFIG { … } */` missing or unparseable by `src/lib/detect-config.ts`
- imports outside the `react` / `remotion` / `@remotion/lottie` allowlist, no default export,
  a component named `MyVideo`, any `backdrop-filter`. These three test what actually RENDERS, so
  comments are stripped first — prose that *mentions* a banned property is not a banned property.
  The camelCase half of that check stays strict on purpose: `render-video` only scrubs the
  kebab-case CSS form, so `backdropFilter:` inside a JSX style object would reach Lambda untouched.
- the `ClipCamera` marker block **diffed against `supabase/functions/_shared/clip-camera.ts`**.
  This matters more than it looks: the Playground preview runs *your* copy while Lambda swaps in
  the canonical one, so drift means preview and render disagree. Install it from
  `tools/clipkit/parts/camera.txt` (extracted from the canonical source) — never retype it.
- the `in: N, out: N` trap: `render-video` regex-scans the *whole file* for that pair to score
  clip-cut coverage, so any other object literal using those two key names fakes a segment and
  can cost you the lossless cut. Rename to `start`/`end`.
- non-hub URLs (warning, not failure — see "Asset URLs" below)

`verify.mjs` compiles the file, **evaluates** it with stubbed `react`/`remotion`, and audits the
pure logic through the composition's own `CLIP_AUDIT` export:

| audit | what it has caught |
|---|---|
| segment tiling vs `durationInFrames` | a 1-frame black tail (1377 vs 1376) |
| segment picture frames vs sound frames | an out-point where `round(out*fps)-round(in*fps)` differs from `round((out-in)*fps)` — the segment's audio copy then stops a frame before the picture |
| `offsetFrames` vs the caption clock | captions drifting from audio across a stitched hook |
| word monotonicity / duration / bounds | ASR words with 0–20 ms slots, words outside the timeline |
| caption pages | >4 words, overlaps, mixed speakers on one page, a page starting under a blackout |
| camera rects | a placeholder rect, a rect escaping the frame, split mode missing its second face |
| zoom curve | peaks past the 1.25 clamp, dips under 1.0 (crop widening outside the tracked face box) |
| `pushAt` — the slow push-in | drift >1.05, and (with `shakePad`) the composed band top/bottom escaping the card and caption zones. Needed because the push and the shake wrapper scale about **different origins**, so the band moves more than either transform alone |
| music silences | a "record stop" that was not actually silent on the frame it claimed |
| layout zones | chip / card / band / caption zones intersecting; captions inside the bottom 340 px |
| beat lanes | two cards double-booked on the same pixels (caught 4 in the first build) |
| beat sync | a beat that misses the word it claims to land on, or has no SFX within 0.2 s |

### The `CLIP_AUDIT` contract

Every clip composition ends with:

```js
const BLOCKS = [
  ["hook headline", 0, HOOK.cut, "card"],   // [name, startSec, endSec, lane]
  ["rewind flag", REWIND.at, REWIND.out, "flag"],
  ["stunned meme", MEME.at, MEME.out, "sticker"],
];

export const CLIP_AUDIT = {
  fps: FPS, duration: DURATION, layout: LAYOUT, srcAspect: SOURCE_ASPECT,
  segments: SEGMENTS, offsetFrames: OFFSET_FRAMES, camera: CAMERA,
  words: WORDS, pages: CAPTION_PAGES, zoomAt, musicVolumeAt, sfx: SFX,
  blocks: BLOCKS, hide: CAPTION_HIDE_RANGES, silences: MUSIC_SILENCES,
};
```

`lane` is the vertical slot a beat owns, so a deliberate stack (a corner flag above a panel) is
not reported as a collision. Declaring `BLOCKS` is what turns "I think these don't overlap" into
a proof — and writing the windows down once means the beat map, the SFX list and the audit all
read the same constants.

## The kit

`clipkit/clip-kit.tsx` is the whole reusable half in reading order; `clipkit/parts/*.txt` are the
same blocks split for assembly. All of it is byte-identical to code that has already rendered on
Lambda. Copy blocks verbatim, in this order:

```
font gate → DATA (per clip) → repairWords/normalizeWord/buildPages/zoom maths → caption clock,
ZOOM_KEYS, SFX, music (per clip) → helpers+glyphs → ClipCamera → background → grade → captions → audio
→ creative sections (per clip) → main + CLIP_AUDIT
```

Only these change per clip: `REMOTION_CONFIG`, `ASSETS`, `SEGMENTS`, `OFFSET_FRAMES`, `CAMERA`,
`WORDS`, the beat-time constants, `RED_WORDS`/`GREEN_WORDS`, `speakerTag`, `ZOOM_KEYS`, `SFX`,
music levels/silences, `LAYOUT` (rarely), and the creative sections.

`LAYOUT` is a contract: `videoTop`/`videoHeight` must equal ClipCamera's wide box
(`(1920 - 1080/srcAspect) * 0.4` = 525 for 16:9), or graphics will sit on top of the picture.

## Colour grade — the house look (`clipkit/parts/grade.txt`)

Every clipper on the same source ships the flat camera original, so from
`clips/lose-a-trade-ask-your-friend-to-buy-breakfast.tsx` onwards our picture is graded: teal in the
shadows, amber in the highlights, crushed blacks, a vignette and a three-phase grain.

Three wiring points, all outside the ClipCamera marker block:

1. `filter: GRADE.filter` goes on the wrapper that already carries `pushAt`'s scale — the same
   element, both transforms;
2. `<BackdropLayer />` after it (letterbox ambience);
3. `<GradeLayer />` after that, **before** the creative layer — so the blend layers sit over the
   footage and under the graphics. Cards, captions, meters and the brand stamp stay pixel-clean, and
   the stamp is outside the shake wrapper anyway so it never gets tinted.

Flat CSS compositing only: no SVG filter, no `backdrop-filter`, no blur-behind, nothing that
re-rasterises per pixel per frame. A freeze outro draws over everything, so it does not go through
`GradeLayer` — merge the grade into its own `<Video>` filter instead. `GRADE.off = true` plus
`GRADE.filter = "none"` turns the whole thing off without touching a section.

## Assembly

Keep the per-clip parts in a scratch dir and concatenate — do not retype the kit:

```bash
python3 - <<'PY'
kit = lambda n: open(f"tools/clipkit/parts/{n}.txt").read().rstrip() + "\n"
parts = [data_a, kit("font"), kit("repairWords"), kit("normalizeWord"), kit("buildPages"),
         kit("zoom"), data_b, kit("helpers"), kit("camera"), kit("background"),
         kit("grade"), kit("captions"), kit("audio"), sections]
open("clips/<project-slug>.tsx", "w").write("\n".join(parts))
PY
```

## Asset URLs — the real rule

Nothing in the pipeline blocks external URLs: `render-video` has no allowlist and rewrites
nothing except the source-cut swap, and `findMissingAssets` only validates hub UUIDs it finds.
So:

- **The source video must be a hub asset.** The cut / `meta.ranges` / `&part=audio` machinery keys
  off hub ids, and a `role=source` asset with no `meta.audio_path` is refused at render time
  ("needs preparing first").
- **B-roll, memes, stickers and SFX may be any public URL** that serves HTTP range requests and
  does not expire or hotlink-block. Prefer saving them into the hub anyway (`agent-create` with
  `sourceUrl`, `role=stock` or `role=meme`): links rot, and a tagged library means the next clip
  needs zero search calls. Never save B-roll as `role=source` — that triggers the refusal above.
- Fonts: `@remotion/google-fonts` is **not** installed. Use the kit's `FontFace` + `delayRender`
  gate (an `@import` alone can paint frames in a fallback font on Lambda).
