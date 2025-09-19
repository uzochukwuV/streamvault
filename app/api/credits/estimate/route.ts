import { NextRequest, NextResponse } from 'next/server';
import { creditManager } from '@/services/CreditManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileType, fileCount, features, userId } = body;

    if (!userId || !fileType || !fileCount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const estimate = await creditManager.estimateUploadCost({
      fileType,
      fileCount,
      features: features || [],
      userId,
    });

    return NextResponse.json(estimate);
  } catch (error: any) {
    console.error('Failed to estimate upload cost:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}