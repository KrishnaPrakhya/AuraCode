-- ============================================================================
-- MAKE USER_ID NULLABLE FOR ANONYMOUS USERS
-- ============================================================================
-- 
-- This allows the sandbox to work without authentication by making user_id
-- optional in tables that need it.
--
-- This is a better solution than dropping foreign keys completely.
--
-- ============================================================================
-- Make user_id nullable in events table
ALTER TABLE IF EXISTS events
ALTER COLUMN user_id DROP NOT NULL;
-- Make user_id nullable in sessions table
ALTER TABLE IF EXISTS sessions
ALTER COLUMN user_id DROP NOT NULL;
-- Make user_id nullable in hints table
ALTER TABLE IF EXISTS hints
ALTER COLUMN user_id DROP NOT NULL;
-- Make user_id nullable in submissions table
ALTER TABLE IF EXISTS submissions
ALTER COLUMN user_id DROP NOT NULL;
-- Make created_by nullable in problems table
ALTER TABLE IF EXISTS problems
ALTER COLUMN created_by DROP NOT NULL;
-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================
-- 
-- You can verify the changes by running:
-- 
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'events' AND column_name = 'user_id';
--
-- Should return: is_nullable = 'YES'
--
-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- With these changes:
-- - Anonymous users can use the sandbox
-- - Foreign key constraints are still enforced when user_id is provided
-- - Data integrity is maintained for authenticated users
-- - No need to drop foreign key constraints
--
-- For production:
-- - Consider requiring authentication for the sandbox
-- - Or keep these nullable fields but add application-level validation
--