-- Migration: Store team member names on sessions
-- Run this in your Supabase SQL editor

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT NULL;

COMMENT ON COLUMN sessions.team_members IS 'Array of member names for team-mode sessions, e.g. ["Alice","Bob","Carol"]';
