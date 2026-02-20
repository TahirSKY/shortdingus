

# Save Renders to Library with Notes

## Overview
Add the ability to save rendered videos and posters to a persistent library, with optional notes for each item. This involves creating a database table to store render metadata and building UI for saving and browsing saved renders.

## How It Works

1. **After a render completes** (on the Result page), a new "Save to Library" button appears alongside the Download button
2. Clicking it opens a small dialog where you can type a **title** and **notes** (e.g., "Client A kitchen flythrough - version 2")
3. The render URL, type (video/poster), title, and notes are saved to the database
4. A new **Renders Library** page (accessible from navigation) shows all saved renders in a grid/list with their notes, preview, and options to download or delete

## Changes

### 1. Database -- New `saved_renders` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| title | text | User-provided label |
| notes | text (nullable) | Free-form notes |
| url | text | The render output URL |
| mode | text | "video" or "poster" |
| created_at | timestamptz | Auto-set |

No RLS restrictions (public table, no auth in this app).

### 2. RenderResult page -- Add "Save to Library" button
- Add a "Save to Library" button next to the Download button in the top bar
- Clicking it opens a Dialog with Title (required) and Notes (optional) fields
- On save, inserts a row into `saved_renders` and shows a success toast
- Button changes to "Saved" (disabled) after saving to prevent duplicates

### 3. New page -- Renders Library (`/renders`)
- Grid of saved renders showing:
  - Thumbnail (poster image or video element)
  - Title, notes, mode badge, date
  - Download and Delete buttons
- Add route `/renders` to App.tsx
- Add navigation link to the renders library from the main nav and existing pages

### Technical Details

- **Migration SQL**: Creates the `saved_renders` table with no RLS (public access)
- **Components modified**: `src/pages/RenderResult.tsx` (save dialog), `src/App.tsx` (new route)
- **Components created**: `src/pages/RendersLibrary.tsx` (library page)
- **Data access**: Standard Supabase client queries (`insert`, `select`, `delete`) on `saved_renders`

