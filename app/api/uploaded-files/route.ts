import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const userId = searchParams.get('userId');
    const creatorId = searchParams.get('creatorId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'uploadedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (status) {
      where.uploadStatus = status;
    }

    // Build orderBy clause
    const orderBy: any = {};

    if (sortBy === 'uploadedAt') {
      orderBy.uploadedAt = sortOrder;
    } else if (sortBy === 'fileSize') {
      orderBy.fileSize = sortOrder;
    } else if (sortBy === 'playCount') {
      orderBy.playCount = sortOrder;
    } else {
      orderBy.uploadedAt = sortOrder;
    }

    // Fetch files with pagination
    const [files, totalCount] = await Promise.all([
      prisma.uploadedFile.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              stageName: true,
              genre: true,
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            }
          }
        }
      }),
      prisma.uploadedFile.count({ where })
    ]);

    // Format the response
    const formattedFiles = files.map(file => ({
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      fileHash: file.fileHash,
      pieceCid: file.pieceCid,
      txHash: file.txHash,
      blockNumber: file.blockNumber,
      storageProvider: file.storageProvider,
      uploadStatus: file.uploadStatus,
      processingError: file.processingError,
      duration: file.duration,
      bitrate: file.bitrate,
      genre: file.genre,
      artwork: file.artwork,
      isPublic: file.isPublic,
      isPremium: file.isPremium,
      encryptionKey: file.encryptionKey,
      tags: file.tags,
      downloadCount: file.downloadCount,
      playCount: file.playCount,
      lastAccessed: file.lastAccessed?.toISOString() || null,
      creditsCost: file.creditsCost,
      wasSponsored: file.wasSponsored,
      uploadedAt: file.uploadedAt.toISOString(),
      processedAt: file.processedAt?.toISOString() || null,
      publishedAt: file.publishedAt?.toISOString() || null,
      trackId: file.trackId,
      creator: file.creator,
      user: file.user,
    }));

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      files: formattedFiles,
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
    console.error('Uploaded files API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch uploaded files', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}