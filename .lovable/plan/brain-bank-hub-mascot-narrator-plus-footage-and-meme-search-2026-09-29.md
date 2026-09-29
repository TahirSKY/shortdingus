# Brain Bank hub: mascot narrator, plus footage and meme search for agents

## What you get
A **Brain Bank** hub set up for your channel. An outside AI agent opens a project there and gets:
- your mascot clips, both vertical and horizontal
- a skill explaining how Brain Bank videos are made: voice first, mascot popping in as the narrator, everything else made fresh
- search tools it can call directly for stock footage and memes, with no button clicks from you

## 1. The hub
- Create hub **Brain Bank** (slug `brain-bank`) with a short description and a starter style guide: high quality, no slideshow feel, no AI slop. You can edit it later.
- Auto cut-outs **on**, so the Vox-style layers get see-through images.
- A starter project that uses the new skill.

## 2. Mascot library
- A new library type, **mascot**, with tags `vertical` or `horizontal`. When you upload a clip, the app picks the tag from the clip's shape.
- Every clip is described automatically, as today: setting, gestures, mouth movement and length. The agent can then pick the clip that fits a line ("pointing, excited, in the kitchen").
- You upload the 5 + 5 clips on the Library tab. Adding more later works the same way.

## 3. Brain Bank skill (a guide, not a template)
Written as advice for the agent, not fixed rules:
- **Voiceover first:** the agent works from the timed transcript (AssemblyAI).
- **Mascot as narrator:** pick a few moments where the mascot appears for a couple of seconds. His clip is muted and plays over the voiceover so he seems to be speaking. Choose clips whose mouth movement and energy fit the line, and use the version that matches the video's orientation.
- **Everything else:** Vox-style collage, generated images, motion graphics, stock footage and memes, mixed as the story needs. The agent decides the structure and length with you.
- Technical notes: muted `<OffthreadVideo>`, trim the clip to fit the line, and use the correct 9:16 or 16:9 format.
- It points to the other skills (vox, 2D generator, suggest-sfx, retention ideas, final-check) as optional tools.

## 4. Agent search tools (no clicks)
New token-checked endpoints, listed in the agent link:
- **Stock footage search:** videos and photos from **Pexels** (free), filtered by orientation.
- **Meme / GIF search:** from **GIPHY** (free).
- Search results come back as a list with preview links. The agent then saves the ones it wants into the project using the existing `agent-create` with `sourceUrl`. Saved clips are described automatically.
- Everything is listed in the agent link and `AGENT_ACCESS.md`.

## What I need from you
- A free **Pexels API key** (pexels.com/api) and a free **GIPHY API key** (developers.giphy.com). I'll open a secure form for each. Please don't paste them in chat.
- The 10 mascot clips, uploaded to the hub after it's built.

## Technical details
- Migration: add `mascot` to allowed roles (if a CHECK constraint exists), insert `brain-bank` into `asset_groups` (auto_cutout true, style_guide) and a starter project.
- `skills/brain-bank.md` is imported with `scripts/import-skills.ts` as a hub skill for brain-bank.
- Browser upload: use the video's width and height to set the `vertical`/`horizontal` tag and the `mascot` role when uploading to the mascot section.
- New edge functions `footage-search` (Pexels `/videos/search` and `/v1/search`, `orientation` param) and `meme-search` (GIPHY `/v1/gifs/search`, returns mp4 renditions). Both use `HUB_WRITE_TOKEN`, work with GET or POST, have `verify_jwt = false`, and return small JSON results.
- `project-manifest` gets the new endpoints and lists mascot clips grouped by orientation.
- Test: search both tools with the token, push one result into the project, and check it shows up with a description.
