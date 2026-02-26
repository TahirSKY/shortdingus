
CREATE TABLE public.saved_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🎬',
  code TEXT NOT NULL
);

ALTER TABLE public.saved_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.saved_templates FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.saved_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.saved_templates FOR DELETE USING (true);
CREATE POLICY "Allow public update access" ON public.saved_templates FOR UPDATE USING (true) WITH CHECK (true);
