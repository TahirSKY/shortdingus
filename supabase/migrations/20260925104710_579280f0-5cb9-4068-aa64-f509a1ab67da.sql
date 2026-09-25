DROP TABLE IF EXISTS public.studio_messages CASCADE;
DROP TABLE IF EXISTS public.studio_assets CASCADE;
DROP TRIGGER IF EXISTS set_studio_projects_updated_at ON public.studio_projects;
DROP TABLE IF EXISTS public.studio_projects CASCADE;
DROP TRIGGER IF EXISTS set_video_analyses_updated_at ON public.video_analyses;
DROP TABLE IF EXISTS public.video_analyses CASCADE;
DROP TABLE IF EXISTS public.image_library CASCADE;
DROP FUNCTION IF EXISTS public.set_studio_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.asset_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  title text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_groups_slug_key ON public.asset_groups(slug);

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('video','image','audio','text','transcript','analysis','code','render')),
  name text NOT NULL,
  storage_path text,
  inline_content text,
  mime_type text NOT NULL,
  size_bytes bigint,
  duration_seconds numeric,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assets_group_id_idx ON public.assets(group_id);

CREATE TABLE public.asset_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  tool text NOT NULL CHECK (tool IN ('gemini-video','assembly-transcript','manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','complete','error')),
  summary text,
  report jsonb NOT NULL DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_analyses_asset_id_idx ON public.asset_analyses(asset_id);
CREATE INDEX asset_analyses_group_id_idx ON public.asset_analyses(group_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_groups, public.assets, public.asset_analyses TO anon, authenticated;
GRANT ALL ON public.asset_groups, public.assets, public.asset_analyses TO service_role;

ALTER TABLE public.asset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public manage asset groups" ON public.asset_groups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public manage assets" ON public.assets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read analyses" ON public.asset_analyses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public delete analyses" ON public.asset_analyses FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER asset_groups_updated_at BEFORE UPDATE ON public.asset_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER asset_analyses_updated_at BEFORE UPDATE ON public.asset_analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "hub-media public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'hub-media');
CREATE POLICY "hub-media public upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'hub-media');
CREATE POLICY "hub-media public delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'hub-media');