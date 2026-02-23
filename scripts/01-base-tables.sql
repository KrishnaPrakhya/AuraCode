-- AuraCode Database Schema - Part 1: Base Tables
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
  test_cases JSONB,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  hint_strategy TEXT DEFAULT 'progressive'
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
  test_results JSONB,
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
  timestamp_ms INT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  helpful_rating INT CHECK (helpful_rating >= -1 AND helpful_rating <= 1)
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
  ai_suggestions JSONB,
  code_contributed TEXT,
  points_deducted INT DEFAULT 10
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
  difficulty_recommendation INT,
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
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_problems_created_by ON problems(created_by);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
