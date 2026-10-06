---
name: clip-editing
description: Edit a clip from a long source video into a vertical short — face-follow 9:16 crops, split screen for two speakers, punch-ins, word captions, SFX — always playing the full-quality original by time range.
---

# Clip editing — from source ranges to a finished short

The project plan has `clip`: `source_asset_id`, `segments` (absolute seconds in the original, in play order), the hook, and a face track. The original is never cut into files.

## Playing the source
- One `<OffthreadVideo src={SOURCE} startFrom={Math.round(seg.in*fps)} endAt={Math.round(seg.out*fps)} />` per segment, each in its own `<Sequence from=...>` placed back to back. Only those seconds are read at render time, at full quality.
- Clip-local time = time since the start of the clip. Convert source word times: `local = word.start - seg.in + segmentOffset`.
- Keep the original audio (not muted) — it IS the voice.

## Framing 9:16 from 16:9
- Face boxes are fractions of the frame (x, y, w, h). Make the video wide enough to fill the height (scale = 1920 / sourceHeight*… simply: render the video at height 1920, width 1920*16/9 ≈ 3413) and translate so the active face center sits at ~50% horizontally, ~35-40% vertically.
- Ease between face positions (spring/interpolate over ~8-12 frames); never jitter on every snapshot. Hold steady while the same person talks.
- Who is talking comes from transcript speaker labels; which face is which comes from the face track `id`s — match them by when each speaker talks.
- **Split screen** when two people trade lines quickly: two crops stacked (top/bottom), each centered on one face, thin divider. Return to single when one person holds the floor.
- Wide/group or screen-share shots: show them letterboxed or as a card with the speaker cropped below.

## Making it hit
- Hook text on screen in frame 0. Word-by-word captions from the transcript words, current word highlighted, in the phone-safe middle band.
- Punch-in (scale 1.0→1.15) on emphasis words, jump-cut zooms between segments to hide the cut, quick zoom-out on reactions/laughs.
- Remove dead air inside segments if needed by splitting them further at word gaps > 0.6s.
- SFX on exact words, sparingly (whoosh on cuts, pop on numbers, record-scratch on reveals). Music bed low and only if it fits.
- Optional end: loop back seamlessly or a short punchline freeze.
- Follow `motion-craft` and the hub style guide; propose the plan, then build.
