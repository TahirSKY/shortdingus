ALTER TABLE public.asset_groups ADD COLUMN IF NOT EXISTS auto_cutout boolean NOT NULL DEFAULT false;
UPDATE public.asset_groups SET auto_cutout = true WHERE slug = 'vox';