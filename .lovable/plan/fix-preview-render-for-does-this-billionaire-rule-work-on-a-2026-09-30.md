# Fix "Preview & render" for "Does This Billionaire Rule Work on a Normal Salary?"

## What I found

1. **A mascot clip that doesn't exist.** The agent's latest code (`billionaire-rule-remotion-with-sfx`) plays 4 mascot clips. Three are real files in the Brain Bank library, but the fourth (`8f3fe471…`) is not in the hub at all. When the video reaches 33.1s it tries to load that clip, gets "not found", and the render stops. This is the main cause.
2. **The code looks odd because the agent squashed it.** The whole video is written as a few very long lines with short names (`U`, `m`, `t`), so it's almost impossible to read or tweak. It works technically, but nobody can review it.
3. **Nothing stops bad code getting saved.** The hub accepts any code, even if it points to missing files, and the render panel only shows a generic failure, so the real reason is hidden.
4. **Minor:** the voiceover file (`download (1).mp3`) has no "voice" type set, and the mascot videos have no "mascot" type, so the agent link lists them as general files. That's likely why the agent guessed a clip ID.

## What I'll do

1. **Fix this video's code:** replace the missing clip with one of the real mascot clips, and save a cleaned-up, readable version (one idea per line, clear names, a proper length/size header) as a new code file in the project, so Preview & render picks it up.
2. **Check links before preview and render:** when you press Preview & render, check every hub file the code uses. If any is missing, show a clear message naming it (e.g. "Clip 8f3fe471 isn't in this hub") instead of failing later.
3. **Show the real render error:** show the actual reason from the render service in the render panel.
4. **Mark the files properly:** set the voiceover file to "voice" and the 4 mascot videos (plus the 5th if present) to "mascot" with their vertical/horizontal tags, so the agent link lists them correctly.
5. **Update the agent guide** (Brain Bank skill + agent guide): only use file IDs from the agent link, write readable code (no squashing), and put the length/size header at the top.
6. Render the fixed video end to end and confirm it finishes as an MP4.

## Technical details

- Missing ID confirmed with a database lookup; the other clip and sound IDs resolve.
- Pre-flight check: parse `asset-url?id=<uuid>` occurrences in the code and query `assets` for existence / non-null `storage_path` (in `ProjectDetail.openInPlayground` and before calling `render-video`).
- Surface `render-video` / `check-render-progress` error bodies in `RenderControls`.
- `agent-create`/`project-update` stay permissive; the check is advisory in the UI plus a warning in the returned JSON when a code asset references unknown IDs.
