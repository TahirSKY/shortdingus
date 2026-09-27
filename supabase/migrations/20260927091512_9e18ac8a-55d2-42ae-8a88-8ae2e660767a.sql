ALTER TABLE public.asset_groups ADD COLUMN IF NOT EXISTS style_guide text NOT NULL DEFAULT '';

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX skills_scope_slug ON public.skills (coalesce(group_id,'00000000-0000-0000-0000-000000000000'::uuid), slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO anon, authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public manage skills" ON public.skills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.asset_groups(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  skill_id uuid REFERENCES public.skills(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'idea',
  notes text NOT NULL DEFAULT '',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public manage projects" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS assets_project_idx ON public.assets(project_id);