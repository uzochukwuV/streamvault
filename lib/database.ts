/**
 * Database connection and utilities for StreamVault V2
 * Provides Prisma client and common database operations
 */

import { PrismaClient } from '../app/generated/prisma';

// Global variable to store the Prisma client instance
declare global {
  let __prisma: PrismaClient | undefined;
}

// Initialize Prisma client with better error handling
const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}

export { prisma };

/**
 * Database health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Graceful shutdown of database connections
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Creator-specific database operations
 */
export const creatorDB = {
  /**
   * Get creator by wallet address
   */
  async getByWallet(walletAddress: string) {
    return await prisma.creator.findUnique({
      where: { walletAddress },
      include: {
        user: true,
        tracks: true,
        milestones: true,
      },
    });
  },

  /**
   * Get creators eligible for oracle sync
   * (those with wallet addresses and recent activity)
   */
  async getEligibleForSync() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await prisma.creator.findMany({
      where: {
        walletAddress: { not: null },
        OR: [
          { updatedAt: { gte: twentyFourHoursAgo } },
          { lastSyncAt: null },
          { lastSyncAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }, // Not synced in last hour
        ],
      },
      include: {
        user: true,
        tracks: true,
      },
    });
  },

  /**
   * Update creator metrics after successful sync
   */
  async updateMetrics(creatorId: string, metrics: {
    totalPlays: number;
    followerCount: number;
    monthlyRevenue: number;
    engagementScore: number;
  }) {
    return await prisma.creator.update({
      where: { id: creatorId },
      data: {
        ...metrics,
        lastSyncAt: new Date(),
        syncErrorCount: 0,
        lastSyncError: null,
      },
    });
  },

  /**
   * Record sync error
   */
  async recordSyncError(creatorId: string, error: string) {
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { syncErrorCount: true },
    });

    return await prisma.creator.update({
      where: { id: creatorId },
      data: {
        syncErrorCount: (creator?.syncErrorCount || 0) + 1,
        lastSyncError: error,
      },
    });
  },

  /**
   * Update creator coin status
   */
  async updateCoinStatus(creatorId: string, coinData: {
    coinAddress: string;
    txHash: string;
  }) {
    return await prisma.creator.update({
      where: { id: creatorId },
      data: {
        hasCoin: true,
        coinAddress: coinData.coinAddress,
        coinTxHash: coinData.txHash,
        coinCreatedAt: new Date(),
      },
    });
  },
};

/**
 * Milestone tracking operations
 */
export const milestoneDB = {
  /**
   * Check if milestone already exists
   */
  async exists(creatorId: string, type: string, threshold: number): Promise<boolean> {
    const milestone = await prisma.creatorMilestone.findFirst({
      where: {
        creatorId,
        type: type as any,
        threshold,
      },
    });
    return !!milestone;
  },

  /**
   * Create new milestone
   */
  async create(creatorId: string, milestone: {
    type: string;
    threshold: number;
    description: string;
    currentValue: number;
    txHash?: string;
    blockNumber?: number;
  }) {
    return await prisma.creatorMilestone.create({
      data: {
        creatorId,
        type: milestone.type as any,
        threshold: milestone.threshold,
        description: milestone.description,
        currentValue: milestone.currentValue,
        txHash: milestone.txHash,
        blockNumber: milestone.blockNumber,
        isProcessed: !!milestone.txHash,
      },
    });
  },

  /**
   * Get creator's milestones
   */
  async getByCreator(creatorId: string) {
    return await prisma.creatorMilestone.findMany({
      where: { creatorId },
      orderBy: { achievedAt: 'desc' },
    });
  },
};

/**
 * Oracle sync logging operations
 */
export const oracleLogDB = {
  /**
   * Create sync log entry
   */
  async createLog(data: {
    creatorId: string;
    operation: string;
    status: string;
    totalPlays: number;
    followerCount: number;
    monthlyRevenue: number;
    engagementScore: number;
    txHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    error?: string;
    attempts?: number;
  }) {
    return await prisma.oracleSyncLog.create({
      data: {
        ...data,
        operation: data.operation as any,
        status: data.status as any,
        monthlyRevenue: data.monthlyRevenue.toString(),
        attempts: data.attempts || 1,
      },
    });
  },

  /**
   * Update sync log status
   */
  async updateStatus(logId: string, data: {
    status: string;
    txHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    error?: string;
    attempts?: number;
  }) {
    return await prisma.oracleSyncLog.update({
      where: { id: logId },
      data: {
        ...data,
        status: data.status as any,
        completedAt: data.status === 'SUCCESS' ? new Date() : undefined,
      },
    });
  },

  /**
   * Get recent sync logs for monitoring
   */
  async getRecentLogs(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await prisma.oracleSyncLog.findMany({
      where: {
        startedAt: { gte: since },
      },
      include: {
        creator: {
          select: {
            stageName: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  },

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStats(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await prisma.oracleSyncLog.groupBy({
      by: ['status'],
      where: {
        startedAt: { gte: since },
      },
      _count: {
        status: true,
      },
    });

    const result = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
    };

    stats.forEach(stat => {
      result.total += stat._count.status;
      if (stat.status === 'SUCCESS') result.success = stat._count.status;
      if (stat.status === 'FAILED') result.failed = stat._count.status;
      if (stat.status === 'PENDING') result.pending = stat._count.status;
    });

    result.successRate = result.total > 0 ? result.success / result.total : 0;

    return result;
  },
};

/**
 * Credit system operations
 */
export const creditDB = {
  /**
   * Get user credit balance
   */
  async getUserBalance(userId: string) {
    const userCredits = await prisma.userCredits.findUnique({
      where: { userId },
    });

    return userCredits ? userCredits.balance : 0;
  },

  /**
   * Check if user has sufficient credits
   */
  async hasCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getUserBalance(userId);
    return balance >= amount;
  },

  /**
   * Get recent credit transactions
   */
  async getRecentTransactions(userId: string, limit: number = 10) {
    return await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get platform credit statistics
   */
  async getPlatformStats(days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalIssued, totalSpent, revenue, activeUsers] = await Promise.all([
      prisma.creditTransaction.aggregate({
        where: {
          createdAt: { gte: since },
          type: { in: ['PURCHASE', 'BONUS', 'EARN'] },
        },
        _sum: { amount: true },
      }),

      prisma.creditTransaction.aggregate({
        where: {
          createdAt: { gte: since },
          type: 'SPEND',
        },
        _sum: { amount: true },
      }),

      prisma.creditPurchase.aggregate({
        where: {
          createdAt: { gte: since },
          status: 'COMPLETED',
        },
        _sum: { usdPrice: true },
      }),

      prisma.userCredits.count({
        where: { updatedAt: { gte: since } },
      }),
    ]);

    return {
      totalIssued: totalIssued._sum.amount || 0,
      totalSpent: Math.abs(totalSpent._sum.amount || 0),
      revenue: parseFloat(revenue._sum.usdPrice?.toString() || '0'),
      activeUsers,
    };
  },
};

/**
 * Gas management operations
 */
export const gasDB = {
  /**
   * Get recent gas transactions
   */
  async getRecentTransactions(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await prisma.filecoinGasTransaction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get gas optimization statistics
   */
  async getOptimizationStats(days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await prisma.filecoinGasTransaction.aggregate({
      where: { createdAt: { gte: since } },
      _sum: {
        totalCostUSDC: true,
        costSavings: true,
        batchSize: true,
      },
      _count: { id: true },
      _avg: { batchSize: true },
    });

    const successCount = await prisma.filecoinGasTransaction.count({
      where: {
        createdAt: { gte: since },
        status: 'CONFIRMED',
      },
    });

    return {
      totalCost: parseFloat(stats._sum.totalCostUSDC?.toString() || '0'),
      totalSavings: parseFloat(stats._sum.costSavings?.toString() || '0'),
      averageBatchSize: Math.round(stats._avg.batchSize || 0),
      successRate: stats._count.id > 0 ? successCount / stats._count.id : 0,
      totalTransactions: stats._count.id,
    };
  },
};

/**
 * Analytics operations
 */
export const analyticsDB = {
  /**
   * Get creator analytics for oracle sync
   */
  async getCreatorMetrics(creatorId: string) {
    // Get recent plays (last 30 days for monthly calculation)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [creator, monthlyPlays, totalFollowers] = await Promise.all([
      prisma.creator.findUnique({
        where: { id: creatorId },
        include: {
          user: true,
          tracks: {
            include: {
              plays: {
                where: {
                  completedAt: { gte: thirtyDaysAgo },
                },
              },
            },
          },
        },
      }),

      // Get monthly play count
      prisma.play.count({
        where: {
          track: {
            creatorId,
          },
          completedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Get follower count
      prisma.follow.count({
        where: {
          following: {
            creator: {
              id: creatorId,
            },
          },
        },
      }),
    ]);

    if (!creator) return null;

    const totalPlays = creator.tracks.reduce((sum, track) => sum + track.playCount, 0);

    return {
      creatorId,
      walletAddress: creator.walletAddress!,
      stageName: creator.stageName,
      totalPlays,
      monthlyPlays,
      followers: totalFollowers,
      monthlyRevenue: parseFloat(creator.monthlyRevenue.toString()),
      lastUpdated: creator.updatedAt,
    };
  },

  /**
   * Calculate engagement score based on user interactions
   */
  async calculateEngagementScore(creatorId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPlays,
      totalLikes,
      totalComments,
      followers,
      tracks,
    ] = await Promise.all([
      prisma.play.count({
        where: {
          track: { creatorId },
          completedAt: { gte: thirtyDaysAgo },
        },
      }),

      prisma.like.count({
        where: {
          track: { creatorId },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      prisma.comment.count({
        where: {
          track: { creatorId },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      prisma.follow.count({
        where: {
          following: {
            creator: { id: creatorId },
          },
        },
      }),

      prisma.track.count({
        where: { creatorId },
      }),
    ]);

    // Calculate engagement score (0-100)
    let score = 0;

    // Base score from play-to-follower ratio (up to 40 points)
    if (followers > 0) {
      const playToFollowerRatio = totalPlays / followers;
      score += Math.min(playToFollowerRatio / 10, 40);
    }

    // Interaction bonus (up to 30 points)
    const interactionRate = (totalLikes + totalComments * 2) / Math.max(totalPlays, 1);
    score += Math.min(interactionRate * 100, 30);

    // Content consistency bonus (up to 30 points)
    const tracksPerMonth = tracks / Math.max(1, (Date.now() - new Date('2024-01-01').getTime()) / (30 * 24 * 60 * 60 * 1000));
    score += Math.min(tracksPerMonth * 10, 30);

    return Math.floor(Math.min(score, 100));
  },
};