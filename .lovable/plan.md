# Clipping: raw long video to ready-to-edit Shorts

## The key idea: never physically cut, never shrink the edit
Clips don't need to be cut into new files. A clip is a list of time ranges in the original video, for example "12:04.2–12:31.8, plus a 2s hook from 47:10.0". The live preview plays those ranges straight from the original. The final render then reads only those seconds at full quality. Nothing gets rendered until you approve a clip, so there's no rendering of throwaway clips, no copies, and no quality loss.

## Solving size and context
1. **Upload the original, untouched.** Use resumable upload so big files (1–2 GB, hours long) survive slow connections. Raise the storage limit for this hub.
2. **Get the full context from the transcript, not the video.** AssemblyAI handles the whole long file from its storage link. That gives word timings plus who is speaking. This avoids the 20 MB limit entirely. A 1-hour podcast is about 10k words, so the AI can read the **entire** transcript in one go. No splitting means no lost context, and a hook can come from anywhere in the video.
3. **Understand the visuals cheaply.** While the file uploads, your browser grabs small snapshots, about 1 frame every 2s. It also detects shot changes. Gemini reads those snapshots in batches and returns:
   - where each person's face is
   - the layout (one person, two people, screen share, B-roll)
   - visual moments worth using

   Nothing heavy is sent, and no low-quality copy is needed for editing. A small preview copy is made only if a clip needs deeper motion analysis.

## The flow
```text
Upload original -> Transcript (whole video, speakers, words)
               -> Snapshots -> Faces, layout, shot changes
                      |
              Clip Finder (reads EVERYTHING at once)
                      |
   10-30 candidate clips: hook, ranges (can be stitched), score, why it works
                      |
   You review clip cards: instant preview from the original, keep/tweak/drop
                      |
   Each kept clip -> its own project, with ranges + face tracking ready
                      |
   Existing editor: reframe to 9:16, split screen, zooms, captions, sound, motion
                      |
   Render only the finals, at full quality
```

## What gets built
- **Clipping hub + "Clip finder" skill.** Covers what makes a moment viral: a strong opener, a payoff, a self-contained story, controversy or emotion, and a clean ending. It also covers stitching hooks from elsewhere, snapping cuts to word edges, and the guidance from Edit raw footage and Retention structure. It's guidance, not a template.
- **Source video page.** Upload progress, transcript and analysis status, then a grid of clip cards. Each card has a score, hook text, a range timeline, a play button, and **Make project** / **Make all**.
- **Clip project starter.** Creates the project, links the original as the source clip, and stores the ranges and the face/layout track. The editor then knows where to crop, when to split screen, and who is speaking.
- **Editor additions.** Guidance on face-follow crops, a split-screen helper, and speaker-aware layout, all using the existing tools.

## Things to know
- Analysis cost per hour of footage is small. The transcript is on your AssemblyAI trial. The snapshots and one Clip Finder pass are roughly 1–3 credits with Astra, or much less with Gemini Flash. Editing cost per clip stays the same as today.
- Face tracking from snapshots is good for podcasts and talking heads. Fast action footage may need a deeper pass on that clip only.
- The largest file you can upload depends on the storage plan limit. I'll check it and show a clear message if a file is too big.

## Technical details
- Storage: TUS resumable upload to `hub-media`, with a higher bucket `file_size_limit`. The asset is `kind=video`, `role=source`.
- Transcript: the existing `assembly-transcript` path with `speaker_labels` turned on. No 20 MB path is used for sources.
- Frames: in the browser, a `<video>` element plus canvas seek, giving 360px JPEGs every ~2s and a shot-change score. They upload as a sprite/contact-sheet set. A new `gemini-frames` tool batches about 60 frames per call and returns `{t, shot_id, layout, faces:[{speaker?, box}]}`.
- New `find-clips` edge function: background job (EdgeRuntime.waitUntil, resumable like `editor-build`) with Astra by default and the model picker. It uses a strict JSON schema: `clips[{title, hook, score, reason, segments[{in,out}], layout_hint}]`. Segments are snapped to word boundaries. Results go in `asset_analyses` with `tool=clip-finder`.
- Clip preview: a client-side Remotion Player that plays the segments from the signed URL. No render is needed.
- Projects: `plan.clip = {source_asset_id, segments, face_track}`. Code uses `<OffthreadVideo startFrom endAt>` for each segment. Lambda fetches byte ranges, so only the used seconds are decoded.
- I'll add an AGENTS.md rule: clips are virtual ranges over the original source, never physical cuts.
