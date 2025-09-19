import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function PUT(request: NextRequest) {
  try {
    const { userId, username, displayName, bio, profileImage } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if username is taken (if being updated)
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(displayName && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(profileImage !== undefined && { profileImage }),
      },
      include: {
        creator: true,
        credits: true,
      },
    });

    // Format response
    const userData = {
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      walletAddress: updatedUser.walletAddress,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
      isVerified: updatedUser.isVerified,
      isPremium: updatedUser.isPremium,
      followerCount: updatedUser.followerCount,
      followingCount: updatedUser.followingCount,
      totalPlays: updatedUser.totalPlays,
      creator: updatedUser.creator ? {
        id: updatedUser.creator.id,
        stageName: updatedUser.creator.stageName,
        genre: updatedUser.creator.genre,
        description: updatedUser.creator.description,
        walletAddress: updatedUser.creator.walletAddress,
        totalPlays: updatedUser.creator.totalPlays,
        monthlyPlays: updatedUser.creator.monthlyPlays,
        followerCount: updatedUser.creator.followerCount,
        monthlyRevenue: updatedUser.creator.monthlyRevenue.toString(),
        engagementScore: updatedUser.creator.engagementScore,
        hasCoin: updatedUser.creator.hasCoin,
        coinAddress: updatedUser.creator.coinAddress,
      } : null,
      credits: updatedUser.credits ? {
        balance: updatedUser.credits.balance,
        totalEarned: updatedUser.credits.totalEarned,
        totalSpent: updatedUser.credits.totalSpent,
      } : null,
    };

    return NextResponse.json(userData);

  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}