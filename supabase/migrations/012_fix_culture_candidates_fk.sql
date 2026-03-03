-- Fix approved_by / generated_by FK constraints on culture_trend_candidates.
-- These columns referenced app_users(id) but auth now resolves to profiles.id
-- which maps to auth.users(id). Re-point the FKs accordingly.

ALTER TABLE culture_trend_candidates
  DROP CONSTRAINT IF EXISTS culture_trend_candidates_approved_by_fkey;

ALTER TABLE culture_trend_candidates
  DROP CONSTRAINT IF EXISTS culture_trend_candidates_generated_by_fkey;

ALTER TABLE culture_trend_candidates
  ADD CONSTRAINT culture_trend_candidates_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE culture_trend_candidates
  ADD CONSTRAINT culture_trend_candidates_generated_by_fkey
    FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
