-- AuraCode Database Schema
-- Comprehensive setup for hackathon platform with playback, hints, and analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('participant', 'admin', 'mentor')) DEFAULT 'participant',
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PROBLEMS & CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  markdown_content TEXT,
  difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 3,
  time_limit_minutes INT DEFAULT 60,
  points_available INT DEFAULT 100,
  starter_code TEXT,
  language TEXT DEFAULT 'javascript',
  test_cases JSONB, -- Array of {input, expected_output, visible: boolean}
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  hint_strategy TEXT DEFAULT 'progressive' -- 'progressive', 'direct', 'socratic'
);

-- ============================================================================
-- SESSIONS & CODING
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'submitted', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  points_earned INT DEFAULT 0,
  hint_penalty INT DEFAULT 0,
  total_hints_used INT DEFAULT 0,
  ai_pair_programmer_used BOOLEAN DEFAULT false,
  UNIQUE(problem_id, user_id, started_at)
);

-- ============================================================================
-- CODE SUBMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_content TEXT NOT NULL,
  language TEXT NOT NULL,
  test_results JSONB, -- {test_id, passed, runtime, error}
  passed_tests INT DEFAULT 0,
  total_tests INT DEFAULT 0,
  execution_time_ms INT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EVENTS (For Playback Mode)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'code_change', 'cursor_move', 'selection_change', 'pause', 'resume', 
    'run_code', 'hint_request', 'ai_pair_request', 'test_run'
  )),
  timestamp_ms INT, -- Milliseconds from session start
  payload JSONB, -- Event-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_session_timestamp (session_id, timestamp_ms)
);

-- ============================================================================
-- HINTS & AI MENTOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS hints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hint_level INT CHECK (hint_level >= 0 AND hint_level <= 3) DEFAULT 1,
  content TEXT NOT NULL,
  code_snippet TEXT,
  point_penalty INT DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT true,
  model_name TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  helpful_rating INT CHECK (helpful_rating >= -1 AND helpful_rating <= 1) -- -1: not helpful, 0: neutral, 1: helpful
);

-- ============================================================================
-- AI PAIR PROGRAMMER SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_pair_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  ai_suggestions JSONB, -- Array of suggestions with timestamps
  code_contributed TEXT,
  points_deducted INT DEFAULT 10 -- Flat deduction per session
);

-- ============================================================================
-- ANALYTICS & METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  total_attempts INT DEFAULT 0,
  successful_attempts INT DEFAULT 0,
  failed_attempts INT DEFAULT 0,
  average_time_minutes DECIMAL(10, 2),
  average_hints_used DECIMAL(5, 2),
  average_points_earned DECIMAL(8, 2),
  pass_rate_percentage DECIMAL(5, 2),
  difficulty_recommendation INT, -- 1-5 suggested difficulty
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_case_analytics (
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  test_case_index INT NOT NULL,
  fail_count INT DEFAULT 0,
  pass_count INT DEFAULT 0,
  fail_rate_percentage DECIMAL(5, 2),
  is_challenging BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (problem_id, test_case_index)
);

-- ============================================================================
-- LEADERBOARD & STATS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  problems_solved INT DEFAULT 0,
  problems_attempted INT DEFAULT 0,
  rank INT,
  streak_days INT DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pair_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR role = 'admin');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Sessions: users can only see their own, admins can see all
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid()::text = user_id::text OR (SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

CREATE POLICY "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Events: users can only see their own session events
CREATE POLICY "Users can view own session events" ON events
  FOR SELECT USING (
    auth.uid()::text = user_id::text 
    OR (SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin'
  );

-- Hints: users can see hints for their sessions
CREATE POLICY "Users can view hints for own sessions" ON hints
  FOR SELECT USING (auth.uid()::text = user_id::text OR (SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

-- Problems: all users can see active problems
CREATE POLICY "All users can view active problems" ON problems
  FOR SELECT USING (is_active = true OR (SELECT role FROM users WHERE id = auth.uid()::uuid) IN ('admin', 'mentor'));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_problem_id ON sessions(problem_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_hints_user_id ON hints(user_id);
CREATE INDEX IF NOT EXISTS idx_hints_session_id ON hints(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_problems_created_by ON problems(created_by);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

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

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
