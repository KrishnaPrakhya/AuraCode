-- ============================================================================
-- RESTORE FOREIGN KEYS WITH NULL SUPPORT
-- ============================================================================
-- 
-- This script restores foreign key relationships while allowing NULL values.
-- This gives you the best of both worlds:
-- - Data integrity when user_id is provided
-- - Flexibility for anonymous users (NULL user_id)
--
-- ============================================================================
-- First, make sure columns are nullable
ALTER TABLE IF EXISTS events
ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS sessions
ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS hints
ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS submissions
ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS problems
ALTER COLUMN created_by DROP NOT NULL;
-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE IF EXISTS events DROP CONSTRAINT IF EXISTS events_session_id_fkey;
ALTER TABLE IF EXISTS sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS sessions DROP CONSTRAINT IF EXISTS sessions_problem_id_fkey;
ALTER TABLE IF EXISTS hints DROP CONSTRAINT IF EXISTS hints_user_id_fkey;
ALTER TABLE IF EXISTS hints DROP CONSTRAINT IF EXISTS hints_session_id_fkey;
ALTER TABLE IF EXISTS hints DROP CONSTRAINT IF EXISTS hints_problem_id_fkey;
ALTER TABLE IF EXISTS submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;
ALTER TABLE IF EXISTS submissions DROP CONSTRAINT IF EXISTS submissions_session_id_fkey;
ALTER TABLE IF EXISTS submissions DROP CONSTRAINT IF EXISTS submissions_problem_id_fkey;
ALTER TABLE IF EXISTS problems DROP CONSTRAINT IF EXISTS problems_created_by_fkey;
-- Add foreign keys back with ON DELETE SET NULL for user references
-- This means if a user is deleted, the user_id becomes NULL instead of cascading
-- Events table
ALTER TABLE events
ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE events
ADD CONSTRAINT events_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
-- Sessions table
ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE sessions
ADD CONSTRAINT sessions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE;
-- Hints table
ALTER TABLE hints
ADD CONSTRAINT hints_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE hints
ADD CONSTRAINT hints_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE hints
ADD CONSTRAINT hints_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE;
-- Submissions table
ALTER TABLE submissions
ADD CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
SET NULL;
ALTER TABLE submissions
ADD CONSTRAINT submissions_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE submissions
ADD CONSTRAINT submissions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE;
-- Problems table
ALTER TABLE problems
ADD CONSTRAINT problems_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
SET NULL;
-- ============================================================================
-- VERIFY CONSTRAINTS
-- ============================================================================
-- 
-- Check that constraints were created:
-- 
-- SELECT constraint_name, table_name
-- FROM information_schema.table_constraints
-- WHERE table_name IN ('events', 'sessions', 'hints', 'submissions', 'problems')
-- AND constraint_type = 'FOREIGN KEY'
-- ORDER BY table_name, constraint_name;
--
-- ============================================================================
-- BENEFITS
-- ============================================================================
-- 
-- With this setup:
-- ✅ Anonymous users can use the sandbox (user_id can be NULL)
-- ✅ Foreign keys enforce data integrity when user_id is provided
-- ✅ Deleting a user sets user_id to NULL instead of cascading deletes
-- ✅ Admin dashboard can query sessions without JOIN errors
-- ✅ Better data integrity than having no foreign keys at all
--