# Asset Hub rebuild — file cabinet + tool bench

I'll follow your plan as written. There are a few places where I'd change the approach to get the same result with less risk. Each one is marked **Change**.

## What stays exactly as you wrote it
- Part 1 deletions: pages, root clutter, old functions, old tables. The only exceptions are the `studio` EDL compiler files, which stay.
- Part 2: rendering, Playground, Renders, Examples, templates. None of it gets touched.
- Part 4 data model: `asset_groups`, `assets`, `asset_analyses`, with slugs, indexes, and update triggers.
- Part 6 UI: a Groups index at `/`, `/groups/:slug` with four sections, and the new mobile nav (Groups, Playground, Renders, Examples).
- Part 7: `AGENT_ACCESS.md` as the contract for agents.

## Changes I recommend

1. **Delete the deployed functions too, not just the files.** Deleting the source leaves `studio-agent`, `studio-image`, `studio-voice`, `edge-tts`, `generate-remotion` and `video-analyzer` still running live. I'll remove them from the backend as well. Your plan leaves out `video-analyzer`, but it gets replaced by `analyze-asset`, so it goes too.

2. **Run analysis in the background and poll.** A Gemini pass on a 60-second video can take longer than a browser request comfortably waits. `analyze-asset` will create the row, return right away, and finish the work in the background (`EdgeRuntime.waitUntil`). The group page polls every 5 seconds until the analysis is complete or has failed. The saved result is the same; you just avoid timeouts.

3. **Browser uploads go directly to storage.** Files go to `hub-media` directly, not through `asset-ingest`, because edge functions have request-size limits. `asset-ingest` stays the agent write path, working from a URL or inline text as you specified.

4. **Be honest about the write token.** The app has no login and uses open "anyone" access rules, so the token only protects the agent endpoint. Anyone holding the public key could still write through the database. I'll build it to match your plan: public read, open write, token on ingest. The real lock-down is a later choice between a single-user login and making all writes go through token-checked functions. I can do either one next.

5. **Use one manifest endpoint and skip committing a manifest into GitHub (option a).** Agents that can reach the web can use the live `group-manifest` URL. Committing JSON into the repo creates stale copies and needs a GitHub write path. `AGENT_ACCESS.md` will include the full URLs, so an agent told only a slug can use them.

6. **Stable URL detail.** `asset-url` returns a 302 redirect to a 1-hour signed link. Remotion's browser Player and Lambda's headless Chrome both follow the redirect. Long renders are fine, because Lambda fetches each asset once at the start. For inline text and code assets, `asset-url` returns the content directly instead of redirecting.

7. **Keep the old `studio-media` bucket for now.** The old tables get dropped, but the files stay in that bucket. Deleting the bucket can't be undone, so I'll leave it unless you tell me to empty it.

## Build order
1. Delete files, routes, nav links and deployed functions. Confirm build and tests pass.
2. Migration: drop the old tables, then create the three new tables, access rules, and storage rules for `hub-media`.
3. Create the private `hub-media` bucket and generate the `HUB_WRITE_TOKEN` secret.
4. Write and deploy `asset-url`, `group-manifest`, `asset-ingest` and `analyze-asset`, each with `verify_jwt = false` in config.
5. Build the Groups index, group detail page and nav.
6. Write `AGENT_ACCESS.md` and `docs/agent-write-token.md`.
7. Verify end to end:
   - Create a group and upload a short video, an image and a text asset.
   - Run the analysis and confirm the beats appear.
   - Fetch the manifest with curl.
   - Ingest one asset through the agent path.
   - Paste a stable URL into Playground and confirm it previews.

## Technical notes
- Slugs are generated in the client from the title. On collision, a numeric suffix is added (`-2`, `-3`) and the save is retried against the unique index.
- `analyze-asset` reuses the existing gateway call and beat normalisation from `video-analyzer`, keeping the same beat shape. The `assembly-transcript` branch returns 501 for now.
- `group-manifest` builds URLs from `SUPABASE_URL`, so no project ref is hardcoded.
