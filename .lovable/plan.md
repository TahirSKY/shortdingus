

# Fix "No component found" - Add Default Export Detection

## Problem

The config extraction and boilerplate stripping are both working correctly now. The real issue is simpler than expected:

After stripping `RemotionRoot`, `registerRoot`, and `<Composition>`, the remaining code defines `Scene` as a plain `const` -- **it has no `export default`**. The Lambda bundle needs a default export to identify which React component to render. Without one, it shows "No component found".

## Solution

In the `pickComponentCode()` function, after stripping boilerplate, check if the resulting code has a default export. If not, detect the last top-level React component and append `export default <ComponentName>;`.

## Technical Details

### File: `supabase/functions/render-video/index.ts`

After the stripping logic in `pickComponentCode`, add:

```typescript
// Ensure there's a default export so Lambda can find the component
if (!/export\s+default\b/.test(stripped)) {
  // Find the last top-level component: const Name = () => or function Name(
  const componentNames = [...stripped.matchAll(/(?:const|function)\s+([A-Z][A-Za-z0-9]*)/g)]
    .map(m => m[1]);
  if (componentNames.length > 0) {
    const lastComponent = componentNames[componentNames.length - 1];
    return stripped + `\n\nexport default ${lastComponent};`;
  }
}
```

This detects component names (starting with uppercase, following React convention) and exports the last one as default. For the Galaxy code, this would append `export default Scene;`.

### Deployment

Redeploy the `render-video` edge function immediately after the change.

