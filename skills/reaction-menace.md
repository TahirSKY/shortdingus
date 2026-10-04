---
name: Make a menace reaction video
description: High-edit reaction videos — viral source clips play, our menace character pops in to roast or silently react, with SFX, zooms and overlays. Script on request, voice recorded outside. A guide, not a template.
---

# Menace reaction videos

Short (9:16) and long (16:9) reaction videos. The source video plays; our character interrupts it. Think of channels like Ryth: the character is a **menace** — smug, judgy, unhinged, quick. Nothing below is a fixed rule; agree length and structure with the user.

## What you know about the source
Every source video in the project has:
- **gemini-reaction** analysis: a dense timeline (cuts, who's on screen, expressions, on-screen text, sounds) plus `reaction_moments` — sus/cringe/funny/shocking moments with suggested reactions.
- **assembly-transcript**: every spoken word with timing. Quote people exactly from it, never invent lines.
Clips tagged `reference` (e.g. Ryth videos) have a **gemini-edit-style** report: how often the character appears, for how long, the zooms, SFX hits and captions. Learn the rhythm from it; don't copy jokes.

## Script (only when the user asks — "Create script")
- Read the source analysis, the transcript and the user's notes/jokes first. The user's jokes win; build around them.
- Pick the moments worth reacting to. Not every moment — leave room for the source to breathe, then hit hard.
- For each pop-in write: source time (pause/freeze or keep playing), what the character does, and the line.
- Reactions are not always voice. Silent ones are often funnier: side-eye, slow turn to camera, dead stare, freeze-frame + zoom + record scratch, the character just muting the video.
- Menace voice: short, specific, mean-funny, about what's on screen. Avoid generic "bro what" filler and avoid repeating the same joke shape.
- End with a **clean voiceover read**: only the spoken lines, numbered, so the user can record them outside.
- Save it with `save_script`.

## Edit (after the user uploads the voice)
- Match each voice line (transcript words) to its pop-in moment from the script.
- Source: `<OffthreadVideo>` with trims (`startFrom`), pauses via freeze (a `<Freeze>` or holding the frame), punch-in zooms on faces at the key word.
- Character pops in (slide/bounce from a corner or full takeover), talks while the voice line plays, leaves. Lower the source volume under his lines.
- SFX on every beat that matters (pop-in whoosh, vine boom on the stare, record scratch on freeze) — use the hub/shared sound library with their peak times.
- Captions for the key source quote and for his punchline. Keep text in the phone-safe area.

## The character
**Gremlin Bean** — a smug lime-green bean with crossed arms, one curl of hair, mismatched eyes and two buck teeth. Its full code is in the library (role `character`, shown under CHARACTERS). Copy the `GremlinBean` component into the video unchanged and drive it with props: `poses` (smug, sideEye, stare, judging, laugh, angry, shocked, talk — switch at the beat, they blend), `words` (voice word timings, seconds local to its Sequence → mouth flaps), `enterAt`/`exitAt` (springy pop-in/out), `look`, `flip`, `size`. Give each instance a unique `id`. Pop him in from a corner or bottom edge, often cropped by the frame. Silent reactions = pose + no words.

Useful other skills: suggest-sfx, retention-structure (hook ideas), final-check.
