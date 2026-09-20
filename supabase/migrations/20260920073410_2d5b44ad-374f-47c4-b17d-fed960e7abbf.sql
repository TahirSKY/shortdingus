CREATE TABLE public.studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('have_footage', 'need_footage')),
  title TEXT NOT NULL DEFAULT 'Untitled video',
  stage TEXT NOT NULL DEFAULT 'start' CHECK (stage IN ('start', 'analyzing', 'directions', 'approved', 'building', 'ready', 'rendering', 'complete', 'error')),
  footage_analysis JSONB,
  selected_direction JSONB,
  script JSONB,
  edl JSONB,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_projects TO anon, authenticated;
GRANT ALL ON public.studio_projects TO service_role;
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read studio projects" ON public.studio_projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can create studio projects" ON public.studio_projects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can update studio projects" ON public.studio_projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete studio projects" ON public.studio_projects FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.studio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'status')),
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'beats', 'directions', 'approval', 'status', 'error')),
  content TEXT NOT NULL DEFAULT '',
  payload JSONB,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, sequence)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_messages TO anon, authenticated;
GRANT ALL ON public.studio_messages TO service_role;
ALTER TABLE public.studio_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read studio messages" ON public.studio_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can create studio messages" ON public.studio_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can update studio messages" ON public.studio_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete studio messages" ON public.studio_messages FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX studio_messages_project_sequence_idx ON public.studio_messages(project_id, sequence);

CREATE TABLE public.studio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('source_video', 'generated_image', 'voice', 'render')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT NOT NULL,
  duration_seconds NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_assets TO anon, authenticated;
GRANT ALL ON public.studio_assets TO service_role;
ALTER TABLE public.studio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read studio assets" ON public.studio_assets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can create studio assets" ON public.studio_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can update studio assets" ON public.studio_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete studio assets" ON public.studio_assets FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX studio_assets_project_idx ON public.studio_assets(project_id);

CREATE OR REPLACE FUNCTION public.set_studio_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_studio_projects_updated_at
BEFORE UPDATE ON public.studio_projects
FOR EACH ROW EXECUTE FUNCTION public.set_studio_updated_at();