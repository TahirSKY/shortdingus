# Reaction hub: deep video understanding, script on demand, character pop-ins

## What you get
- A new **Reactions** hub (menace-character reaction videos, short and long) with a starter project.
- Much deeper analysis of every source video, so the editor knows exactly what happens and when.
- A **Create script** button in the editor. It uses the chosen model, your notes and jokes, and the source analysis.
- A skill that teaches the agent how to time the pop-ins (spoken lines and silent reactions like a side-eye) and the edit style (SFX, overlays, zooms).
- A "study a reference" mode: upload Ryth videos and they get broken down into an edit-style report (when he appears, how long, the cuts, sounds, text) instead of a story summary.

## 1. Deeper video analysis
Today each video gets about 30 short beats. For reactions, that is too thin. New analysis for source and reference videos:
- **Dense timeline:** splits long videos into chunks so nothing is skipped. Records every cut, who is on screen, facial expressions, on-screen text, sounds and music changes.
- **Reaction moments:** marks lines that are sus, cringe, funny or shocking, each with a suggested reaction (speak, side-eye, stare, freeze-frame and zoom, mute).
- **Quote list:** exact spoken lines with times (from the AssemblyAI transcript already running), merged into the timeline.
- **Reference-style mode** for clips tagged `reference`: lists edit events (character pop-in times and lengths, zooms, SFX hits, captions, pacing) and gives a short "how this editor works" summary.
- Uses a stronger Gemini model for this (Gemini 3.1 Pro), with the current one as backup.

## 2. Script, only when you ask
- The project gets a **Notes** box for your jokes and context.
- The **Create script** button sends this to the editor agent: source analysis + transcript + notes + hub skill + character personality. It returns a script with a timeline: which source moments play, where the character cuts in, what he says or does (including silent reactions), and a clean voiceover read for you to record outside.
- The script is saved to the project. You can then edit it by chatting.

## 3. Editing after the voice
- Upload your voice. It's transcribed automatically, as now.
- The agent matches each voice line to its pop-in moment and builds the video: source clip plays, pauses or zooms, the character appears and talks with a moving mouth, SFX and overlays.

## 4. Character (later)
- When you've picked a look, we build it as an SVG character with poses (idle, side-eye, laugh, angry, shocked) and mouth shapes timed to the voice. It's saved to the hub as a reusable part.
- Until then, the skill uses a placeholder slot.

## What I need from you later
- The character idea (a sketch or description).
- Your SFX pack and a few Ryth clips, uploaded to the hub library (tag them `reference`).

## Technical details
- Hub `reactions` in `asset_groups` + starter project; skill `skills/reaction-menace.md` imported as a hub skill.
- `_shared/analysis.ts`: new `runReactionVideo` (tool `gemini-reaction`), selected when the asset's hub has a flag in `asset_groups` (new column `analysis_mode text default 'standard'`) or the asset is tagged `reference` (tool `gemini-edit-style`). Chunked by duration (~60s windows, using a time-range prompt on the same signed URL), raises the beat cap and field lengths, merges with the AssemblyAI words. Uses google/gemini-3.1-pro-preview, falling back to 3.8 Flash.
- `describe()` in `_shared/editor-context.ts` includes reaction moments and edit-style reports in full for project assets.
- Editor: a "Create script" button sends a fixed instruction message; the agent saves the result as a project `text` asset with role `script` via a new `save_script` tool. The project notes field already exists (`projects.notes`) and is shown in the editor.
