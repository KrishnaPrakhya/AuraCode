-- AuraCode Database Schema - Part 2: RLS Policies and Triggers

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_pair_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS problem_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_case_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile, admins can see all
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Sessions: users can only see their own, admins can see all
CREATE POLICY IF NOT EXISTS "Users can view own sessions" ON sessions
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Submissions: users can see their own
CREATE POLICY IF NOT EXISTS "Users can view own submissions" ON submissions
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "Users can create own submissions" ON submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Events: users can only see their own session events, admins can see all
CREATE POLICY IF NOT EXISTS "Users can view own session events" ON events
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "Users can create session events" ON events
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Hints: users can see hints for their sessions, admins see all
CREATE POLICY IF NOT EXISTS "Users can view hints for own sessions" ON hints
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "Users can create hints for own sessions" ON hints
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- AI Pair Sessions: users can see their own
CREATE POLICY IF NOT EXISTS "Users can view own AI pair sessions" ON ai_pair_sessions
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

-- Problems: all authenticated users can see active problems, admins can manage all
CREATE POLICY IF NOT EXISTS "Users can view active problems" ON problems
  FOR SELECT USING (
    is_active = true 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('admin', 'mentor'))
  );

CREATE POLICY IF NOT EXISTS "Admins can manage problems" ON problems
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('admin', 'mentor')));

-- Analytics: public read for problems, users can see their own stats
CREATE POLICY IF NOT EXISTS "Users can view problem analytics" ON problem_analytics
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can view test case analytics" ON test_case_analytics
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can view own stats" ON user_stats
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_problems_updated_at ON problems;
CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
