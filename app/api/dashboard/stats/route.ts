import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get platform-wide statistics
    const [
      totalTracks,
      totalCreators,
      totalUsers,
      totalPlays,
      recentTracks,
      topCreators,
      totalRevenue
    ] = await Promise.all([
      // Total tracks count
      prisma.uploadedFile.count({
        where: { uploadStatus: 'UPLOADED' }
      }),

      // Total creators count
      prisma.creator.count(),

      // Total users count
      prisma.user.count(),

      // Total plays count
      prisma.play.count(),

      // Recent tracks (last 7 days)
      prisma.uploadedFile.findMany({
        where: {
          uploadStatus: 'UPLOADED',
          uploadedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          creator: {
            select: {
              stageName: true,
              genre: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        take: 10
      }),

      // Top creators by follower count
      prisma.creator.findMany({
        orderBy: { followerCount: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              profileImage: true,
              isVerified: true
            }
          }
        }
      }),

      // Calculate total revenue from credit purchases
      prisma.creditPurchase.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { usdPrice: true }
      })
    ]);

    // Format response
    const stats = {
      platform: {
        totalTracks,
        totalCreators,
        totalUsers,
        totalPlays,
        totalRevenue: parseFloat(totalRevenue._sum.usdPrice?.toString() || '0'),
        growth: {
          tracks: '+12%', // These would be calculated from historical data
          creators: '+8%',
          users: '+15%',
          revenue: '+24%'
        }
      },
      recentTracks: recentTracks.map(track => ({
        id: track.id,
        fileName: track.fileName,
        originalName: track.originalName,
        duration: track.duration,
        genre: track.genre,
        uploadedAt: track.uploadedAt,
        creator: track.creator ? {
          stageName: track.creator.stageName,
          genre: track.creator.genre
        } : null
      })),
      topCreators: topCreators.map(creator => ({
        id: creator.id,
        stageName: creator.stageName,
        genre: creator.genre,
        followerCount: creator.followerCount,
        totalPlays: creator.totalPlays,
        isVerified: creator.user?.isVerified || false,
        profileImage: creator.user?.profileImage
      }))
    };

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}