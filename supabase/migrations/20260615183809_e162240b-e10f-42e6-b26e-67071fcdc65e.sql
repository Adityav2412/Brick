CREATE TABLE public.backups (
  code TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.backups TO service_role;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
-- No policies: table is unreachable from the Data API. All access goes through
-- trusted server functions that use the service role, gated by the user's
-- secret backup code.