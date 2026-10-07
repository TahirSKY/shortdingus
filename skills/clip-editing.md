---
name: clip-editing
description: Turn a clip from a long source video into a finished, high-energy vertical short — tracked framing as the base layer, then creative editing on top (camera moves, captions, overlays, B-roll, memes, SFX, freeze frames, replays). A toolbox, not a template.
---

# Clip editing — from source ranges to a short people finish

The project plan has `clip`: `source_asset_id`, `segments` (absolute seconds in the original, in play order), the hook, and a face track (CAMERA). The original is never cut into files; only the used seconds are read at render time, at full quality.

Framing is the floor, not the job. A clean crop of a podcast is a raw clip, not an edit. Treat this like a VOX or Brain Bank video: the talking footage is the spine, and you edit around it with the same ambition. Plan the creative layer with the user first, then build it.

## The base layer (do this, then move on)
- Render the source only through the pasted `ClipCamera` helper with SEGMENTS and CAMERA from the editor context. Don't write your own crop/transform maths for the source — the helper already follows the speaker, splits the screen when two people trade lines, resets on camera cuts and goes wide when no face is reliable.
- No CAMERA yet: frame it wide and ask the user to press "Track faces".
- Keep the original audio — it is the voice. Clip-local time for a word: `word.start - seg.in + segmentOffset`.
- You still control the camera feel: `zoom` (1–1.25) for punch-ins, slow push-ins, snap zooms, zoom-outs on laughs.

## The creative layer (the actual edit — pick what fits this clip)
None of these are required, and this isn't a checklist. Choose moves that serve what's being said, and vary them between clips so the channel never feels templated.

**Camera & time**
- Punch-in on emphasis words, snap zoom on a reveal, slow push during a story, quick zoom-out on a laugh.
- Hide jump cuts between segments with a zoom change, whip/flash, or a cutaway.
- Freeze-frame on a face at the perfect moment (B&W or tinted, with a label or arrow).
- Instant replay: rewind a line and repeat it, slower or zoomed, for a punchline.
- Cut dead air: split segments further at word gaps over ~0.6s.

**Visualise what they say** (this is what separates good clips from raw crops)
- Numbers, money, dates, names: big kinetic type, counters, receipts, charts, price tags.
- A story or concept: a picture/B-roll cutaway (Pexels via the library, a generated image, a cut-out), full-screen or as a card/panel over the speaker.
- A product, company or person mentioned: a logo, a screenshot-style card, a picture pinned to the screen.
- Reactions: a meme or GIF (GIPHY), an emoji burst, a sticker, a pop-up comment.
- Split the screen with B-roll on top and the speaker below when explaining something visual.

**Captions & type**
- Word-by-word captions from the transcript words, current word highlighted, in the phone-safe middle band. Style them for this clip and hub: colour on key words, size jumps on emphasis, an emoji now and then.
- Hook text in frame 0 that makes the first line land; can morph or leave on the first cut.
- Occasional headline/label text ("$2M saved", "1 year later") as a separate layer from captions.

**Sound**
- SFX on exact words and visual hits: whoosh on cuts/zooms, pop on numbers and stickers, riser before a reveal, record-scratch or bass drop on a twist, cash register on money. Not every beat — leave room.
- A low music bed only if it fits; duck it under speech.

**Shape**
- Strongest line first (the hook can be a segment pulled from later in the source).
- Build the middle so something new appears every 1–3 seconds (a zoom, a cutaway, a caption beat, a sound).
- End on the punchline, a freeze, or a seamless loop back to the start.

## Working with the user
- Propose: the hook, 3–6 concrete creative moments tied to exact lines ("at 'two million' → counter + cash SFX + punch-in"), the visual style, and any assets you'll need (stock, memes, images). Then build.
- Use style references, `motion-craft`, the hub style guide and library sounds/assets the same way you would for any other video.
- Before render: captions don't cover faces, text stays in the safe zone, cutaways don't hide the important reaction, audio is clean.
