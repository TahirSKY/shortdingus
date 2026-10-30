CREATE TABLE public.whiteboard_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 clip_id uuid NOT NULL UNIQUE REFERENCES public.assets(id) ON DELETE CASCADE,
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
 render_id text,
 bucket_name text,
 code text,
 error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whiteboard_jobs TO service_role;
ALTER TABLE public.whiteboard_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages drawing jobs" ON public.whiteboard_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TABLE public.whiteboard_worker_lease (
 id integer PRIMARY KEY CHECK (id = 1),
 owner uuid NOT NULL,
 expires_at timestamptz NOT NULL
);
GRANT ALL ON public.whiteboard_worker_lease TO service_role;
ALTER TABLE public.whiteboard_worker_lease ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages drawing lease" ON public.whiteboard_worker_lease FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX whiteboard_jobs_pending ON public.whiteboard_jobs(status, created_at);
CREATE OR REPLACE FUNCTION public.claim_whiteboard_worker(worker uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed integer;
BEGIN
 INSERT INTO public.whiteboard_worker_lease(id,owner,expires_at) VALUES(1,worker,now()+interval '90 seconds')
 ON CONFLICT(id) DO UPDATE SET owner=EXCLUDED.owner,expires_at=EXCLUDED.expires_at
 WHERE whiteboard_worker_lease.expires_at < now() OR whiteboard_worker_lease.owner=worker;
 GET DIAGNOSTICS claimed = ROW_COUNT;
 RETURN claimed=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_whiteboard_worker(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whiteboard_worker(uuid) TO service_role;
CREATE UNIQUE INDEX whiteboard_one_pending_image ON public.assets(project_id, (meta->>'source_asset_id')) WHERE tags @> ARRAY['whiteboard-clip']::text[] AND meta->>'creating'='true';