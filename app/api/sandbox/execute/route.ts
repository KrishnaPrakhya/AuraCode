import { NextRequest, NextResponse } from 'next/server';
import type { CodeExecutionRequest, CodeExecutionResponse, TestResult } from '@/lib/types/database';

/**
 * Code Execution Endpoint
 * Sends code to FastAPI backend for execution and returns test results
 */
export async function POST(request: NextRequest) {
  try {
    const body: CodeExecutionRequest = await request.json();
    const { code, language, test_cases, time_limit_ms = 5000 } = body;

    if (!code || !language || !test_cases) {
      return NextResponse.json(
        { error: 'Missing required fields: code, language, test_cases' },
        { status: 400 }
      );
    }

    // Call FastAPI backend
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/sandbox/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        language,
        test_cases,
        time_limit_ms,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[v0] Backend execution error:', error);
      return NextResponse.json(
        { error: 'Code execution failed', details: error },
        { status: response.status }
      );
    }

    const result: CodeExecutionResponse = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[v0] Code execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
