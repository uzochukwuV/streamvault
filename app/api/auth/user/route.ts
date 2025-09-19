import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    console.log(walletAddress)
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        creator: true,
        credits: true,
      },
    });
    console.log(user)

    // Create new user if doesn't exist
    if (!user) {
      // Generate unique username from wallet address
      let username = `user_${walletAddress.slice(2, 8)}`;
      let attempts = 0;

      // Ensure username is unique by checking and adding suffix if needed
      while (attempts < 10) {
        const existingUser = await prisma.user.findUnique({
          where: { username: attempts === 0 ? username : `${username}_${attempts}` }
        });

        if (!existingUser) {
          if (attempts > 0) {
            username = `${username}_${attempts}`;
          }
          break;
        }
        attempts++;
      }

      console.log('Creating user with username:', username);

      user = await prisma.user.create({
        data: {
          walletAddress,
          username,
          displayName: `User ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          credits: {
            create: {
              balance: 100, // Welcome bonus
              totalEarned: 100,
            }
          }
        },
        include: {
          creator: true,
          credits: true,
        },
      });

      console.log('Created new user:', user.id);
    } else {
      // Update last active time
      console.log("updatinh")
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
        include: {
          creator: true,
          credits: true,
        },
      });
    }

    // Format response
    const userData = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      profileImage: user.profileImage,
      bio: user.bio,
      isVerified: user.isVerified,
      isPremium: user.isPremium,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      totalPlays: user.totalPlays,
      creator: user.creator ? {
        id: user.creator.id,
        stageName: user.creator.stageName,
        genre: user.creator.genre,
        description: user.creator.description,
        walletAddress: user.creator.walletAddress,
        totalPlays: user.creator.totalPlays,
        monthlyPlays: user.creator.monthlyPlays,
        followerCount: user.creator.followerCount,
        monthlyRevenue: user.creator.monthlyRevenue.toString(),
        engagementScore: user.creator.engagementScore,
        hasCoin: user.creator.hasCoin,
        coinAddress: user.creator.coinAddress,
      } : null,
      credits: user.credits ? {
        balance: user.credits.balance,
        totalEarned: user.credits.totalEarned,
        totalSpent: user.credits.totalSpent,
      } : null,
    };

    return NextResponse.json(userData);

  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}



