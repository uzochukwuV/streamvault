import { NextRequest, NextResponse } from 'next/server';
import { creditManager } from '@/services/CreditManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const credits = await creditManager.getUserCredits(userId);
    return NextResponse.json(credits);
  } catch (error: any) {
    console.error('Failed to get user credits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}