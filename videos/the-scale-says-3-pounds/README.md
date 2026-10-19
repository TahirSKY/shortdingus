# The Scale Says +3 Pounds — editorial cut 01

Vox-style paper-and-ink short built on the supplied 44.52s voiceover.
`TheScaleSaysThreePounds.tsx` is a single self-contained Remotion file
(1080×1920, 30fps, 1434 frames (1344 VO + 90 CoreAge end card)). No on-screen captions — B-roll and custom
SVG carry the story; labels only name the evidence.

## Beat map (from the AssemblyAI word timings)

| Time | Beat | Visual |
|---|---|---|
| 0.0s | Hook — "gained 3 pounds overnight" | Bathroom-scale B-roll, big `+3 lb` slip slams in |
| 3.0s | "As fat? 10,000+ calories" | Calorie counter rolls to 10,500+ over three food clips |
| 9.7s | "So where did it come from?" | SVG scale, drawn arrows, question marks |
| 12.2s | 01 Water (salty meal) | Salt B-roll → jar fills with held fluid |
| 16.1s | 02 Carbs / glycogen | Bread + noodle B-roll → glycogen hexagons bind water drops |
| 24.2s | 03 Food itself | Eating B-roll → red route draws through an SVG gut |
| 30.0s | "Not 3 pounds of fat" | Weight ≠ fat; stamp: NOT THE SAME THING |
| 32.7s | "It adds everything together" | WATER / FOOD / FUEL / FAT bars collapse into one `+3.0` reading |
| 40.6s | Reassurance | Morning-walk B-roll; one red outlier on a long-term trend line |
| 44.8s | End card | CoreAge screenshot full-frame; music lifts, then fades |

The camera travels one continuous evidence board (9 islands, drawn routes
between them) instead of hard-cutting scenes.

## Assets (saved in the hub project `vox / the-scale-says-3-pounds`)

Voiceover + 11 fresh Pexels clips ingested as `role=stock`:
scale (Pavel Danilyuk 7802051), salt pot (RDNE 10431976), salt macro
(MART 8107809), water pour (Kindel 8093375), water on scale (Antonius
6211534), pasta (MART 8107798), noodles (cottonbro 4543685), bread
(ArtHouse 8231554), eating (Michael Burrows 7126075), salmon meal
(Castlebar 19107091), morning walk (Matthias Groeneveld 18089046).
Music: `docu-pluck` documentary bed under the whole VO. SFX from the shared
library (impact / pencil / stream / sparkle / chime / shimmer), mixed loud:
pencil route-draws on every camera flight, thumps on the slams and stamp.

## Render

Open the project in the hub → paste `TheScaleSaysThreePounds.tsx` into
Preview & render (or the Playground), then render. All media URLs in the
file are permanent `asset-url` links.

`preview/` is a local @remotion/player harness for scrubbing beats
(`npx vite --config videos/the-scale-says-3-pounds/preview/vite.config.ts`);
`?frame=N` deep-links a frame. Not needed for the hub render.

## Notes / things to eyeball at render

- Stock trims (`trim` seconds in each `Film`) are sensible offsets, not
  frame-picked — nudge if a clip opens on a dead frame.
