import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Calculate trending score based on recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get tracks with recent engagement
    const trendingTracks = await prisma.track.findMany({
      where: {
        publishedAt: { not: null },
        OR: [
          {
            plays: {
              some: {
                completedAt: { gte: sevenDaysAgo }
              }
            }
          },
          {
            likes: {
              some: {
                createdAt: { gte: sevenDaysAgo }
              }
            }
          },
          {
            comments: {
              some: {
                createdAt: { gte: sevenDaysAgo }
              }
            }
          },
          {
            createdAt: { gte: sevenDaysAgo }
          }
        ]
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
        },
        plays: {
          where: {
            completedAt: { gte: sevenDaysAgo }
          },
          select: { id: true }
        },
        likes: {
          where: {
            createdAt: { gte: sevenDaysAgo }
          },
          select: { id: true }
        },
        comments: {
          where: {
            createdAt: { gte: sevenDaysAgo }
          },
          select: { id: true }
        }
      }
    });

    // Calculate trending score for each track
    const tracksWithScore = trendingTracks.map(track => {
      const recentPlays = track.plays.length;
      const recentLikes = track.likes.length;
      const recentComments = track.comments.length;

      // Recency bonus (newer tracks get higher score)
      const daysSinceCreation = Math.max(1, Math.floor((Date.now() - track.createdAt.getTime()) / (24 * 60 * 60 * 1000)));
      const recencyBonus = Math.max(1, 8 - daysSinceCreation); // Bonus for tracks up to 7 days old

      // Calculate trending score
      // Weight: plays = 1, likes = 3, comments = 5, recency = multiplier
      const trendingScore = (recentPlays * 1 + recentLikes * 3 + recentComments * 5) * recencyBonus;

      return {
        ...track,
        trendingScore,
        recentEngagement: {
          recentPlays,
          recentLikes,
          recentComments,
          recencyBonus
        }
      };
    });

    // Sort by trending score and take the top results
    const sortedTracks = tracksWithScore
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    // Format the response
    const formattedTracks = sortedTracks.map(track => ({
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
      trendingScore: track.trendingScore,
      recentEngagement: track.recentEngagement,
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

    return NextResponse.json({
      tracks: formattedTracks,
      totalCount: formattedTracks.length,
      algorithm: {
        description: 'Trending algorithm based on recent engagement (7 days)',
        weights: {
          plays: 1,
          likes: 3,
          comments: 5,
          recencyBonus: 'up to 8x for tracks under 7 days old'
        }
      }
    });

  } catch (error: any) {
    console.error('Trending content API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending content', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}