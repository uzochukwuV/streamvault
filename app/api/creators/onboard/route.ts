import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const artistName = formData.get('artistName') as string;
    const bio = formData.get('bio') as string;
    const genre = formData.get('genre') as string;
    const socialLinksStr = formData.get('socialLinks') as string;
    const walletAddress = formData.get('walletAddress') as string;
    const profileImage = formData.get('profileImage') as File | null;
    const coverImage = formData.get('coverImage') as File | null;

    if (!artistName || !genre || !walletAddress) {
      return NextResponse.json(
        { error: 'Artist name, genre, and wallet address are required' },
        { status: 400 }
      );
    }

    const socialLinks = socialLinksStr ? JSON.parse(socialLinksStr) : {};

    // Handle file uploads
    let profileImagePath = null;
    let coverImagePath = null;

    if (profileImage) {
      const fileName = `profile_${Date.now()}_${profileImage.name}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'creators');

      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const filePath = join(uploadDir, fileName);
      const bytes = await profileImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      profileImagePath = `/uploads/creators/${fileName}`;
    }

    if (coverImage) {
      const fileName = `cover_${Date.now()}_${coverImage.name}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'creators');

      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const filePath = join(uploadDir, fileName);
      const bytes = await coverImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      coverImagePath = `/uploads/creators/${fileName}`;
    }

    // Create or update user (find by username since walletAddress moved to Creator)
    const user = await prisma.user.upsert({
      where: { username: artistName },
      update: {
        lastActiveAt: new Date(),
        profileImage: profileImagePath
      },
      create: {
        lastActiveAt: new Date(),
        profileImage: profileImagePath,
        username: artistName,
        displayName: artistName
      }
    });

    // Create or update creator profile
    const creator = await prisma.creator.upsert({
      where: { userId: user.id },
      update: {
        walletAddress,
        description: bio,
        genre: [genre],
      },
      create: {
        userId: user.id,
        walletAddress,
        stageName: artistName,
        description: bio,
        genre: [genre],
      }
    });

    // Initialize creator credits with new creator bonus
    await prisma.userCredits.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: 75, // 5 free uploads (15 credits each)
        totalEarned: 75,
        totalSpent: 0,
        totalPurchased: 0,
      }
    });

    // Create welcome transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount: 75,
        balanceAfter: 75,
        purpose: 'welcome_bonus',
        description: 'New creator welcome bonus - 5 free uploads',
        usdEquivalent: 0,
      }
    });

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        artistName: user.username,
        genre: creator.genre,
        profileImageUrl: user.profileImage,
        // coverImageUrl: creator.coverImageUrl,
      },
      user: {
        id: user.id,
        walletAddress: creator.walletAddress,
      }
    });

  } catch (error: any) {
    console.error('Creator onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}