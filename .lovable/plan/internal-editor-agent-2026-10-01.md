# Internal editor agent

A built-in editor/producer agent on its own page for each project. You chat on the left and the live video preview plays on the right. The agent already knows the hub's skills, style guide, library, voiceover transcript and asset descriptions, so you never re-explain them.

## How it works for you

1. Open a project and click **Editor**. You get one ongoing chat per project, saved in the app.
2. Drop in your premade assets (voiceover, clips, images) right in the chat. They go into the project and get transcribed and described automatically, as they do today.
3. **Proposal:** the agent reads everything and proposes the angle, structure, mascot moments, visuals and sound moments. You discuss. Nothing gets built until you say "approve".
4. **Build:** the agent writes the full video code. You watch its progress in the chat, and the preview updates when it's done.
5. **Edit:** you ask "move the title down" or "swap the clip at 0:33". The agent changes only those lines, and the preview refreshes. Each edit shows a short "what changed" card and has an **Undo** button.
6. **Render:** a button checks for missing files, then renders on your AWS setup (one render at a time). The finished MP4 link shows in the chat.

The agent can also search Pexels and GIPHY, generate images (on white, with auto cut-outs where the hub has them on), and save picks into the project. It asks before generating images, because images cost credits.

## What the agent follows

- Your hub's skills and style guide, treated as a toolbox and not a template.
- The rules already known to break renders: exact file IDs, a REMOTION_CONFIG header, no frosted-glass blur, single file, no Unsplash, never naming a component MyVideo.
- Readable code with clear names.
- The voiceover is yours. The agent never generates voice unless you ask.

## Cost control

- Edits change only the needed lines instead of rewriting the file.
- Long conversations get older messages summarised. The current code and transcript always stay in full.
- A small usage line per video shows roughly how much AI it has used, so you can see the real cost per video.

## Technical details

- **Model:** built-in `openai/gpt-6-astra` via Responses, streaming, with reasoning summaries shown. AI SDK `streamText` with tools, `stopWhen: stepCountIs(50)`, and 402/403/429 errors shown in the chat.
- **Edge function `editor-agent`:** loads the project manifest server-side as context and verifies the project. Tools:
  - `read_code`: returns the current code with line numbers.
  - `write_code`: full file, used for the first build.
  - `edit_code`: a list of `{find, replace}` exact-match edits; it fails clearly if a match isn't unique.
  - `list_assets`
  - `search_footage`, `search_memes`
  - `save_from_url`
  - `generate_image` (needs your approval)
  - `update_plan`: stage and notes.
  - Assets are written through the existing shared hub helpers, so no token is needed inside the app.
- **Code versions:** each write or edit saves a new `kind=code role=code` asset version on the project with `meta.version` and `meta.summary`. Undo restores the previous version. Before saving, a check confirms that every referenced asset ID exists.
- **Storage:** new tables `editor_messages` (project_id, ui_message jsonb, created_at; database-generated UUIDs; AI SDK ids kept in a text column), with GRANTs and RLS that match the app's current no-login setup.
- **Frontend:** new route `/groups/:slug/p/:project/editor`. AI Elements chat (Conversation, Message, MessageResponse, Tool cards collapsed, PromptInput with file drop). The preview reuses the existing `RemotionPreview` player at 9:16 or 16:9 from REMOTION_CONFIG. The render button reuses the Playground render flow (`render-video`, `check-render-progress`, missing-file preflight). On mobile, chat and preview switch with the bottom nav.
- **Persistence:** `toUIMessageStreamResponse({ originalMessages, onFinish })` saves messages, and errors are surfaced.
- **AGENTS.md:** a rule recording that code versions are project code assets and the agent edits through find/replace tools.

## Not included

- Voice generation, and multiple chats per project (you chose one chat per project).
- Login. The app stays open as it is today, but the editor will make it easier to lock down later if you want.
