import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { title, description, genre, isPremium = false, price } = await request.json();

    // Validate required fields
    if (!title || !genre) {
      return NextResponse.json(
        { error: 'Title and genre are required' },
        { status: 400 }
      );
    }

    // Get the uploaded file
    const uploadedFile = await prisma.uploadedFile.findUnique({
      where: { id },
      include: {
        creator: true,
        user: true
      }
    });

    if (!uploadedFile) {
      return NextResponse.json(
        { error: 'Uploaded file not found' },
        { status: 404 }
      );
    }

    // Check if file is ready to be converted
    if (uploadedFile.uploadStatus !== 'CONFIRMED' && uploadedFile.uploadStatus !== 'UPLOADED') {
      return NextResponse.json(
        { error: `File cannot be converted. Current status: ${uploadedFile.uploadStatus}` },
        { status: 400 }
      );
    }

    // Check if file is already converted to a track
    if (uploadedFile.trackId) {
      return NextResponse.json(
        { error: 'File has already been converted to a track' },
        { status: 400 }
      );
    }

    // Must have creator to publish tracks
    if (!uploadedFile.creator) {
      return NextResponse.json(
        { error: 'Only creators can publish tracks' },
        { status: 400 }
      );
    }

    // Validate price for premium tracks
    if (isPremium && (!price || price <= 0)) {
      return NextResponse.json(
        { error: 'Premium tracks must have a valid price' },
        { status: 400 }
      );
    }

    // Create the track in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the track
      const track = await tx.track.create({
        data: {
          title,
          description: description || null,
          genre,
          duration: uploadedFile.duration || 0,
          fileHash: uploadedFile.fileHash,
          fileName: uploadedFile.fileName,
          fileSize: uploadedFile.fileSize,
          storageProvider: uploadedFile.storageProvider,
          encryptionKey: uploadedFile.encryptionKey,
          isPremium,
          price: isPremium && price ? price.toString() : null,
          creatorId: uploadedFile.creator!.id,
          publishedAt: new Date(),
        },
        include: {
          creator: {
            include: {
              user: {
                select: {
                  profileImage: true,
                  isVerified: true,
                }
              }
            }
          }
        }
      });

      // Update the uploaded file to link it to the track and mark as published
      await tx.uploadedFile.update({
        where: { id },
        data: {
          trackId: track.id,
          uploadStatus: 'PUBLISHED',
          publishedAt: new Date(),
        }
      });

      // Update creator's track count
      await tx.creator.update({
        where: { id: uploadedFile.creator!.id },
        data: {
          totalPlays: { increment: 0 }, // Initialize if needed
        }
      });

      return track;
    });

    // Format the response
    const formattedTrack = {
      id: result.id,
      title: result.title,
      description: result.description,
      genre: result.genre,
      duration: result.duration,
      fileHash: result.fileHash,
      fileName: result.fileName,
      fileSize: result.fileSize,
      playCount: result.playCount,
      likeCount: result.likeCount,
      commentCount: result.commentCount,
      shareCount: result.shareCount,
      isPremium: result.isPremium,
      price: result.price?.toString() || null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      publishedAt: result.publishedAt?.toISOString() || null,
      creator: {
        id: result.creator.id,
        stageName: result.creator.stageName,
        genre: result.creator.genre,
        description: result.creator.description,
        walletAddress: result.creator.walletAddress,
        totalPlays: result.creator.totalPlays,
        followerCount: result.creator.followerCount,
        isVerified: result.creator.user?.isVerified || false,
        user: result.creator.user ? {
          profileImage: result.creator.user.profileImage,
          isVerified: result.creator.user.isVerified,
        } : null,
      }
    };

    return NextResponse.json({
      success: true,
      track: formattedTrack,
      message: 'File successfully converted to track'
    });

  } catch (error: any) {
    console.error('Convert to track error:', error);
    return NextResponse.json(
      { error: 'Failed to convert file to track', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}