CREATE TABLE public.editor_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  part integer NOT NULL DEFAULT 0,
  lines integer NOT NULL DEFAULT 0,
  brief text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  error text,
  version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.editor_builds TO anon, authenticated;
GRANT ALL ON public.editor_builds TO service_role;
ALTER TABLE public.editor_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read editor builds" ON public.editor_builds FOR SELECT USING (true);
CREATE INDEX editor_builds_project_idx ON public.editor_builds (project_id, created_at DESC);
CREATE TRIGGER editor_builds_updated_at BEFORE UPDATE ON public.editor_builds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();