/**
 * AuraCode Database Types
 * Type-safe definitions for all database tables
 */

// ============================================================================
// USERS & AUTHENTICATION
// ============================================================================

export type UserRole = 'participant' | 'admin' | 'mentor';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROBLEMS & CHALLENGES
// ============================================================================

export interface TestCase {
  input: string;
  expected_output: string;
  description: string;
  is_hidden?: boolean;
}

export type ProgrammingLanguage = 'javascript' | 'python' | 'typescript' | 'java' | 'cpp' | 'go' | 'rust';
export type HintStrategy = 'progressive' | 'contextual' | 'socratic';

export interface Problem {
  id: string;
  title: string;
  description: string;
  markdown_content: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  time_limit_minutes: number;
  points_available: number;
  starter_code: string | null;
  language: ProgrammingLanguage;
  test_cases: TestCase[];
  requirements?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  hint_strategy: HintStrategy;
}

// ============================================================================
// SESSIONS & CODING
// ============================================================================

export type SessionStatus = 'in_progress' | 'submitted' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  problem_id: string;
  user_id: string;
  status: SessionStatus;
  started_at: string;
  submitted_at: string | null;
  ended_at: string | null;
  points_earned: number;
  hint_penalty: number;
  total_hints_used: number;
  ai_pair_programmer_used: boolean;
}

// ============================================================================
// SUBMISSIONS
// ============================================================================

export interface TestResult {
  test_case_index: number;
  passed: boolean;
  expected_output: string;
  actual_output: string;
  error_message?: string;
  execution_time_ms: number;
}

export interface Submission {
  id: string;
  session_id: string;
  problem_id: string;
  user_id: string;
  code_content: string;
  language: ProgrammingLanguage;
  test_results: TestResult[];
  passed_tests: number;
  total_tests: number;
  execution_time_ms: number | null;
  submitted_at: string;
}

// ============================================================================
// EVENTS (For Playback Mode)
// ============================================================================

export type EventType = 
  | 'code_change'
  | 'cursor_move'
  | 'selection_change'
  | 'pause'
  | 'resume'
  | 'run_code'
  | 'hint_request'
  | 'ai_pair_request'
  | 'test_run';

export interface CodeChangeEvent {
  type: 'code_change';
  start: { line: number; column: number };
  end: { line: number; column: number };
  text: string;
  removed_text: string;
}

export interface CursorMoveEvent {
  type: 'cursor_move';
  line: number;
  column: number;
}

export interface RunCodeEvent {
  type: 'run_code';
  code: string;
}

export type EventPayload = CodeChangeEvent | CursorMoveEvent | RunCodeEvent | Record<string, any>;

export interface Event {
  id: string;
  session_id: string;
  user_id: string;
  event_type: EventType;
  timestamp_ms: number;
  payload: EventPayload;
  created_at: string;
}

// ============================================================================
// HINTS & AI MENTOR
// ============================================================================

export type HintLevel = 0 | 1 | 2 | 3;

export interface Hint {
  id: string;
  session_id: string;
  problem_id: string;
  user_id: string;
  hint_level: HintLevel;
  content: string;
  code_snippet: string | null;
  point_penalty: number;
  is_ai_generated: boolean;
  model_name: string | null;
  requested_at: string;
  helpful_rating: -1 | 0 | 1 | null;
}

// ============================================================================
// AI PAIR PROGRAMMER SESSIONS
// ============================================================================

export interface AISuggestion {
  suggestion: string;
  type: 'refactor' | 'fix' | 'optimize' | 'pattern';
  explanation: string;
}

export interface AIPairSession {
  id: string;
  session_id: string;
  user_id: string;
  problem_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ai_suggestions: AISuggestion[];
  code_contributed: string | null;
  points_deducted: number;
}

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

export interface ProblemAnalytics {
  id: string;
  problem_id: string;
  total_attempts: number;
  successful_attempts: number;
  failed_attempts: number;
  average_time_minutes: number | null;
  average_hints_used: number | null;
  average_points_earned: number | null;
  pass_rate_percentage: number | null;
  difficulty_recommendation: number | null;
  last_updated: string;
}

export interface TestCaseAnalytics {
  problem_id: string;
  test_case_index: number;
  fail_count: number;
  pass_count: number;
  fail_rate_percentage: number | null;
  is_challenging: boolean;
  last_updated: string;
}

// ============================================================================
// LEADERBOARD & STATS
// ============================================================================

export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  problems_solved: number;
  problems_attempted: number;
  rank: number | null;
  streak_days: number;
  last_activity: string | null;
  updated_at: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CodeExecutionRequest {
  code: string;
  language: ProgrammingLanguage;
  test_cases: TestCase[];
  time_limit_ms?: number;
}

export interface CodeExecutionResponse {
  success: boolean;
  test_results: TestResult[];
  execution_time_ms: number;
  error?: string;
}

export interface HintRequest {
  problem_id: string;
  user_id: string;
  session_id: string;
  current_code: string;
  hint_level: HintLevel;
  previous_attempts: number;
  // Client-side fallback info (used when problem_id isn't in DB)
  challenge_title?: string;
  challenge_description?: string;
  requirements?: string[];
}

export interface HintResponse {
  hint: string;
  code_snippet?: string;
  point_penalty: number;
  explanation: string;
}

// ============================================================================
// WEBSOCKET TYPES
// ============================================================================

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface ProblemPushMessage extends WebSocketMessage {
  type: 'problem_push';
  payload: {
    problem_id: string;
    problem: Problem;
    pushed_at: string;
  };
}

export interface EditorUpdateMessage extends WebSocketMessage {
  type: 'editor_update';
  payload: {
    session_id: string;
    user_id: string;
    event: Event;
  };
}
