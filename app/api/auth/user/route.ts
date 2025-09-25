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

    // Try to find existing creator first (since walletAddress is now on Creator)
    const user = await prisma.user!.findUnique({
      where: { walletAddress },
      include: {
        creator: true,
        credits: true
      }
    });

    console.log(user)


    if (!user){
      // Create new user if doesn't exist
   
      // Update last active time
     
      try {
        const vuser = await prisma.user!.create({
         
          data: { walletAddress, username: walletAddress, displayName: walletAddress },
         
        });
      } catch (updateError) {
        console.error('Failed to update user lastActiveAt:', updateError);
        // Continue with the existing user data if update fails
      }
    
    }

    // Format response
    const userData = {
      id: user!.id,
      username: user!.username,
      displayName: user!.displayName,
      walletAddress: user!.creator?.walletAddress,
      profileImage: user!.profileImage,
      bio: user!.bio,
      isVerified: user!.isVerified,
      isPremium: user!.isPremium,
      followingCount: user!.followingCount,
      creator: user!.creator ? {
        id: user!.creator.id,
        stageName: user!.creator.stageName,
        genre: user!.creator.genre,
        description: user!.creator.description,
        walletAddress: user!.creator.walletAddress,
        totalPlays: user!.creator.totalPlays,
        monthlyPlays: user!.creator.monthlyPlays,
        followerCount: user!.creator.followerCount,
        monthlyRevenue: user!.creator.monthlyRevenue.toString(),
        engagementScore: user!.creator.engagementScore,
        hasCoin: user!.creator.hasCoin,
        coinAddress: user!.creator.coinAddress,
      } : null,
      credits: user!.credits ? {
        balance: user!.credits.balance,
        totalEarned: user!.credits.totalEarned,
        totalSpent: user!.credits.totalSpent,
      } : null,
    };

    return NextResponse.json(userData);

  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error.message },
      { status: 500 }
    );
  }
}



