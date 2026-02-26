-- ============================================================
-- Migration 10: AI Coach usage counter + hint penalty column
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add ai_coach_uses counter (integer, default 0)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS ai_coach_uses integer NOT NULL DEFAULT 0;

-- 2. Backfill: existing rows where ai_pair_programmer_used = true get count of 1
UPDATE sessions
SET ai_coach_uses = 1
WHERE ai_pair_programmer_used = true
  AND ai_coach_uses = 0;

-- 3. Ensure hint_penalty column exists (already in schema but adding IF NOT EXISTS safety)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS hint_penalty integer NOT NULL DEFAULT 0;

-- Verify
SELECT id, ai_pair_programmer_used, ai_coach_uses, total_hints_used, hint_penalty
FROM sessions
ORDER BY started_at DESC
LIMIT 10;
