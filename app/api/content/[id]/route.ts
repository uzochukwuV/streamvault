import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Fetch track with all related data
    const track = await prisma.track.findUnique({
      where: { id },
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
        },
        likes: {
          select: {
            userId: true,
            user: {
              select: {
                username: true,
                displayName: true,
                profileImage: true,
              }
            }
          }
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                username: true,
                displayName: true,
                profileImage: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20 // Latest 20 comments
        },
        plays: {
          select: {
            id: true,
            duration: true,
            completedAt: true,
            userId: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 10 // Latest 10 plays for analytics
        }
      }
    });

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedTrack = {
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
      },
      likes: track.likes.map(like => ({
        userId: like.userId,
        user: {
          username: like.user.username,
          displayName: like.user.displayName,
          profileImage: like.user.profileImage,
        }
      })),
      comments: track.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        user: {
          username: comment.user.username,
          displayName: comment.user.displayName,
          profileImage: comment.user.profileImage,
        }
      })),
      recentPlays: track.plays.map(play => ({
        id: play.id,
        duration: play.duration,
        completedAt: play.completedAt.toISOString(),
        userId: play.userId,
      }))
    };

    return NextResponse.json(formattedTrack);

  } catch (error: any) {
    console.error('Track fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch track', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}