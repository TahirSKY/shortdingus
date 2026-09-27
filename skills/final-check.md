---
name: final-check
description: Practical checks before a full render — cut-off words, voice/caption sync, banned words, safe areas, audio, asset links, phone-size frames. No structure or timing rules.
---

# Final check — before rendering

Render a few key frames with `render-still` (start, a few middle moments, the end) and look at them at phone size. Fix, re-check, then render the full video. Structure and length are whatever the user agreed — don't judge them here.

- [ ] **No cut-off words**: cuts snap to word boundaries (voiceover transcript); no clipped syllables.
- [ ] **Sync**: captions and SFX land on their words; voice not drifting from visuals.
- [ ] **Banned words**: none from the hub style guide; no false claims.
- [ ] **Safe areas**: text/captions not hidden under phone UI; nothing cropped at the chosen format.
- [ ] **Readability**: captions large and high contrast.
- [ ] **Opening frame** isn't accidentally black or blank (unless intended).
- [ ] **Audio**: music under the voice; no clipping; no unintended silent gaps.
- [ ] **Assets**: every URL is a hub `asset-url` link (no Unsplash — blocked on the renderer).

Optionally save the result as `check.md` in the project (`role=plan`).
