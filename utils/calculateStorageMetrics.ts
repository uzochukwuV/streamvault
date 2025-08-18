import { Synapse, TIME_CONSTANTS, SIZE_CONSTANTS } from "@filoz/synapse-sdk";
import { config } from "@/config";
import { StorageCalculationResult } from "@/types";
import { calculateRateAllowanceGB } from "@/utils/storageCostUtils";
import {
  calculateCurrentStorageUsage,
  fetchFilecoinWarmStorageStorageCosts,
  fetchFilecoinWarmStorageBalanceData,
} from "@/utils/filecoinWarmStorageUtils";

/**
 * Calculates storage metrics for FilecoinWarmStorage service based on balance data and user config.
 * Fetches costs and balances, then computes all relevant metrics for storage and allowance sufficiency.
 *
 * @param synapse - The Synapse instance
 * @param persistencePeriodDays - The desired persistence period in days
 * @param storageCapacityBytes - The storage capacity in bytes
 * @param minDaysThreshold - Minimum days threshold for lockup sufficiency
 * @returns StorageCalculationResult containing all calculated metrics
 */
export const calculateStorageMetrics = async (
  synapse: Synapse,
  persistencePeriodDays: number = config.persistencePeriod,
  storageCapacityBytes: number = config.storageCapacity *
    Number(SIZE_CONSTANTS.GiB),
  minDaysThreshold: number = config.minDaysThreshold
): Promise<StorageCalculationResult> => {
  // Fetch storage costs and balance data from FilecoinWarmStorage service
  const storageCosts = await fetchFilecoinWarmStorageStorageCosts(synapse);
  const filecoinWarmStorageBalance = await fetchFilecoinWarmStorageBalanceData(
    synapse,
    storageCapacityBytes,
    persistencePeriodDays
  );

  // Calculate the rate needed per epoch for the requested storage
  const rateNeeded = filecoinWarmStorageBalance.costs.perEpoch;

  // Calculate daily lockup requirements at requested and current rates
  const lockupPerDay = TIME_CONSTANTS.EPOCHS_PER_DAY * rateNeeded;
  const lockupPerDayAtCurrentRate =
    TIME_CONSTANTS.EPOCHS_PER_DAY * filecoinWarmStorageBalance.currentRateUsed;

  // Calculate remaining lockup and persistence days
  const currentLockupRemaining =
    filecoinWarmStorageBalance.currentLockupAllowance -
    filecoinWarmStorageBalance.currentLockupUsed;
  // How many days of storage remain at requested rate
  const persistenceDaysLeft =
    Number(currentLockupRemaining) / Number(lockupPerDay);
  // How many days of storage remain at current rate usage
  const persistenceDaysLeftAtCurrentRate =
    lockupPerDayAtCurrentRate > 0n
      ? Number(currentLockupRemaining) / Number(lockupPerDayAtCurrentRate)
      : currentLockupRemaining > 0n
      ? Infinity
      : 0;

  // Calculate current storage usage (in bytes and GB)
  const { currentStorageBytes, currentStorageGB } =
    calculateCurrentStorageUsage(
      filecoinWarmStorageBalance,
      storageCapacityBytes
    );

  // Determine sufficiency of allowances
  const isRateSufficient =
    filecoinWarmStorageBalance.currentRateAllowance >= rateNeeded;
  // Lockup is sufficient if enough days remain
  const isLockupSufficient = persistenceDaysLeft >= minDaysThreshold;
  // Both must be sufficient
  const isSufficient = isRateSufficient && isLockupSufficient;

  // Calculate how much storage (in GB) the current rate allowance supports
  const currentRateAllowanceGB = calculateRateAllowanceGB(
    filecoinWarmStorageBalance.currentRateAllowance,
    storageCosts
  );
  // Amount of deposit needed for storage
  const depositNeeded = filecoinWarmStorageBalance.depositAmountNeeded;

  return {
    rateNeeded, // rate needed per epoch for requested storage
    rateUsed: filecoinWarmStorageBalance.currentRateUsed, // rate currently used
    currentStorageBytes, // current storage used in bytes
    currentStorageGB, // current storage used in GB
    totalLockupNeeded: filecoinWarmStorageBalance.lockupAllowanceNeeded, // total lockup needed
    depositNeeded, // deposit needed for storage
    persistenceDaysLeft, // days of storage left at requested rate
    persistenceDaysLeftAtCurrentRate, // days of storage left at current rate
    isRateSufficient, // is the rate allowance sufficient?
    isLockupSufficient, // is the lockup allowance sufficient?
    isSufficient, // are both sufficient?
    currentRateAllowanceGB, // how much storage (GB) current rate allowance supports
    currentLockupAllowance: filecoinWarmStorageBalance.currentLockupAllowance, // current lockup allowance
  };
};
