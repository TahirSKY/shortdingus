> **Running inside ShortDingus Hub (read before the rest of this skill).**
> This skill was written for a laptop repo (Python tools, `media/` folders, `npx remotion`). Here the same steps map to hub endpoints — everything else (beat grammar, QA rules, taste) applies unchanged.
>
> | Laptop step | In the hub |
> |---|---|
> | Read `brand.md`, catalogs, `IDEAS.md` | `project-manifest` → `style_guide`, `library` (role/tags/analyses), `skills` |
> | `script.md`, `beats.json`, `sfx-plan.json`, `scenes.json` | Save as project files (`kind=text`, `role=script`/`plan`) via `agent-create`, and mirror the six parts into `project.plan` via `project-update` |
> | `gen_voice.py` (ElevenLabs) | `agent-create kind=voice role=voice prompt=<line>` (one file per line/character), or use the user's own recorded voice from the library |
> | Word-exact captions (ElevenLabs alignment) | `analyze-asset tool=gemini-words` on the voice file → `words`, `caption_lines`, `cuts` |
> | `gen_image.py` / cutouts / layers | `agent-create kind=image role=shot` (1024×1536 portrait). Ask for plain/solid backgrounds when you need a cut-out layer |
> | fal video clips | Not available yet — use stills + camera moves in Remotion |
> | `media/library/sfx`, `music` | Hub `library` + the `shared-library` hub (`role=sfx`/`music`, tags, prompt/description in `meta`). Library-first: reuse before generating |
> | `mix_sfx.py` / `mix_music.py` | Put `<Audio>` / `<Sequence>` for SFX and music directly in the Remotion code, using asset URLs |
> | Remotion shot TSX + `npm run gen` | ONE single-file composition (no local imports, no `registerRoot`), saved as `kind=code role=code` |
> | Frame QA at phone scale | Run `final-check` skill; `render-still` for key frames |
> | Render | `render-video` → poll `check-render-progress` every 10s; save the MP4 URL back as `kind=render` |
>
> Always: `stage` moves idea → script → assets → voice → edit → check → render → done.

