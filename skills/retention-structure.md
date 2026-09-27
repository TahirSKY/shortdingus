---
name: retention-structure
description: The six-part story order every short follows for retention — hook, setup, quiz, reveal, twist, loop. Used by every making skill; the project plan is written in this shape.
---

# Retention structure — six parts, every video

Length ~35–45s at 1080×1920, 30fps. No intros, no "like and subscribe", no CTA outro. The loop IS the ending.

| # | Part | Time | Job | Rules |
|---|---|---|---|---|
| 1 | **Hook** | 0–3.4s | Stop the scroll | Frame 0 is FULLY composed — the payoff/tension already visible. No fade-in from black. First word lands in the first 0.5s. A question, contradiction or impossible image. |
| 2 | **Setup** | ~3–10s | Give just enough context | One idea per sentence. Every line earns the next. |
| 3 | **Quiz** | ~10–16s | Make the viewer guess | Pose the question on screen; hold a beat (~1s) so they commit to an answer. |
| 4 | **Reveal** | ~16–30s | Pay it off | In 2–4 steps, each synced to a spoken word (zoom, stamp, highlight, SFX on the word). |
| 5 | **Twist** | ~30–38s | Re-open curiosity | A second surprise or a reframing of the answer. |
| 6 | **Loop** | last 2–4s | Rewatch | Last frame ≈ frame 0; last line flows into the first line (sentence reads continuously on replay). If a loop is impossible, end on the payoff with no filler. |

## Project plan shape (save with project-update)

```json
{ "title": "…", "duration_s": 40,
  "parts": [
    { "part": "hook",   "start": 0,   "end": 3.4, "on_screen": "…", "voice": "…", "sfx": ["impact-soft@0.2"] },
    { "part": "setup",  "start": 3.4, "end": 10,  "on_screen": "…", "voice": "…" },
    { "part": "quiz",   … }, { "part": "reveal", … }, { "part": "twist", … }, { "part": "loop", … }
  ] }
```

## Always
- Captions highlight each word as it's spoken (word timing), kept clear of the top 12% and bottom 20% UI zones.
- Something changes on screen at least every 1.5–2s (cut, camera move, layer, highlight).
- Motion is many simple staggered moves plus a virtual camera — not complex per-element animation.
- Pick topics that make people argue or feel smart; your angle/voice beats generic facts.
