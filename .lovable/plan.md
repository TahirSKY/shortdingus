# Save a video as a "style reference"

## What you get
- In the editor, a **Save as style reference** button. You give it a name (e.g. "Taped evidence board") and an optional note on what you like ("duct-taped photos, investigation feel, bold condensed captions").
- The agent reads the finished video's code and writes a short **style card**: fonts, colors, caption look, image treatment (tape, paper, shadows), transitions, pacing, and sound habits. You can edit that card.
- References are saved to the hub, so every new project in that hub can use them. You can also mark one as shared with every hub.
- In any new project, tell the agent "use the Taped evidence board style." It loads the card and the original code to learn the techniques. It then makes a new video around your new voiceover, not a copy.
- A small list of references in the hub page lets you rename, edit, or delete them.

## Guardrails against templating
- The agent is told that references show style and technique (fonts, textures, motion feel), not structure. It must not copy section order, timings, or text.
- References are used only when you name one or say yes when the agent suggests one.

## Technical section
- Store references as hub library `text` assets with `role = style-reference`. The style card goes in `inline_content`. `meta` holds `source_code_asset_id`, `source_project_id` and the user's note. This uses the existing tables and needs no migration.
- `knowledge()` lists reference names and one-line summaries. A new `read_style_reference(id)` tool in `editor-agent` returns the full card plus the source code, trimmed to the key components.
- A new `save_style_reference` tool lets the agent draft the card from the current code and save it, so the button just sends a chat request.
- Editor gets the button and dialog. GroupDetail gets the reference list using the existing asset panel filtered by role.
