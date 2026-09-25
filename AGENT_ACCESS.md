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
