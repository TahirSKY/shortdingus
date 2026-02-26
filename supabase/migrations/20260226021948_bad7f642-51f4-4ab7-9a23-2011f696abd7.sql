
CREATE TABLE public.image_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  url text NOT NULL,
  storage_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.image_library FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.image_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.image_library FOR DELETE USING (true);
