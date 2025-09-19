import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const genre = searchParams.get('genre');
    const isPremium = searchParams.get('isPremium');
    const creatorId = searchParams.get('creatorId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {
      publishedAt: { not: null }, // Only published tracks
    };

    if (genre) {
      where.genre = { contains: genre, mode: 'insensitive' };
    }

    if (isPremium !== null) {
      where.isPremium = isPremium === 'true';
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    // Build orderBy clause
    const orderBy: any = {};

    if (sortBy === 'playCount') {
      orderBy.playCount = sortOrder;
    } else if (sortBy === 'likeCount') {
      orderBy.likeCount = sortOrder;
    } else if (sortBy === 'commentCount') {
      orderBy.commentCount = sortOrder;
    } else if (sortBy === 'shareCount') {
      orderBy.shareCount = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Fetch tracks with pagination
    const [tracks, totalCount] = await Promise.all([
      prisma.track.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
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
      }),
      prisma.track.count({ where })
    ]);

    // Format the response
    const formattedTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      genre: track.genre,
      duration: track.duration,
      fileHash: track.fileHash,
      fileName: track.fileName,
      fileSize: track.fileSize,
      playCount: track.playCount,
      likeCount: track.likeCount,
      commentCount: track.commentCount,
      shareCount: track.shareCount,
      isPremium: track.isPremium,
      price: track.price?.toString() || null,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
      publishedAt: track.publishedAt?.toISOString() || null,
      creator: {
        id: track.creator.id,
        stageName: track.creator.stageName,
        genre: track.creator.genre,
        description: track.creator.description,
        walletAddress: track.creator.walletAddress,
        totalPlays: track.creator.totalPlays,
        followerCount: track.creator.followerCount,
        isVerified: track.creator.user?.isVerified || false,
        user: track.creator.user ? {
          profileImage: track.creator.user.profileImage,
          isVerified: track.creator.user.isVerified,
        } : null,
      }
    }));

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      tracks: formattedTracks,
      totalCount,
      hasMore,
      pagination: {
        limit,
        offset,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1,
      }
    });

  } catch (error: any) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}