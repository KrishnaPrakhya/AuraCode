import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // TODO: Fetch from Supabase
    // const { data, error } = await supabase
    //   .from('sessions')
    //   .select('*, events(*)')
    //   .eq('id', sessionId)
    //   .single();

    // Mock response for now
    return NextResponse.json({
      id: sessionId,
      userId: 'user-1',
      problemId: 'problem-1',
      problemTitle: 'Two Sum',
      language: 'python',
      startedAt: new Date().toISOString(),
      completedAt: null,
      finalScore: 85,
      events: []
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
