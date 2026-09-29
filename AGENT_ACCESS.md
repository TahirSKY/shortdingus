# Agent Access — ShortDingus Asset Hub

This app is a file cabinet. You (the agent) are the brain. Given only a **group slug**, you can read everything in the group and write files back.

Base: `https://rfbrxohavioeaexhztxa.supabase.co/functions/v1`

## Read a group

```
GET /group-manifest?slug=<slug>
```

Example response:

```json
{
  "group": { "slug": "loan-horror-01", "title": "Loan Horror 01", "notes": "30s intern vs CEO sketch",
             "created_at": "2026-09-25T10:00:00Z", "updated_at": "2026-09-25T10:20:00Z",
             "counts": { "video": 1, "image": 2, "text": 1 } },
  "assets": [
    { "id": "4b1e…", "kind": "video", "name": "reference.mp4",
      "url": "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=4b1e…",
      "mime_type": "video/mp4", "size_bytes": 8123456, "duration_seconds": 42.5, "meta": {}, "created_at": "…" },
    { "id": "9c2a…", "kind": "text", "name": "idea.md", "url": "…/asset-url?id=9c2a…",
      "mime_type": "text/markdown", "inline_content": "Intern discovers his salary is a loan…", "meta": {} }
  ],
  "analyses": [
    { "asset_id": "4b1e…", "asset_name": "reference.mp4", "tool": "gemini-video", "status": "complete",
      "summary": "An intern opens a paycheck…",
      "report": { "summary": "…", "beats": [
        { "start": 0, "end": 3.2, "label": "Hook", "detail": "Intern opens envelope", "emotion": "curious",
          "dialogue": "", "visual_event": "close-up of envelope", "opportunity": "punch-in zoom" } ] } }
  ],
  "generated_at": "…"
}
```

- Assets are in upload order. `text` and `code` assets include `inline_content`, so you don't need a second request.
- Only completed analyses are listed.

## URLs are permanent

Every `url` works forever. Paste it straight into Remotion code. Files are stored privately. The URL answers with a redirect to a short-lived signed link. **Never rewrite, store, or cache the resolved signed link** — always use the `asset-url` form.

## Asset kinds

| kind | use |
|---|---|
| video | source footage |
| image | stills, generated frames |
| audio | voice, music, SFX |
| text | ideas, notes, scripts |
| transcript | word/line-level timecoded speech (seconds) |
| analysis | timecoded report data (seconds) |
| code | Remotion TSX, EDL JSON |
| render | finished MP4 outputs |

`transcript` and `analysis` data, and analysis `beats`, are all in **numeric seconds**. You can cut precisely without watching anything: frame = seconds × fps.

## Write back

```
POST /asset-ingest
Content-Type: application/json

{ "token": "<HUB_WRITE_TOKEN>", "slug": "loan-horror-01", "kind": "image",
  "name": "scene-01.png", "sourceUrl": "https://…/scene-01.png", "meta": { "prompt": "…" } }
```

- Use `sourceUrl` for files (fetched on the server, 200MB max) or `inlineContent` for text/code.
- Returns `201 { asset: { …, url } }`. Error codes: 401 bad token, 404 unknown slug, 400 unknown kind.
- The token is stored in the app's Cloud secrets as `HUB_WRITE_TOKEN`. The owner gives it to you directly. It is never in the repo.

## Create assets (GET works)

Agents that can only fetch URLs can generate files on the server:

```
GET /agent-create?token=<HUB_WRITE_TOKEN>&slug=loan-horror-01&kind=image&name=scene-01&prompt=intern+opening+envelope
```

| param | notes |
|---|---|
| token | required, `HUB_WRITE_TOKEN` |
| slug | target group |
| kind | `image`, `voice`, `text`, `code` |
| name | optional file name |
| prompt | image description, or the words to speak for `voice` |
| inlineContent | the content for `text` / `code` |
| voice | optional, default `alloy` |

The same fields also work as a POST JSON body.

- `text` / `code` are saved immediately and return `201 { id, url }`.
- `image` / `voice` return `202 { id, url, status: "creating" }` right away. Poll `group-manifest` every few seconds until that asset's `meta.creating` is gone. If `meta.error` is set, it failed. Until then `url` returns 409. Voice is stored as kind `audio` (MP3).
- Voice uses `openai/gpt-4o-mini-tts` (voices: alloy, echo, fable, onyx, nova, shimmer…).
- **Push a hosted file:** add `sourceUrl=<public http(s) url>` (any `kind` from the table above). The server fetches it (200MB max), stores it, and returns `201 { id, url }`. No generation runs. Example: `GET /agent-create?token=…&slug=…&kind=image&sourceUrl=https://raw.githubusercontent.com/…/frame.png`.
- **Duplicate guard:** a repeat request for the same group and name within 60s returns the existing asset instead of making a new one. If you leave out `name`, it's derived from the prompt or content, so retries are safe.
- **Token in query string:** on GET, the token appears in the URL, so it can end up in logs and history. This is an accepted trade-off for a single-user tool. Rotate `HUB_WRITE_TOKEN` if it leaks.

## Seeing images as text

`POST /analyze-asset { "assetId": "<image id>" }` runs a `gemini-image` analysis (202, then background). When it's done, the manifest's `analyses` has `{ tool: "gemini-image", summary, report: { summary, detail } }`. Read that text to understand the picture. Analyses stuck running for more than 10 minutes become `error` ("Analysis timed out. Run it again.").

## Remotion example

```tsx
import { AbsoluteFill, OffthreadVideo, Img, Audio, Sequence } from "remotion";

const VIDEO = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=4b1e…";
const IMAGE = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=7d3f…";
const VOICE = "https://rfbrxohavioeaexhztxa.supabase.co/functions/v1/asset-url?id=a81c…";

export default function Video() {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* beat 0–3.2s at 30fps */}
      <Sequence from={0} durationInFrames={96}>
        <OffthreadVideo src={VIDEO} startFrom={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Sequence>
      <Sequence from={96} durationInFrames={90}>
        <Img src={IMAGE} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Sequence>
      <Audio src={VOICE} />
    </AbsoluteFill>
  );
}
```

Render by pasting the code into the app's `/playground`.

## Hubs, projects and skills (start here)

A **hub** (formerly "group") is a niche, e.g. `horror`. It holds **skills** (instructions), a **library** (reusable sfx, music, clips, logos, characters — each with `role` and `tags`) and a **style guide**. A **project** inside it is one video.

```
GET /project-manifest?slug=<hub>&project=<project>
```
Returns `read_first` steps, `hub.style_guide`, `shared_style_guide`, `project` (stage, plan, chosen skill), `skills` (full bodies — shared + hub), `library` (hub + `shared-library` hub, with analyses), `project_files` and `endpoints`. Follow `read_first`.

- Write into a project: add `project=<project slug>`, plus optional `role` (sfx, music, clip, image, logo, character, voice, script, plan, shot, code, render, reference, other) and `tags` (comma list) to `agent-create` / `asset-ingest`. Omit `project` to add to the hub library.
- Create or update a project: `POST /project-update` `{ token, slug, project?, name?, stage?, plan?, notes?, skill? }`. No `project` + `name` = create. Stages: idea, script, assets, voice, edit, check, render, done.
- `project.plan` is free-form JSON — any shape you and the user agree on. Nothing in the hub enforces a structure or length.
- Voiceover transcripts: audio (and role=voice video) is auto-transcribed by AssemblyAI → analysis `tool: "assembly-transcript"`, report `{ text, words:[{w,start,end}], utterances, caption_lines, cuts }` (seconds). Re-run: `POST /analyze-asset { assetId, tool: "assembly-transcript" }`. `gemini-words` still works as an alternative.
- Render: save the single-file Remotion composition as `kind=code role=code`; the user presses "Preview & render" on the project page (or call `render-video`).

## Auto cut-outs (opt-in per hub)
Hubs with `auto_cutout: true` (shown in the manifest's hub object; VOX is on) automatically get a transparent-PNG copy of every new image, whichever way it arrives. The copy is named `<name>-cutout.png`, tagged `cutout`, keeps the original's project and role, and has `meta.source_asset_id` pointing to the original. While it's being made `meta.creating` is true and its URL returns 409; on failure `meta.error` holds the reason. For collage layers, use the `cutout` file; the original is always kept.

## Search stock footage and memes (no clicks)
- `GET /functions/v1/footage-search?token=…&q=rocket+launch&type=video&orientation=portrait` → Pexels results with `download_url`.
- `GET /functions/v1/meme-search?token=…&q=mind+blown` → GIPHY results with `mp4_url`.
- Save a pick: `agent-create?token=…&slug=<hub>&project=<p>&kind=video&role=stock|meme&sourceUrl=<url>`. It is auto-described.
- Mascot clips: library assets with `role=mascot`, tagged `vertical`/`horizontal`; listed under `mascot_clips` in the project manifest. Play muted over the voiceover.
