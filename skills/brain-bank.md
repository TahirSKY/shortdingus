---
name: Make a Brain Bank video
description: How Brain Bank videos come together — voiceover first, the mascot popping in as the narrator, everything else made fresh. A guide, not a template.
---

# Brain Bank videos

Brain Bank explains ideas in short (vertical 9:16) and long (horizontal 16:9) videos. The goal is a video that feels hand-made and high quality — **never a slideshow, never AI slop**. Nothing below is a fixed rule; agree the idea, length and structure with the user.

## The mascot is the narrator
- The hub library holds mascot clips (`role = mascot`), tagged `vertical` or `horizontal`. Each has an auto description (setting, gestures, mouth movement, length).
- The clips are the mascot talking in different settings. **Mute them** and lay them over our voiceover so he looks like he is saying the line.
- Use the clip matching the video's orientation. Pick clips whose energy and gestures fit the line (excited, pointing, thinking…). Vary the settings across a video.
- He pops in for a couple of seconds at moments where a narrator face helps: an opening line, a punchline, a direct question to the viewer, a sign-off. Not the whole video.
- Remotion: `<OffthreadVideo src={url} muted startFrom={...} />` inside a `<Sequence>`, trimmed to the spoken phrase. Cut in/out on word boundaries from the transcript so the mouth moves only while the voice speaks. Full-frame, picture-in-picture, or a pop/scale-in are all fine.

## Start from the voiceover
- The user uploads a voiceover into the project (`role = voice`). It gets an `assembly-transcript` analysis: `words [{w,start,end}]` in seconds, caption lines and suggested cuts. Time everything to it.
- Word-by-word captions are usually welcome; style them to the hub style guide.

## Everything else — mix what the story needs
- **Vox-style collage**: paper cut-out layers with a moving camera (see `make-vox`). This hub has auto cut-outs on, so generated subject images on white get a transparent `-cutout` version.
- **Generated images** (`agent-create kind=image`) and **2D motion graphics** in code (see `vidtsx-2d-generator`): diagrams, counters, maps, kinetic type.
- **Stock footage** via `footage-search` (Pexels) and **memes/GIFs** via `meme-search` (GIPHY). Search, then save the pick into the project with `agent-create sourceUrl=...` (`role=stock` or `role=meme`). Use memes sparingly, where a beat is genuinely funny.
- **Sound**: effects and music from the Shared Library (see `suggest-sfx`), placed on the exact word.

## Quality bar
- Something should move on screen most of the time; avoid static images held for long.
- Every visual should earn its place against the line being spoken.
- Retention ideas (hook, curiosity gap, twist, loop) live in `retention-structure` — use them when they fit.
- Before rendering, run the practical checks in `final-check` and view frames at phone size.

## Writing the code (so it previews and renders)
- Start the file with `/* REMOTION_CONFIG { "fps": 30, "durationInFrames": N, "width": 1080, "height": 1920 } */` (1920x1080 for horizontal).
- Copy file IDs exactly from the agent link; never type or guess one. A single wrong character makes the render fail.
- Write readable code: one idea per line, clear names (`VOICE`, `MASCOT_MOMENTS`), grouped constants. Never squash it into long one-liners — the user reviews it.
