---
name: final-check
description: Mandatory check before any full render — six parts present, hook speed, cut-off words, voice/caption sync, banned words, safe areas, loop, phone-size frames.
---

# Final check — do this before rendering

Render key frames with `render-still` (frame 0, each part's first frame, the last frame) and actually look at them at phone size. Fix, re-check, only then render the full video.

- [ ] **Six parts** in `project.plan`: hook, setup, quiz, reveal, twist, loop — none missing.
- [ ] **Hook**: frame 0 fully composed (not black, not fading in); first spoken word before 0.5s; hook ends by ~3.4s.
- [ ] **No cut-off words**: every cut snaps to word boundaries (word timing); no clipped first/last syllable.
- [ ] **Sync**: captions and SFX land on the word (±0.1s); voice not drifting from visuals.
- [ ] **Banned words**: none from the hub style guide's banned list; no profanity unless the hub allows it; no false claims.
- [ ] **Safe areas**: text/captions not in the top ~12% or bottom ~20%; nothing cropped at 1080×1920.
- [ ] **Readability**: captions ≥ ~60px, high contrast; on-screen change every ≤2s.
- [ ] **Loop**: last frame ≈ frame 0 and last line flows into the first — or ends cleanly on the payoff. No CTA outro.
- [ ] **Audio**: music ducked under voice; no peaks clipping; no silent gaps.
- [ ] **Assets**: every URL in the code is a hub `asset-url` link (no Unsplash — it's blocked on the renderer).

Write the result as `check.md` in the project (`role=plan`), then set stage to `render`.
