import { NextRequest, NextResponse } from 'next/server';

/**
 * React Challenge AI Evaluation Endpoint
 * Proxies evaluation requests to the FastAPI Gemini evaluator
 */
export async function POST(request: NextRequest) {
  try {
    const userApiKey = request.headers.get('x-gemini-key') ?? undefined;
    const body = await request.json();
    const { code, language, challenge_title, challenge_description, requirements } = body;

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    if (!challenge_title) {
      return NextResponse.json({ error: 'challenge_title is required' }, { status: 400 });
    }

    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/evaluate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        language: language || 'typescript',
        challenge_title,
        challenge_description: challenge_description || '',
        requirements: requirements || [],
        ...(userApiKey ? { gemini_api_key: userApiKey } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[evaluate] FastAPI error:', errorText);
      return NextResponse.json(
        { error: `Evaluation service error: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[evaluate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Evaluation failed' },
      { status: 500 }
    );
  }
}
