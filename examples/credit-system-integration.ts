/**
 * Credit System Integration Example
 *
 * This example demonstrates how to integrate the StreamVault Credit System
 * into your file upload workflow, providing gas fee abstraction and
 * predictable costs for users.
 */

import { creditManager } from '../services/CreditManager';
import { filecoinGasManager } from '../services/FilecoinGasManager';

// Example: Complete upload workflow with credits
async function exampleUploadWorkflow() {
  const userId = 'user_123';
  const audioFile = new File(['fake audio data'], 'my-song.mp3', { type: 'audio/mpeg' });

  console.log('🎵 Starting upload workflow with credit system...\n');

  try {
    // Step 1: Check user's credit balance
    console.log('1️⃣ Checking user credits...');
    const credits = await creditManager.getUserCredits(userId);
    console.log(`   Balance: ${credits.balance} credits`);
    console.log(`   Total earned: ${credits.totalEarned} credits`);
    console.log(`   Total spent: ${credits.totalSpent} credits\n`);

    // Step 2: Estimate upload cost
    console.log('2️⃣ Estimating upload cost...');
    const estimate = await creditManager.estimateUploadCost({
      fileType: 'audio',
      fileCount: 1,
      features: ['premium_encryption', 'quality_variants'],
      userId,
    });

    console.log(`   Base cost: ${estimate.baseCost} credits`);
    console.log(`   Features: ${estimate.additionalFeatures} credits`);
    console.log(`   Batch discount: -${estimate.batchDiscount} credits`);
    console.log(`   Total cost: ${estimate.totalCost} credits`);
    console.log(`   USD equivalent: $${estimate.usdEquivalent.toFixed(2)}\n`);

    // Step 3: Check if user needs more credits
    if (credits.balance < estimate.totalCost) {
      console.log('⚠️  Insufficient credits! User needs to purchase more.');

      // Check if eligible for sponsored upload
      const sponsorship = await creditManager.checkSponsorshipEligibility(userId);
      if (sponsorship.eligible) {
        console.log(`🎁 User eligible for sponsored upload: ${sponsorship.reason}`);
        console.log(`   Remaining sponsored uploads: ${sponsorship.remainingSponsored}\n`);

        // Create sponsored upload
        await creditManager.createSponsoredUpload(userId, sponsorship.reason!, {
          fileUploadId: 'upload_123',
          creditsCost: estimate.totalCost,
          usdValue: estimate.usdEquivalent,
          gasValue: estimate.gasEquivalent,
        });

        console.log('✅ Sponsored upload created - no credits charged\n');
      } else {
        // Show credit purchase options
        console.log('💳 Available credit packages:');
        console.log('   Starter: 100 credits for $5.00');
        console.log('   Creator: 550 credits for $20.00 (10% bonus)');
        console.log('   Pro: 2300 credits for $60.00 (15% bonus)\n');
        return;
      }
    }

    // Step 4: Queue file for gas-optimized upload
    console.log('4️⃣ Queuing file for batched upload...');
    const batchInfo = await filecoinGasManager.queueUpload({
      id: 'upload_123',
      file: audioFile,
      metadata: {
        title: 'My Amazing Song',
        description: 'A test track for the credit system',
        genre: 'Electronic',
        isPremium: true,
        encryptionKey: 'generated-key-123',
      },
      userId,
    });

    console.log(`   Batch ID: ${batchInfo.batchId}`);
    console.log(`   Estimated cost: $${batchInfo.estimatedCost.toFixed(4)}`);
    console.log(`   Estimated delay: ${batchInfo.estimatedDelay / 1000}s\n`);

    // Step 5: Spend credits for the upload (if not sponsored)
    const sponsorship = await creditManager.checkSponsorshipEligibility(userId);
    if (!sponsorship.eligible) {
      console.log('5️⃣ Charging credits for upload...');
      const spendResult = await creditManager.spendCreditsForUpload(userId, estimate.totalCost, {
        fileUploadId: 'upload_123',
        description: `Upload: ${audioFile.name}`,
        gasEquivalent: estimate.gasEquivalent,
      });

      if (spendResult.success) {
        console.log(`   Credits charged: ${estimate.totalCost}`);
        console.log(`   Remaining balance: ${spendResult.remainingBalance}\n`);
      } else {
        console.error(`   Failed to charge credits: ${spendResult.error}\n`);
        return;
      }
    }

    // Step 6: Platform processes the upload with gas optimization
    console.log('6️⃣ Platform processing upload...');
    console.log('   🔄 Batching with other uploads for gas optimization...');
    console.log('   ⛽ Monitoring gas prices for optimal timing...');
    console.log('   📤 Uploading to Filecoin with encryption...');

    // Simulate batch processing (in real app, this happens automatically)
    const batchResult = await simulateBatchProcessing(batchInfo.batchId);

    if (batchResult.success) {
      console.log(`   ✅ Upload successful!`);
      console.log(`   🔗 Transaction: ${batchResult.txHash}`);
      console.log(`   💰 Total cost: $${batchResult.totalCost?.toFixed(4)}`);
      console.log(`   💡 Platform savings: $${batchResult.costSavings?.toFixed(4)}\n`);
    } else {
      console.error(`   ❌ Upload failed: ${batchResult.error}\n`);
    }

    console.log('🎉 Upload workflow completed successfully!');

  } catch (error: any) {
    console.error('❌ Upload workflow failed:', error.message);
  }
}

// Example: Credit purchase workflow
async function exampleCreditPurchase() {
  const userId = 'user_456';

  console.log('💳 Credit Purchase Example\n');

  try {
    // Purchase the "Creator" package
    const purchaseResult = await creditManager.purchaseCredits(userId, 'creator', {
      paymentMethod: 'stripe',
      paymentId: 'pi_mock_payment_123',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Example Browser)',
    });

    if (purchaseResult.success) {
      console.log('✅ Purchase successful!');
      console.log(`   Package: Creator (500 + 50 bonus credits)`);
      console.log(`   Amount: $20.00`);
      console.log(`   Payment ID: ${purchaseResult.purchase?.paymentId}\n`);

      // Check updated balance
      const updatedCredits = await creditManager.getUserCredits(userId);
      console.log(`Updated balance: ${updatedCredits.balance} credits`);
    } else {
      console.error(`Purchase failed: ${purchaseResult.error}`);
    }

  } catch (error: any) {
    console.error('Purchase error:', error.message);
  }
}

// Example: Platform analytics
async function examplePlatformAnalytics() {
  console.log('📊 Platform Analytics Example\n');

  try {
    // Get credit system statistics
    const creditStats = await creditManager.getPlatformCreditStats(30);
    console.log('Credit System (Last 30 days):');
    console.log(`   Total revenue: $${creditStats.totalRevenue}`);
    console.log(`   Active users: ${creditStats.activeUsers}`);
    console.log(`   Average balance: ${creditStats.averageBalance} credits\n`);

    // Get gas optimization statistics
    const gasStats = await filecoinGasManager.getGasStats(30);
    console.log('Gas Optimization (Last 30 days):');
    console.log(`   Total cost: $${gasStats.totalCostUSDC.toFixed(2)}`);
    console.log(`   Total savings: $${gasStats.totalSavings.toFixed(2)}`);
    console.log(`   Average batch size: ${gasStats.averageBatchSize} files`);
    console.log(`   Success rate: ${(gasStats.successRate * 100).toFixed(1)}%`);

  } catch (error: any) {
    console.error('Analytics error:', error.message);
  }
}

// Simulate batch processing for demo
async function simulateBatchProcessing(batchId: string): Promise<any> {
  // In real implementation, this would be handled automatically by FilecoinGasManager
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

  return {
    success: true,
    txHash: '0x1234567890abcdef1234567890abcdef12345678',
    blockNumber: 2145623,
    totalCost: 0.75,
    costSavings: 0.35,
  };
}

// Run examples
async function runExamples() {
  console.log('🚀 StreamVault Credit System Examples\n');
  console.log('=' .repeat(60) + '\n');

  await exampleUploadWorkflow();

  console.log('\n' + '=' .repeat(60) + '\n');

  await exampleCreditPurchase();

  console.log('\n' + '=' .repeat(60) + '\n');

  await examplePlatformAnalytics();
}

// Export for use in other files
export {
  exampleUploadWorkflow,
  exampleCreditPurchase,
  examplePlatformAnalytics,
};

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}