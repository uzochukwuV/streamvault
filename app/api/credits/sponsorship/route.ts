import { NextRequest, NextResponse } from 'next/server';
import { creditManager } from '@/services/CreditManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const eligibility = await creditManager.checkSponsorshipEligibility(userId);
    return NextResponse.json(eligibility);
  } catch (error: any) {
    console.error('Failed to check sponsorship eligibility:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}