-- ============================================================================
-- FIX FOREIGN KEY CONSTRAINTS FOR DEVELOPMENT
-- ============================================================================
-- 
-- This script removes foreign key constraints that cause 409 Conflict errors
-- when using the sandbox without authentication.
--
-- The issue: events, sessions, and hints tables reference users that don't exist
-- Solution: Drop the foreign key constraints for development
--
-- ============================================================================
-- Drop foreign key constraints on events table
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_session_id_fkey,
  DROP CONSTRAINT IF EXISTS events_user_id_fkey;
-- Drop foreign key constraints on sessions table
ALTER TABLE IF EXISTS sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey,
  DROP CONSTRAINT IF EXISTS sessions_problem_id_fkey;
-- Drop foreign key constraints on hints table
ALTER TABLE IF EXISTS hints DROP CONSTRAINT IF EXISTS hints_session_id_fkey,
  DROP CONSTRAINT IF EXISTS hints_user_id_fkey,
  DROP CONSTRAINT IF EXISTS hints_problem_id_fkey;
-- Drop foreign key constraints on submissions table
ALTER TABLE IF EXISTS submissions DROP CONSTRAINT IF EXISTS submissions_session_id_fkey,
  DROP CONSTRAINT IF EXISTS submissions_user_id_fkey,
  DROP CONSTRAINT IF EXISTS submissions_problem_id_fkey;
-- Drop foreign key constraint on problems table
ALTER TABLE IF EXISTS problems DROP CONSTRAINT IF EXISTS problems_created_by_fkey;
-- ============================================================================
-- ALTERNATIVE: Make Foreign Keys Nullable (Better for Production)
-- ============================================================================
-- 
-- If you want to keep referential integrity but allow NULL values:
--
-- ALTER TABLE events ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE sessions ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE hints ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE submissions ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE problems ALTER COLUMN created_by DROP NOT NULL;
--
-- ============================================================================
-- TO RESTORE CONSTRAINTS (Before Production)
-- ============================================================================
-- 
-- Before deploying to production, restore the foreign keys:
--
-- ALTER TABLE events 
--   ADD CONSTRAINT events_session_id_fkey 
--   FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
--
-- ALTER TABLE events 
--   ADD CONSTRAINT events_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
--
-- (Add similar constraints for other tables)
--