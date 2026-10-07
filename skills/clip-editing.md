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
- Framing comes from real face tracking (CAMERA in the editor context) and the tested `ClipCamera` helper. Paste the helper as-is and render the source only through it. Never write your own crop or transform maths for the source.
- CAMERA already follows the active speaker, splits the screen when two people trade lines, resets on camera cuts and goes wide when no face is reliable.
- Your creative control: `zoom` for punch-ins (1-1.25), plus everything layered on top (hook, captions, overlays, SFX, freeze frames, B&W replays).
- No CAMERA yet: frame wide and ask the user to press "Track faces".

## Making it hit
- Hook text on screen in frame 0. Word-by-word captions from the transcript words, current word highlighted, in the phone-safe middle band.
- Punch-in (scale 1.0→1.15) on emphasis words, jump-cut zooms between segments to hide the cut, quick zoom-out on reactions/laughs.
- Remove dead air inside segments if needed by splitting them further at word gaps > 0.6s.
- SFX on exact words, sparingly (whoosh on cuts, pop on numbers, record-scratch on reveals). Music bed low and only if it fits.
- Optional end: loop back seamlessly or a short punchline freeze.
- Follow `motion-craft` and the hub style guide; propose the plan, then build.
