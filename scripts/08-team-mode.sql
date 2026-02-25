-- Migration: Add team mode support to problems table
-- Run this in your Supabase SQL editor

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS team_mode  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS team_size  INT     NOT NULL DEFAULT 2
    CHECK (team_size BETWEEN 2 AND 5);

COMMENT ON COLUMN problems.team_mode IS 'When true, challenge runs in team mode — time is divided equally among team members';
COMMENT ON COLUMN problems.team_size IS 'Number of team members (2–5). Only used when team_mode = TRUE';
