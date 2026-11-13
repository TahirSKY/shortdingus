---
name: whiteboard-master-playbook
description: Portable Master Skill & Living Production Memory for creating high-retention vertical Whiteboard YouTube Shorts in ShortDingus Hub. Drop this file into ANY coding/chat agent (Claude, ChatGPT, Cursor, Arena, etc.) alongside a project-manifest link to skip every setup trap, art mistake, upload hurdle, and Remotion Playground/Lambda crash. Keep the "Living Memory" section at the bottom updated as we ship new videos.
---

# Whiteboard Shorts — Master Skill, Director Playbook & Living Memory

> **How to use this file with ANY agent:**  
> Copy-paste this entire file into a new agent chat, share the project manifest URL (`https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/project-manifest?slug=whiteboard&project=<project_slug>`), and attach one character style reference image (like `s01-big-meal.png` or `scene-01-organ-wrap.png`). The agent has everything needed to execute immediately without trial-and-error.  
> **Rule for the agent:** Treat this document as your **living memory**. Whenever we discover a new trick, refine our look, or finish a stage/video, **update this file** so the next session starts smarter than the last.

---

## 1. Creative Vision & Role (Think Like a Movie Director)

We make **killer vertical (`1080×1920`, `30 fps`) whiteboard explainer YouTube Shorts** that hook viewers on frame 0 and hold retention to the final word:
- **Visual storytelling first:** Never draw boring icons or literal text slides. Direct **expressive people/characters** acting out the idea with emotion, contrast, humor, and clear visual metaphors (2–3 characters interacting whenever it heightens the scene: whispering secrets, shrugging at bad gym myths, walking together, celebrating).
- **One crisp idea per scene (~3.0s – 6.5s per beat):** Gives the realistic marker hand ~2.5s–4.0s to draw the black outlines at natural human speed, `0.6s` for the flat marker colors to settle in, and `~1.0s` for the viewer's eye to absorb the colored punchline before the next cut.
- **Bookend payoffs:** Mirror the opening hook visually in the finale (e.g., Scene 01 shows shocked characters looking at yellow fat wrapping coral organs → Final scene shows the same characters celebrating over sparkling, fat-free smiling organs).
- **Sponsor / Brand Mentions (e.g., CoreAge RX) = Custom Code, NOT Static Art:** Whenever the script mentions our brand/partner (such as **CoreAge RX** connecting patients with U.S. doctors online), **skip generating a whiteboard PNG for that beat**. Instead, code a slick, smart interactive UI animation directly in Remotion (e.g., typing `"CoreAge RX"` into a clean search bar synced to the voiceover → cursor click → sleek telehealth platform card popping open with verified U.S. doctors online + tactile keyboard/click/pop SFX).

---

## 2. End-to-End Production Workflow (Zero-Friction Loop)

1. **Read the Project Manifest (`GET /project-manifest`):**
   - Base URL: `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/project-manifest?slug=whiteboard&project=<project_slug>`
   - **Context-saving shortcut:** Manifests are ~28–33 chunks because all shared skill bodies sit in the middle. Read **chunk `0–1`** (hub & project metadata) and the **last 6–8 chunks** (`project_files`, voiceover `id`/`url`/`duration_seconds`, and the `assembly-transcript` analysis containing exact `words: [{ w, start, end }]`, `caption_lines`, and `cuts`).
2. **Map the Director's Beat Sheet:**
   - Split the voiceover into sequential scenes (`scene-01-<idea>.png`, `scene-02-<idea>.png`, …) aligned to exact word `start`/`end` timestamps.
   - Carve out any brand/UI beat (e.g. CoreAge RX) as a **code-only scene** (no PNG needed).
3. **Generate Vertical (`9:16`) Scene Images:**
   - **Arena / Per-Turn Cap:** Inside LMarena, `generate_image` caps at **10 images per turn**. If the video needs 14–15 scenes, generate **Scene 01 first** (to verify character & line consistency via `read_file`), generate **Scenes 02–10 in parallel** in the same turn, inspect every image with `read_file`, present the batch, and pause for the user's `"continue"` to finish Scenes 11–N in the next turn.
   - Always set `offer_options: false` (batch assets inside a larger video build) and pass the channel's reference character PNG in `images: [...]` so character proportions and marker stroke weights never drift.
4. **Push Scene PNGs to the Hub (`coreagerxshort2`, etc.):**
   - Save PNGs locally under `whiteboard/<project_slug>/scenes/scene-XX-<slug>.png`.
   - **Restricted-sandbox upload pattern (works even when `bash` only reaches GitHub):**
     1. `git add whiteboard/<project_slug>/scenes/*.png && git commit && git push origin <current_branch>` (`TahirSKY/shortdingus` is public, making `https://raw.githubusercontent.com/TahirSKY/shortdingus/<branch>/whiteboard/<project_slug>/scenes/...` immediately reachable).
     2. **SECURITY HARD RULE:** **NEVER** write, save, or commit `HUB_WRITE_TOKEN` into any file, script, or commit message. Only pass the user-supplied token directly in ephemeral `agent-create` calls.
     3. Ingest each scene in order (`01 → N`) via HTTP GET (`fetch_page` or `curl`):
        ```
        https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/agent-create?token=<TOKEN>&slug=whiteboard&project=<project_slug>&kind=image&role=image&name=scene-01-example.png&sourceUrl=<URL_ENCODED_RAW_GITHUB_URL>
        ```
        Each returns `201 { id, url, asset }` immediately.
5. **STOP & Hand Off for MP4 Drawing Generation:**
   - Once all scene PNGs are pushed, **STOP** and report the uploaded asset table to the user.
   - Do **NOT** poll in a loop or build with pending clips. The user clicks **Render pending drawings** on the Hub project page (which automatically batches >12 images into 12-clip calls to `whiteboard-animate` with `format: "vertical"` and renders `whiteboard-<scene>.mp4` sequentially).
6. **Verify Clips & Deliver Single-File Remotion Code in Chat:**
   - Only after the user says **"continue"** (confirming MP4s finished), fetch the tail chunks of `project-manifest` **once**.
   - Check every `whiteboard-clip` video asset: require `meta.creating === false`, `meta.whiteboard_status === "ready"`, no `meta.error`, and read `id`, `url`, `duration_seconds`, `meta.draw_seconds`, `meta.hold_seconds`, and `meta.source_asset_id`. (If any clip is still queued/rendering or errored, report which one and stop.)
   - Write the complete, self-contained single-file Remotion `.tsx` composition and **paste it in one code block directly in chat** for the user to copy into `/playground` (no need to push code to the Hub unless asked).

---

## 3. Art Direction & Engine-Safe Prompt Formula (`whiteboard-animate` Internals)

### Why Our Style Traces Cleanly AND Looks Colorful
Inside `supabase/functions/whiteboard-animate/index.ts`, `traceBytes()` converts each PNG to grayscale (`0.299R + 0.587G + 0.114B`) and sets the ink threshold around **`~140` (`0–255`)**:
- **Pixels darker than `~140`** → traced as black marker strokes by Zhang-Suen centerline tracing and drawn by the realistic marker hand.
- **Pixels brighter than `~145`** → ignored during stroke tracing (treated as white board), then **smoothly faded in over `0.6s` via `COLOR_ART`** right as the marker finishes drawing!

**Therefore, follow these exact visual rules on every single image:**
1. **Outlines:** Thick, uniform, solid `#000000` black marker outlines enclosing every character, limb, prop, and color area. Single clean smooth black outline for each round bald head (no sketchy double head-lines).
2. **Character Cast:** Cute minimalist round-headed bald white-bodied doodle characters (smooth white circular head, tiny solid black dot eyes, simple expressive mouths/brows, rounded hands, colorful pastel tops/hoodies/sneakers).
3. **Colors (Bright Flat Marker Pastels ONLY — Luminance `165–225`):**
   - Sky Blue (`#7CC8F8`), Mint / Soft Green (`#84E4B8`), Warm Golden Yellow (`#FFD45E`), Soft Coral / Salmon (`#FF8E7A`), Pastel Lavender (`#C9AEFF`), Soft Peach (`#FFC49B`).
   - **NEVER** use dark navy, charcoal, dark brown, black solid fills, gradients, drop shadows, gray shading, cross-hatching, or off-white paper textures — dark fills below luminance `140` get traced into hundreds of ugly scribble strokes!
4. **Pure `#FFFFFF` Background, Nighttime Rule & Vertical Safe Zones:**
   - `9:16` portrait (`768×1376` / `1080×1920`).
   - **Nighttime / Dark Settings on `#FFFFFF`:** Even when the script takes place *"Tonight"* or at bedtime, **NEVER** draw a dark navy/black sky backdrop (any fill darker than `~140` gets traced into dense black marker scribbles!). Keep `100%` pure `#FFFFFF` white and signify night cleanly with a **warm golden-yellow crescent moon + pastel stars**.
   - **Bold Low-Clutter Props & 2-Arm Anatomy Check:** Keep props chunky and uncluttered so `whiteboard-animate` renders clips in the `6s–10s` sweet spot (`playbackRate` `1.3x–3.3x`, always `< 4.0x` so HTML5 `<video>` stays silky smooth). Never ask one character to do 3 simultaneous hand gestures (e.g. *thumbs-up + pointing + holding a clipboard* causes 3-arm anatomy glitches — assign at most 2 hand actions per character or split across 2 characters, and always inspect hands via `read_file`).
   - Keep **generous pure `#FFFFFF` white margin around all sides, especially the bottom `22%`** (`30%` on `3-2-1` quiz scenes) so dynamic Shorts captions (`y ≈ 1500`) and countdown medallions never cover character action.
5. **NO Baked-In Text / Words / Numbers:**
   - Never put English words, labels, `"Zzz"`, or clock numbers inside generated images (letters trace poorly and clash with captions). Universal visual symbols (`?`, `!`, `✗`, `✓`, `★`, arrows, numberless clocks with colored pie wedges, scissors snipping a moon-cloud, battery meters) read 10× faster and trace cleanly.

### Copy-Paste Master Image Prompt Template
```text
Vertical 9:16 portrait whiteboard doodle illustration in the exact minimalist cute round-headed bald white-bodied character style of the reference image (single clean smooth black outline for each round head, tiny solid black dot eyes), thick uniform solid black marker outlines on a pure solid #FFFFFF white background, with vibrant flat pastel marker colors. <SCENE ACTION WITH 1-3 EXPRESSIVE CHARACTERS, CLEAR VISUAL METAPHOR, AND SPECIFIC FLAT PASTEL COLORS: sky-blue, mint-green, golden-yellow, soft-coral, pastel-lavender>. Flat bright light-to-medium marker fills only, zero shading, zero gradients, zero gray shadows, NO text, NO letters, NO numbers, NO words, generous pure white margin especially at the bottom 20%.
```

---

## 4. Remotion Playground & Lambda Hard Rules (Mistakes We Already Solved)

Every single rule below comes directly from inspecting `src/lib/code-evaluator.ts`, `src/lib/detect-config.ts`, `src/lib/check-asset-links.ts`, and `supabase/functions/render-video/index.ts`:

### Rule 1 — Strict Import Allowlist (`code-evaluator.ts`)
The browser Playground's Babel `require()` shim **ONLY** exposes three packages:
- `react`
- `remotion`
- `@remotion/lottie`

**NEVER import** `@remotion/google-fonts/*`, `lucide-react`, `@remotion/paths`, `@remotion/transitions`, `framer-motion`, or `chroma-js` — any other import throws `Module "..." is not available in the preview` instantly! Draw UI icons as clean inline SVGs and use crisp font stacks (`"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`).

### Rule 2 — Config Header Must Use Plain Integers (`detect-config.ts` & `render-video`)
Always put this exact comment on Line 1 with **plain integer literals** (never expressions like `68.24 * 30` or `2048 / 30` — Lambda's S3 bundle parses the first config with a digits-only regex where `2048 / 30` becomes `2048` seconds!):
```tsx
/* REMOTION_CONFIG { "fps": 30, "durationInFrames": 2048, "width": 1080, "height": 1920 } */
```
Also export your root component with `export default function WhiteboardShortName()` (never name it `MyVideo`, and never call `registerRoot`).

### Rule 3 — UUID Link Scanner (`check-asset-links.ts`)
Before rendering, the app scans the entire code string with:
`/asset-url\?id=([0-9a-f-]{36})|['"`]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})['"`]/gi`
Every matched UUID must exist in Supabase `assets` with a valid `storage_path` or `inline_content`.
- **Never** put example/placeholder UUIDs in comments or strings.
- **Always** use the permanent Hub URL format: `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=<UUID>` (never paste signed S3/Supabase storage redirect URLs).

### Rule 4 — No `backdropFilter` & Frame-Deterministic Math Only
- Never use `backdropFilter` / `-webkit-backdrop-filter` (GPU-less Chrome on AWS Lambda software-blurs every frame and times out).
- Never use `useState`, `useEffect`, `setTimeout`, CSS `transition`/`animation`, or unseeded `Math.random()`. Drive everything from `useCurrentFrame()`, `interpolate(..., { extrapolateLeft: "clamp", extrapolateRight: "clamp" })` with **strictly monotonic** `inputRange` arrays, and `spring()`.

### Rule 5 — Whiteboard MP4 Clips ONLY, Speed-to-Fit Pacing & Muted/Quiet Pencil Sound
1. **Use ONLY the `.mp4` `whiteboard-clip` assets — NEVER `.png` stills:** Every rendered `whiteboard-clip` MP4 already contains both the realistic hand-drawing animation (`0 → draw_seconds`) AND the full-color artwork payoff settling in and holding (`draw_seconds → duration_seconds`, where `hold_seconds ≈ 1.0s`). Do not put the source `.png` images in the Remotion composition.
2. **Never cut an MP4 clip short — speed up or slow down (`playbackRate`) to fit the beat:** If you cut a clip early, you lose the full-color payoff at the end! Instead, read each clip's exact `duration_seconds` from the manifest and stretch/compress it smoothly across `sceneDuration` (`end - start`):
   ```ts
   const playbackRate = Number(((clipDurationSeconds - 0.08) / sceneDurationSeconds).toFixed(4));
   ```
   - Stopping `0.08s` (~2 frames) shy of `clipDurationSeconds` lands right inside the clip's `1.0s` final colored hold, guaranteeing: (a) 100% of the drawing + full-color reveal plays before the cut, and (b) `<OffthreadVideo>` never hits EOF early or flashes blank on the last frame!
3. **Mute or heavily reduce built-in pencil sound:** `whiteboard-clip` MP4s bake in pencil-scribble audio (`meta.drawing_sound: true`) that is too loud at `1.0` and interferes with voiceover and SFX. Always set `muted` or whisper-low `volume={0.03}` on every whiteboard `<OffthreadVideo>` so the voiceover and intentional SFX stay crystal clear.
4. **Local vs. Global Frames:** Inside `<Sequence from={startFrame} durationInFrames={durFrames}>`, `useCurrentFrame()` starts at **`0`**. Keep word-timed `Captions` and `ProgressBar` mounted at the **root** `<AbsoluteFill>` so global word timestamps (`t = frame / fps`) stay frame-accurate without offset bugs.

### Rule 6 — Word-Timed Captions, Cache-Busting & Shorts Safe Zones (`1080×1920`)
- Place captions centered around **`bottom: ~295px`** (well above YouTube Shorts bottom UI and inside the clean bottom margin of our vertical illustrations), keeping `≥ 56px` horizontal margin.
- **Zero-Overlap Caption Windows:** Never use a naive fixed `+ 0.16s` overhang on `.find()`, or Group A will stay onscreen while Group B's first word is already being spoken! Always cap each phrase's end against the next phrase's start:
  ```ts
  const winEnd = Math.min(g.end + 0.2, nextStart - 0.01);
  ```
  And compute a single `activeWordIdx` (latest word where `t >= word.s - 0.03`) so two adjacent words never highlight simultaneously.
- **Top-of-File Quick Knobs:** Always expose `SHOW_CAPTIONS`, `PENCIL_CLIP_VOLUME` (`0.03` default, `0` to mute), and `MUSIC_BASE_VOLUME` (`0.065`) at the very top of the `.tsx` file for 1-second tweaking in `/playground`.
- **`fetch_page` Manifest Cache-Busting Trap:** When re-fetching `project-manifest` later in a session to check `whiteboard-clip` readiness, append a query cache-buster (`&t=1`, `&t=2`, etc.) and verify `generated_at` at the bottom of the JSON so tool-level URL caching never returns a stale `"queued"`/`"rendering"` snapshot!

---

## 5. Verified Shared-Library Audio Palette (Permanent Hub URLs)

Base prefix: `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=`

### Clean UI, Motion & Storytelling SFX (`shared-library`)
| Cue Name | UUID | Duration | Best Use in Our Shorts |
|---|---|---|---|
| `whoosh-soft.mp3` | `8000d709-85ee-4aa4-aad0-9fc84130d93b` | `0.68s` | Clean section transitions / sliding into brand UI |
| `whoosh-wind.mp3` | `e4e47763-4766-4814-be90-75961922c4ea` | `1.20s` | Softer airy sweep on big mood shifts |
| `pop-reveal.mp3` | `c52d697f-f404-484e-881d-0349bc9d3b69` | `0.48s` | Thought bubbles, cards, or search results popping in |
| `ui-click-soft.mp3` | `b4bb2b99-a6c9-42f3-b3d6-816cca355aad` | `0.48s` | Search button click / quiz option highlight |
| `ui-toggle-on.mp3` | `aabeb8f0-a7f1-4ab0-ad37-96400b3f90f6` | `0.60s` | Verified badge / checkmark activation |
| `ui-send.mp3` | `ecb7cce6-2edf-4a4c-9f3f-4bacd2c07c30` | `0.60s` | Submitting search query / connecting online |
| `keys-typing-soft.mp3` | `bd282333-3e72-45c7-8dad-b8809f4bf2db` | `2.20s` | Typing `"CoreAge RX"` into the search bar |
| `chime-reward.mp3` | `e0021584-0f5b-4f03-9847-7798617996d4` | `0.88s` | Positive payoff ("good news", doctor connected, finale) |
| `sparkle-soft.mp3` | `16d0b9a2-6984-4a90-ad8d-41be83b4f0df` | `0.88s` | Fat shrinking / healthy sparkling organs reveal |
| `stamp-hit.mp3` | `72187c30-49d0-4a52-821c-ae1cf92be0be` | `0.60s` | Myth busted ("can't target belly fat" / red X) |
| `clock-tick-soft.mp3` | `4205bf00-25d2-457b-a974-07049914196a` | `2.20s` | Quiz thinking beat ("Pick one in your head") or 10-min timer |
| `riser-soft.mp3` | `377b15fe-2f65-42df-9c9a-0830ea894bf9` | `1.36s` | Gentle build right before "Here's the line I promised" |
| `impact-soft.mp3` | `599a8103-6cc7-4b36-8b2c-159af900165a` | `1.00s` | Landing the promised payoff line |

### Underscore Music Beds (`shared-library` — play quiet ~`volume={0.07}`–`0.10` under voiceover)
| Track Name | UUID | Duration | Mood |
|---|---|---|---|
| `docu-pluck.mp3` | `f4a1ed94-671d-4de6-ba60-43370bfafe68` | `63.03s` | Curious, warm Vox/NYT pizzicato & marimba explainer bed |
| `lofi-warm.mp3` | `32cc3259-0b65-4218-b798-45a790861aa1` | `63.03s` | Cozy, friendly Rhodes & soft beat |
| `tech-pulse.mp3` | `6352a623-f2b1-490f-a85c-76c4eb683b34` | `63.03s` | Clean modern forward-moving pulse |
| `ambient-pad.mp3` | `5592d78e-4167-4d4d-88b9-4be5d3b2522c` | `63.03s` | Calm airy pad, zero drums |

*(Note: If a short exceeds `63.0s` — like `68.24s` — add `loop` to `<Audio src={MUSIC} loop volume={...} />` and fade out gently over the final `1.2s`!)*

---

## 6. Living Production Memory (Keep Updating as We Progress)

### Channel & Brand Constants
- **Hub Slug:** `whiteboard`
- **Primary Brand Partner:** **CoreAge RX** (`CoreAge RX` — online telehealth platform connecting patients with licensed U.S. doctors for modern weight management & medical guidance).
  - **Visual rule for CoreAge RX beats:** Always build a dedicated, high-polish coded UI animation in Remotion (browser/search bar typing `"CoreAge RX"` → animated cursor click → clean medical platform screen showing verified U.S. doctors online, status pills, and smooth spring entrances).
  - **AssemblyAI Phonetic Trap:** AssemblyAI frequently transcribes `"CoreAge RX"` as `"Courage RX"` or `"Core Age RX"`. Always inspect the transcript and normalize the brand spelling to **`CoreAge RX`** in both captions and UI cards!
- **Signature Quiz Participation Beat (`3 → 2 → 1` Countdown):** Whenever the script asks the viewer a question like *"Pick one in your head"*, add a tactile **`3 → 2 → 1`** countdown animation (pulsing numeral + draining SVG ring + synchronized `clock-tick-soft` / `ui-click-soft` ticks) before the reveal! If the natural voiceover silence gap is `< 1.5s`, cleanly split `<Audio src={VOICE_URL} />` inside AssemblyAI's natural silence cut (`<Sequence durationInFrames={splitFrame}><Audio src={VOICE_URL} /></Sequence>` + `<Sequence from={splitFrame + extraFrames}><Audio src={VOICE_URL} startFrom={splitFrame} /></Sequence>`) and shift post-pause timestamps by `PAUSE_SHIFT` seconds so the `3, 2, 1` countdown feels genuinely playable and unhurried!
- **Signature Character Look:** Established from `s01-big-meal.png` and perfected across `coreagerxshort2` (`scene-01-organ-wrap.png` through `scene-14-organ-fat-shrinks-cta.png` in `whiteboard/coreagerxshort2/scenes/`): cute round-headed white-bodied bald doodle cast, single clean black head outline, tiny black dot eyes, expressive body language, dressed in flat sky-blue, mint-green, lavender, warm-yellow, and soft-coral clothes.

### Project Log — `coreagerxshort2` (Completed)
- **Project ID:** `b0e15b2a-a73b-4d66-8d61-7f5e59879ef3`
- **Voiceover Asset:** `fd103c47-1e02-40f8-9f8e-810686fe62c2` (`68.24s`, `2048` frames at `30fps`, speech `0.256s – 67.870s`)
- **Final Composition File:** `whiteboard/coreagerxshort2/CoreAgeRxShort2.tsx` (also delivered directly in chat for copy-paste into `/playground`)
- **Topic:** Visceral (organ-wrapping) belly fat — why crunches don't spot-target it, the 3 small repeatable habits that work (10-min post-meal walks, 6+ hrs sleep, protein at every meal), online U.S. doctor guidance via **CoreAge RX**, and the promised payoff ("you don't need to punish yourself — you need small habits you can repeat").
- **Rendered `whiteboard-clip` MP4 Assets Used in Video (ZERO `.png` files referenced in TSX!):**
  1. `0.00s – 4.40s` (`4.40s`) · `whiteboard-scene-01-organ-wrap.mp4` → `19fc584d-e522-4ff5-ba7c-aee542b77f24` (`9.76s` clip, `2.20x` rate)
  2. `4.40s – 8.05s` (`3.65s`) · `whiteboard-scene-02-secret-last-line.mp4` → `f26e2e88-a3b3-4032-9e3d-5fe7197abd0c` (`6.88s` clip, `1.86x` rate)
  3. `8.05s – 11.55s` (`3.50s`) · `whiteboard-scene-03-not-pinchable.mp4` → `48d7d438-de62-43ed-8bc9-d9c6752cb459` (`7.07s` clip, `2.00x` rate)
  4. `11.55s – 14.35s` (`2.80s`) · `whiteboard-scene-04-deep-danger.mp4` → `427d19bb-9fed-4956-8bc2-1528b11622f0` (`7.49s` clip, `2.65x` rate)
  5. `14.35s – 18.55s` (`4.20s`) · `whiteboard-scene-05-first-to-shrink.mp4` → `95cb64a1-384f-45d0-9844-859dc2f684d3` (`6.58s` clip, `1.55x` rate)
  6. `18.55s – 24.65s` (`6.10s`) · `whiteboard-scene-06-three-choices.mp4` → `c4a26bb9-10c6-4368-98b5-8719d9db192f` (`8.01s` clip, `1.30x` rate + live quiz pill overlay)
  7. `24.65s – 28.10s` (`3.45s`) · `whiteboard-scene-07-crunches-myth.mp4` → `5978f9aa-8ddd-485b-96a6-55021c2d37a7` (`6.00s` clip, `1.72x` rate)
  8. `28.10s – 33.50s` (`5.40s`) · `whiteboard-scene-08-walk-after-meals.mp4` → `1e52f02d-ef13-4938-bf5c-a02dd29e4afa` (`9.84s` clip, `1.81x` rate)
  9. `33.50s – 39.10s` (`5.60s`) · `whiteboard-scene-09-muscles-soak-sugar.mp4` → `2ff21972-b673-4a62-820c-015c87dd6b30` (`7.80s` clip, `1.38x` rate)
  10. `39.10s – 45.00s` (`5.90s`) · `whiteboard-scene-10-sleep-under-six.mp4` → `10d2148f-d1d8-4317-979d-bdfba9f2a93b` (`8.48s` clip, `1.42x` rate)
  11. `45.00s – 50.70s` (`5.70s`) · `whiteboard-scene-11-protein-every-meal.mp4` → `31c85763-77f3-4e2d-b62c-5ad1ec6ab9d3` (`9.27s` clip, `1.61x` rate)
  - *(Code Beat)* `50.70s – 57.50s` (`6.80s`) · **CoreAge RX Interactive Search → U.S. Doctors Online UI** (custom Remotion TSX with character-matched inline-SVG doodle doctor avatars, search typing, click ripple, and verified online pills)
  12. `57.50s – 60.95s` (`3.45s`) · `whiteboard-scene-12-no-punishment.mp4` → `b05d6042-9b89-4f84-8295-a8bdf0f63df8` (`6.69s` clip, `1.92x` rate)
  13. `60.95s – 64.25s` (`3.30s`) · `whiteboard-scene-13-small-habits-loop.mp4` → `5908b3c7-6c21-4e24-9b1b-9946181d7769` (`6.56s` clip, `1.96x` rate)
  14. `64.25s – 68.26s` (`4.01s`) · `whiteboard-scene-14-organ-fat-shrinks-cta.mp4` → `11853cf0-c19a-4636-ab34-f338f3546ba1` (`10.07s` clip, `2.50x` rate)

### Project Log — `coreagerx3` (Completed)
- **Project ID:** `59cdcdcb-ed10-4f6c-99f9-7cb26af6a2df`
- **Voiceover Asset:** `76219d88-d891-441b-a022-40ffb23a05e7` (`36.76s` raw, split cleanly in silence at `21.867s` with `+2.033s` `3-2-1` participation pause + crisp fridge outro hold → `41.50s` / `1245` frames at `30fps`; normalized `"Courage RX"` → **`CoreAge RX`**)
- **Final Composition File:** `whiteboard/coreagerx3/CoreAgeRxShort3.tsx` (also delivered directly in chat for copy-paste into `/playground`)
- **Topic:** 10 everyday foods & drinks quietly feeding organ/visceral fat — the sneakiest one isn't even a food (**sugary drinks**, which hit fast and barely fill you up), **3 → 2 → 1** viewer countdown medallion right after *"Now, which one's sneakiest? Pick one in your head."* (`21.68s – 24.14s`), custom **CoreAge RX** online U.S. doctors UI (`29.65s – 34.10s`), and practical swap + *"Now go open your fridge."* closer.
- **Rendered `whiteboard-clip` MP4 Assets Used in Video (ZERO `.png` files referenced in TSX, all `playbackRate < 4.0x` for smooth browser + Lambda playback!):**
  1. `0.00s – 4.45s` (`4.45s`) · `whiteboard-scene-01-sneaky-foods-feeding-organs.mp4` → `5832261f-ba4e-465b-94cf-2342fd54589c` (`10.53s` clip, `2.35x` rate)
  2. `4.45s – 7.30s` (`2.85s`) · `whiteboard-scene-02-sneakiest-not-food.mp4` → `22cde04a-68fd-477c-aeaa-6fc5a0df6b71` (`6.29s` clip, `2.18x` rate)
  3. `7.30s – 11.22s` (`3.92s`) · `whiteboard-scene-03-savory-culprits-part1.mp4` → `4232fdda-f244-45c0-befd-f102f1c00fff` (`9.28s` clip, `2.35x` rate)
  4. `11.22s – 14.80s` (`3.58s`) · `whiteboard-scene-04-sweet-fastfood-culprits-part2.mp4` → `d34bc938-39d5-48f1-b927-ad56dee5914d` (`9.80s` clip, `2.72x` rate)
  5. `14.80s – 18.90s` (`4.10s`) · `whiteboard-scene-05-belly-link-and-daily-beer.mp4` → `0e5bf1ac-0c98-4cae-af7e-56d858891712` (`12.59s` clip, `3.05x` rate)
  6. `18.90s – 24.18s` (`5.28s`) · `whiteboard-scene-06-pick-sneakiest-quiz.mp4` → `54eeccfa-5c67-49cc-a03b-8e10d349430a` (`6.27s` clip, `1.17x` rate + `3 → 2 → 1` pulsing medallion & draining SVG ring!)
  7. `24.18s – 26.95s` (`2.77s`) · `whiteboard-scene-07-sugary-drinks-reveal.mp4` → `bb2ec0f2-63ad-43ec-87f4-605c2a96d9a7` (`8.27s` clip, `2.96x` rate)
  8. `26.95s – 29.65s` (`2.70s`) · `whiteboard-scene-08-liquid-sugar-hits-fast.mp4` → `9d2af250-a841-4d80-b43d-d9e2ff35f1c2` (`8.72s` clip, `3.20x` rate)
  - *(Code Beat)* `29.65s – 34.10s` (`4.45s`) · **CoreAge RX Interactive Search → U.S. Doctors Online UI** (custom Remotion TSX)
  9. `34.10s – 37.30s` (`3.20s`) · `whiteboard-scene-09-swap-one-thing.mp4` → `4022f712-586d-4def-8942-d18e6d90d058` (`5.49s` clip, `1.69x` rate)
  10. `37.30s – 41.50s` (`4.20s`) · `whiteboard-scene-10-go-open-your-fridge.mp4` → `f827f5fa-eec1-4933-b48c-96dbe74686d6` (`16.54s` clip, `3.92x` rate — kept `< 4.0x` with a crisp end hold so Chromium HTML5 `<video>` plays smoothly!)

### Project Log — `coreagerx4` (Completed)
- **Project ID:** `172a5db3-c0e4-4f67-b783-aa9d9540214a`
- **Voiceover Asset:** `94618780-a6af-4758-8d8d-27d9ab967591` (`37.88s` raw WAV, split cleanly in silence at `22.600s` with `+1.900s` `3-2-1` participation pause + crisp crescent-moon/checkmark outro hold → `41.00s` / `1230` frames at `30fps`; normalized `"CorageRx"` → **`CoreAge RX`**)
- **Final Composition File:** `whiteboard/coreagerx4/CoreAgeRxShort4.tsx` (also delivered directly in chat for copy-paste into `/playground`)
- **Topic:** 5 evening/nighttime habits quietly feeding visceral organ fat — (1) eating late makes people hungrier, (2) nightcaps/alcohol linked to belly fat, (3) scrolling in bed cuts into sleep, (4) short sleep quiz (`3 → 2 → 1` countdown medallion `22.38s – 24.84s` → **under 6 hours**), (5) the easiest fix: **10-minute after-dinner walk** to ease blood sugar spikes, custom **CoreAge RX** U.S. doctors UI (`33.02s – 37.02s`), and *"Just pick one. So, what are you doing tonight?"* closer.
- **Rendered `whiteboard-clip` MP4 Assets Used in Video (ZERO `.png` files referenced in TSX, all `playbackRate` `0.76x – 3.52x`!):**
  1. `0.00s – 3.80s` (`3.80s`) · `whiteboard-scene-01-tonight-feeding-organ-fat.mp4` → `9aaa56bf-3a1b-4a88-be7a-a38e1713e4e7` (`9.82s` clip, `2.56x` rate)
  2. `3.80s – 6.95s` (`3.15s`) · `whiteboard-scene-02-five-habits-easiest-fix.mp4` → `0d47a80f-135a-404e-8bed-cab71bd14968` (`6.91s` clip, `2.17x` rate)
  3. `6.95s – 11.00s` (`4.05s`) · `whiteboard-scene-03-habit1-eating-late-hungrier.mp4` → `3c72078f-8380-4c61-8891-2910d3deead4` (`8.47s` clip, `2.07x` rate)
  4. `11.00s – 14.85s` (`3.85s`) · `whiteboard-scene-04-habit2-nightcaps-belly-fat.mp4` → `26eb3a24-7c54-4793-ba22-df2857ceabc4` (`7.03s` clip, `1.81x` rate)
  5. `14.85s – 18.20s` (`3.35s`) · `whiteboard-scene-05-habit3-scrolling-cuts-sleep.mp4` → `1be6a53c-6e01-48ed-8a88-4882d785e440` (`7.06s` clip, `2.08x` rate)
  6. `18.20s – 24.86s` (`6.66s`) · `whiteboard-scene-06-habit4-short-sleep-quiz.mp4` → `ea66357b-1aa4-45ac-9f8c-8c9945db4fff` (`5.16s` clip, `0.76x` rate + `3 → 2 → 1` sleep hours countdown medallion!)
  7. `24.86s – 27.25s` (`2.39s`) · `whiteboard-scene-07-under-six-hours-belly-fat.mp4` → `227e9e24-b00c-4f53-9432-f044c7731986` (`7.59s` clip, `3.14x` rate)
  8. `27.25s – 30.55s` (`3.30s`) · `whiteboard-scene-08-habit5-skipping-dinner-walk.mp4` → `cca6952a-4aa6-4936-b2af-3d65a10731b7` (`8.88s` clip, `2.67x` rate)
  9. `30.55s – 33.02s` (`2.47s`) · `whiteboard-scene-09-ten-min-walk-eases-spikes.mp4` → `d9139e59-59f1-4c01-9d0e-48899554f2b9` (`8.78s` clip, `3.52x` rate)
  - *(Code Beat)* `33.02s – 37.02s` (`4.00s`) · **CoreAge RX Interactive Search → U.S. Doctors Online UI** (custom Remotion TSX)
  10. `37.02s – 41.00s` (`3.98s`) · `whiteboard-scene-10-pick-one-tonight-closer.mp4` → `aceb17ad-622d-4bfb-a1e4-1b790046eb46` (`6.67s` clip, `1.66x` rate)

### Project Log — `coreagerx5` (Completed)
- **Project ID:** `fa2827c6-af0a-43f5-9b52-23954894204d`
- **Voiceover Asset:** `93cd2853-f655-48a7-ae4f-4e92b7bec363` (`40.40s` raw WAV, split cleanly in silence at `18.100s` with `+1.967s` `3-2-1` participation pause + crisp stress-gauge outro hold → `43.50s` / `1305` frames at `30fps`; split `"possible—stay"` into `"possible."` + `"Stay"` and normalized `"CoreageRx"` → **`CoreAge RX`**)
- **Final Composition File:** `whiteboard/coreagerx5/CoreAgeRxShort5.tsx` (also delivered directly in chat for copy-paste into `/playground`)
- **Topic:** Cortisol & visceral organ fat — why zero cortisol isn't possible (you need it to live), how months of stress steer fat to organs, plot-twist quiz (*Hard workouts or bad sleep?* → `3 → 2 → 1` countdown `17.88s – 20.34s` → **Both can!**), why rest days + full sleep + walking + lifting shrink visceral fat, custom **CoreAge RX** U.S. doctors UI (`27.90s – 32.95s`), promised payoff (*"No cortisol hack melts visceral fat. Small habits slowly shrink it."*), and *"So, how stressed are you right now?"* stress-meter closer.
- **Rendered `whiteboard-clip` MP4 Assets Used in Video (ZERO `.png` files referenced in TSX, all `playbackRate` `0.62x – 2.87x`!):**
  1. `0.00s – 3.80s` (`3.80s`) · `whiteboard-scene-01-stress-steering-organ-fat.mp4` → `06e29fad-58fe-4f01-b2e8-887908a00fca` (`8.64s` clip, `2.25x` rate)
  2. `3.80s – 7.00s` (`3.20s`) · `whiteboard-scene-02-zero-cortisol-impossible.mp4` → `bd760c40-c595-4e5a-b8d4-b81542cc9336` (`7.25s` clip, `2.24x` rate)
  3. `7.00s – 9.12s` (`2.12s`) · `whiteboard-scene-03-need-cortisol-to-live.mp4` → `f1349bea-2fd3-4c57-a380-70ac84d960eb` (`4.48s` clip, `2.08x` rate)
  4. `9.12s – 13.15s` (`4.03s`) · `whiteboard-scene-04-stressed-for-months-organs.mp4` → `6881a04a-58aa-496b-add4-7ececb85b822` (`11.64s` clip, `2.87x` rate)
  5. `13.15s – 20.38s` (`7.23s`) · `whiteboard-scene-05-workouts-or-sleep-quiz.mp4` → `74c1253d-3ae9-4745-897b-3f4e48f2dd97` (`4.59s` clip, `0.62x` rate + `3 → 2 → 1` A/B countdown medallion!)
  6. `20.38s – 24.60s` (`4.22s`) · `whiteboard-scene-06-both-can-rest-and-sleep.mp4` → `c3f6b4a3-3892-4e61-8152-2404e284069c` (`7.82s` clip, `1.83x` rate)
  7. `24.60s – 27.90s` (`3.30s`) · `whiteboard-scene-07-walking-and-lifting-shrink.mp4` → `14b3c50a-e9a6-455c-b9cf-4f170bbdc320` (`7.80s` clip, `2.34x` rate)
  - *(Code Beat)* `27.90s – 32.95s` (`5.05s`) · **CoreAge RX Interactive Search → U.S. Doctors Online UI** (custom Remotion TSX)
  8. `32.95s – 37.25s` (`4.30s`) · `whiteboard-scene-08-no-cortisol-hack-myth.mp4` → `12ab601d-d9d6-49d9-baa8-294bb782ba17` (`5.94s` clip, `1.36x` rate)
  9. `37.25s – 39.95s` (`2.70s`) · `whiteboard-scene-09-small-habits-slowly-shrink.mp4` → `2e6ce90b-8846-48c4-9685-502d168da994` (`6.41s` clip, `2.34x` rate)
  10. `39.95s – 43.50s` (`3.55s`) · `whiteboard-scene-10-how-stressed-right-now.mp4` → `72e4a57c-7a59-4f66-ae57-c3e56684731d` (`5.49s` clip, `1.52x` rate)

### Project Log — `impressive-videos-for-client-aquisition` (Completed)
- **Project ID:** `a8b59d0d-5ba4-4848-abfb-181f82867405`
- **Winning Voiceover Asset:** `"Generated Audio November 12, 2026 - 9_23PM.wav"` → `d5e75d69-66d8-4a0c-a811-e9efa578ec2d` (`71.96s` WAV, 186 words `0.272s – 71.750s`, saved in `whiteboard/impressive-videos-for-client-aquisition/transcript-9_23PM.json`; normalized `"147,"` → `"$147,"` and `"497."` → `"$497."`; final composition `73.20s` = `2196` frames @ `30fps`, `1080×1920`)
- **Final Composition File:** `whiteboard/impressive-videos-for-client-aquisition/ClientAcquisitionShowcase.tsx` (ingested into Hub via `agent-create` with `kind=code&role=composition`)
- **Creative Direction & Reusable Flagship Techniques:**
  - **14-Beat Hybrid Showcase (`1080×1920`, Brand-Neutral):** Combines 10 hand-drawn whiteboard scenes + SVG/pill micro-overlays (including a live Open-Loop progress bar in Scene 05 hitting `100%` on `"finished."`) with 4 bespoke Remotion motion-graphic showcase scenes (`GameChangerPivotScene`, `DoneForYouPipelineScene`, `PricingPackagesScene`, `LaunchBatchCtaScene`).
  - **Live Whiteboard-Inside-UI Showcase:** `DoneForYouPipelineScene` embeds a live muted `OffthreadVideo` (`whiteboard-scene-03`, `2.8x`) inside Step 04 (`Whiteboard Animation`) so prospects literally watch the drawing engine render inside the 48-hour workflow card.
  - **Dual-Act Music Crossfade (`>63s` Videos):** Because `shared-library` music tracks are `63.033s`, crossfading `docu-pluck` (`0.00s – 49.10s`) into `tech-pulse` (`47.40s – 73.20s`, `25.80s` played) elevates energy right at the Done-For-You service reveal AND avoids any `63.03s` audio loop seam.
  - **Full-Frame Runtime Verification:** Bundling with `esbuild` in `/tmp` and executing all `2,196` frames (`0..2195`) against a lightweight `remotion` mock catches any dynamic `interpolate()` monotonicity or `NaN` bugs before upload.
- **Rendered `whiteboard-clip` MP4 Assets Used in Video (ZERO `.png` files referenced in TSX, all `playbackRate` `1.39x – 2.94x`!):**
  1. `0.00s – 4.55s` (`4.55s`) · `whiteboard-scene-01-automatic-brain-magnet.mp4` → `e5e0a43a-72b2-4c87-a99c-62109e622b82` (`7.28s` clip, `1.58x` rate)
  2. `4.55s – 9.10s` (`4.55s`) · `whiteboard-scene-02-scrolling-past-talking-heads.mp4` → `943d1616-40e4-436e-81fd-16696d93a4b6` (`11.16s` clip, `2.44x` rate)
  3. `9.10s – 13.55s` (`4.45s`) · `whiteboard-scene-03-stopped-step-by-step-idea.mp4` → `95fd92d4-dfd4-43db-b065-7041a9f656a1` (`9.37s` clip, `2.09x` rate; also reused muted at `2.80x` inside `DoneForYouPipelineScene` Step 04)
  4. `13.55s – 16.65s` (`3.10s`) · `whiteboard-scene-04-psychologist-open-loop.mp4` → `006d967e-1ea8-4bba-aa63-5c92c9db0980` (`6.22s` clip, `1.98x` rate)
  5. `16.65s – 23.05s` (`6.40s`) · `whiteboard-scene-05-brain-sticks-until-finished.mp4` → `a583227a-4ddf-4d8d-b6e0-4fa59d2a2816` (`9.78s` clip, `1.52x` rate + Open-Loop `100%` completion bar)
  6. `23.05s – 27.55s` (`4.50s`) · `whiteboard-scene-06-complex-offer-hard-to-explain.mp4` → `40119bcf-c04f-4585-a369-2f6c7bba35e0` (`11.12s` clip, `2.45x` rate)
  - *(Code Beat 1)* `27.55s – 29.65s` (`2.10s`) · **`GameChangerPivotScene`** (*"This changes everything."* — SVG knot → razor-sharp emerald clarity arrow + stacked kinetic hero typography; bottom captions suppressed during hero text)
  7. `29.65s – 34.55s` (`4.90s`) · `whiteboard-scene-07-begging-camera-bored-viewer.mp4` → `e4c2b280-0d33-4893-9729-2cbb3d61330d` (`9.57s` clip, `1.94x` rate)
  8. `34.55s – 38.85s` (`4.30s`) · `whiteboard-scene-08-visually-break-down-offers.mp4` → `be50a9ac-cf4a-4ddf-b8ed-ef2352aaf68a` (`9.95s` clip, `2.30x` rate)
  9. `38.85s – 44.35s` (`5.50s`) · `whiteboard-scene-09-cold-prospect-ready-to-buy.mp4` → `df708bb7-f260-4a49-8969-add489240b16` (`7.74s` clip, `1.39x` rate)
  10. `44.35s – 47.95s` (`3.60s`) · `whiteboard-scene-10-we-handle-entire-process.mp4` → `739ca1d8-b0fc-49e3-9481-87d879d17035` (`10.68s` clip, `2.94x` rate)
  - *(Code Beat 2)* `47.95s – 56.85s` (`8.90s`) · **`DoneForYouPipelineScene`** (Stage A URL typing & click → Stage B 4-step pipeline `Research`, `Scriptwriting`, `Voiceover` waveform, `Whiteboard Animation` live embedded `OffthreadVideo` + `⚡ 48 HOURS` SLA banner)
  - *(Code Beat 3)* `56.85s – 68.15s` (`11.30s`) · **`PricingPackagesScene`** (`$97` 5 Custom Shorts · `$147` 10-Min YouTube Explainer · `$497` 30 White-Label Shorts stacked comparison with word-synced price locks)
  - *(Code Beat 4)* `68.15s – 73.20s` (`5.05s`) · **`LaunchBatchCtaScene`** (`DoodleFounderMascot` + fanned 5-Shorts deck + Option 1 `"Reply to this message"` + Option 2 `"Click the link"` cursor click + `$97 / $147 / $497` freeze-frame summary strip)

### Project Log — `new-coreagerx` (COMPLETE — `CoreAgeRxMuscleShort.tsx`, `84.80s`, `2544` frames)
- **Project ID:** `5f4992a0-bc75-4ea1-ba34-cba444f3b47b`
- **Voiceover Asset:** `"Generated Audio November 14, 2026 - 12_13AM.wav"` → `daefd336-4538-4048-ab67-6658c34b7b16` (`83.64s` WAV, 229 words `0.176s – 83.287s`, saved in `whiteboard/new-coreagerx/transcript-12_13AM.json`; normalized AssemblyAI `"Core" + "HRX"` → **`"CoreAge" + "RX"`** at `64.996s` and `82.469s`; compose to `84.80s` = `2544` frames @ `30fps`, `1080×1920`, with dual-act music crossfade so neither `63.03s` track hits a loop seam!)
- **Topic & 14-Beat Hybrid Architecture:** Preserving lean muscle during weight loss & GLP-1 treatment — why losing weight isn't automatically fat-only, why muscle matters for daily strength & metabolic health, how GLP-1s affect appetite & stomach emptying, clinical research on lean body mass reductions, looking beyond the scale (`nutrition + protein + resistance training`), consulting a qualified healthcare provider, **CoreAge RX** online telehealth platform + licensed provider personalized evaluation (`not one-size-fits-all`), whole-health bookend payoff, and **CoreAge RX** end-card CTA.
- **10 Uploaded Vertical PNG Source Assets in `new-coreagerx` (NEVER reference these PNG UUIDs in TSX — ONLY use the rendered `whiteboard-clip` MP4 UUIDs!):**
  1. `0.00s – 4.15s` (`4.15s`) · `scene-01-weight-loss-deserves-attention.png` → `3a4f63a9-537f-402e-a5ee-eec8e3c283b2`
  2. `4.15s – 8.60s` (`4.45s`) · `scene-02-not-just-fat-alone.png` → `ebb5f1fa-d25a-47af-af42-08c73bfd7873`
  3. `8.60s – 12.20s` (`3.60s`) · `scene-03-can-lose-muscle-too.png` → `732ff856-ff04-4c27-91de-0843f197a776`
  4. `12.20s – 16.98s` (`4.78s`) · `scene-04-beyond-looking-athletic-strength.png` → `92f9968f-9ce2-4fc5-b971-4d0f7a74f0e2`
  5. `16.98s – 21.65s` (`4.67s`) · `scene-05-everyday-life-metabolic-engine.png` → `68e89796-75a8-4e65-8c0d-0f5cdffc6540`
  - *(Code Beat 1)* `21.65s – 24.30s` (`2.65s`) · **`InterestingPivotScene`** (*"Now, here's where things get interesting."* — kinetic chapter turn + Fat vs. Muscle balance + `GLP-1` spotlight pill)
  6. `24.30s – 31.80s` (`7.50s`) · `scene-06-glp1-appetite-and-stomach-pace.png` → `2fdd343e-9401-4760-b674-db103fdde09f`
  7. `31.80s – 38.95s` (`7.15s`) · `scene-07-quality-and-amount-of-weight-lost.png` → `803f3aa4-0899-48ea-8a47-e1ad92dea35e`
  - *(Code Beat 2)* `38.95s – 50.00s` (`11.05s`) · **`ResearchBeyondScaleScene`** (Stage A `38.95–45.35s`: Clinical Research Body-Composition Chart `Body Fat` + `Lean Body Mass` reductions & `NOT JUST BODY FAT` stamp; Stage B `45.35–50.00s`: `Beyond the Number on the Scale` 3-pillar health dashboard)
  8. `50.00s – 57.35s` (`7.35s`) · `scene-08-nutrition-protein-resistance-shield.png` → `23eb165d-7b98-49a0-825d-d6d9d8c7ebf1`
  9. `57.35s – 64.75s` (`7.40s`) · `scene-09-questions-with-healthcare-provider.png` → `cec1a4e1-6198-4022-878d-71ad3ca52ac5`
  - *(Code Beat 3)* `64.75s – 76.10s` (`11.35s`) · **`CoreAgeRxTelehealthScene`** (Stage A `64.75–70.00s`: typing `"CoreAge RX"` → click → online weight management healthcare platform; Stage B `70.00–76.10s`: `NOT ONE-SIZE-FITS-ALL` + 1-on-1 Licensed Provider personalized appropriateness review)
  10. `76.10s – 81.50s` (`5.40s`) · `scene-10-care-for-health-along-the-way.png` → `4460dfa7-2492-484a-9298-f67c0e71cd10`
  - *(Code Beat 4)* `81.50s – 84.80s` (`3.30s`) · **`CoreAgeRxOutroCard`** (*"Learn more about CoreAge RX."* — authoritative **CoreAge RX** brand lockup + animated cursor CTA click + clinical clarity strip)



- **Phase 2 composition:** `whiteboard/new-coreagerx/CoreAgeRxMuscleShort.tsx`; esbuild bundle syntax check passed with React and Remotion externalized. Ten ready `whiteboard-clip` MP4s below are used in the composition; playback rates are approximately `(duration - 0.08) / scene duration`:
  1. `e970164e-1b57-455d-abc2-4ee498f4c332` (8.23s, ~1.96x)
  2. `f57e1b7b-ca8e-4595-b7bf-8ed3833b96ee` (7.55s, ~1.68x)
  3. `15d45a0e-f1c1-4f5b-9b7e-a82d7b196cbf` (5.77s, ~1.58x)
  4. `908dc58c-6a26-4599-a5bb-b3a46bbc0b54` (7.89s, ~1.63x)
  5. `c45b611d-2c37-4e13-b882-670705a5c7e4` (8.34s, ~1.77x)
  6. `9cc198f7-0e43-4633-b737-4e4b056a3ffc` (7.20s, ~0.95x)
  7. `e7eaf133-968c-40d8-8529-130c91f78f4f` (8.59s, ~1.19x)
  8. `01cd2172-eb22-4411-9325-cd9f59f276d0` (10.23s, ~1.38x)
  9. `cfedf07e-4c28-4d8d-8a4d-68971485c0d7` (8.25s, ~1.10x)
  10. `6e5df87c-d9ca-48bf-bbac-b9a3ac2f6035` (8.90s, ~1.63x)
- **Audio and captions:** 229 timestamped words with highlighted keywords; original voiceover, 27 SFX cues, low-level pencil audio, and docu-pluck to tech-pulse music crossfade at 47–50s. The four coded scenes are detailed in the timeline above.
