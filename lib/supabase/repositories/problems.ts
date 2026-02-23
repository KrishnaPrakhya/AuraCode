import { getSupabaseClient } from '../client';
import type { Problem, TestCase, ProgrammingLanguage, HintStrategy } from '@/lib/types/database';
import type { Database } from '../database.types';

type ProblemRow = Database['public']['Tables']['problems']['Row'];

/**
 * Problems Repository
 * Handles all problem-related database operations
 */

export const problemRepository = {
  /**
   * Create a new problem
   */
  async create(input: {
    title: string;
    description: string;
    markdownContent: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    timeLimitMinutes?: number;
    pointsAvailable?: number;
    starterCode?: string;
    language: ProgrammingLanguage;
    testCases: TestCase[];
    createdBy: string;
    hintStrategy?: HintStrategy;
  }): Promise<Problem> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .insert({
        title: input.title,
        description: input.description,
        markdown_content: input.markdownContent,
        difficulty: input.difficulty,
        time_limit_minutes: input.timeLimitMinutes ?? 60,
        points_available: input.pointsAvailable ?? 100,
        starter_code: input.starterCode,
        language: input.language,
        test_cases: input.testCases as any,
        created_by: input.createdBy,
        hint_strategy: input.hintStrategy ?? 'progressive',
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToProblem(data);
  },

  /**
   * Get problem by ID
   */
  async getById(problemId: string): Promise<Problem | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .select()
      .eq('id', problemId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return mapRowToProblem(data);
  },

  /**
   * Get all active problems
   */
  async getActive(): Promise<Problem[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .select()
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToProblem);
  },

  /**
   * Get problems by difficulty
   */
  async getByDifficulty(difficulty: 1 | 2 | 3 | 4 | 5): Promise<Problem[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .select()
      .eq('difficulty', difficulty)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToProblem);
  },

  /**
   * Get problems created by a user
   */
  async getByCreator(userId: string): Promise<Problem[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .select()
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToProblem);
  },

  /**
   * Update problem
   */
  async update(
    problemId: string,
    updates: Partial<{
      title: string;
      description: string;
      markdown_content: string;
      difficulty: 1 | 2 | 3 | 4 | 5;
      time_limit_minutes: number;
      points_available: number;
      starter_code: string;
      language: ProgrammingLanguage;
      test_cases: TestCase[];
      is_active: boolean;
      hint_strategy: HintStrategy;
    }>
  ): Promise<Problem> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .update(updates as any)
      .eq('id', problemId)
      .select()
      .single();

    if (error) throw error;
    return mapRowToProblem(data);
  },

  /**
   * Deactivate problem
   */
  async deactivate(problemId: string): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('problems')
      .update({ is_active: false })
      .eq('id', problemId);

    if (error) throw error;
  },

  /**
   * Get problems by language
   */
  async getByLanguage(language: ProgrammingLanguage): Promise<Problem[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('problems')
      .select()
      .eq('language', language)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRowToProblem);
  },
};

/**
 * Map database row to Problem type
 */
function mapRowToProblem(row: ProblemRow): Problem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    markdown_content: row.markdown_content,
    difficulty: row.difficulty as 1 | 2 | 3 | 4 | 5,
    time_limit_minutes: row.time_limit_minutes,
    points_available: row.points_available,
    starter_code: row.starter_code,
    language: row.language as ProgrammingLanguage,
    test_cases: (row.test_cases as unknown as TestCase[]) || [],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_active: row.is_active,
    hint_strategy: row.hint_strategy as HintStrategy,
  };
}
