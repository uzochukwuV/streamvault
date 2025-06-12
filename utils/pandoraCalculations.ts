import { PandoraService, Synapse } from "@filoz/synapse-sdk";
import { EPOCHS_PER_DAY, ONE_GB_IN_BYTES } from "@/utils/constants";
import { config } from "@/config";
import { formatUnits } from "viem";

/**
 * Interface representing the Pandora balance data returned from the SDK
 */
export interface PandoraBalanceData {
  rateAllowanceNeeded: bigint;
  currentRateUsed: bigint;
  currentRateAllowance: bigint;
  currentLockupAllowance: bigint;
  currentLockupUsed: bigint;
}

/**
 * Interface representing the calculated storage metrics
 */
export interface StorageCalculationResult {
  /** The required rate allowance needed for storage */
  rateNeeded: bigint;
  /** The current rate used */
  rateUsed: bigint;
  /** The current storage usage in bytes */
  currentStorageBytes: bigint;
  /** The current storage usage in GB */
  currentStorageGB: number;
  /** The required lockup amount needed for storage persistence */
  lockupNeeded: bigint;
  /** The required lockup amount formatted with 18 decimal places */
  lockupNeededFormatted: string;
  /** Remaining lockup allowance available */
  lockupRemaining: bigint;
  /** Number of days left before lockup expires */
  persistenceDaysLeft: bigint;
  /** Whether the current rate allowance is sufficient */
  isRateSufficient: boolean;
  /** Whether the current lockup allowance is sufficient for at least the minimum days threshold */
  isLockupSufficient: boolean;
  /** Whether both rate and lockup allowances are sufficient */
  isSufficient: boolean;
}

/**
 * Calculates storage metrics for Pandora service based on balance data
 *
 * This function performs comprehensive calculations to determine:
 * - Required rate allowance for storage operations
 * - Required lockup amount for data persistence
 * - Remaining persistence days based on current allowances
 * - Sufficiency checks for both rate and lockup allowances
 * - Checks if current allowances are sufficient for at least the minimum days threshold
 *
 * The lockup sufficiency check ensures that the current allowances provide
 * at least `minDaysThreshold` days of storage persistence (default: 10 days).
 *
 * @param pandoraBalance - The balance data from Pandora service
 * @param persistencePeriodDays - The desired persistence period in days (default: PERSISTENCE_PERIOD_IN_DAYS)
 * @param epochsPerDay - Number of epochs per day (default: EPOCHS_PER_DAY)
 * @param minDaysThreshold - Minimum days threshold for lockup sufficiency (default: 10n)
 * @returns StorageCalculationResult containing all calculated metrics including formatted lockup amount
 *
 * @example
 * ```typescript
 * const pandoraBalance = await pandoraService.checkAllowanceForStorage(
 *   NUMBER_OF_GB * ONE_GB_IN_BYTES,
 *   false,
 *   synapse.payments
 * );
 *
 * const result = calculateStorageMetrics(pandoraBalance);
 *
 * if (result.isSufficient) {
 *   console.log("Storage allowances are sufficient for at least 10 days");
 * } else {
 *   console.log(`Need additional rate: ${result.rateNeeded}`);
 *   console.log(`Need additional lockup: ${result.lockupNeededFormatted} tokens`);
 * }
 * ```
 */
export const calculateStorageMetrics = async (
  synapse: Synapse,
  persistencePeriodDays: bigint = BigInt(config.persistencePeriod) *
    EPOCHS_PER_DAY,
  storageCapacity: number = config.storageCapacity * ONE_GB_IN_BYTES,
  minDaysThreshold: bigint = BigInt(config.minDaysThreshold)
): Promise<StorageCalculationResult> => {
  const pandoraService = new PandoraService(
    synapse.getProvider(),
    synapse.getPandoraAddress()
  );
  const pandoraBalance = await pandoraService.checkAllowanceForStorage(
    storageCapacity,
    false,
    synapse.payments
  );

  // Calculate the required rate allowance
  // This is the difference between what's needed and what's currently used
  const rateNeeded =
    pandoraBalance.rateAllowanceNeeded - pandoraBalance.currentRateUsed;

  // Calculate the base lockup needed for the persistence period
  // Formula: persistence_days * epochs_per_day * rate_needed
  let lockupNeeded = persistencePeriodDays * EPOCHS_PER_DAY * rateNeeded;

  // Calculate remaining lockup allowance
  // Use the current allowance if it's greater than or equal to what's used,
  // otherwise just use the current allowance (handles edge cases)
  const lockupRemaining =
    pandoraBalance.currentLockupAllowance >= pandoraBalance.currentLockupUsed
      ? pandoraBalance.currentLockupAllowance - pandoraBalance.currentLockupUsed
      : pandoraBalance.currentLockupAllowance;

  // Calculate how many days of persistence are left with current lockup
  // Avoid division by zero by checking if rateNeeded is greater than 0
  const persistenceDaysLeft =
    rateNeeded > 0n ? lockupRemaining / EPOCHS_PER_DAY / rateNeeded : 0n;

  // If persistence days left is below the minimum threshold,
  // add the remaining lockup to the needed amount for safety
  if (persistenceDaysLeft < minDaysThreshold) {
    lockupNeeded = lockupNeeded + lockupRemaining;
  }

  // Calculate current storage usage based on the ratio of current rate used
  // to the rate needed for the known storage capacity
  let currentStorageBytes = 0n;
  let currentStorageGB = 0;

  if (
    pandoraBalance.currentRateUsed > 0n &&
    pandoraBalance.rateAllowanceNeeded > 0n
  ) {
    try {
      // Calculate the ratio of current usage to what would be needed for the storage capacity
      // currentRateUsed / rateAllowanceNeeded = actualStorageBytes / storageCapacity
      // Therefore: actualStorageBytes = (currentRateUsed * storageCapacity) / rateAllowanceNeeded
      currentStorageBytes =
        (pandoraBalance.currentRateUsed * BigInt(storageCapacity)) /
        pandoraBalance.rateAllowanceNeeded;

      // Convert bytes to GB (1 GB = 1024^3 bytes)
      currentStorageGB = Number(currentStorageBytes) / (1024 * 1024 * 1024);
    } catch (error) {
      console.warn("Failed to calculate current storage usage:", error);
      // Fallback to 0 if calculation fails
      currentStorageBytes = 0n;
      currentStorageGB = 0;
    }
  }

  // Check if current rate allowance is sufficient
  const isRateSufficient = pandoraBalance.currentRateAllowance >= rateNeeded;

  // Check if lockup is sufficient (at least minimum days threshold)
  const isLockupSufficient = persistenceDaysLeft >= minDaysThreshold;

  // Overall sufficiency requires both rate and lockup to be sufficient
  const isSufficient = isRateSufficient && isLockupSufficient;

  return {
    rateNeeded,
    rateUsed: pandoraBalance.currentRateUsed,
    currentStorageBytes,
    currentStorageGB,
    lockupNeeded,
    lockupNeededFormatted: formatUnits(lockupNeeded, 18),
    lockupRemaining,
    persistenceDaysLeft,
    isRateSufficient,
    isLockupSufficient,
    isSufficient,
  };
};
