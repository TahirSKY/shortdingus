# Hubs → Projects, with Skills built in

## The idea in one picture

```text
Hub: "Horror"            (a niche / channel)
 ├─ Skills               how videos in this niche are made (instructions)
 ├─ Library              reusable stuff: sound effects, music, clips, logos, characters
 ├─ Style guide          voice, colours, fonts, pacing rules
 └─ Projects
     ├─ "The Door Video"   one actual video: script, voice, shots, plan, renders
     └─ "Basement Tape"
```

Every AI agent (Claude, ChatGPT, anything outside) opens a project through one link and gets everything it needs: the hub's skills, the library, the style guide and the project's own files. It does the work, pushes results back, and the video is saved ready to render on your AWS setup.

## What changes

### 1. Hubs (today's Groups become Hubs)
- Your existing groups become hubs; nothing is lost.
- A hub page has four tabs: **Projects, Skills, Library, Style**.
- Library items are marked as a type: sound effect, music, clip, image, logo, character, voice. Each has tags and a description (auto-described like today), so agents can search "door creak" or "tense music".

### 2. Projects inside a hub
- "New project" → give it a name → pick a skill to follow (e.g. Vox collage).
- A project holds its own files: idea, script, voice lines, shots, sound plan, video code, renders.
- A project shows its stage, following the skill's steps (see section 4), so you and the agent always know what's next.
- One "Agent link" per project: the agent reads everything and writes back with your token.

### 3. Skills (ready on day one)
Skills are written instructions an agent follows. They live at two levels:
- **Shared skills** available to every hub (the starter pack below).
- **Hub skills** you add or edit for one niche (e.g. Horror pacing rules).

Starter pack, imported from the GitHub project and adapted to our tools (our voice, our library, our render service instead of a laptop):
- **Make code-only short** (animated lessons, no footage)
- **Make AI-character short** (one recurring character kept consistent across shots)
- **Make Vox collage short** (paper-cutout layers + moving camera)
- **Suggest sound effects** (place effects on exact spoken words, from the library)
- **2D visual generator + style presets**
- **Retention story structure** (below), used by all of them
- **Editing from raw footage** (from the first video): cut silences/filler/bad takes, clean audio, music bed, sound on the word, fake screen recordings
- **Packaging**: 3 titles + 3 thumbnail ideas per video
- **Final check** before render: cut-off words, voice/caption sync, banned words, phone-size frame check

You can add more skills later from the Skills tab (paste text or upload a file).

### 4. The retention structure is built in, not just text
Every project plan follows the six parts: **Hook → Setup → Quiz/question → Reveal → Twist → Loop back to the start**. The project page shows these six parts with their timings, and the final check warns if one is missing or the hook is too slow.

### 5. Voice, captions and cutting available to agents
- Your existing voice system stays. Agents can ask for a voice line per scene and get it back as a library/project file.
- **Word-by-word timing** for every voice line and uploaded video, so captions highlight each word and sound effects land on the right word. This is the key missing piece from both videos.
- **Cut suggestions** for uploaded footage: silences and filler words found from the word timing, returned as a cut list the agent can use.

### 6. Seeded library
The music and sound-effect clips from the GitHub project (with their catalog descriptions) get imported into a shared library so agents have sounds from day one. Its brand/style file becomes an example style guide.

### 7. Render from a project
"Render" on a project sends its video code to the existing AWS setup; the finished video is saved in the project and in Renders.

## Build order
1. Database: hubs, projects, skills, library tags; move existing groups into hubs.
2. Hub page (Projects / Skills / Library / Style) and project page (files, six-part plan, stage, agent link, render).
3. Import the starter skills and the sound/music library from GitHub.
4. Agent link: one read link per project that bundles skills + library + style + project files; write-back uses your existing token.
5. Word timing for voice and video, cut suggestions, caption timing.
6. Final-check skill + retention warnings on the project page.
7. Update the agent guide and test end to end: create "Horror" hub, a project with the Vox skill, have an agent build and render it.

## Technical details
- New tables: `hubs` (from `asset_groups`), `projects` (hub_id, name, slug, skill_id, stage, plan jsonb with six story parts), `skills` (hub_id nullable = shared, name, slug, body markdown, references), `assets` gains `project_id` (nullable = hub library), `role` (sfx|music|clip|image|logo|character|voice|script|code|render…) and `tags text[]`. Grants + RLS matching today's no-login model.
- `group-manifest` → `project-manifest?hub=&project=` returning skills (shared + hub), style guide, library with tags/descriptions, project files, stage and plan. Old manifest links keep working.
- `agent-create` / `asset-ingest` accept `project` and `role`/`tags`; add `project-update` for stage/plan changes (token checked).
- Word timing: speech-to-text with word timestamps on voice/video assets, stored as a `transcript` asset; cut list derived from gaps and filler words.
- GitHub import is a one-time script copying SKILL.md files and `media/library` clips + catalogs into storage.
- ElevenLabs is not added; we keep the current voice system. It can be added later if you want that exact voice quality (needs your key).
