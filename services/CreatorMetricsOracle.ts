import { ethers } from "ethers";
import { config } from "dotenv";
import { BlockchainErrorHandler } from "./BlockchainErrorHandler";

// Load environment variables
config();

// Deployed contract addresses on Filecoin Calibration
const CREATOR_METRICS_MANAGER = "0x4e16A7a1c32AB270961F7796AdbB46452C9dE0eE";
const CREATOR_TOKEN_FACTORY = "0xBE62747E099F4a361F291eb41c0eA1673C414322";

// Smart contract ABIs (you'll need to import these from your contract artifacts)
const CREATOR_METRICS_MANAGER_ABI = [
  "function updateCreatorMetrics(address creator, uint256 monthlyStreams, uint256 followers, uint256 monthlyRevenue, uint256 engagementScore) external",
  "function authorizedOracles(address) external view returns (bool)",
  "function meetsLaunchRequirements(address creator) external view returns (bool)",
  "function calculateIntrinsicValue(address creator) external view returns (uint256)"
];

const CREATOR_TOKEN_FACTORY_ABI = [
  "function launchCreatorCoin(address creator, string memory name, string memory symbol, uint256 initialSupply) external returns (address)",
  "function getCreatorCoinInfo(address creator) external view returns (address coinAddress, uint256 intrinsicValue, uint256 circulatingSupply, uint256 reserveRatio, bool hasRevenueBacking)"
];

// Types for our data structures
interface CreatorMetrics {
  creatorId: string;
  walletAddress: string;
  totalPlays: number;
  followers: number;
  monthlyRevenue: number; // in wei
  engagementScore: number;
  lastUpdated: Date;
}

interface MilestoneThreshold {
  type: 'plays' | 'followers' | 'revenue';
  threshold: number;
  description: string;
}

/**
 * CreatorMetricsOracle - Bridge between PostgreSQL analytics and blockchain
 * Syncs creator metrics and triggers milestone-based coin creation
 */
export class CreatorMetricsOracle {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private metricsManager: ethers.Contract;
  private tokenFactory: ethers.Contract;
  private errorHandler: BlockchainErrorHandler;

  // Milestone thresholds for creator coin creation and updates
  private readonly MILESTONE_THRESHOLDS: MilestoneThreshold[] = [
    { type: 'plays', threshold: 1000, description: '1K plays milestone' },
    { type: 'plays', threshold: 5000, description: '5K plays milestone' },
    { type: 'plays', threshold: 10000, description: '10K plays milestone' },
    { type: 'plays', threshold: 20000, description: '20K plays milestone' },
    { type: 'plays', threshold: 50000, description: '50K plays - coin creation eligible' },
    { type: 'followers', threshold: 1000, description: '1K followers milestone' },
    { type: 'followers', threshold: 5000, description: '5K followers milestone' },
    { type: 'followers', threshold: 10000, description: '10K followers milestone' },
    { type: 'revenue', threshold: 100, description: '100 FIL monthly revenue' }
  ];

  constructor() {
    // Initialize Filecoin Calibration testnet connection
    this.provider = new ethers.JsonRpcProvider("https://api.calibration.node.glif.io/rpc/v1");

    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

    // Initialize contract instances
    this.metricsManager = new ethers.Contract(
      CREATOR_METRICS_MANAGER,
      CREATOR_METRICS_MANAGER_ABI,
      this.wallet
    );

    this.tokenFactory = new ethers.Contract(
      CREATOR_TOKEN_FACTORY,
      CREATOR_TOKEN_FACTORY_ABI,
      this.wallet
    );

    // Initialize error handler
    this.errorHandler = new BlockchainErrorHandler(this.provider, this.wallet);
  }

  /**
   * Main sync function - updates all creator metrics on blockchain
   * Called by cron job every hour
   */
  async syncAllCreatorMetrics(): Promise<void> {
    console.log(`🔄 Starting creator metrics sync at ${new Date().toISOString()}`);

    try {
      // Get all creators with wallet addresses from your database
      const creators = await this.getCreatorsFromDatabase();

      console.log(`📊 Found ${creators.length} creators to sync`);

      for (const creator of creators) {
        await this.syncCreatorMetrics(creator);

        // Check for milestone achievements
        await this.checkMilestones(creator);

        // Small delay to avoid rate limiting
        await this.delay(1000);
      }

      console.log(`✅ Completed metrics sync for ${creators.length} creators`);
    } catch (error) {
      console.error("❌ Sync failed:", error);
      throw error;
    }
  }

  /**
   * Update individual creator metrics on blockchain
   */
  async syncCreatorMetrics(creator: CreatorMetrics): Promise<void> {
    console.log(`📈 Syncing metrics for creator ${creator.creatorId}`);

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(creator);

    // Create transaction function
    const updateMetricsTransaction = async () => {
      return await this.metricsManager.updateCreatorMetrics(
        creator.walletAddress,
        creator.totalPlays,
        creator.followers,
        ethers.parseEther(creator.monthlyRevenue.toString()), // Convert to wei
        engagementScore,
        {
          gasLimit: 200000 // Set reasonable gas limit
        }
      );
    };

    // Execute with robust error handling
    const result = await this.errorHandler.executeWithRetry(
      updateMetricsTransaction,
      'updateCreatorMetrics',
      creator.creatorId
    );

    if (result.success) {
      console.log(`✅ Metrics updated successfully: ${result.txHash}`);
      await this.updateLastSyncTimestamp(creator.creatorId);
    } else {
      console.error(`❌ Failed to sync creator ${creator.creatorId} after all retries: ${result.error}`);
      await this.handleSyncError(creator, new Error(result.error || 'Unknown error'));
    }
  }

  /**
   * Check if creator has hit any milestones and trigger appropriate actions
   */
  async checkMilestones(creator: CreatorMetrics): Promise<void> {
    try {
      // Check if creator meets coin launch requirements (50k plays + 5k followers)
      const meetsRequirements = await this.metricsManager.meetsLaunchRequirements(creator.walletAddress);

      if (meetsRequirements) {
        const coinInfo = await this.tokenFactory.getCreatorCoinInfo(creator.walletAddress);
        const hasCoin = coinInfo[0] !== "0x0000000000000000000000000000000000000000";

        if (!hasCoin) {
          console.log(`🚀 Creator ${creator.creatorId} is eligible for coin creation!`);
          await this.triggerCoinCreation(creator);
        }
      }

      // Check other milestone thresholds
      for (const milestone of this.MILESTONE_THRESHOLDS) {
        if (this.hasCrossedMilestone(creator, milestone)) {
          await this.handleMilestone(creator, milestone);
        }
      }

    } catch (error: any) {
      console.error(`❌ Milestone check failed for ${creator.creatorId}:`, error.message);
    }
  }

  /**
   * Trigger automatic creator coin creation
   */
  async triggerCoinCreation(creator: CreatorMetrics): Promise<void> {
    console.log(`🪙 Creating creator coin for ${creator.creatorId}...`);

    // Get creator details from your database
    const creatorDetails = await this.getCreatorDetails(creator.creatorId);

    const tokenName = `${creatorDetails.stageName} Token`;
    const tokenSymbol = this.generateTokenSymbol(creatorDetails.stageName);
    const initialSupply = ethers.parseEther("1000000"); // 1M tokens

    // Create coin creation transaction function
    const coinCreationTransaction = async () => {
      return await this.tokenFactory.launchCreatorCoin(
        creator.walletAddress,
        tokenName,
        tokenSymbol,
        initialSupply,
        {
          gasLimit: 500000 // Higher gas limit for contract deployment
        }
      );
    };

    // Execute with robust error handling
    const result = await this.errorHandler.executeWithRetry(
      coinCreationTransaction,
      'launchCreatorCoin',
      creator.creatorId,
      { maxRetries: 5, gasIncreasePercentage: 30 } // More retries and higher gas increase for coin creation
    );

    if (result.success) {
      console.log(`🎉 Creator coin created successfully: ${result.txHash}`);

      // Update your database
      await this.updateCreatorCoinStatus(creator.creatorId, true, result.txHash!);

      // Send notification to creator
      await this.notifyCreatorCoinLaunched(creator.creatorId);
    } else {
      console.error(`❌ Coin creation failed for ${creator.creatorId} after all retries: ${result.error}`);
      throw new Error(`Creator coin creation failed: ${result.error}`);
    }
  }

  /**
   * Calculate engagement score based on user interactions
   * Score: 0-100 based on likes, comments, shares, playlist adds
   */
  private calculateEngagementScore(creator: CreatorMetrics): number {
    // This would connect to your actual database
    // For now, returning a calculated score based on available metrics

    // Base score from play-to-follower ratio
    const playToFollowerRatio = creator.totalPlays / Math.max(creator.followers, 1);
    let score = Math.min(playToFollowerRatio / 10, 50); // Up to 50 points

    // Add engagement bonus (you'd get this from your database)
    // Placeholder calculation:
    const engagementBonus = Math.min(creator.followers / 100, 25); // Up to 25 points
    score += engagementBonus;

    // Revenue bonus
    if (creator.monthlyRevenue > 0) {
      score += Math.min(creator.monthlyRevenue / 10, 25); // Up to 25 points
    }

    return Math.floor(Math.min(score, 100));
  }

  /**
   * Check if creator has crossed a milestone threshold
   */
  private hasCrossedMilestone(creator: CreatorMetrics, milestone: MilestoneThreshold): boolean {
    switch (milestone.type) {
      case 'plays':
        return creator.totalPlays >= milestone.threshold;
      case 'followers':
        return creator.followers >= milestone.threshold;
      case 'revenue':
        return creator.monthlyRevenue >= milestone.threshold;
      default:
        return false;
    }
  }

  /**
   * Handle milestone achievement
   */
  private async handleMilestone(creator: CreatorMetrics, milestone: MilestoneThreshold): Promise<void> {
    console.log(`🎯 Creator ${creator.creatorId} hit milestone: ${milestone.description}`);

    // Log milestone achievement in your database
    await this.logMilestoneAchievement(creator.creatorId, milestone);

    // Send notification to creator
    await this.notifyMilestoneAchieved(creator.creatorId, milestone);
  }

  /**
   * Generate token symbol from stage name
   */
  private generateTokenSymbol(stageName: string): string {
    // Remove special characters and take first 4-6 characters
    const clean = stageName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return clean.substring(0, Math.min(6, clean.length)) || 'MUSIC';
  }

  /**
   * Error handling with retry logic
   */
  private async handleSyncError(creator: CreatorMetrics, error: any): Promise<void> {
    // Log error to your database
    await this.logSyncError(creator.creatorId, error.message);

    // Implement exponential backoff retry
    // This is a simplified version - you'd want more sophisticated retry logic
    console.log(`⏰ Will retry syncing ${creator.creatorId} in next cycle`);
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Database interface methods

  private async getCreatorsFromDatabase(): Promise<CreatorMetrics[]> {
    const { creatorDB, analyticsDB } = await import('../lib/database');

    try {
      const eligibleCreators = await creatorDB.getEligibleForSync();
      const creatorMetrics: CreatorMetrics[] = [];

      for (const creator of eligibleCreators) {
        const metrics = await analyticsDB.getCreatorMetrics(creator.id);
        if (metrics && metrics.walletAddress) {
          creatorMetrics.push({
            creatorId: metrics.creatorId,
            walletAddress: metrics.walletAddress,
            totalPlays: metrics.totalPlays,
            followers: metrics.followers,
            monthlyRevenue: metrics.monthlyRevenue,
            engagementScore: await analyticsDB.calculateEngagementScore(creator.id),
            lastUpdated: metrics.lastUpdated,
          });
        }
      }

      return creatorMetrics;
    } catch (error: any) {
      console.error('Failed to fetch creators from database:', error.message);
      return [];
    }
  }

  private async getCreatorDetails(creatorId: string): Promise<{ stageName: string; bio: string }> {
    const { prisma } = await import('../lib/database');

    try {
      const creator = await prisma.creator.findUnique({
        where: { id: creatorId },
        select: {
          stageName: true,
          description: true,
        },
      });

      return {
        stageName: creator?.stageName || 'Unknown Artist',
        bio: creator?.description || 'No bio available',
      };
    } catch (error: any) {
      console.error(`Failed to get creator details for ${creatorId}:`, error.message);
      return {
        stageName: 'Unknown Artist',
        bio: 'No bio available',
      };
    }
  }

  private async updateLastSyncTimestamp(creatorId: string): Promise<void> {
    const { creatorDB } = await import('../lib/database');

    try {
      await creatorDB.updateMetrics(creatorId, {} as any);
      console.log(`✅ Updated sync timestamp for ${creatorId}`);
    } catch (error: any) {
      console.error(`Failed to update sync timestamp for ${creatorId}:`, error.message);
    }
  }

  private async updateCreatorCoinStatus(creatorId: string, hasCoin: boolean, txHash: string): Promise<void> {
    const { creatorDB, prisma } = await import('../lib/database');

    try {
      // Get creator's coin address from the blockchain
      const creator = await prisma.creator.findUnique({
        where: { id: creatorId },
        select: { walletAddress: true },
      });

      if (!creator?.walletAddress) {
        throw new Error('Creator wallet address not found');
      }

      // Get coin info from smart contract
      const coinInfo = await this.tokenFactory.getCreatorCoinInfo(creator.walletAddress);
      const coinAddress = coinInfo[0];

      await creatorDB.updateCoinStatus(creatorId, {
        coinAddress,
        txHash,
      });

      console.log(`✅ Updated coin status for ${creatorId}: hasCoin=${hasCoin}, coinAddress=${coinAddress}, tx=${txHash}`);
    } catch (error: any) {
      console.error(`Failed to update coin status for ${creatorId}:`, error.message);
    }
  }

  private async logMilestoneAchievement(creatorId: string, milestone: MilestoneThreshold): Promise<void> {
    const { milestoneDB, analyticsDB } = await import('../lib/database');

    try {
      // Check if milestone already exists
      const exists = await milestoneDB.exists(creatorId, milestone.type, milestone.threshold);
      if (exists) {
        console.log(`Milestone already exists for ${creatorId}: ${milestone.description}`);
        return;
      }

      // Get current metrics to record actual value when milestone was hit
      const metrics = await analyticsDB.getCreatorMetrics(creatorId);
      let currentValue = 0;

      switch (milestone.type) {
        case 'plays':
          currentValue = metrics?.totalPlays || 0;
          break;
        case 'followers':
          currentValue = metrics?.followers || 0;
          break;
        case 'revenue':
          currentValue = metrics?.monthlyRevenue || 0;
          break;
      }

      await milestoneDB.create(creatorId, {
        type: milestone.type,
        threshold: milestone.threshold,
        description: milestone.description,
        currentValue,
      });

      console.log(`✅ Logged milestone for ${creatorId}: ${milestone.description} (current: ${currentValue})`);
    } catch (error: any) {
      console.error(`Failed to log milestone for ${creatorId}:`, error.message);
    }
  }

  private async logSyncError(creatorId: string, errorMessage: string): Promise<void> {
    const { creatorDB } = await import('../lib/database');

    try {
      await creatorDB.recordSyncError(creatorId, errorMessage);
      console.log(`✅ Logged error for ${creatorId}: ${errorMessage}`);
    } catch (error: any) {
      console.error(`Failed to log sync error for ${creatorId}:`, error.message);
    }
  }

  private async notifyCreatorCoinLaunched(creatorId: string): Promise<void> {
    // TODO: Implement notification system (email, push notification, etc.)
    // This could integrate with services like SendGrid, Twilio, or web push notifications

    try {
      const details = await this.getCreatorDetails(creatorId);
      console.log(`🎉 COIN LAUNCHED! Notified creator ${details.stageName} (${creatorId}) about their coin launch`);

      // Future: Send email, push notification, in-app notification
      // await emailService.sendCoinLaunchNotification(creatorId);
      // await pushNotificationService.send(creatorId, { type: 'coin_launch' });

    } catch (error: any) {
      console.error(`Failed to notify creator ${creatorId} about coin launch:`, error.message);
    }
  }

  private async notifyMilestoneAchieved(creatorId: string, milestone: MilestoneThreshold): Promise<void> {
    // TODO: Implement notification system for milestone achievements

    try {
      const details = await this.getCreatorDetails(creatorId);
      console.log(`🎯 MILESTONE! Notified creator ${details.stageName} (${creatorId}) about milestone: ${milestone.description}`);

      // Future: Send email, push notification, in-app notification
      // await emailService.sendMilestoneNotification(creatorId, milestone);
      // await pushNotificationService.send(creatorId, { type: 'milestone', milestone });

    } catch (error: any) {
      console.error(`Failed to notify creator ${creatorId} about milestone:`, error.message);
    }
  }
}

// Export singleton instance
export const creatorMetricsOracle = new CreatorMetricsOracle();