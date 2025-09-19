/**
 * CreditManager - Off-chain credit system for gas fee abstraction
 *
 * Features:
 * - StreamVault Credits (SVC) purchase and management
 * - Predictable upload costs regardless of gas price fluctuations
 * - Sponsored uploads for new creators
 * - Credit transaction history and analytics
 * - Future on-chain token migration support
 */

import { prisma } from '../lib/database';
import { Decimal } from '@prisma/client/runtime/library';
import { CREDIT_PACKAGES, UPLOAD_COSTS, SPONSORSHIP_RULES } from '../lib/constants/credit-system';

interface CreditEstimate {
  baseCost: number;
  additionalFeatures: number;
  batchDiscount: number;
  totalCost: number;
  usdEquivalent: number;
  gasEquivalent: number;
}

interface UploadRequest {
  fileType: 'audio' | 'video' | 'album';
  fileCount: number;
  features: string[];
  userId: string;
}

export class CreditManager {
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalPurchased: number;
  }> {
    const userCredits = await prisma.userCredits.findUnique({
      where: { userId },
    });

    if (!userCredits) {
      // Create initial credit record
      const newCredits = await prisma.userCredits.create({
        data: { userId },
      });
      return {
        balance: newCredits.balance,
        totalEarned: newCredits.totalEarned,
        totalSpent: newCredits.totalSpent,
        totalPurchased: newCredits.totalPurchased,
      };
    }

    return {
      balance: userCredits.balance,
      totalEarned: userCredits.totalEarned,
      totalSpent: userCredits.totalSpent,
      totalPurchased: userCredits.totalPurchased,
    };
  }

  /**
   * Estimate upload costs for user
   */
  async estimateUploadCost(request: UploadRequest): Promise<CreditEstimate> {
    const { fileType, fileCount, features } = request;

    // Calculate base cost
    let baseCost = 0;
    switch (fileType) {
      case 'audio':
        baseCost = UPLOAD_COSTS.audioTrack * fileCount;
        break;
      case 'video':
        baseCost = UPLOAD_COSTS.videoContent * fileCount;
        break;
      case 'album':
        baseCost = UPLOAD_COSTS.albumBundle;
        break;
    }

    // Calculate additional features cost
    let additionalFeatures = 0;
    features.forEach(feature => {
      switch (feature) {
        case 'premium_encryption':
          additionalFeatures += UPLOAD_COSTS.premiumEncryption;
          break;
        case 'quality_variants':
          additionalFeatures += UPLOAD_COSTS.qualityVariants;
          break;
        case 'custom_thumbnail':
          additionalFeatures += UPLOAD_COSTS.customThumbnail;
          break;
      }
    });

    // Apply batch discount if applicable
    let batchDiscount = 0;
    if (fileCount >= UPLOAD_COSTS.batchDiscount.threshold) {
      batchDiscount = Math.round(
        (baseCost + additionalFeatures) * UPLOAD_COSTS.batchDiscount.discountPercent
      );
    }

    const totalCost = baseCost + additionalFeatures - batchDiscount;

    // Calculate equivalents (approximate values)
    const usdEquivalent = totalCost * 0.04; // Average $0.04 per credit
    const gasEquivalent = usdEquivalent * 0.8; // Assuming 80% goes to gas costs

    return {
      baseCost,
      additionalFeatures,
      batchDiscount,
      totalCost,
      usdEquivalent,
      gasEquivalent,
    };
  }

  /**
   * Check if user is eligible for sponsored upload
   */
  async checkSponsorshipEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
    remainingSponsored?: number;
  }> {
    // Check if user is a new creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creator: true,
        sponsoredUploads: true,
      },
    });

    if (!user) {
      return { eligible: false };
    }

    // New creator bonus
    if (user.creator && user.sponsoredUploads.length < SPONSORSHIP_RULES.newCreator.maxUploads) {
      const remaining = SPONSORSHIP_RULES.newCreator.maxUploads - user.sponsoredUploads.length;
      return {
        eligible: true,
        reason: SPONSORSHIP_RULES.newCreator.reason,
        remainingSponsored: remaining,
      };
    }

    // TODO: Add milestone-based sponsorship logic
    // Check if user recently hit a milestone and deserves bonus credits

    return { eligible: false };
  }

  /**
   * Process credit purchase
   */
  async purchaseCredits(
    userId: string,
    packageId: keyof typeof CREDIT_PACKAGES,
    paymentData: {
      paymentMethod: string;
      paymentId: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{
    success: boolean;
    purchase?: any;
    error?: string;
  }> {
    const packageInfo = CREDIT_PACKAGES[packageId];
    if (!packageInfo) {
      return { success: false, error: 'Invalid package selected' };
    }

    try {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create purchase record
        const purchase = await tx.creditPurchase.create({
          data: {
            userId,
            packageName: packageId,
            creditsAmount: packageInfo.credits,
            bonusCredits: packageInfo.bonusCredits,
            usdPrice: new Decimal(packageInfo.usdPrice),
            paymentMethod: paymentData.paymentMethod,
            paymentId: paymentData.paymentId,
            status: 'COMPLETED', // Would be PENDING in real implementation
            ipAddress: paymentData.ipAddress,
            userAgent: paymentData.userAgent,
            completedAt: new Date(),
          },
        });

        // Get or create user credits
        const userCredits = await tx.userCredits.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });

        // Calculate total credits to add
        const totalCredits = packageInfo.credits + packageInfo.bonusCredits;

        // Update user credit balance
        const updatedCredits = await tx.userCredits.update({
          where: { userId },
          data: {
            balance: { increment: totalCredits },
            totalEarned: { increment: totalCredits },
            totalPurchased: { increment: packageInfo.credits },
          },
        });

        // Create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'PURCHASE',
            amount: totalCredits,
            balanceAfter: updatedCredits.balance,
            purpose: 'purchase',
            description: `Purchased ${packageInfo.credits} credits${packageInfo.bonusCredits > 0 ? ` + ${packageInfo.bonusCredits} bonus` : ''}`,
            purchaseId: purchase.id,
            usdEquivalent: new Decimal(packageInfo.usdPrice),
          },
        });

        return purchase;
      });

      return { success: true, purchase: result };

    } catch (error: any) {
      console.error('Failed to process credit purchase:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Spend credits for upload
   */
  async spendCreditsForUpload(
    userId: string,
    cost: number,
    uploadContext: {
      fileUploadId: string;
      description: string;
      gasEquivalent?: number;
    }
  ): Promise<{
    success: boolean;
    remainingBalance?: number;
    error?: string;
  }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get current balance
        const userCredits = await tx.userCredits.findUnique({
          where: { userId },
        });

        if (!userCredits || userCredits.balance < cost) {
          throw new Error('Insufficient credit balance');
        }

        // Update balance
        const updatedCredits = await tx.userCredits.update({
          where: { userId },
          data: {
            balance: { decrement: cost },
            totalSpent: { increment: cost },
          },
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'SPEND',
            amount: -cost, // Negative for spending
            balanceAfter: updatedCredits.balance,
            purpose: 'file_upload',
            description: uploadContext.description,
            fileUploadId: uploadContext.fileUploadId,
            gasEquivalent: uploadContext.gasEquivalent ? new Decimal(uploadContext.gasEquivalent) : undefined,
          },
        });

        return updatedCredits.balance;
      });

      return { success: true, remainingBalance: result };

    } catch (error: any) {
      console.error('Failed to spend credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create sponsored upload
   */
  async createSponsoredUpload(
    userId: string,
    reason: string,
    uploadContext: {
      fileUploadId: string;
      creditsCost: number;
      usdValue: number;
      gasValue: number;
    }
  ): Promise<{
    success: boolean;
    sponsorship?: any;
    error?: string;
  }> {
    try {
      const sponsorship = await prisma.sponsoredUpload.create({
        data: {
          userId,
          reason,
          fileUploadId: uploadContext.fileUploadId,
          creditsCost: uploadContext.creditsCost,
          usdValue: new Decimal(uploadContext.usdValue),
          gasValue: new Decimal(uploadContext.gasValue),
        },
      });

      console.log(`🎁 Created sponsored upload for user ${userId}: ${uploadContext.creditsCost} credits saved`);

      return { success: true, sponsorship };

    } catch (error: any) {
      console.error('Failed to create sponsored upload:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's credit transaction history
   */
  async getCreditHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    return await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        purpose: true,
        description: true,
        usdEquivalent: true,
        gasEquivalent: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get platform credit statistics (admin use)
   */
  async getPlatformCreditStats(days: number = 30): Promise<{
    totalCreditsIssued: number;
    totalCreditsSpent: number;
    totalRevenue: number;
    activeUsers: number;
    averageBalance: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      creditStats,
      revenue,
      activeUsers,
      balanceStats,
    ] = await Promise.all([
      // Total credits issued and spent
      prisma.creditTransaction.aggregate({
        where: { createdAt: { gte: since } },
        _sum: {
          amount: true,
        },
      }),

      // Total revenue from purchases
      prisma.creditPurchase.aggregate({
        where: {
          createdAt: { gte: since },
          status: 'COMPLETED',
        },
        _sum: {
          usdPrice: true,
        },
      }),

      // Active users with credits
      prisma.userCredits.count({
        where: { updatedAt: { gte: since } },
      }),

      // Average balance
      prisma.userCredits.aggregate({
        _avg: { balance: true },
      }),
    ]);

    const totalAmount = creditStats._sum.amount || 0;
    const totalCreditsIssued = Math.max(0, totalAmount);
    const totalCreditsSpent = Math.max(0, -totalAmount);

    return {
      totalCreditsIssued,
      totalCreditsSpent,
      totalRevenue: parseFloat(revenue._sum.usdPrice?.toString() || '0'),
      activeUsers,
      averageBalance: Math.round(balanceStats._avg.balance || 0),
    };
  }
}

// Export singleton instance
export const creditManager = new CreditManager();