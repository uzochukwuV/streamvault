import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const {
      walletAddress,
      displayName,
      bio,
      genres,
      userType,
      stageName,
      creatorBio,
      socialLinks
    } = await request.json();

    if (!walletAddress || !displayName || !userType) {
      return NextResponse.json(
        { error: 'Wallet address, display name, and user type are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingCreator = await prisma.creator.findUnique({
      where: { walletAddress },
      include: { user: true }
    });

    if (existingCreator) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    let user;
    let creator;

    if (userType === 'listener') {
      // Create listener user
      user = await prisma.user.create({
        data: {
          username: displayName.toLowerCase().replace(/\s+/g, '_'),
          displayName,
          bio,
          credits: {
            create: {
              balance: 100, // Welcome bonus for listeners
              totalEarned: 100,
            }
          }
        },
        include: {
          credits: true
        }
      });

      // Create welcome transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'BONUS',
          amount: 100,
          balanceAfter: 100,
          purpose: 'welcome_bonus',
          description: 'Welcome bonus for new listener',
          usdEquivalent: 0,
        }
      });

    } else if (userType === 'creator') {
      // Validate creator required fields
      if (!stageName || !genres || genres.length === 0) {
        return NextResponse.json(
          { error: 'Stage name and genres are required for creators' },
          { status: 400 }
        );
      }

      // Create creator user with creator profile
      user = await prisma.user.create({
        data: {
          username: stageName.toLowerCase().replace(/\s+/g, '_'),
          displayName,
          bio,
          credits: {
            create: {
              balance: 75, // Creator welcome bonus (5 free uploads)
              totalEarned: 75,
            }
          },
          creator: {
            create: {
              stageName,
              description: creatorBio,
              genre: genres,
              walletAddress,
            }
          }
        },
        include: {
          creator: true,
          credits: true
        }
      });

      // Create welcome transaction for creator
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'BONUS',
          amount: 75,
          balanceAfter: 75,
          purpose: 'creator_welcome_bonus',
          description: 'Creator welcome bonus - 5 free uploads',
          usdEquivalent: 0,
        }
      });

      creator = user.creator;
    }

    const response = {
      success: true,
      user: {
        id: user!.id,
        username: user!.username,
        displayName: user!.displayName,
        bio: user!.bio,
        isVerified: user!.isVerified,
        isPremium: user!.isPremium,
        userType,
        credits: {
          balance: user!.credits?.balance || 0,
          totalEarned: user!.credits?.totalEarned || 0,
        }
      },
      creator: creator ? {
        id: creator.id,
        stageName: creator.stageName,
        genre: creator.genre,
        description: creator.description,
        walletAddress: creator.walletAddress,
        totalPlays: creator.totalPlays,
        followerCount: creator.followerCount,
        hasCoin: creator.hasCoin,
      } : null
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}