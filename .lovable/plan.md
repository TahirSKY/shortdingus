

# Image Library for LLM Video Generation

## Summary
Add a new "Image Library" page where users can upload images (from URL or device), store them in Lovable Cloud storage, and get clean public URLs. The page provides a one-click "Copy for LLM" button so users can paste image references directly into their LLM prompts.

## What Gets Built

### 1. Storage Bucket (Database Migration)
- Create a public `images` storage bucket
- Add RLS policies allowing anonymous uploads, reads, and deletes (since no auth system exists in the app)

### 2. Edge Function: `fetch-image`
- Accepts a JSON body with `{ url: string }`
- Fetches the image from the external URL server-side (avoids CORS)
- Returns the image bytes and content type to the client
- Needed for pasting URLs from sites like Zillow that block browser-side fetches

### 3. New Page: `/images` -- `src/pages/ImageLibrary.tsx`
**Top Section:**
- Displays the base URL with a "Copy Base URL" button
- Helper text explaining how LLMs can reconstruct full URLs

**Input Section:**
- Text input for external image URL
- File upload / drag-and-drop area
- Text input for image label (e.g., "kitchen", "master_bedroom")
- "Add Image" button
- Label sanitization: lowercase, spaces to underscores, strip special chars
- Filename format: `{sanitized_label}_{6 random alphanumeric}.jpg`

**Image Grid:**
- Cards showing thumbnail, label, filename
- Download button (uses anchor tag with `download` attribute set to exact Supabase filename)
- Copy URL button (copies full public URL)
- Delete button (removes from storage)

**Bottom Section:**
- "Copy for LLM" button that copies a formatted block containing the base URL and all filenames

### 4. Routing Update (`App.tsx`)
- Add `/images` route pointing to `ImageLibrary`

### 5. Navigation Update (`Index.tsx`)
- Add "Image Library" link to the landing page nav bar

## Technical Details

### Storage Path Structure
```
images/{sanitized_label}_{random6}.jpg
```
No user ID subfolder since the app has no authentication. All images go into a flat structure within the `images` bucket.

### Edge Function: `fetch-image`
- Located at `supabase/functions/fetch-image/index.ts`
- CORS headers included
- Validates the URL before fetching
- Returns raw image bytes with appropriate content-type
- Handles errors (invalid URL, fetch failure, non-image response)

### Image Upload Flow
1. **From URL**: Client calls `fetch-image` edge function -> gets image blob -> uploads to storage via Supabase JS client
2. **From file**: Client reads file directly -> uploads to storage via Supabase JS client
3. Both paths convert/store as `.jpg` and generate the clean filename

### Copy for LLM Output Format
```
IMAGE BASE URL: https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/images/

Uploaded images (download and upload these to this chat):
- kitchen_a8f2k9.jpg
- master_bedroom_k2m5n8.jpg

To use in code: {BASE_URL} + filename
Example: https://rfbrxohavioeaexhztxa.supabase.co/storage/v1/object/public/images/kitchen_a8f2k9.jpg
```

### Image Listing
Since there's no database table tracking uploads, the page will list images by calling `supabase.storage.from('images').list()` directly. Each file's public URL is constructed from the known base URL pattern.

### Config.toml Update
Add JWT verification disabled for the `fetch-image` function:
```toml
[functions.fetch-image]
verify_jwt = false
```

## Files to Create/Modify

| File | Action |
|------|--------|
| SQL migration (storage bucket + RLS) | Create |
| `supabase/functions/fetch-image/index.ts` | Create |
| `supabase/config.toml` | Modify (add function config) |
| `src/pages/ImageLibrary.tsx` | Create |
| `src/App.tsx` | Modify (add route) |
| `src/pages/Index.tsx` | Modify (add nav link) |

