CREATE POLICY "Public can upload studio media"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'studio-media');
CREATE POLICY "Public can read studio media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'studio-media');
CREATE POLICY "Public can update studio media"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id = 'studio-media')
WITH CHECK (bucket_id = 'studio-media');
CREATE POLICY "Public can delete studio media"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id = 'studio-media');