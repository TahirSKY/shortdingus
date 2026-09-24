# Repair the Video Analyzer

## What will change
- Replace the current placeholder upload with a real upload to the existing private video storage.
- Add a real video-analysis function that sends the uploaded clip to Gemini and returns timecoded scenes, dialogue, emotion, and edit opportunities.
- Save each analysis alongside its video reference so it survives refreshes and can be retrieved later.
- Show saved analyses on the page, with clear upload, analyzing, success, and failure states.

## Agent access
- Store the results as structured project data, not browser-only data or files that falsely claim to exist in a local workspace.
- Keep a stable analysis ID and video storage path so the app’s AI features can retrieve the correct footage analysis when prompted.
- A GitHub-only agent can see the implementation but cannot automatically read live uploaded files; live agent access will come through the app’s stored analysis data.

## Technical details
- Reuse the existing private `studio-media` bucket and its 200 MB limit.
- Add a `video_analyses` table with video name, storage path, MIME type, duration, status, summary, beats, and timestamps.
- Add a `video-analyzer` cloud function using the available Gemini video-input model and server-held Lovable AI credentials.
- Update `public/video-analyzer.html` to upload, call the function, persist results, and reload prior analyses.
- Validate MP4/MOV/WebM, file size, duration, API errors, and malformed AI responses.
- Test the deployed function and the complete browser flow with a real short video.
