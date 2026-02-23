/**
 * Difficulty Scaling Analytics
 * Automatically recommends difficulty adjustments based on pass rates
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type { TestCaseAnalytics, ProblemAnalytics } from '@/lib/types/database';

export interface DifficultyRecommendation {
  problemId: string;
  currentDifficulty: number;
  recommendedDifficulty: number;
  reason: string;
  confidence: number; // 0-100
  passRate: number;
  failRate: number;
}

/**
 * Analytics service for monitoring problem difficulty
 */
export const difficultyAnalytics = {
  /**
   * Analyze test case performance
   */
  async analyzeTestCasePerformance(
    problemId: string
  ): Promise<TestCaseAnalytics[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('test_case_analytics')
      .select()
      .eq('problem_id', problemId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Calculate problem pass rate
   */
  async calculatePassRate(problemId: string): Promise<number> {
    const client = getSupabaseClient();

    // Get test case analytics
    const { data: testCaseAnalytics, error } = await client
      .from('test_case_analytics')
      .select()
      .eq('problem_id', problemId);

    if (error) throw error;

    if (!testCaseAnalytics || testCaseAnalytics.length === 0) {
      return 0;
    }

    // Calculate average pass rate across all test cases
    const totalTests = testCaseAnalytics.reduce(
      (sum, tc) => sum + (tc.pass_count + tc.fail_count),
      0
    );

    if (totalTests === 0) return 0;

    const totalPassed = testCaseAnalytics.reduce((sum, tc) => sum + tc.pass_count, 0);
    return (totalPassed / totalTests) * 100;
  },

  /**
   * Get difficulty recommendation for a problem
   */
  async getDifficultyRecommendation(problemId: string): Promise<DifficultyRecommendation | null> {
    try {
      const client = getSupabaseClient();

      // Get problem info
      const { data: problem, error: problemError } = await client
        .from('problems')
        .select('id, difficulty, title')
        .eq('id', problemId)
        .single();

      if (problemError || !problem) return null;

      // Calculate pass rate
      const passRate = await this.calculatePassRate(problemId);
      const failRate = 100 - passRate;

      // Get test case analytics to identify challenging cases
      const { data: testCaseAnalytics } = await client
        .from('test_case_analytics')
        .select()
        .eq('problem_id', problemId);

      const challengingCases = testCaseAnalytics?.filter((tc) => tc.is_challenging) || [];

      // Determine recommendation
      let recommendedDifficulty = problem.difficulty;
      let reason = 'No adjustment needed';
      let confidence = 50;

      if (passRate >= 90) {
        // Problem is too easy
        recommendedDifficulty = Math.min(5, problem.difficulty + 1);
        reason = `High pass rate (${Math.round(passRate)}%) - Consider increasing difficulty`;
        confidence = Math.min(100, passRate - 80);
      } else if (passRate <= 40) {
        // Problem is too hard
        recommendedDifficulty = Math.max(1, problem.difficulty - 1);
        reason = `Low pass rate (${Math.round(passRate)}%) - Consider decreasing difficulty`;
        confidence = Math.min(100, 100 - passRate);
      } else if (challengingCases.length > 0) {
        // Identify specific test case issues
        reason = `${challengingCases.length} challenging test case(s) detected`;
        confidence = 70;
      }

      return {
        problemId,
        currentDifficulty: problem.difficulty,
        recommendedDifficulty,
        reason,
        confidence,
        passRate,
        failRate,
      };
    } catch (error) {
      console.error('[v0] Error getting difficulty recommendation:', error);
      return null;
    }
  },

  /**
   * Get recommendations for all problems
   */
  async getAllDifficultyRecommendations(): Promise<DifficultyRecommendation[]> {
    try {
      const client = getSupabaseClient();

      // Get all active problems
      const { data: problems, error } = await client
        .from('problems')
        .select('id')
        .eq('is_active', true);

      if (error || !problems) return [];

      // Get recommendations for each
      const recommendations: DifficultyRecommendation[] = [];

      for (const problem of problems) {
        const rec = await this.getDifficultyRecommendation(problem.id);
        if (rec) {
          recommendations.push(rec);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('[v0] Error getting all recommendations:', error);
      return [];
    }
  },

  /**
   * Update problem analytics
   */
  async updateProblemAnalytics(problemId: string): Promise<ProblemAnalytics | null> {
    try {
      const client = getSupabaseClient();

      // Get all submissions for this problem
      const { data: submissions, error } = await client
        .from('submissions')
        .select('passed_tests, total_tests, execution_time_ms')
        .eq('problem_id', problemId);

      if (error || !submissions || submissions.length === 0) return null;

      // Calculate metrics
      const totalAttempts = submissions.length;
      const successfulAttempts = submissions.filter(
        (s) => s.passed_tests === s.total_tests
      ).length;
      const failedAttempts = totalAttempts - successfulAttempts;

      const avgTime =
        submissions.reduce((sum, s) => sum + (s.execution_time_ms || 0), 0) / totalAttempts;

      const passRate = (successfulAttempts / totalAttempts) * 100;

      // Update analytics
      const { data, error: updateError } = await client
        .from('problem_analytics')
        .update({
          total_attempts: totalAttempts,
          successful_attempts: successfulAttempts,
          failed_attempts: failedAttempts,
          average_time_minutes: avgTime / 60000,
          pass_rate_percentage: passRate,
          last_updated: new Date().toISOString(),
        })
        .eq('problem_id', problemId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data || null;
    } catch (error) {
      console.error('[v0] Error updating problem analytics:', error);
      return null;
    }
  },

  /**
   * Track hint effectiveness
   */
  async getHintEffectiveness(problemId: string): Promise<{
    hintLevel: number;
    timesUsed: number;
    successRate: number;
  }[]> {
    try {
      const client = getSupabaseClient();

      // Get hints and their session outcomes
      const { data: hints, error } = await client
        .from('hints')
        .select('id, hint_level, session_id')
        .eq('problem_id', problemId);

      if (error || !hints) return [];

      // Group by hint level
      const hintLevels = [0, 1, 2, 3];
      const effectiveness = [];

      for (const level of hintLevels) {
        const hintsAtLevel = hints.filter((h) => h.hint_level === level);
        if (hintsAtLevel.length === 0) continue;

        // Get success rate for sessions with this hint level
        const { data: successfulSessions, error: sessionError } = await client
          .from('sessions')
          .select('id')
          .in(
            'id',
            hintsAtLevel.map((h) => h.session_id)
          )
          .eq('status', 'completed');

        const successRate = sessionError
          ? 0
          : (successfulSessions?.length || 0) / hintsAtLevel.length;

        effectiveness.push({
          hintLevel: level,
          timesUsed: hintsAtLevel.length,
          successRate: successRate * 100,
        });
      }

      return effectiveness;
    } catch (error) {
      console.error('[v0] Error getting hint effectiveness:', error);
      return [];
    }
  },
};
