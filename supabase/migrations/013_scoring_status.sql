-- Add scoring status tracking to practice_sessions.
-- Prevents fake/fallback scores from polluting the database when the
-- scoring API is unavailable. Failed sessions are saved with null scores
-- and can be re-scored later.

ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS scoring_status TEXT NOT NULL DEFAULT 'scored'
    CHECK (scoring_status IN ('scored', 'scoring_failed', 'pending_rescore')),
  ADD COLUMN IF NOT EXISTS scoring_error TEXT;

CREATE INDEX IF NOT EXISTS idx_practice_sessions_scoring_status
  ON public.practice_sessions(scoring_status)
  WHERE scoring_status != 'scored';
