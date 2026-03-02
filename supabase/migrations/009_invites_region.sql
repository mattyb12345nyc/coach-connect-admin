-- Add regional assignment support for invites.
-- Regional managers should be scoped by region rather than a specific store.

ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS idx_invites_region ON public.invites(region);
