-- ============================================================================
-- PERMISSIVE RLS POLICIES FOR DEVELOPMENT
-- ============================================================================
-- 
-- This script creates permissive policies that allow anonymous users
-- to use the sandbox while keeping RLS enabled.
-- 
-- RECOMMENDED: Use this instead of disabling RLS completely.
--
-- ============================================================================
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own session events" ON events;
DROP POLICY IF EXISTS "Users can create session events" ON events;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view hints for own sessions" ON hints;
DROP POLICY IF EXISTS "Users can create hints for own sessions" ON hints;
DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can create own submissions" ON submissions;
DROP POLICY IF EXISTS "Users can view active problems" ON problems;
-- ============================================================================
-- PROBLEMS: Allow everyone to read active problems
-- ============================================================================
CREATE POLICY "Anyone can view active problems" ON problems FOR
SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage problems" ON problems FOR ALL USING (auth.uid() IS NOT NULL);
-- ============================================================================
-- SESSIONS: Allow anonymous users to create and manage sessions
-- ============================================================================
CREATE POLICY "Anyone can create sessions" ON sessions FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view sessions" ON sessions FOR
SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON sessions FOR
UPDATE USING (true);
-- ============================================================================
-- EVENTS: Allow anonymous users to record events
-- ============================================================================
CREATE POLICY "Anyone can create events" ON events FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view events" ON events FOR
SELECT USING (true);
-- ============================================================================
-- HINTS: Allow anonymous users to request and view hints
-- ============================================================================
CREATE POLICY "Anyone can create hints" ON hints FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view hints" ON hints FOR
SELECT USING (true);
-- ============================================================================
-- SUBMISSIONS: Allow anonymous users to submit code
-- ============================================================================
CREATE POLICY "Anyone can create submissions" ON submissions FOR
INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view submissions" ON submissions FOR
SELECT USING (true);
-- ============================================================================
-- ANALYTICS: Public read access
-- ============================================================================
CREATE POLICY "Anyone can view problem analytics" ON problem_analytics FOR
SELECT USING (true);
CREATE POLICY "Anyone can view test case analytics" ON test_case_analytics FOR
SELECT USING (true);
-- ============================================================================
-- NOTE: For Production
-- ============================================================================
-- 
-- Before deploying to production, you should:
-- 1. Require authentication for the sandbox
-- 2. Replace these permissive policies with the ones in 02-rls-policies.sql
-- 3. Add proper user role checks
--
-- For now, this allows the sandbox to work without authentication.
--