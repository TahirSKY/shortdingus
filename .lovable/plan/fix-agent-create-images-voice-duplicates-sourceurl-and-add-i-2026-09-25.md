# Fix agent-create images, voice, duplicates, sourceUrl, and add image analysis

## 1. Image generation
- In `makeImage`, the request body becomes only `{ model, prompt, size }`. Keep reading `data[0].b64_json`.

## 2. Voice generation
- Switch to `openai/gpt-4o-mini-tts` with `{ model, input, voice, response_format: "mp3" }`, mime `audio/mpeg`, default voice `alloy`. This is your preferred option.
- Before switching, check the live model list. If that model isn't offered, fall back to `google/gemini-2.5-flash-preview-tts` with voice `Kore`, a `.wav` path and mime `audio/wav`. Whichever one is used gets reported.

## 3. Idempotent creates
- Before any insert (text, code, image, voice, sourceUrl), look for an asset in the same group with the same name created in the last 60 seconds. If one exists, return it: 200 for text/code/sourceUrl, 202 while it's still creating. No new row is made.
- If no name is given, a default one is used. It includes a hash of the prompt or content instead of `Date.now()`, so quick retries get the same name.

## 4. sourceUrl push
- If `sourceUrl` (http/https) is present, fetch it on the server (200MB max), upload it to `hub-media/groups/<slug>/<id>-<name>`, and set `storage_path`, `size_bytes` and `mime_type`. `kind` can be any valid kind, and the token check stays. Returns 201 and skips generation.

## 5. Image analysis + stale timeout
- In `analyze-asset`, add an image branch. It creates a signed URL, calls `google/gemini-3.8-flash` (streaming, JSON object) with an `image_url` part, and gets `{summary, detail}`. It saves a `tool = "gemini-image"` row in the background and returns 202.
- A migration adds `gemini-image` to the allowed `tool` values on `asset_analyses`.
- Stale timeout: `analyze-asset` and `group-manifest` mark `running` rows older than 10 minutes as `error` ("Analysis timed out. Run it again."). The group page already stops polling on complete or error. The image "Analyse" button is added to the group page.

## 6. AGENT_ACCESS.md
- Document `sourceUrl` push on `agent-create`, the 60-second duplicate guard, and the `gemini-image` analysis that agents read as text.

## Verification (actual calls with your token)
1. Bad token: expect 401.
2. `kind=text`: expect 201 and the note in the manifest.
3. `kind=image` + prompt: expect 202, then `size_bytes > 0` and no error.
4. `kind=voice`: expect bytes present, the right mime type and no error.
5. `kind=image` + public raw `sourceUrl`: expect the stable URL to serve the image.
6. `analyze-asset` on that image: expect a `gemini-image` row with a real summary.
7. The same image GET twice quickly: expect one row.
8. Delete the test assets afterwards.
