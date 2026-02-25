import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface PairProgrammerState {
  isActive: boolean;
  sessionId: string;
  streamingText: string;
  suggestion: {
    suggestion: string;
    explanation: string;
    code_snippet?: string;
  } | null;
  timeRemaining: number;
  isLoading: boolean;
  error: string | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

export function usePairProgrammer() {
  const [state, setState] = useState<PairProgrammerState>({
    isActive: false,
    sessionId: '',
    streamingText: '',
    suggestion: null,
    timeRemaining: 30,
    isLoading: false,
    error: null,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startSession = useCallback(
    async (
      userCode: string,
      problemDescription: string,
      language: string
    ) => {
      const sessionId = uuidv4();
      setState((prev) => ({
        ...prev,
        isActive: true,
        isLoading: true,
        sessionId,
        streamingText: '',
        error: null,
        timeRemaining: 30,
      }));

      abortControllerRef.current = new AbortController();

      try {
        const geminiKey = typeof window !== 'undefined' ? localStorage.getItem('aura_gemini_key') ?? '' : '';
        const response = await fetch(`${BACKEND_URL}/api/pair-programmer/session/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            user_code: userCode,
            problem_description: problemDescription,
            language,
            context_window: [],
            ...(geminiKey ? { gemini_api_key: geminiKey } : {}),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error('Stream request failed');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        let fullText = '';
        const decoder = new TextDecoder();

        // Start countdown timer
        let remaining = 30;
        timerRef.current = setInterval(() => {
          remaining--;
          setState((prev) => ({ ...prev, timeRemaining: remaining }));
          
          if (remaining <= 0) {
            clearInterval(timerRef.current!);
            endSession(sessionId);
          }
        }, 1000);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          fullText += text;
          
          setState((prev) => ({
            ...prev,
            streamingText: fullText,
            isLoading: false,
          }));

          // Parse JSON messages if they appear
          try {
            const lines = fullText.split('\n');
            const lastLine = lines[lines.length - 2];
            if (lastLine && lastLine.startsWith('{')) {
              const parsed = JSON.parse(lastLine);
              if (parsed.type === 'suggestion_complete') {
                setState((prev) => ({
                  ...prev,
                  suggestion: parsed.data,
                }));
              }
            }
          } catch {
            // Not yet complete JSON
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            error: error.message,
            isLoading: false,
          }));
        }
      }
    },
    []
  );

  const endSession = useCallback(async (sessionId: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    try {
      await fetch(`${BACKEND_URL}/api/pair-programmer/end-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (error) {
      console.error('Failed to end session:', error);
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      isLoading: false,
    }));
  }, []);

  const cancelSession = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isActive: false,
      isLoading: false,
      error: 'Session cancelled',
    }));
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return {
    ...state,
    startSession,
    endSession,
    cancelSession,
  };
}
