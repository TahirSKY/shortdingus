---
name: whiteboard
description: Make a hand-drawn whiteboard video (short or long) from a voiceover — plan scenes from the transcript, generate bold line-art images, send them to the whiteboard-animate engine which returns one finished MP4 drawing clip per image, then edit those clips (speed, trim, hold, order) to the voiceover in Remotion. Use in the Whiteboard hub or whenever the user asks for a whiteboard / hand-drawn / doodle explainer.
---

# Whiteboard video — from voiceover to finished drawing

The drawing is done by the **whiteboard-animate engine**, like transcription or cut-outs: image in, finished
MP4 drawing clip out. It traces the centre of every line (one pen pass per line), draws big shapes first then
details, moves a realistic pencil hand along the pen tip, and settles into the exact original artwork at the end.
Your job is the creative part: what to draw, and how the clips flow with the voice. Never write stroke code.

## Flow
1. Voiceover lands in the project → transcribed automatically (word timings + caption lines).
2. Read the transcript; split into **scenes** — one idea per drawing (often every 3–10 s; guidance, not a rule).
3. Propose the scene plan in chat (start time from the transcript word, sentence, what's drawn). Wait for go-ahead.
4. Generate one image per scene with `generate_image` (prompt rules below), named `scene-01-<idea>`, …
5. Call `whiteboard_animate` with `clips: [{ assetId }]` (all scenes in one call, `format` vertical/horizontal).
   The engine waits for images still uploading. It returns one **video asset per image** (role `clip`, tag
   `whiteboard-clip`) with `drawSeconds` (drawing time) and `holdSeconds` (finished picture held). They render in
   the background — usually 1–3 minutes; `list_files` shows them once ready (an error in meta means retry that one).
6. Build the video in Remotion with the clips as footage, the voiceover as `<Audio>`, plus captions/titles:
   - Each scene = `<Sequence from={start*fps} durationInFrames={len*fps}>` with `<OffthreadVideo src={clipUrl} playbackRate={r} muted/>`.
   - Fit the drawing to the line it illustrates: `r = drawSeconds / secondsYouWantTheDrawingToTake`
     (keep r between ~0.5 and 2.5 so the hand looks natural). If the scene lasts longer than the drawing,
     freeze on the finished picture (the clip's last frame) or add a slow push-in / highlight.
   - Use `startFrom` to skip into a drawing, cuts or crossfades between scenes, gentle camera moves — creative choices are yours.
7. Re-timing = edit the Sequence/playbackRate numbers. Swapping a drawing = new image → `whiteboard_animate` for just that one.

## Line-art rules (the engine depends on them)
- Thick dark outlines on pure white. No shading, gradients, hatching, gray, photos or dense detail.
  Prompt: "Whiteboard line-art illustration of <subject>, thick black marker outlines on a pure white background,
  simple clean shapes, no shading, no hatching, no gray, no text, centered, generous white margin, <portrait 9:16 | landscape 16:9>".
- One clear subject, 1–3 supporting objects. Text out of the image — captions carry words.
- Same line weight and character design across scenes.
- Very few strokes (<5) or a blank drawing → regenerate the image simpler/bolder.

## Older mode
`scenes: [{assetId, start}]` + `voiceoverAssetId` still builds a single all-in-one code version, but its timing is
fixed. Prefer `clips` — they can be sped, slowed and re-cut freely.

## External agents (HTTP)
`POST {FUNCTIONS_URL}/whiteboard-animate` with `{ token, projectId, format, clips: [{ assetId, drawSeconds?, holdSeconds? }] }`
→ 202 `{ clips: [{ id, url, drawSeconds, holdSeconds, duration }] }`. Poll the url (409 = still rendering).
Create images first with `agent-create` (`kind: "image", prompt, role: "image"`).
