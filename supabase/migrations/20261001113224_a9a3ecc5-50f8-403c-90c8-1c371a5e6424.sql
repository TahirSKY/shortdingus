CREATE TABLE public.editor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  msg_id text NOT NULL,
  role text NOT NULL,
  ui_message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, msg_id)
);
CREATE INDEX editor_messages_project_idx ON public.editor_messages (project_id, created_at);
GRANT SELECT ON public.editor_messages TO anon, authenticated;
GRANT ALL ON public.editor_messages TO service_role;
ALTER TABLE public.editor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read editor messages" ON public.editor_messages FOR SELECT USING (true);