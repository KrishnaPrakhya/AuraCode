import { useCallback, useState } from 'react';
import { eventRepository } from '@/lib/supabase/repositories/events';
import type { Event, ProgrammingLanguage } from '@/lib/types/database';

interface UseCodeEditorProps {
  sessionId: string;
  userId: string;
  initialCode?: string;
  language: ProgrammingLanguage;
}

interface EditorState {
  code: string;
  isRunning: boolean;
  lastEventTimestamp: number;
}

/**
 * Hook for managing code editor state and event recording
 */
export function useCodeEditor({
  sessionId,
  userId,
  initialCode = '',
  language,
}: UseCodeEditorProps) {
  const [state, setState] = useState<EditorState>({
    code: initialCode,
    isRunning: false,
    lastEventTimestamp: 0,
  });

  const [sessionStartTime] = useState(Date.now());

  /**
   * Record a code change event
   */
  const recordCodeChange = useCallback(
    async (
      newCode: string,
      startLine: number,
      startColumn: number,
      endLine: number,
      endColumn: number,
      removedText: string
    ) => {
      const timestampMs = Date.now() - sessionStartTime;

      try {
        await eventRepository.record(
          sessionId,
          userId,
          'code_change',
          timestampMs,
          {
            type: 'code_change',
            start: { line: startLine, column: startColumn },
            end: { line: endLine, column: endColumn },
            text: newCode.substring(
              newCode.lastIndexOf('\n', newCode.length - newCode.split('\n').slice(endLine + 1).join('\n').length) + 1
            ),
            removed_text: removedText,
          }
        );

        setState((prev) => ({
          ...prev,
          code: newCode,
          lastEventTimestamp: timestampMs,
        }));
      } catch {
        // event recording is analytics-only; RLS failures are expected without auth
      }
    },
    [sessionId, userId, sessionStartTime]
  );

  /**
   * Record cursor movement
   */
  const recordCursorMove = useCallback(
    async (line: number, column: number) => {
      const timestampMs = Date.now() - sessionStartTime;

      try {
        await eventRepository.record(
          sessionId,
          userId,
          'cursor_move',
          timestampMs,
          {
            type: 'cursor_move',
            line,
            column,
          }
        );

        setState((prev) => ({
          ...prev,
          lastEventTimestamp: timestampMs,
        }));
      } catch {
        // analytics-only
      }
    },
    [sessionId, userId, sessionStartTime]
  );

  /**
   * Record code execution
   */
  const recordCodeRun = useCallback(
    async (code: string) => {
      const timestampMs = Date.now() - sessionStartTime;

      try {
        await eventRepository.record(
          sessionId,
          userId,
          'run_code',
          timestampMs,
          {
            type: 'run_code',
            code,
          }
        );

        setState((prev) => ({
          ...prev,
          isRunning: true,
          lastEventTimestamp: timestampMs,
        }));
      } catch {
        // analytics-only
      }
    },
    [sessionId, userId, sessionStartTime]
  );

  /**
   * Record hint request
   */
  const recordHintRequest = useCallback(
    async (hintLevel: number) => {
      const timestampMs = Date.now() - sessionStartTime;

      try {
        await eventRepository.record(
          sessionId,
          userId,
          'hint_request',
          timestampMs,
          {
            hint_level: hintLevel,
            code: state.code,
          }
        );

        setState((prev) => ({
          ...prev,
          lastEventTimestamp: timestampMs,
        }));
      } catch {
        // analytics-only
      }
    },
    [sessionId, userId, sessionStartTime, state.code]
  );

  /**
   * Mark execution complete
   */
  const markExecutionComplete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  /**
   * Update code state directly
   */
  const setCode = useCallback((newCode: string) => {
    setState(prev => ({ ...prev, code: newCode }));
  }, []);

  return {
    code: state.code,
    setCode,
    isRunning: state.isRunning,
    lastEventTimestamp: state.lastEventTimestamp,
    recordCodeChange,
    recordCursorMove,
    recordCodeRun,
    recordHintRequest,
    markExecutionComplete,
  };
}
