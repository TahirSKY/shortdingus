

## Problem

The edge function (`render-video`) uses regex to parse hardcoded values from the user's `Root.tsx`. But the new `Root.tsx` no longer contains hardcoded dimensions -- it uses `calculateMetadata` to dynamically resolve them from `inputProps`. Since the regex finds nothing, every render defaults to 1920x1080 at 5 seconds.

## Solution

Update the edge function to work **with** the new `Root.tsx` architecture instead of against it. The edge function should:

1. Parse the `__REMOTION_CONFIG__` JSON header from the component code (e.g., `/*__REMOTION_CONFIG__ {"format":"tiktok","durationInSeconds":12} */`)
2. Send all supported props (`format`, `durationInSeconds`, `durationInFrames`, `fps`, `width`, `height`) through to Lambda's `inputProps`
3. Let the `calculateMetadata` function on the Lambda side handle resolution and defaults

## Changes

### File: `supabase/functions/render-video/index.ts`

Replace the regex-based Root.tsx parsing (lines 37-56) with:

1. A `parseEmbeddedConfig` function that extracts `__REMOTION_CONFIG__` JSON from the component code string (mirroring the same logic in the S3 bundle's Root.tsx)
2. Build `inputProps` payload including `code` plus any config found (`format`, `durationInSeconds`, `durationInFrames`, `fps`, `width`, `height`)
3. Remove the old regex parsing entirely -- the Lambda's `calculateMetadata` handles all dimension/duration logic now

```text
Before (what gets sent to Lambda):
  { code, width: 1920, height: 1080, fps: 30, durationInFrames: 150 }
  (always defaults because regex finds nothing)

After (what gets sent to Lambda):
  { code, format: "tiktok", durationInSeconds: 12, fps: 30 }
  (parsed from __REMOTION_CONFIG__ in user's code, calculateMetadata resolves the rest)
```

### How users control video settings

Users embed a config comment in their component code:

```
/*__REMOTION_CONFIG__ {"format":"tiktok","durationInSeconds":12,"fps":30} */
```

Or they can specify explicit dimensions:

```
/*__REMOTION_CONFIG__ {"width":1080,"height":1920,"durationInFrames":360} */
```

If no config is found, the Lambda's `calculateMetadata` defaults apply (YouTube 1920x1080, 5 seconds, 30fps).

## Technical Details

- Only the `render-video` edge function needs to change
- No frontend changes required
- The S3 bundle (Root.tsx + calculateMetadata) already handles all the resolution logic correctly
- The edge function just needs to pass through the right props instead of trying to pre-resolve them

