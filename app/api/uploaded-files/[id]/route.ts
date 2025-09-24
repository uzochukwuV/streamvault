import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// GET single uploaded file
export async function GET(
  request: NextRequest,
  { params }: any 
) {
  try {
    const  id  = await params.id;

    const file = await prisma.uploadedFile.findUnique({
      where: { id },
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
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Uploaded file not found' },
        { status: 404 }
      );
    }

    const formattedFile = {
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
    };

    return NextResponse.json(formattedFile);

  } catch (error: any) {
    console.error('Get uploaded file error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch uploaded file', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH update uploaded file metadata
export async function PATCH(
  request: NextRequest,
  { params }: any 
) {
  try {
    const { id } = params;
    const updates = await request.json();

    // Only allow updating certain fields
    const allowedUpdates = {
      originalName: updates.originalName,
      genre: updates.genre,
      artwork: updates.artwork,
      isPublic: updates.isPublic,
      isPremium: updates.isPremium,
      tags: updates.tags,
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });

    const updatedFile = await prisma.uploadedFile.update({
      where: { id },
      data: allowedUpdates,
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
    });

    const formattedFile = {
      id: updatedFile.id,
      fileName: updatedFile.fileName,
      originalName: updatedFile.originalName,
      fileSize: updatedFile.fileSize,
      mimeType: updatedFile.mimeType,
      fileHash: updatedFile.fileHash,
      pieceCid: updatedFile.pieceCid,
      txHash: updatedFile.txHash,
      blockNumber: updatedFile.blockNumber,
      storageProvider: updatedFile.storageProvider,
      uploadStatus: updatedFile.uploadStatus,
      processingError: updatedFile.processingError,
      duration: updatedFile.duration,
      bitrate: updatedFile.bitrate,
      genre: updatedFile.genre,
      artwork: updatedFile.artwork,
      isPublic: updatedFile.isPublic,
      isPremium: updatedFile.isPremium,
      encryptionKey: updatedFile.encryptionKey,
      tags: updatedFile.tags,
      downloadCount: updatedFile.downloadCount,
      playCount: updatedFile.playCount,
      lastAccessed: updatedFile.lastAccessed?.toISOString() || null,
      creditsCost: updatedFile.creditsCost,
      wasSponsored: updatedFile.wasSponsored,
      uploadedAt: updatedFile.uploadedAt.toISOString(),
      processedAt: updatedFile.processedAt?.toISOString() || null,
      publishedAt: updatedFile.publishedAt?.toISOString() || null,
      trackId: updatedFile.trackId,
      creator: updatedFile.creator,
      user: updatedFile.user,
    };

    return NextResponse.json(formattedFile);

  } catch (error: any) {
    console.error('Update uploaded file error:', error);
    return NextResponse.json(
      { error: 'Failed to update uploaded file', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE uploaded file
export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    const { id } = params;

    // Check if file exists and get its status
    const file = await prisma.uploadedFile.findUnique({
      where: { id },
      select: { uploadStatus: true, trackId: true }
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Uploaded file not found' },
        { status: 404 }
      );
    }

    // Don't allow deletion of published files that are linked to tracks
    if (file.uploadStatus === 'PUBLISHED' && file.trackId) {
      return NextResponse.json(
        { error: 'Cannot delete published files that are linked to tracks' },
        { status: 400 }
      );
    }

    // Mark as deleted instead of actually deleting to preserve history
    await prisma.uploadedFile.update({
      where: { id },
      data: {
        uploadStatus: 'DELETED'
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete uploaded file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete uploaded file', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}