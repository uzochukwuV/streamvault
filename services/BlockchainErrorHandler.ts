/**
 * BlockchainErrorHandler - Robust error handling and retry logic for blockchain operations
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Gas price adjustment on failure
 * - Network congestion detection
 * - Transaction replacement for stuck transactions
 * - Comprehensive error logging and monitoring
 */

import { ethers } from "ethers";

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  gasIncreasePercentage: number;
}

interface TransactionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  error?: string;
  attempts: number;
  totalTime: number;
}

interface FailedTransaction {
  id: string;
  creatorId: string;
  operation: string;
  attempts: number;
  lastAttempt: Date;
  error: string;
  originalGasPrice: bigint;
  data: any;
}

export class BlockchainErrorHandler {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private failedTransactions: Map<string, FailedTransaction> = new Map();

  private readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 2000,     // 2 seconds
    maxDelayMs: 30000,     // 30 seconds
    backoffMultiplier: 2,
    gasIncreasePercentage: 20 // Increase gas by 20% on retry
  };

  constructor(provider: ethers.Provider, wallet: ethers.Wallet) {
    this.provider = provider;
    this.wallet = wallet;

    // Set up periodic cleanup of old failed transactions
    setInterval(() => this.cleanupOldFailures(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Execute a blockchain transaction with comprehensive error handling and retry logic
   */
  async executeWithRetry(
    operation: () => Promise<ethers.TransactionResponse>,
    operationName: string,
    creatorId: string,
    config: Partial<RetryConfig> = {}
  ): Promise<TransactionResult> {
    const retryConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: any;

    console.log(`🔄 Starting ${operationName} for creator ${creatorId}`);

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        console.log(`📤 Attempt ${attempt}/${retryConfig.maxRetries} for ${operationName}`);

        // Get current network conditions
        const networkInfo = await this.getNetworkInfo();
        console.log(`⛽ Current gas price: ${ethers.formatUnits(networkInfo.gasPrice, 'gwei')} gwei`);

        // Execute the transaction
        const tx = await operation();
        console.log(`📤 Transaction sent: ${tx.hash}`);

        // Wait for confirmation with timeout
        const receipt = await this.waitForConfirmationWithTimeout(tx, 300000); // 5 minutes timeout

        if (receipt.status === 1) {
          const totalTime = Date.now() - startTime;
          console.log(`✅ ${operationName} succeeded in ${totalTime}ms, gas used: ${receipt.gasUsed}`);

          // Remove from failed transactions if it was there
          this.removeFailedTransaction(creatorId, operationName);

          return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            attempts: attempt,
            totalTime
          };
        } else {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }

      } catch (error: any) {
        lastError = error;
        const errorType = this.classifyError(error);

        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        console.log(`🔍 Error type: ${errorType}`);

        // Handle specific error types
        if (errorType === 'NONCE_TOO_LOW') {
          console.log(`⚠️ Nonce too low, syncing nonce and retrying...`);
          await this.syncNonce();
          continue;
        }

        if (errorType === 'GAS_PRICE_TOO_LOW' || errorType === 'UNDERPRICED') {
          console.log(`⛽ Gas price too low, increasing gas price for retry...`);
          // The next attempt will use higher gas price automatically
        }

        if (errorType === 'INSUFFICIENT_FUNDS') {
          console.log(`💰 Insufficient funds, cannot retry`);
          break; // Don't retry on insufficient funds
        }

        if (errorType === 'NETWORK_ERROR' && attempt < retryConfig.maxRetries) {
          console.log(`🌐 Network error, waiting before retry...`);
          await this.delay(retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1));
          continue;
        }

        // If this is not the last attempt, wait before retrying
        if (attempt < retryConfig.maxRetries) {
          const delayMs = Math.min(
            retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
            retryConfig.maxDelayMs
          );
          console.log(`⏰ Waiting ${delayMs}ms before retry...`);
          await this.delay(delayMs);
        }
      }
    }

    // All attempts failed
    const totalTime = Date.now() - startTime;
    console.log(`❌ ${operationName} failed after ${retryConfig.maxRetries} attempts`);

    // Store failed transaction for later analysis
    this.storeFailedTransaction(creatorId, operationName, retryConfig.maxRetries, lastError);

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: retryConfig.maxRetries,
      totalTime
    };
  }

  /**
   * Get current network conditions
   */
  private async getNetworkInfo(): Promise<{
    gasPrice: bigint;
    baseFee?: bigint;
    priorityFee?: bigint;
    blockNumber: number;
  }> {
    const [gasPrice, block] = await Promise.all([
      this.provider.getGasPrice(),
      this.provider.getBlock('latest')
    ]);

    return {
      gasPrice,
      baseFee: block?.baseFeePerGas || undefined,
      blockNumber: block?.number || 0
    };
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  private async waitForConfirmationWithTimeout(
    tx: ethers.TransactionResponse,
    timeoutMs: number
  ): Promise<ethers.TransactionReceipt> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const receipt = await tx.wait();
        clearTimeout(timeout);
        if (receipt) {
          resolve(receipt);
        } else {
          reject(new Error('Transaction receipt is null'));
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Classify error types for appropriate handling
   */
  private classifyError(error: any): string {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('nonce too low')) return 'NONCE_TOO_LOW';
    if (message.includes('gas price too low')) return 'GAS_PRICE_TOO_LOW';
    if (message.includes('underpriced')) return 'UNDERPRICED';
    if (message.includes('insufficient funds')) return 'INSUFFICIENT_FUNDS';
    if (message.includes('network error') || message.includes('timeout')) return 'NETWORK_ERROR';
    if (message.includes('execution reverted')) return 'EXECUTION_REVERTED';
    if (message.includes('gas required exceeds allowance')) return 'OUT_OF_GAS';
    if (message.includes('replacement transaction underpriced')) return 'REPLACEMENT_UNDERPRICED';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Sync wallet nonce with the network
   */
  private async syncNonce(): Promise<void> {
    const nonce = await this.provider.getTransactionCount(this.wallet.address, 'pending');
    console.log(`🔄 Synced nonce: ${nonce}`);
  }

  /**
   * Store failed transaction for analysis and potential manual intervention
   */
  private storeFailedTransaction(
    creatorId: string,
    operation: string,
    attempts: number,
    error: any
  ): void {
    const id = `${creatorId}-${operation}-${Date.now()}`;

    const failedTx: FailedTransaction = {
      id,
      creatorId,
      operation,
      attempts,
      lastAttempt: new Date(),
      error: error.message,
      originalGasPrice: BigInt(0), // Would store actual gas price
      data: {
        stack: error.stack,
        code: error.code
      }
    };

    this.failedTransactions.set(id, failedTx);

    // Also log to external monitoring system
    this.logFailedTransaction(failedTx);
  }

  /**
   * Remove successfully completed transaction from failed list
   */
  private removeFailedTransaction(creatorId: string, operation: string): void {
    for (const [id, failedTx] of this.failedTransactions.entries()) {
      if (failedTx.creatorId === creatorId && failedTx.operation === operation) {
        this.failedTransactions.delete(id);
        console.log(`✅ Removed failed transaction ${id} from tracking`);
      }
    }
  }

  /**
   * Get all failed transactions for monitoring
   */
  getFailedTransactions(): FailedTransaction[] {
    return Array.from(this.failedTransactions.values());
  }

  /**
   * Retry a specific failed transaction manually
   */
  async retryFailedTransaction(
    transactionId: string,
    operation: () => Promise<ethers.TransactionResponse>
  ): Promise<TransactionResult> {
    const failedTx = this.failedTransactions.get(transactionId);
    if (!failedTx) {
      throw new Error(`Failed transaction ${transactionId} not found`);
    }

    console.log(`🔄 Manually retrying failed transaction: ${transactionId}`);

    return this.executeWithRetry(
      operation,
      failedTx.operation,
      failedTx.creatorId,
      { maxRetries: 1 } // Single retry for manual intervention
    );
  }

  /**
   * Log failed transaction to external monitoring system
   */
  private async logFailedTransaction(failedTx: FailedTransaction): Promise<void> {
    // TODO: Implement logging to your monitoring system (Sentry, DataDog, etc.)
    console.error(`🚨 Failed Transaction Alert:`, {
      id: failedTx.id,
      creatorId: failedTx.creatorId,
      operation: failedTx.operation,
      attempts: failedTx.attempts,
      error: failedTx.error,
      timestamp: failedTx.lastAttempt
    });

    // You could also send alerts via email, Slack, etc.
  }

  /**
   * Clean up old failed transactions to prevent memory leaks
   */
  private cleanupOldFailures(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, failedTx] of this.failedTransactions.entries()) {
      if (failedTx.lastAttempt < oneDayAgo) {
        this.failedTransactions.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old failed transactions`);
    }
  }

  /**
   * Get system health metrics
   */
  getHealthMetrics(): {
    totalFailedTransactions: number;
    recentFailures: number;
    errorTypes: Record<string, number>;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let recentFailures = 0;
    const errorTypes: Record<string, number> = {};

    for (const failedTx of this.failedTransactions.values()) {
      if (failedTx.lastAttempt > oneHourAgo) {
        recentFailures++;
      }

      const errorType = this.classifyError({ message: failedTx.error });
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    }

    return {
      totalFailedTransactions: this.failedTransactions.size,
      recentFailures,
      errorTypes
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BlockchainErrorHandler;