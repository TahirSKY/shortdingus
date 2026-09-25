# Agent create endpoint (GET-friendly)

Built as you specced it. I found the old gateway calls in git history and will reuse them exactly.

## What gets built
- New `agent-create` function that takes GET query params or a POST JSON body: `slug`, `kind`, `name`, `prompt`, `inlineContent`, `voice`, `token`.
- Token check against `HUB_WRITE_TOKEN`, the same way `asset-ingest` does it. Returns 401 on mismatch, 404 for an unknown slug, and 400 for a bad kind or missing prompt/content.
- `text` / `code`: saved inline right away and returned with 201. There is no background step, and `meta.creating` is never set.
- `image` / `voice`: inserts an `assets` row with `meta: { creating: true, prompt }` and returns 202 `{ id, url }`. The work then finishes in the background:
  - image: `/v1/images/generations`, `openai/gpt-image-2.5-sunburst`, `1024x1536`, `b64_json`. The PNG goes to `hub-media/groups/<slug>/<id>-<name>.png`.
  - voice: `/v1/audio/speech`, `google/gemini-3.1-flash-tts-preview`, `voice` (default `alloy`), mp3. The MP3 goes to `hub-media`.
  - On success, fills in `storage_path`, `size_bytes` and `mime_type`, and removes `creating`.
  - On failure, sets `meta.error` and removes `creating`. 402 and 429 get clear messages.
- CORS `*` on every response, and `OPTIONS` is handled.
- `config.toml`: `[functions.agent-create] verify_jwt = false`.
- `asset-url`: while an asset is still being created it returns 409 "still creating" instead of a broken redirect.
- `AGENT_ACCESS.md`: new "Create assets" section with a GET example URL, the params, the 202-then-poll-`group-manifest` pattern, and a note that the token travels in the query string.

## One small change from your spec
`text` / `code` return 201 instead of 202, because there's nothing to wait for. Say so if you want 202 kept for consistency.

## Verification
1. Bad token: expect 401.
2. `kind=text`: expect the asset in the manifest.
3. `kind=image` with a prompt: expect 202, then poll the manifest until `creating` is gone, then check that the stable URL returns a PNG.
4. Optionally, a short `kind=voice` check.
5. Delete the test assets afterwards.
