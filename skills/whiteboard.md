---
name: whiteboard
description: Make a hand-drawn whiteboard video (short or long) from a voiceover — plan scenes from the transcript, generate bold line-art images, send them to the whiteboard-animate engine (it traces and draws them with a realistic pencil hand, paced to the voice, with captions), then render. Use in the Whiteboard hub or whenever the user asks for a whiteboard / hand-drawn / doodle explainer.
---

# Whiteboard video — from voiceover to finished drawing

The drawing itself is done by the **whiteboard-animate engine**, like transcription or cut-outs:
images in, finished Remotion composition out. Your job is the creative part: what to draw, and when.
Never hand-write stroke code yourself.

## How the system works
1. A voiceover lands in the project → it is transcribed automatically (word timings + caption lines).
2. You read the transcript and split it into **scenes** — one idea per drawing, usually one scene every 5–12 s
   (shorter for punchy shorts, longer for calm explainers; it's guidance, not a rule).
3. For each scene you generate one image (or use an uploaded one) — **bold line art** (rules below).
4. You call the engine once with all scenes + the voiceover. It traces every image into pen strokes, orders them,
   draws them with the pencil hand inside each scene's time window, crossfades between scenes, adds word-timed
   captions and the voice. It saves the result as a new code version in the project.
5. The user (or you) renders that version through the normal Render button → MP4.

## Step by step
1. `list_files` → find the voiceover (audio) and its transcript in the file analyses. No voiceover? Ask for one,
   or work from a script with explicit scene durations.
2. Propose the scene plan in chat: for each scene → start time (seconds, taken from the transcript word where that
   idea begins), the sentence it covers, and what will be drawn. Wait for a go-ahead before generating images
   (images cost credits).
3. Generate each image with `generate_image`. Prompt template (adapt the subject):
   > "Whiteboard line-art illustration of <subject>, thick black marker outlines on a pure white background,
   > simple clean shapes, no shading, no hatching, no gray, no text, no background details, centered,
   > generous white margin, <portrait 9:16 | landscape 16:9> composition"
   Name them `scene-01-<idea>`, `scene-02-…` so order is obvious. Wait until they appear in `list_files`.
4. Call `whiteboard_animate` with:
   - `scenes`: `[{ assetId, start }]` in story order (start = seconds into the voiceover; give all or none —
     without starts the engine shares the time by drawing complexity),
   - `voiceoverAssetId`, `format` (`vertical` for shorts, `horizontal` for YouTube), `captions` (default on), `title`.
5. Tell the user the new version is saved and ready to render. Re-timing = call again with new `start` values;
   swapping a drawing = generate a new image and call again. Small style tweaks to the saved code (caption look,
   colors, background) can be done with normal exact edits — never rewrite the TRACES/SCENES data by hand.

## Line-art rules (the engine depends on them)
- Dark, thick outlines on white. Shading, gradients, hatching, photos and dense detail trace badly
  (too many strokes or blank areas). If a drawing comes back with very few or hundreds of strokes, regenerate it simpler.
- One clear subject per scene; 1–3 supporting objects at most. Keep text out of the image — captions carry words.
- Keep the same drawing style across scenes (same line weight, same character design if there is a character).
- Up to 12 scenes per call. For longer videos, make several calls (e.g. per chapter) and stitch the saved clips.

## External agents (HTTP)
`POST {FUNCTIONS_URL}/whiteboard-animate` with `{ token, projectId, title, format, voiceoverAssetId,
scenes: [{ assetId, start? }], captions? }` — or single image: `{ token, projectId, assetId | imageUrl, duration? }`.
Create the images first with `agent-create` (`kind: "image", prompt, role: "image"`). The response gives the new
code asset id; render it with `render-video` like any other version.
