# Fluid AI Video Studio V1

## Product outcome
Replace the current “chat generates a whole code file” Studio with a chat-first editor driven by a structured JSON edit decision list (EDL).

The experience has only two starting modes:
- **I have footage** — upload one MP4 up to 60 seconds, then the agent analyzes it.
- **I need footage** — describe an idea, then the agent develops the script and visuals.

There is no wizard. The agent moves the conversation forward, presents choices inside chat, waits for approval, builds the edit, and accepts natural-language revisions.

## Experience

### Studio shell
- Redesign `/studio` as a minimal, dark workspace using Inter and restrained neutral tokens.
- Keep the 9:16 video visually dominant.
- Desktop: chat and activity on the left, large persistent video preview on the right.
- Mobile: video remains prominent with a compact Chat/Preview switch and safe bottom navigation.
- Add the two-mode segmented toggle at the top of a new conversation.
- Keep advanced code and templates out of this Studio; the existing Playground remains the code-focused tool.

### “I have footage” flow
1. Accept one MP4, validate its actual duration is no more than 60 seconds, and upload it to media storage.
2. Analyze the clip with built-in multimodal AI and return visible, timecoded beats: actions, subjects, useful moments, likely cuts, zoom opportunities, and audio context.
3. Generate three genuinely different hooks/edit plans from the footage and the user’s goal.
4. Render those choices as selectable chat responses, while still allowing free text such as “try another angle.”
5. Do not generate paid assets or voice until the user approves a direction.
6. After approval, create the script, voiceover, captions, overlays, and final EDL; generate supporting images only when the approved plan needs them.
7. Show the playable vertical edit directly in the conversation workspace.
8. Translate later chat requests into focused EDL changes rather than regenerating the entire video.

### “I need footage” flow
1. Start from a free-form topic or sketch idea.
2. Produce three script/hook directions and wait for approval.
3. Build scenes from generated images and motion treatments, with separate voices where the script has multiple characters.
4. Produce the same EDL preview, chat revision, render, and download flow.

For V1, generated stills animated by Remotion are the dependable visual source. Arbitrary stock-video search and generative video are not part of this first slice.

## Editing foundation

### JSON EDL as the source of truth
Define a versioned, validated EDL containing:
- 1080×1920 output, 30 fps, and total duration
- ordered scenes with source media, source in/out points, crop/fit, speed, zoom, and transitions
- timed voice/dialogue tracks with voice identity and volume
- timed captions with style settings
- timed text, image, and shape overlays
- project metadata and revision number

The model never writes Remotion code. It returns narrow, validated edit operations against the EDL, such as changing caption scale or adding a zoom at a specific time.

### One deterministic Remotion composition
- Build one reusable EDL composition supporting video, images, audio, captions, overlays, cuts, fades, and keyframed zoom/pan.
- Compile the validated EDL into a fixed single-file Remotion composition for both the browser preview and the existing AWS Lambda renderer.
- Send that exact compiled composition through the current `render-video` and progress-polling flow, preserving preview/render parity.
- Keep the current Playground code rendering path unchanged.

This approach uses the Lambda bundle that is already working. A future Lambda bundle can accept raw `inputProps.edl`, but V1 does not require another external AWS deployment.

## Agent and media tools

Create a server-side Studio agent using the AI SDK and built-in Lovable AI capabilities. Its small tool set will be:
- **Understand footage** — multimodal analysis into timecoded beats.
- **Create directions** — three distinct hooks/plans from footage or an idea.
- **Update edit** — validate and apply EDL operations.
- **Generate voice** — create and store one voice segment per narration/dialogue turn.
- **Generate image** — create supporting cartoon or illustrative shots when approved.

Agent behavior:
- Keep project stage, footage analysis, selected direction, script, assets, and current EDL in server-backed project state.
- Use an approval gate between proposed directions and asset generation.
- Use structured outputs with runtime validation and graceful recovery from malformed model output.
- Stream chat/status updates and surface the actual safe AI error message.
- Stop on credit, configuration, provider-denial, or validation errors; only rate limits and temporary server failures receive bounded delayed retries.

## Data and storage

Add anonymous, no-login Studio persistence matching the current app model:
- **studio_projects** — mode, title, stage, footage analysis, selected direction, script, current EDL, and revision.
- **studio_messages** — ordered user, agent, status, and choice messages.
- **studio_assets** — uploaded footage, generated images, voice tracks, duration, MIME type, and storage path.

Add a dedicated public media bucket reachable by both the browser preview and AWS Lambda. Enforce expected video/image/audio MIME types, a practical upload-size cap, and the 60-second footage limit before analysis. Database access rules and grants will match the app’s existing no-login behavior.

## Rendering and download
- Add Render beside the active preview, using the EDL’s duration and fixed TikTok format.
- Show render progress without blocking chat.
- On completion, expose MP4 download in Studio and keep compatibility with the existing result/render library flow.
- Preserve the existing 10-second polling interval and AWS rate-limit backoff.

## Verification

### Acceptance scenario 1: uploaded footage
- Upload a real dog-walk MP4 under 60 seconds.
- Receive accurate timecoded beats and three hooks.
- Choose a threshold-training angle.
- Generate voiceover, captions, and an EDL preview using the original clip.
- Change caption size and add a zoom near 2 seconds through chat.
- Confirm only the requested EDL fields change.
- Render through AWS Lambda and download a playable 1080×1920 MP4.

### Acceptance scenario 2: idea only
- Enter “make a 30s sketch about why loans are ridiculous, intern vs CEO style.”
- Receive three directions and approve one.
- Generate cartoon scene images, two distinct voice tracks, captions, and a 30-second preview.
- Revise one overlay through chat.
- Render and download the MP4.

### Technical checks
- Validate EDL schemas and edit operations with unit tests.
- Verify upload rejection for non-MP4, oversized, empty, and over-60-second files.
- Verify the same EDL produces matching browser and Lambda timing.
- Test AI, voice, and image error states with loading cleared correctly.
- Check desktop and mobile layouts for overlap, readable chat, and an uncropped 9:16 player.

## Deliberate V1 boundaries
- One uploaded source video per project.
- No manual drag-and-drop timeline.
- No stock-footage marketplace search or generated video clips; generated stills plus motion cover footage-free scenes.
- No user accounts or collaboration.
- No changes to the separate code Playground.
