# Make the editor's "Build" step reliable (no quality cut)

## What is actually happening

- The proposal step works: the agent read your files and replied normally.
- Both times you said "build it", the AI service was still writing your video when our side hung up on it at about 58 seconds. The AI log shows "cancelled by our side", not an error, and no code was saved.
- The outside agent setup is not involved. The editor talks to the AI directly. The problem is how the build is tied to your open browser page.
- Most likely cause: in the last fix I stopped sending the code to your page while it was being written. That leaves the connection silent for a long time, and silent connections get closed at about 60 seconds. When the page connection closes, the build is cancelled with it. Step 1 below checks this before anything else changes.
- Side effect: each retry saved your message again, so this chat now has the proposal request 3 times and "build it" 2 times, with no reply after them.

## What changes (video quality stays the same)

The same AI model, the same thinking level and the same full context (transcript, word timings, skills, library). Nothing is trimmed.

1. **Confirm the cause first.** Run one build test and watch exactly when and why it stops.
2. **The build no longer depends on your page staying connected.** Once started, the build finishes and saves on the server even if the page reloads, the connection drops or you close the tab. When you come back, the new version is there.
3. **A live progress line instead of silence.** Every few seconds the chat shows something like "Writing your video… about 420 lines so far". The connection stays alive and you can see it working.
4. **Long videos are built in parts.** The agent writes the file in sections (for example setup and constants, scenes, captions and sound). Each section is saved as it's finished. If anything stops partway, it continues from the last saved section instead of starting over. The finished file is still one complete video, same as before.
5. **No more endless "Pending".** If the page loses track of a build, it checks what's saved, shows "Still building…" or the finished version, and offers a **Continue** button only if the build really stopped.
6. **Clean up this chat.** Remove the repeated copies of your messages so the agent sees one clear proposal request and one "build it". Retries won't create duplicates anymore.

## How we test it

- A full build on "The medium popcorn at the movies is a trap", from "build it" to a working preview.
- Reload the page in the middle of a build and confirm it still finishes and appears.
- One small edit afterwards, to confirm edits still change only what you asked.

## Technical details

- Diagnosis evidence: AI gateway requests `01a0f76a-dff9…` (12:23:49Z) and `01a0f770-c8b0…` (12:30:17Z) both `cancelled (http 499, upstream 200)` at about 58.1s and 58.4s, with 0 output tokens recorded. The function passes `abortSignal: req.signal`, so a client or proxy disconnect aborts the model call. The `tool-input-delta` filter leaves the response byte-silent while the model writes code. Step 1 confirms this using a timed curl against the function.
- `editor-agent`:
  - Remove `abortSignal: req.signal`.
  - Run the stream to completion in `EdgeRuntime.waitUntil` (`result.consumeStream()`), so `onFinish` always saves messages.
  - Replace dropped deltas with a throttled `data-progress` part every ~3s (character and line count of the tool input so far). This keeps the connection alive at low CPU cost.
- Sectioned build: new tool `write_code_part({ part, total, code, summary, final })` stores drafts in the project (`kind=code`, `meta.draft=true`, `meta.part`). The final part joins the sections, runs the existing UUID check and `saveVersion`, and removes the drafts. The prompt tells the model to use parts for large files. `write_code` stays for small files. If the function hits its time limit, the next request sees the saved drafts and continues from the next part.
- Frontend (`Editor.tsx`): render `data-progress`. Add a stall watchdog (no stream events for about 45s, or an error): refetch `editor_messages` and code assets, then show a finished version, "still building", or a Continue button that sends "continue the build". Send each user message's id once and dedupe on upsert.
- Data cleanup: delete the duplicate user rows (`epRPGwzbBgr8PTL2`, `y0r6VA8AX5Imtbr2`, `qCmHeM3qgDUIbI09`) and the assistant row with an empty `msg_id` in this project's `editor_messages`.
- AGENTS.md: replace the editor rule to note that builds run detached from the request and large files are written in saved parts.
