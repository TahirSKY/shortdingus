ALTER TABLE public.asset_groups ADD COLUMN IF NOT EXISTS analysis_mode text NOT NULL DEFAULT 'standard';
INSERT INTO public.asset_groups (slug, title, notes, style_guide, auto_cutout, analysis_mode)
VALUES ('reactions', 'Reactions', 'High-edit reaction videos (short and long): viral source clips play while our menace character pops in to react — spoken roasts or silent reactions (side-eye, stare). Heavy SFX, zooms, overlays.',
'Source video is the hero; the character interrupts it. Fast, punchy, menace energy (smug, judgy, unhinged, never wholesome). Every pop-in earns its place: a line, a look, or a sound. Zoom-ins, freeze frames, captions on key quotes, meme SFX on beats. Never a slideshow, never AI slop. Character design is not decided yet — use a placeholder until it exists.', true, 'reaction')
ON CONFLICT DO NOTHING;
INSERT INTO public.projects (group_id, slug, name, stage, notes)
SELECT id, 'first-reaction', 'First reaction', 'idea', '' FROM public.asset_groups WHERE slug = 'reactions'
AND NOT EXISTS (SELECT 1 FROM public.projects p JOIN public.asset_groups g ON g.id = p.group_id WHERE g.slug = 'reactions');