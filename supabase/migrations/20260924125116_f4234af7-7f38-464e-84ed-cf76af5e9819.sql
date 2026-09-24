CREATE TABLE public.video_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  duration_seconds numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'analyzing', 'complete', 'error')),
  summary text,
  beats jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.video_analyses TO anon, authenticated;
GRANT ALL ON public.video_analyses TO service_role;

ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create video analyses"
ON public.video_analyses FOR INSERT TO anon, authenticated
WITH CHECK (status = 'uploaded' AND summary IS NULL AND beats = '[]'::jsonb AND error_message IS NULL);

CREATE POLICY "Public can read video analyses"
ON public.video_analyses FOR SELECT TO anon, authenticated
USING (true);

CREATE TRIGGER set_video_analyses_updated_at
BEFORE UPDATE ON public.video_analyses
FOR EACH ROW EXECUTE FUNCTION public.set_studio_updated_at();