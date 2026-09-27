---
name: edit-raw-footage
description: Turn an uploaded talking/raw recording into a tight edit — word-timed cuts of silences, fillers and bad takes, clean audio, music bed, SFX on the exact word, titles and fake screen recordings.
---

# Edit raw footage — from recording to finished video

The cut is the foundation: every later step depends on it being right.

1. **Transcribe with timing.** `analyze-asset {assetId, tool: "gemini-words"}` on the video. Also read its `gemini-video` beats (what happens on screen).
2. **Cut.** Start from `report.cuts` (silences > 0.6s, um/uh). Also remove: repeated takes (keep the LAST good take of a repeated sentence), false starts, off-topic tangents. Never cut mid-word — snap cut points to word `start`/`end` with ~0.08s padding. Save the keep-list as a project file (`role=plan`, name `cuts.json`: `[{"in":s,"out":s}]`).
3. **Structure.** Reorder if needed so the first 3s is the strongest hook (see `retention-structure`).
4. **Visuals.** Titles and animated graphics on key words; fake screen recordings built in code (a recreated app/editor window, a cursor that moves and clicks, pages that change) instead of real captures. Zoom/punch-ins on emphasis words.
5. **Audio.** Voice first and clear; music bed under at -18 to -24dB, ducked under speech; SFX placed on the exact spoken word (see `suggest-sfx`). Library-first — reuse sounds, logos and screen mocks; save any new reusable one to the HUB library (no `project`), so video 10 is faster than video 1.
6. **Captions** from `caption_lines`, word highlighted as spoken, shifted by your cuts.
7. **Build** one Remotion composition using `<OffthreadVideo startFrom endAt>` per kept segment. Save as `role=code`.
8. Run `final-check`, then `packaging`, then render.
