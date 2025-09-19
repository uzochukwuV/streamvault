/**
 * Credit System Constants - Client-safe constants
 * Separated from server-side CreditManager to avoid Prisma imports on client
 */

// Credit package definitions
export const CREDIT_PACKAGES = {
  starter: {
    id: 'starter',
    credits: 100,
    bonusCredits: 0,
    usdPrice: 5.00,
    description: 'Perfect for new creators',
    costPerCredit: 0.05
  },
  creator: {
    id: 'creator',
    credits: 500,
    bonusCredits: 50,
    usdPrice: 20.00,
    description: 'Most popular - 10% bonus credits',
    costPerCredit: 0.04
  },
  pro: {
    id: 'pro',
    credits: 2000,
    bonusCredits: 300,
    usdPrice: 60.00,
    description: 'Best value - 15% bonus credits',
    costPerCredit: 0.03
  }
} as const;

// Upload cost structure (predictable pricing)
export const UPLOAD_COSTS = {
  // Base costs by file type
  audioTrack: 15,        // ~$0.45-0.75 equivalent
  videoContent: 50,      // ~$1.50-2.50 equivalent
  albumBundle: 40,       // Bulk discount for multiple tracks

  // Additional features
  premiumEncryption: 10, // +10 credits for premium content
  qualityVariants: 5,    // +5 credits for multiple quality versions
  customThumbnail: 3,    // +3 credits for custom artwork

  // Batch discounts (applied automatically)
  batchDiscount: {
    threshold: 5,        // 5+ files
    discountPercent: 0.15 // 15% discount
  }
} as const;

// Sponsorship rules
export const SPONSORSHIP_RULES = {
  newCreator: {
    maxUploads: 5,
    reason: 'new_creator_bonus',
    description: 'Welcome bonus for new creators'
  },
  milestone: {
    triggers: ['1000_plays', '500_followers'],
    bonusCredits: 50,
    reason: 'milestone_bonus'
  }
} as const;