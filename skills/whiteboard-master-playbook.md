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
4. **Pure `#FFFFFF` Background & Vertical Safe Zones:**
   - `9:16` portrait (`768×1376` / `1080×1920`).
   - Keep **generous pure `#FFFFFF` white margin around all sides, especially the bottom `20%`** so dynamic Shorts captions (`y ≈ 1500`) never cover character action.
5. **NO Baked-In Text / Words / Numbers:**
   - Never put English words, labels, or numbers inside generated images (letters trace poorly and clash with captions). Universal visual symbols (`?`, `!`, `✗`, `✓`, `★`, arrows, pie wedges on clocks, battery meters) read 10× faster and trace cleanly.

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

### Rule 5 — Whiteboard Clip Timing, Natural Hand Speed & Zero-Blank-Frame Hold
1. **Keep built-in drawing audio ON:** New `whiteboard-clip` MP4s include `meta.drawing_sound: true` (quiet marker foley synced to pen contact and silent during lifts/holds). **Do NOT add `muted`** to whiteboard `<OffthreadVideo>` clips and **do NOT layer duplicate scribble SFX** over them! (`render-video` automatically converts `<OffthreadVideo>` to streaming `<Video>` on Lambda.)
2. **Natural `playbackRate`:** Fit drawing duration to the spoken beat using `r = clamp(drawSeconds / targetDrawWindow, 0.70, 2.10)` so the female marker hand moves naturally.
3. **Prevent end-of-clip blanking on longer beats:** In Remotion, once a video clip reaches `clipDurationSeconds / playbackRate`, `<OffthreadVideo>` ends and unmounts! Whenever `sceneSeconds > (clipDurationSeconds / playbackRate) - 0.08`:
   - Render the static source PNG (`<Img src={sourceImageUrl} />`) in the exact same board box that `whiteboard-animate` uses (`8%` margin on `1080×1920` → `padding: 86px`, centered `objectFit: "contain"`, white `#ffffff` background) and reveal/hold it seamlessly as the clip finishes its hold, optionally adding a gentle `1.0 → 1.035` slow push-in so the frame stays alive until the cut!
4. **Local vs. Global Frames:** Inside `<Sequence from={startFrame} durationInFrames={durFrames}>`, `useCurrentFrame()` starts at **`0`**. Keep word-timed `Captions` and `ProgressBar` mounted at the **root** `<AbsoluteFill>` so global word timestamps (`t = frame / fps`) stay frame-accurate without offset bugs.

### Rule 6 — Word-Timed Captions & Shorts Safe Zones (`1080×1920`)
- Place captions centered around **`top: 1490px–1540px`** (`bottom: ~340px`), keeping `≥ 60px` horizontal margin (and clear of the right-hand YouTube Shorts icon rail on wide elements).
- Render crisp word-by-word active highlighting (e.g., clean dark charcoal/ink rounded pill or high-contrast card with the currently spoken word highlighted in vibrant brand indigo `#6366F1` or warm marker yellow `#FFD45E`, subtle `translateY(-2px)` pop on the active word, zero em-dashes).

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
- **Signature Character Look:** Established from `s01-big-meal.png` and perfected across `coreagerxshort2` (`scene-01-organ-wrap.png` through `scene-14-organ-fat-shrinks-cta.png` in `whiteboard/coreagerxshort2/scenes/`): cute round-headed white-bodied bald doodle cast, single clean black head outline, tiny black dot eyes, expressive body language, dressed in flat sky-blue, mint-green, lavender, warm-yellow, and soft-coral clothes.

### Project Log — `coreagerxshort2` (In Progress)
- **Project ID:** `b0e15b2a-a73b-4d66-8d61-7f5e59879ef3`
- **Voiceover Asset:** `fd103c47-1e02-40f8-9f8e-810686fe62c2` (`68.24s`, `2048` frames at `30fps`, speech `0.256s – 67.870s`)
- **Topic:** Visceral (organ-wrapping) belly fat — why crunches don't spot-target it, the 3 small repeatable habits that work (10-min post-meal walks, 6+ hrs sleep, protein at every meal), online U.S. doctor guidance via **CoreAge RX**, and the promised payoff ("you don't need to punish yourself — you need small habits you can repeat").
- **Uploaded Scene Image Assets (14 PNGs pushed, awaiting `whiteboard-clip` MP4 renders):**
  1. `0.00s – 4.40s` · `scene-01-organ-wrap.png` → `140fe5ac-afab-4222-97b1-52c53f9749b2`
  2. `4.40s – 8.05s` · `scene-02-secret-last-line.png` → `0feadaaf-0a2e-4bbe-b44e-370eb87ac3c1`
  3. `8.05s – 11.55s` · `scene-03-not-pinchable.png` → `42fe96df-a107-4670-ace6-2219d8ad1bb3`
  4. `11.55s – 14.35s` · `scene-04-deep-danger.png` → `ab3d3a77-63e2-422d-a7c1-4aee01cb37dd`
  5. `14.35s – 18.55s` · `scene-05-first-to-shrink.png` → `d5e4b63b-49c6-429e-8ad7-c17c176b55a2`
  6. `18.55s – 24.65s` · `scene-06-three-choices.png` → `b6f1a717-c3c0-42fa-be2f-480d3f211d5a`
  7. `24.65s – 28.10s` · `scene-07-crunches-myth.png` → `0bd5a871-9494-4e72-ae3d-b1ea8efa30dd`
  8. `28.10s – 33.50s` · `scene-08-walk-after-meals.png` → `71aafcb6-a033-4cd3-9414-b644518bff30`
  9. `33.50s – 39.10s` · `scene-09-muscles-soak-sugar.png` → `1cf384c2-97c7-44f2-ac45-94e3e38d25c2`
  10. `39.10s – 45.00s` · `scene-10-sleep-under-six.png` → `71a207ce-db75-46f0-91c9-21cb5c5b70d4`
  11. `45.00s – 50.70s` · `scene-11-protein-every-meal.png` → `3ca6d5ed-e118-4a63-a483-168acd0ce9c2`
  - *(Code Beat)* `50.70s – 57.50s` · **CoreAge RX Interactive Search → U.S. Doctors Online UI** (custom Remotion TSX)
  12. `57.50s – 60.95s` · `scene-12-no-punishment.png` → `eee3105d-def9-4325-bb71-9f24f01533ea`
  13. `60.95s – 64.25s` · `scene-13-small-habits-loop.png` → `08510d48-c829-477a-a076-b718ddf6b82c`
  14. `64.25s – 68.24s` · `scene-14-organ-fat-shrinks-cta.png` → `d8beb16e-d1c3-4cec-a254-56b851cb931d`
- **Next Step:** Once MP4 `whiteboard-clip` renders finish in Hub and user says `"continue"`, fetch manifest once, build the full single-file Remotion `.tsx` composition (with word-synced captions, CoreAge RX search/platform UI animation, subtle camera motion, and library SFX/music), deliver in chat, and log any final Remotion patterns learned right back here.
