# Roadmap
- [ ] Add manual image-to-whiteboard MP4 button, verify project readback, and report observed generation time
- [x] Generate and save a realistic cutout pencil hand and updated Movie1 whiteboard code; hand-tip frame and project readback checked (new MP4 export not performed)
- [x] Build and save 52-second narrated whiteboard proof in Movie Theatre / Movie1 and Renders; clean export validated with frame/audio inspection (Lambda SVG artifacts required raster fallback)
- [x] Provide a pinned LTX Colab GPU-test notebook and pass structural tests
- [ ] Validate LTX memory use and full-clip quality — blocked on a real user-started Colab GPU run; no GPU is available here
- [ ] Connect app-controlled generation and direct project saving after the GPU quality gate passes
- [x] Clarify personal-use video workflow in the selected plan passage
- [x] Research and propose a shared Colab-powered AI video-generation core using Vibe Voice Studio as reference
- [x] Finish Lottie project playback, editor handoff, and verify video export
- [x] Project Pexels/GIPHY search, preview, and save selected media
- [x] Clip framing: real face tracking + speaker match + tested ClipCamera helper (steps 1-4)
- [ ] Step 5: GPU face/person tracking + audio-visual active speaker detection for hard footage (livestreams)

- [x] Dedicated AI video generation page (/video-studio) + Colab server notebook
- [x] Whiteboard engine: whiteboard-animate edge function (image → traced strokes → Remotion code asset), editor whiteboard_animate tool, frame-verified locally (Lambda render not yet run)
- [x] Whiteboard hub + "Muscle Signals" vertical short: 4 AI line-art scenes, borrowed Movie1 voiceover, 42 word-timed captions, 51.84s 1080x1920 composition v2 frame-verified locally (user to run Lambda render)
