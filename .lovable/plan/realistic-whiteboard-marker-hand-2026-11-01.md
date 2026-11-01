# Realistic whiteboard marker hand

## What changes
Replace the tiny sideways pencil cutout with a photographic female hand holding a marker in a natural writing grip, viewed from above as the artist would see it. Keep the existing centre-line tracing, image finish and serial drawing queue unchanged.

## Why a bigger cutout alone will not solve it
The current hand inherits the drawing's scale, so its apparent size changes with each image. Its forearm ends inside the picture, and its pencil angle is baked into the photo. Simply enlarging or stretching it would trade one problem for another.

Use an **edge-connected hand and forearm**, not a floating hand. The marker tip stays on the drawing; a consistently sized hand sits behind it; the forearm continues beyond the picture boundary. The arm's photographed proportions stay fixed—no length stretching.

## Implementation
1. **Create and inspect the replacement artwork.** Generate a clean photographic female right hand, neutral short nails, a black marker with visible nib, and a sufficiently long connected forearm on transparency. Use an overhead writing pose, not a side-on product shot. Check anatomy and identify the exact nib and wrist anchors before integration. Retain the old artwork for existing saved videos.
2. **Separate drawing size from hand size.** Render the hand in screen coordinates, outside the drawing's scaling group. Use the same believable hand size relative to the shorter screen side in portrait and landscape, regardless of source-image resolution or whitespace.
3. **Keep the arm connected to the frame.** Aim the forearm toward a stable off-screen artist position: primarily the right edge for portrait and the lower edge for landscape, choosing the closest natural exit to avoid an implausibly long reach. Start with a visible hand width around 15–20% of the shorter screen side and judge it against real drawings. Use bounded, smoothly varying wrist/arm angles and a rigid photographic forearm; require the whole terminal cut to remain beyond the frame with overscan at every visible pose, including travel. Test the most difficult corner reaches before accepting the artwork. If the photo cannot cover them naturally, revise the pose or add a separately photographed matching reach pose—never stretch skin, clamp the hand away from the nib, or hide the failure with a disappearing arm. Do not switch poses mid-stroke.
4. **Make movement deliberate.** Keep the nib exactly registered while drawing. Add short pen-lift travel between disconnected strokes so the hand does not teleport; reveal no ink during these moves. Use subtle easing for entry, repositioning and exit, not random wobble that separates the marker from the stroke. Preserve requested drawing durations by budgeting travel inside them.
5. **Apply it to every engine output.** Single-image, queued MP4 and multi-scene outputs share the same hand renderer. Newly created drawings use it automatically; existing MP4s and saved compositions stay unchanged. Do not regenerate a user's existing clips or wake waiting agents automatically.

## Quality gate
- Check nib registration and arm continuity at the top-left, top-right, centre, bottom-left and bottom-right in both 1080×1920 and 1920×1080.
- Check a real traced drawing, including long strokes and jumps between disconnected shapes—not just a static hand pose.
- Keep small geometry tests for screen-independent hand sizing, nib alignment and off-screen forearm endpoints; run the existing whiteboard tests too.
- Export short proof clips sequentially through the actual AWS renderer and inspect frames and motion. Save the proofs in the Whiteboard hub so you can judge them.
- Do not call it realistic based only on generated artwork or browser screenshots. If the exported reach still looks unnatural, revise it before making it the default.

## Honest limits
A photographic hand is a controlled 2D illusion, not a person with fully simulated joints. It can look substantially more convincing with correct scale, grip, arm framing and pen-lift movement, but does not promise natural movement at every imaginable angle. A rigged 3D hand would need a high-quality anatomical model and materials; it is not a shortcut to photorealism. The proof determines whether this photographic approach is good enough.

The occasional second resting hand is explicitly deferred.

## Technical details
Add a shared, deterministic hand-pose generator with calibrated image dimensions, nib/wrist anchors, forearm-end cross-section and bounded reach geometry. Embed the photograph in generated self-contained Remotion code, but render it as a separate Remotion `Img` overlay above the ink rather than nesting it in the drawing SVG. Preserve the existing data-URI SVG safeguard for the ink. Keep immutable frame-based motion (no runtime DOM measurements or CSS manipulation). Record the shared renderer rule in `AGENTS.md`; deploy the drawing function after validation. No new database tables, services or concurrency changes are needed.