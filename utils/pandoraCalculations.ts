import {
  PERSISTENCE_PERIOD_IN_DAYS,
  EPOCHS_PER_DAY,
} from "./constants";
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
export function calculateStorageMetrics(
  pandoraBalance: PandoraBalanceData,
  persistencePeriodDays: bigint = PERSISTENCE_PERIOD_IN_DAYS,
  epochsPerDay: bigint = EPOCHS_PER_DAY,
  minDaysThreshold: bigint = 10n
): StorageCalculationResult {
  // Calculate the required rate allowance
  // This is the difference between what's needed and what's currently used
  const rateNeeded =
    pandoraBalance.rateAllowanceNeeded - pandoraBalance.currentRateUsed;

  // Calculate the base lockup needed for the persistence period
  // Formula: persistence_days * epochs_per_day * rate_needed
  let lockupNeeded = persistencePeriodDays * epochsPerDay * rateNeeded;

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
    rateNeeded > 0n ? lockupRemaining / epochsPerDay / rateNeeded : 0n;

  // If persistence days left is below the minimum threshold,
  // add the remaining lockup to the needed amount for safety
  if (persistenceDaysLeft < minDaysThreshold) {
    lockupNeeded = lockupNeeded + lockupRemaining;
  }

  // Check if current rate allowance is sufficient
  const isRateSufficient = pandoraBalance.currentRateAllowance >= rateNeeded;

  // Check if lockup is sufficient (at least minimum days threshold)
  const isLockupSufficient = persistenceDaysLeft >= minDaysThreshold;

  // Overall sufficiency requires both rate and lockup to be sufficient
  const isSufficient = isRateSufficient && isLockupSufficient;

  return {
    rateNeeded,
    lockupNeeded,
    lockupNeededFormatted: formatUnits(lockupNeeded, 18),
    lockupRemaining,
    persistenceDaysLeft,
    isRateSufficient,
    isLockupSufficient,
    isSufficient,
  };
}

/**
 * Formats a bigint balance to a human-readable number
 *
 * @param balance - The balance as a bigint
 * @param decimals - Number of decimal places for the token
 * @returns The formatted balance as a number
 *
 * @example
 * ```typescript
 * const filBalance = 1000000000000000000n; // 1 FIL in wei
 * const formatted = formatBalance(filBalance, 18); // Returns 1
 * ```
 */
export function formatBalance(balance: bigint, decimals: number): number {
  return Number(balance) / 10 ** decimals;
}

/**
 * Converts days to epochs based on the epochs per day ratio
 *
 * @param days - Number of days as bigint
 * @param epochsPerDay - Number of epochs per day (default: EPOCHS_PER_DAY)
 * @returns Number of epochs as bigint
 */
export function daysToEpochs(
  days: bigint,
  epochsPerDay: bigint = EPOCHS_PER_DAY
): bigint {
  return days * epochsPerDay;
}

/**
 * Converts epochs to days based on the epochs per day ratio
 *
 * @param epochs - Number of epochs as bigint
 * @param epochsPerDay - Number of epochs per day (default: EPOCHS_PER_DAY)
 * @returns Number of days as bigint
 */
export function epochsToDays(
  epochs: bigint,
  epochsPerDay: bigint = EPOCHS_PER_DAY
): bigint {
  return epochs / epochsPerDay;
}
