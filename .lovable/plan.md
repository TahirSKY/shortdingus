

# Refactor: Deterministic Remotion Lambda Edge Functions

## What's Wrong Today

The current edge functions have two major sources of fragility:

1. **render-video**: Contains ~150 lines of regex-based code parsing (`extractConfig`, `extractRootFile`, `pickComponentCode`) that tries to guess fps, duration, width, height from user code strings. It then manually computes `framesPerLambda` -- a value Remotion can calculate itself. This guessing frequently produces wrong chunk sizes, causing either AWS concurrency limit errors or Lambda timeouts.

2. **check-render-progress**: Implements a full manual AWS Signature V4 signing flow (~40 lines of crypto code) instead of using Remotion's official `getRenderProgress()` SDK function. This is brittle and unnecessary.

Both problems have official SDK solutions that are simpler and documented for Deno/Supabase Edge Functions.

---

## What Changes

### A) `supabase/functions/render-video/index.ts` -- Full Rewrite

**Removed (~160 lines):**
- `extractRootFile()` -- regex parsing of Root.tsx from code blob
- `extractConfig()` -- 3 regex strategies to guess fps/duration/dimensions
- `pickComponentCode()` -- stripping boilerplate, injecting default exports
- Manual `framesPerLambda` calculation with `MAX_CHUNKS` logic
- `FILE_MARKER` regex constant

**New behavior (~60 lines):**
- Accept POST body: `{ code, format?, compositionId?, codec?, inputProps?, debug? }`
- Build `inputProps = { code, format, ...extraInputProps }` -- pass raw code untouched to Lambda. The Lambda's `Root.tsx` `calculateMetadata` already handles dimensions via format and parses config from the code string. No need to duplicate that logic here.
- Map format string to width/height and pass as inputProps so `calculateMetadata` on Lambda can use them
- Call `renderMediaOnLambda()` from the official SDK with `concurrency` (not `framesPerLambda`) -- letting Remotion decide how to split frames
- `concurrency` defaults to 4 (configurable via `MAX_CONCURRENCY` env var), clamped 1-200
- Return structured JSON: `{ renderId, bucketName, region, compositionId, concurrency }`

### B) `supabase/functions/check-render-progress/index.ts` -- Full Rewrite

**Removed (~80 lines):**
- Entire manual AWS SigV4 signing implementation (hmac, sha256, canonical request construction)
- Manual Lambda REST API invocation via fetch
- Custom throttle handling

**New behavior (~30 lines):**
- Accept POST body: `{ renderId, bucketName, debug? }`
- Call `getRenderProgress()` from `npm:@remotion/lambda-client@4.0.420`
- Return Remotion's progress object directly as JSON (includes `overallProgress`, `done`, `outputFile`, `fatalErrorEncountered`, `errors`, etc.)

### C) `src/pages/Playground.tsx` -- Minor Update

- Update `handleRender` to send `format` as a string (`"youtube"`, `"tiktok"`, `"square"`) instead of raw width/height, since the edge function and Lambda's `calculateMetadata` now handle dimension mapping
- The response fields (`renderId`, `bucketName`) stay the same, so polling logic is unchanged

### D) `supabase/config.toml` -- No Change Needed

JWT verification is already disabled by default for these functions.

---

## Technical Details

### render-video/index.ts -- New Structure

```text
Imports:
  - renderMediaOnLambda from npm:@remotion/lambda-client@4.0.420

Constants:
  - corsHeaders (with full Supabase header list)
  - FORMAT_DIMENSIONS map: youtube->1920x1080, tiktok->1080x1920, square->1080x1080

Handler:
  1. OPTIONS -> 200
  2. Parse body { code, format?, compositionId?, codec?, inputProps?, debug? }
  3. Validate code is non-empty
  4. Read env: AWS_REGION, REMOTION_LAMBDA_FUNCTION_NAME, REMOTION_SERVE_URL, MAX_CONCURRENCY
  5. Build inputProps = { code, format, width, height, ...extraInputProps }
     - width/height come from FORMAT_DIMENSIONS[format] or default 1920x1080
  6. concurrency = clamp(MAX_CONCURRENCY || 4, 1, 200)
  7. Call renderMediaOnLambda({ serveUrl, composition, codec, region, functionName, inputProps, concurrency, logLevel })
  8. Return { renderId, bucketName, region, compositionId, concurrency }
```

### check-render-progress/index.ts -- New Structure

```text
Imports:
  - getRenderProgress from npm:@remotion/lambda-client@4.0.420

Handler:
  1. OPTIONS -> 200
  2. Parse body { renderId, bucketName, debug? }
  3. Read env: AWS_REGION, REMOTION_LAMBDA_FUNCTION_NAME
  4. Call getRenderProgress({ renderId, bucketName, functionName, region })
  5. Return the full progress object as JSON
```

### Playground.tsx -- Changes

```text
Current:  body: { code, width: format.width, height: format.height }
New:      body: { code, format: format.label.toLowerCase() }
```

The rest of the polling logic (`renderId`, `bucketName`, `overallProgress`, `done`, `outputFile`, `fatalErrorEncountered`) remains identical since `getRenderProgress` returns the same shape as the manual Lambda invocation did.

---

## Required Environment Variables (Already Configured)

All five secrets are already set in the project:
- `AWS_ACCESS_KEY_ID` -- used by SDK internally
- `AWS_SECRET_ACCESS_KEY` -- used by SDK internally
- `AWS_REGION` -- default "us-east-1"
- `REMOTION_LAMBDA_FUNCTION_NAME` -- Lambda function name
- `REMOTION_SERVE_URL` -- S3 bundle URL

Optional new one:
- `MAX_CONCURRENCY` -- not yet set, defaults to 4. Can be added later if needed.

---

## Why This Fixes the Problems

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Concurrency errors on short videos | `framesPerLambda` too small = too many chunks | Use `concurrency` instead; Remotion decides chunk size |
| Timeouts on long videos | `framesPerLambda` too large = single chunk too slow | `concurrency` lets Remotion balance automatically |
| "No component found" from code stripping | `pickComponentCode` mangled user code | Pass raw code untouched; Lambda handles evaluation |
| Fragile progress checking | Manual SigV4 can silently fail | Official `getRenderProgress()` SDK call |

