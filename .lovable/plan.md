# Flexible toolbox, plus voiceover transcripts

The hub becomes a toolbox for your outside AI: skills, library, style and project files. The app suggests things but sets no rules. You and your agent decide the length, structure and pacing.

## 1. Remove the fixed template
- **Project page:** remove the "Story plan · six parts" boxes and their warnings (like "hook must be under 3.4s"). Keep the **Idea** notes box.
- **Skills:** rewrite `retention-structure` as a reference guide. It explains what hook, setup, quiz, reveal, twist and loop are and why they work, framed as ideas to use when they fit. It removes fixed times (0.5s, 3.4s), fixed lengths (35–45s / 40s) and "every video must" wording. Make the same edits wherever these rules appear in the other skills (make-short, make-vox, make-ai-short, suggest-sfx, final-check).
- **Agent link:** change the "read first" steps from orders to a menu, for example: "These skills and library items are here to help. Agree the structure and length with the user." The six-part plan will no longer be required. `project.plan` stays as an open notes field the agent can fill in any way it likes.
- **final-check:** keeps the practical checks (cut-off words, voice and caption sync, banned words, phone-size frames) and drops the timing and structure warnings.

## 2. Voiceover and AssemblyAI transcripts
- The project page gets a **Voiceover** section. You upload an audio or video file there. It's saved into the project with the role "voice".
- Uploading it automatically sends it to AssemblyAI (no button to press). A **Transcribe** button is there to run it again.
- The result is a word-by-word timed transcript, shown under the file. You can read it with timestamps, and captions and suggested cuts (silences and filler words) are made from it.
- Your agent gets the same transcript through the agent link, as `words: [{w, start, end}]` in seconds.
- Voice files pushed in by agents (`agent-create` voice or `asset-ingest` audio into a project) get transcribed the same way.

## Technical details
- Save the AssemblyAI key as the secret `ASSEMBLYAI_API_KEY` using the secure form. I won't put it in code. You pasted it in chat, so it's in the chat history. Consider rotating it later.
- In `_shared/analysis.ts`, add `runAssembly`: upload a signed URL to `POST /v2/transcript` with `speech_model: "universal"`, then poll in the background. Map its milliseconds to seconds. Report `{ text, words, caption_lines, cuts, utterances }`, saved as `asset_analyses` with `tool = "assembly-transcript"`, which the tool check already allows. This replaces the 501 path in `analyze-asset`.
- Auto-start in `startAnalysis` for audio, and for video with role `voice`. Keep `gemini-words` as an option. Reuse the 10-minute stale timeout and status `error` on failure.
- `ProjectDetail.tsx`: drop `PlanEditor` and its warnings, and add a Voiceover panel with a transcript viewer. `project-manifest`: soften `read_first`. `project-update`: accept any JSON for `plan`.
- Re-import the edited skills with `scripts/import-skills.ts`. Update `AGENT_ACCESS.md`.
- Test: upload a short voice clip, check that a timed transcript shows up without a click and appears in the agent link.
