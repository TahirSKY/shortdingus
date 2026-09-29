INSERT INTO public.asset_groups (slug, title, notes, style_guide, auto_cutout)
VALUES ('brain-bank', 'Brain Bank', 'Brain Bank YouTube channel. Mascot narrator clips (vertical + horizontal) paired with our voiceover, plus collage, generated images, motion graphics, stock and memes.',
'# Brain Bank style
- High quality, hand-made feel. Never a slideshow, never AI slop.
- The mascot is the narrator: muted clips over our voiceover, popping in for a couple of seconds at key lines.
- Mix Vox-style collage, generated images, motion graphics, stock footage and the odd meme as the story needs.
- Keep things moving; every visual earns its place against the line.
- Shorts are 9:16, long videos 16:9. Use the mascot clip that matches.', true)
ON CONFLICT (slug) DO NOTHING;