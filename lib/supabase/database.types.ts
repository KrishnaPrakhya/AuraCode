/**
 * Auto-generated Supabase Database Types
 * These types map to the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          display_name: string | null
          avatar_url: string | null
          role: 'participant' | 'admin' | 'mentor'
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'participant' | 'admin' | 'mentor'
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'participant' | 'admin' | 'mentor'
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          id: string
          title: string
          description: string
          markdown_content: string | null
          difficulty: number
          time_limit_minutes: number
          points_available: number
          starter_code: string | null
          language: string
          test_cases: Json | null
          created_by: string
          created_at: string
          updated_at: string
          is_active: boolean
          hint_strategy: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          markdown_content?: string | null
          difficulty?: number
          time_limit_minutes?: number
          points_available?: number
          starter_code?: string | null
          language?: string
          test_cases?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          hint_strategy?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          markdown_content?: string | null
          difficulty?: number
          time_limit_minutes?: number
          points_available?: number
          starter_code?: string | null
          language?: string
          test_cases?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          hint_strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          problem_id: string
          user_id: string
          status: 'in_progress' | 'submitted' | 'completed' | 'abandoned'
          started_at: string
          submitted_at: string | null
          ended_at: string | null
          points_earned: number
          hint_penalty: number
          total_hints_used: number
          ai_pair_programmer_used: boolean
          ai_coach_uses: number
        }
        Insert: {
          id?: string
          problem_id: string
          user_id: string
          status?: 'in_progress' | 'submitted' | 'completed' | 'abandoned'
          started_at?: string
          submitted_at?: string | null
          ended_at?: string | null
          points_earned?: number
          hint_penalty?: number
          total_hints_used?: number
          ai_pair_programmer_used?: boolean
          ai_coach_uses?: number
        }
        Update: {
          id?: string
          problem_id?: string
          user_id?: string
          status?: 'in_progress' | 'submitted' | 'completed' | 'abandoned'
          started_at?: string
          submitted_at?: string | null
          ended_at?: string | null
          points_earned?: number
          hint_penalty?: number
          total_hints_used?: number
          ai_pair_programmer_used?: boolean
          ai_coach_uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      submissions: {
        Row: {
          id: string
          session_id: string
          problem_id: string
          user_id: string
          code_content: string
          language: string
          test_results: Json | null
          passed_tests: number
          total_tests: number
          execution_time_ms: number | null
          submitted_at: string
        }
        Insert: {
          id?: string
          session_id: string
          problem_id: string
          user_id: string
          code_content: string
          language: string
          test_results?: Json | null
          passed_tests?: number
          total_tests?: number
          execution_time_ms?: number | null
          submitted_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          problem_id?: string
          user_id?: string
          code_content?: string
          language?: string
          test_results?: Json | null
          passed_tests?: number
          total_tests?: number
          execution_time_ms?: number | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          session_id: string
          user_id: string
          event_type: string
          timestamp_ms: number
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          event_type: string
          timestamp_ms: number
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          event_type?: string
          timestamp_ms?: number
          payload?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      hints: {
        Row: {
          id: string
          session_id: string
          problem_id: string
          user_id: string
          hint_level: number
          content: string
          code_snippet: string | null
          point_penalty: number
          is_ai_generated: boolean
          model_name: string | null
          requested_at: string
          helpful_rating: number | null
        }
        Insert: {
          id?: string
          session_id: string
          problem_id: string
          user_id: string
          hint_level?: number
          content: string
          code_snippet?: string | null
          point_penalty?: number
          is_ai_generated?: boolean
          model_name?: string | null
          requested_at?: string
          helpful_rating?: number | null
        }
        Update: {
          id?: string
          session_id?: string
          problem_id?: string
          user_id?: string
          hint_level?: number
          content?: string
          code_snippet?: string | null
          point_penalty?: number
          is_ai_generated?: boolean
          model_name?: string | null
          requested_at?: string
          helpful_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hints_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hints_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_pair_sessions: {
        Row: {
          id: string
          session_id: string
          user_id: string
          problem_id: string
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          ai_suggestions: Json | null
          code_contributed: string | null
          points_deducted: number
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          problem_id: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          ai_suggestions?: Json | null
          code_contributed?: string | null
          points_deducted?: number
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          problem_id?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          ai_suggestions?: Json | null
          code_contributed?: string | null
          points_deducted?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_pair_sessions_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pair_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pair_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      problem_analytics: {
        Row: {
          id: string
          problem_id: string
          total_attempts: number
          successful_attempts: number
          failed_attempts: number
          average_time_minutes: number | null
          average_hints_used: number | null
          average_points_earned: number | null
          pass_rate_percentage: number | null
          difficulty_recommendation: number | null
          last_updated: string
        }
        Insert: {
          id?: string
          problem_id: string
          total_attempts?: number
          successful_attempts?: number
          failed_attempts?: number
          average_time_minutes?: number | null
          average_hints_used?: number | null
          average_points_earned?: number | null
          pass_rate_percentage?: number | null
          difficulty_recommendation?: number | null
          last_updated?: string
        }
        Update: {
          id?: string
          problem_id?: string
          total_attempts?: number
          successful_attempts?: number
          failed_attempts?: number
          average_time_minutes?: number | null
          average_hints_used?: number | null
          average_points_earned?: number | null
          pass_rate_percentage?: number | null
          difficulty_recommendation?: number | null
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_analytics_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          }
        ]
      }
      test_case_analytics: {
        Row: {
          problem_id: string
          test_case_index: number
          fail_count: number
          pass_count: number
          fail_rate_percentage: number | null
          is_challenging: boolean
          last_updated: string
        }
        Insert: {
          problem_id: string
          test_case_index: number
          fail_count?: number
          pass_count?: number
          fail_rate_percentage?: number | null
          is_challenging?: boolean
          last_updated?: string
        }
        Update: {
          problem_id?: string
          test_case_index?: number
          fail_count?: number
          pass_count?: number
          fail_rate_percentage?: number | null
          is_challenging?: boolean
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_analytics_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          }
        ]
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          total_points: number
          problems_solved: number
          problems_attempted: number
          rank: number | null
          streak_days: number
          last_activity: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_points?: number
          problems_solved?: number
          problems_attempted?: number
          rank?: number | null
          streak_days?: number
          last_activity?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_points?: number
          problems_solved?: number
          problems_attempted?: number
          rank?: number | null
          streak_days?: number
          last_activity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
