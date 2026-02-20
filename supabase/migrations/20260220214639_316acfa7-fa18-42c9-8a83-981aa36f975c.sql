
CREATE TABLE public.saved_renders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  url TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'video',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.saved_renders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.saved_renders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.saved_renders FOR DELETE USING (true);
