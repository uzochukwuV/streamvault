import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { userId, walletAddress, stageName, genre, description } = await request.json();

    if (!userId || !walletAddress || !stageName || !genre) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has a creator profile
    const existingCreator = await prisma.creator.findUnique({
      where: { userId }
    });

    if (existingCreator) {
      return NextResponse.json(
        { error: 'User already has a creator profile' },
        { status: 400 }
      );
    }

    // Check if stage name is taken
    const existingStageName = await prisma.creator.findUnique({
      where: { stageName }
    });

    if (existingStageName) {
      return NextResponse.json(
        { error: 'Stage name is already taken' },
        { status: 400 }
      );
    }

    // Create creator profile
    const creator = await prisma.creator.create({
      data: {
        userId,
        stageName,
        genre: Array.isArray(genre) ? genre : [genre],
        description,
        walletAddress,
      },
    });

    // Get updated user with creator profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creator: true,
        credits: true,
      },
    });

    // Award bonus credits for becoming a creator
    if (updatedUser?.credits) {
      await prisma.userCredits.update({
        where: { userId },
        data: {
          balance: { increment: 500 }, // Creator bonus
          totalEarned: { increment: 500 },
        },
      });

      // Log the credit transaction
      await prisma.creditTransaction.create({
        data: {
          userId,
          type: 'BONUS',
          amount: 500,
          balanceAfter: updatedUser.credits.balance + 500,
          purpose: 'creator_signup_bonus',
          description: 'Welcome bonus for becoming a creator',
        },
      });
    }

    // Format response
    const userData = {
      id: updatedUser!.id,
      username: updatedUser!.username,
      displayName: updatedUser!.displayName,
      walletAddress: updatedUser!.walletAddress,
      profileImage: updatedUser!.profileImage,
      bio: updatedUser!.bio,
      isVerified: updatedUser!.isVerified,
      isPremium: updatedUser!.isPremium,
      followerCount: updatedUser!.followerCount,
      followingCount: updatedUser!.followingCount,
      totalPlays: updatedUser!.totalPlays,
      creator: {
        id: creator.id,
        stageName: creator.stageName,
        genre: creator.genre,
        description: creator.description,
        walletAddress: creator.walletAddress,
        totalPlays: creator.totalPlays,
        monthlyPlays: creator.monthlyPlays,
        followerCount: creator.followerCount,
        monthlyRevenue: creator.monthlyRevenue.toString(),
        engagementScore: creator.engagementScore,
        hasCoin: creator.hasCoin,
        coinAddress: creator.coinAddress,
      },
      credits: updatedUser!.credits ? {
        balance: updatedUser!.credits.balance + 500,
        totalEarned: updatedUser!.credits.totalEarned + 500,
        totalSpent: updatedUser!.credits.totalSpent,
      } : null,
    };

    return NextResponse.json(userData);

  } catch (error: any) {
    console.error('Creator signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create creator profile', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}