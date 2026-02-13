

# Fix Single-File Code Rendering

## Problem

When users paste Remotion code as a single file (without `// --- file: Root.tsx ---` markers), two things break:

1. **Config extraction fails**: The `extractRootFile()` function only works with file markers. No markers means it returns `null`, so the `<Composition durationInFrames={2100} fps={30}>` attributes are never parsed. The render defaults to 5 seconds at 30fps.

2. **"No component found"**: The entire code (including `RemotionRoot`, `<Composition>`, `registerRoot`) is sent to Lambda as the "component code". The Lambda bundle expects just the scene/component code, not the Root wrapper. It can't find a renderable component, so it shows "No component found".

## Solution

Two changes to `supabase/functions/render-video/index.ts`:

### 1. Fix config extraction for single-file code

In `extractConfig()`, when `extractRootFile()` returns `null` (no file markers), fall back to searching the **raw code** directly for `<Composition ... />` attributes:

```
// If no file markers, search the entire raw code for <Composition> tag
const searchCode = rootCode ?? rawCode;
const compositionMatch = searchCode.match(/<Composition[\s\S]*?\/>/);
```

This ensures `durationInFrames={2100}`, `fps={30}`, `width`, and `height` are extracted regardless of whether file markers are used.

### 2. Fix component code extraction for single-file code

In `pickComponentCode()`, when no file markers are found (single-file paste), strip out the Remotion Root boilerplate so Lambda only receives the actual scene component:

- Remove `export const RemotionRoot` and its function body
- Remove `registerRoot(RemotionRoot)` calls
- Remove `<Composition ... />` JSX declarations
- Remove unused imports like `Composition`, `registerRoot`

This leaves just the Scene component and its dependencies, which is what the Lambda bundle expects.

### 3. Redeploy

Deploy the updated edge function so the fixes take effect immediately.

## Technical Details

### File: `supabase/functions/render-video/index.ts`

**Change A** - `extractConfig` function: Replace the root-file-only search with a fallback:

```typescript
// Strategy 3: Parse <Composition> JSX attributes
// Try Root.tsx first, fall back to searching entire code
const searchCode = extractRootFile(rawCode) ?? rawCode;
const compositionMatch = searchCode.match(/<Composition[\s\S]*?\/>/);
if (compositionMatch) {
  const tag = compositionMatch[0];
  // ... existing JSX attribute matching logic
}
```

**Change B** - `pickComponentCode` function: For single-file code, strip Root/Composition boilerplate:

```typescript
// If no file markers, strip Root wrapper and Composition declarations
// so Lambda only gets the renderable component
const stripped = rawCode
  .replace(/export\s+const\s+RemotionRoot[\s\S]*?^};?/m, '')
  .replace(/registerRoot\(.*?\);?/g, '')
  .replace(/<Composition[\s\S]*?\/>/g, '')
  .replace(/import\s*{[^}]*\bComposition\b[^}]*}\s*from\s*['"]remotion['"];?/g, 
    (match) => match.replace(/,?\s*Composition\s*,?/, '').replace(/{\s*,/, '{').replace(/,\s*}/, '}'))
  .trim();
return stripped || rawCode.trim();
```

This ensures the Lambda bundle receives clean component code it can execute, while the config extraction separately captures duration, fps, and dimensions from the `<Composition>` tag.

