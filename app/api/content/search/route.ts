import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q');
    const genre = searchParams.get('genre');
    const isPremium = searchParams.get('isPremium');
    const creatorId = searchParams.get('creatorId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!query || query.trim() === '') {
      return NextResponse.json({
        tracks: [],
        totalCount: 0,
        hasMore: false,
        query: '',
        pagination: {
          limit,
          offset,
          total: 0,
          pages: 0,
          currentPage: 1,
        }
      });
    }

    const searchTerm = query.trim();

    // Build comprehensive search where clause
    const where: any = {
      publishedAt: { not: null }, // Only published tracks
      OR: [
        // Search in track title
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // Search in track description
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // Search in genre
        {
          genre: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // Search in creator stage name
        {
          creator: {
            stageName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        // Search in creator description
        {
          creator: {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        // Search in creator genre array
        {
          creator: {
            genre: {
              has: searchTerm
            }
          }
        }
      ]
    };

    // Add additional filters
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

    // Calculate relevance score for each track
    const tracksWithRelevance = tracks.map(track => {
      let relevanceScore = 0;

      // Higher score for exact matches in title
      if (track.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        relevanceScore += 10;
        if (track.title.toLowerCase() === searchTerm.toLowerCase()) {
          relevanceScore += 20; // Exact match bonus
        }
      }

      // Score for matches in creator name
      if (track.creator.stageName.toLowerCase().includes(searchTerm.toLowerCase())) {
        relevanceScore += 8;
      }

      // Score for matches in genre
      if (track.genre.toLowerCase().includes(searchTerm.toLowerCase())) {
        relevanceScore += 5;
      }

      // Score for matches in description
      if (track.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        relevanceScore += 3;
      }

      // Boost score based on popularity
      relevanceScore += Math.log10(track.playCount + 1) * 2;
      relevanceScore += Math.log10(track.likeCount + 1) * 1.5;

      return {
        ...track,
        relevanceScore
      };
    });

    // Sort by relevance if using default sort
    const sortedTracks = sortBy === 'createdAt' && sortOrder === 'desc'
      ? tracksWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore)
      : tracksWithRelevance;

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
      relevanceScore: track.relevanceScore,
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
      query: searchTerm,
      searchInfo: {
        searchFields: ['title', 'description', 'genre', 'creator.stageName', 'creator.description', 'creator.genre'],
        relevanceFactors: ['exact_match', 'partial_match', 'popularity_boost']
      },
      pagination: {
        limit,
        offset,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1,
      }
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search content', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}