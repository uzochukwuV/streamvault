/**
 * Gas Optimization and Error Handling Utilities
 * Helps handle gas estimation failures and balance issues
 */

import { Synapse } from "@filoz/synapse-sdk";

export interface GasEstimationResult {
  canProceed: boolean;
  error?: string;
  suggestion?: string;
  estimatedCost?: string;
  requiredBalance?: string;
  currentBalance?: string;
}

/**
 * Enhanced gas estimation with comprehensive error analysis
 */
export async function smartGasEstimation(
  synapse: Synapse,
  operation: 'dataset_creation' | 'piece_addition',
  fileSize?: number
): Promise<GasEstimationResult> {
  try {
    // Get current balance and storage info
    const balance = 0
    const balanceStr = balance?.toString() || '0';

    // Estimate costs based on operation type
    let estimatedCostWei: bigint;
    let operationName: string;

    switch (operation) {
      case 'dataset_creation':
        // Dataset creation typically costs around 0.1-0.5 USDFC
        estimatedCostWei = BigInt('100000000000000000'); // 0.1 USDFC in wei
        operationName = 'create new dataset';
        break;

      case 'piece_addition':
        // Piece addition cost depends on file size
        const sizeFactor = fileSize ? Math.ceil(fileSize / (1024 * 1024)) : 1; // MB
        estimatedCostWei = BigInt(sizeFactor * 50000000000000000); // 0.05 USDFC per MB
        operationName = 'add pieces to dataset';
        break;
    }

    // Check if balance is sufficient
    const currentBalance = BigInt(balanceStr);
    const currentBalanceUSDFC = Number(currentBalance) / 1e18;
    const estimatedCostUSDFC = Number(estimatedCostWei) / 1e18;

    // More lenient balance check - allow if balance is > 0.5 USDFC
    if (currentBalanceUSDFC < 0.5) {
      return {
        canProceed: false,
        error: `Insufficient USDFC balance to ${operationName}`,
        suggestion: `You have ${currentBalanceUSDFC.toFixed(4)} USDFC but need at least 0.5 USDFC for reliable operations. Please deposit more tokens.`,
        estimatedCost: estimatedCostUSDFC.toFixed(4),
        requiredBalance: '0.5000',
        currentBalance: currentBalanceUSDFC.toFixed(4),
      };
    }

    // Check storage allowances via the storage service if possible
    try {
      const storageInfo = await synapse.getStorageInfo?.();
      if (storageInfo) {
        // Additional validation logic based on storage capacity
        console.log('Storage info:', storageInfo);
      }
    } catch (storageError) {
      console.warn('Could not fetch storage info:', storageError);
    }

    return {
      canProceed: true,
      estimatedCost: estimatedCostUSDFC.toFixed(4),
      currentBalance: currentBalanceUSDFC.toFixed(4),
    };

  } catch (error: any) {
    return analyzeContractError(error);
  }
}

/**
 * Analyze specific contract errors and VM errors
 */
function analyzeContractError(error: any): GasEstimationResult {
  const message = error.message?.toLowerCase() || '';
  const fullMessage = error.message || '';

  // Specific RetCode=33 analysis
  if (message.includes('retcode=33') || message.includes('contract reverted')) {

    // Parse VM error for more specific diagnosis
    if (fullMessage.includes('0x8dcd0606')) {
      return {
        canProceed: false,
        error: 'Storage capacity or allowance exceeded',
        suggestion: 'Your storage allowance may be insufficient or there may be a provider capacity issue. Try: 1) Use a smaller file, 2) Wait and retry (provider capacity), 3) Check your storage allowance settings.',
      };
    }

    // Method 3844450837 appears to be related to dataset operations
    if (fullMessage.includes('method 3844450837')) {
      return {
        canProceed: false,
        error: 'Dataset operation rejected by smart contract',
        suggestion: 'The contract rejected the dataset creation. This could be due to: 1) Storage provider capacity limits, 2) Network congestion, 3) Provider-specific restrictions. Try selecting a different provider or waiting a few minutes.',
      };
    }

    return {
      canProceed: false,
      error: 'Smart contract execution failed',
      suggestion: 'The Filecoin storage contract rejected the transaction. This often happens due to provider capacity issues or temporary network problems. Try: 1) Wait 2-3 minutes and retry, 2) Use a different storage provider, 3) Try with a smaller file first.',
    };
  }

  // Gas estimation failure
  if (message.includes('failed to estimate gas')) {
    return {
      canProceed: false,
      error: 'Cannot estimate transaction costs',
      suggestion: 'The network cannot calculate gas costs, indicating a deeper issue. Try: 1) Check your USDFC balance, 2) Wait for network congestion to clear, 3) Try with a much smaller file.',
    };
  }

  // Network/provider errors
  if (message.includes('500') || message.includes('internal server error')) {
    return {
      canProceed: false,
      error: 'Storage provider temporarily unavailable',
      suggestion: 'The storage provider is experiencing issues. This is usually temporary - try again in 2-3 minutes.',
    };
  }

  // Generic contract error
  return {
    canProceed: false,
    error: 'Blockchain transaction error',
    suggestion: `${error.message || 'Unknown contract error'}. Try waiting a few minutes and retrying with a smaller file.`,
  };
}

/**
 * Optimized dataset creation with fallback strategies
 */
export async function createDatasetWithFallback(
  synapse: Synapse,
  options: {
    providerId?: string;
    retryCount?: number;
    maxRetries?: number;
  } = {}
) {
  const { providerId, retryCount = 0, maxRetries = 3 } = options;

  try {
    // Strategy 1: Try with minimal configuration first
    if (retryCount === 0) {
      console.log(providerId+ "provider")
      console.log('🔄 Attempting dataset creation with minimal configuration...');
      return await synapse.createStorage({
        providerId: Number(providerId) , // Let system choose if not specified
        uploadBatchSize: 1, // Minimize resource usage
        // providerId: 2,
        // Remove any optional parameters that might cause issues
        forceCreateDataSet: false,
        // dataSetId: 26,
      });
    }

    // Strategy 2: Force auto-selection (ignore provided providerId)
    if (retryCount === 1) {
      console.log('🔄 Retrying with automatic provider selection...');
      return await synapse.createStorage({
        // Don't specify providerId - let Synapse pick the best one
        uploadBatchSize: 1,
        providerId: 2,
        
        forceCreateDataSet: false,
        dataSetId: 26,
      });
    }

    // Strategy 3: Force new dataset creation
    if (retryCount === 2) {
      console.log('🔄 Forcing new dataset creation...');
      return await synapse.createStorage({
        uploadBatchSize: 1,
        providerId: 2,
        
        forceCreateDataSet: false,
        dataSetId: 26,
      });
    }

    // Strategy 4: Last resort - minimal parameters
    console.log('🔄 Last resort attempt with minimal parameters...');
    return await synapse.createStorage({
      uploadBatchSize: 1,
      // uploadBatchSize: 1,
      providerId: 2,
      
      forceCreateDataSet: false,
      dataSetId: 26,
    });

  } catch (error: any) {
    const message = error.message?.toLowerCase() || '';

    // If we've exhausted retries, throw the error
    if (retryCount >= maxRetries) {
      console.error('❌ All dataset creation strategies failed');
      throw error;
    }

    // For gas/balance issues, try different strategies but don't delay
    if (message.includes('retcode=33') || message.includes('contract reverted')) {
      console.warn(`⚠️ Contract error (attempt ${retryCount + 1}), trying different strategy...`);
      return createDatasetWithFallback(synapse, {
        ...options,
        retryCount: retryCount + 1,
      });
    }

    // For network/provider issues, add delay
    if (message.includes('500') || message.includes('network') || message.includes('timeout')) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s
      console.warn(`⚠️ Network error (attempt ${retryCount + 1}), waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return createDatasetWithFallback(synapse, {
      ...options,
      retryCount: retryCount + 1,
    });
  }
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  const message = error.message?.toLowerCase() || '';

  // Non-recoverable errors (balance/gas issues)
  if (
    message.includes('retcode=33') ||
    message.includes('insufficient') ||
    message.includes('contract reverted')
  ) {
    return false;
  }

  // Recoverable errors (network, provider issues)
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('500') ||
    message.includes('provider')
  );
}

/**
 * Get user-friendly error message with suggestions
 */
export function getErrorSuggestion(error: Error): {
  title: string;
  message: string;
  action?: string;
} {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('retcode=33')) {
    return {
      title: 'Insufficient Balance',
      message: 'Your USDFC balance is too low for this operation. Dataset creation requires additional tokens.',
      action: 'Deposit more USDFC tokens or try uploading a smaller file',
    };
  }

  if (message.includes('failed to estimate gas')) {
    return {
      title: 'Gas Estimation Failed',
      message: 'Unable to calculate transaction costs. This usually indicates balance or network issues.',
      action: 'Check your USDFC balance and try again in a few minutes',
    };
  }

  if (message.includes('provider') && message.includes('not available')) {
    return {
      title: 'Storage Provider Unavailable',
      message: 'The selected storage provider is temporarily unavailable.',
      action: 'The system will automatically select an alternative provider',
    };
  }

  if (message.includes('network') || message.includes('timeout')) {
    return {
      title: 'Network Connection Issue',
      message: 'Unable to connect to the Filecoin network reliably.',
      action: 'Check your internet connection and try again',
    };
  }

  return {
    title: 'Upload Error',
    message: error.message || 'An unexpected error occurred during upload.',
    action: 'Please try again or contact support if the problem persists',
  };
}