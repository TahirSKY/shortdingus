---
name: motion-craft
description: How motion should feel in any video — protagonist object, physics (arcs, squash/stretch, springs), beat-timed hits, kinetic big words, frame-exact sound, and frame QA. Guidance, not a template; use in every hub.
---

# Motion craft

Guidance for making motion feel alive and intentional. These are tools, not rules — pick what fits the story, the hub's style and the user's direction. Never turn this into a repeated template.

## 1. A protagonist object (optional, powerful)
Pick one object that belongs to the topic and proves points by what it does, and let it travel through scenes so cuts feel like one shot (exit one side, enter from the other).
- money → a coin (rolls into a jar, splits 1→2→4 to show compounding, drops through a "fee" slot)
- productivity → a task card that gets ticked, stacked, batched
- tech/UX → a cursor that hesitates, misclicks, finds the button
- funnels → a droplet that leaks at the weak step
- writing/hooks → a caret that deletes the weak word and types the strong one
- AI → a spark that writes the big word itself
If nothing physical fits, the protagonist can be the big word itself.

## 2. Physics, not tweens
- Things travel in arcs (parabolas), not straight lines.
- Stretch along velocity when fast; squash on contact; keep volume (scaleX × scaleY ≈ 1).
- Impacts settle with a damped spring (`spring()` from Remotion) — overshoot then rest.
- Ease in and out. Use linear only when the point is "robotic".
- Optional onion-skin ghosts / motion trails show speed.

## 3. One big moment per scene
Each scene has ONE hero moment; everything else supports it. Land big hits on a steady beat grid (e.g. every 0.5 s at 120 BPM, or on voiceover word times when there is a voice). Hit something within the first 0.5 s of the video.

## 4. Kinetic type
- Loud + quiet pair: one huge word (1–2 words, bold, caps, often ending with a period like a verdict) between two small quiet lines.
- Words react physically: squash wider on impact, stretch narrower when moving fast (animate scale or a variable font's width axis if loaded).
- Letters can fall, shuffle into place, flip one by one.
- Word flips: the common belief becomes the truth (STATIC → ALIVE, POST MORE → POST LESS) — the protagonist can knock a letter out.
- Patterns: number slam (count up, overshoot, settle), split-screen compare lanes, before/after wipe, annotated slow-mo with callouts, strike-through of the wrong way while the right way plays.

## 5. Sound on the exact frame
Every SFX starts on the frame its visual event happens. Compute the frame from the same timing values the animation uses (one shared constant per event), never place by eye. Whooshes slightly before the move, impacts on contact, risers ending on the hit.

## 6. Determinism (renders must match preview)
Everything is a pure function of the frame. No `Math.random`, `Date`, timers or rAF. Use Remotion's `random(seed)` for variety.

## 7. Frame QA before render
- Frame 0 (and the first frame of each scene) is a finished, readable design — it is the thumbnail.
- Keep a safe margin (~72 px at 1080 wide) and keep text away from phone UI zones (top, bottom, right-side buttons on 9:16).
- Loops (if any) have no visible jump: periodic motion repeats exactly, effects come to rest before the loop point.
- Check key moments with `render-still` at phone scale.

## 8. Look discipline (when a clean editorial look is wanted)
One hero colour + one hot accent + warm off-white type; tinted neutrals, not pure black/white. Accent reserved for the protagonist and big shapes, not small text. Avoid gradient text, neon and linear full-screen gradients. Hubs with their own style guide override this.
