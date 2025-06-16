import {
  PandoraService,
  Synapse,
  TIME_CONSTANTS,
  SIZE_CONSTANTS,
} from "@filoz/synapse-sdk";
import { config } from "@/config";
import { PandoraBalanceData, StorageCalculationResult } from "@/types";

/**
 * Constants for storage pricing and calculations
 */
const STORAGE_CONSTANTS = {
  /** Price per TB per month in wei (2 USDFC) */
  PRICE_PER_TB_PER_MONTH: 2n * 10n ** 18n,
  /** Price per TB per month in wei (3 USDFC) */
  PRICE_PER_TB_PER_MONTH_CDN: 3n * 10n ** 18n,
} as const;

/**
 * Calculates storage metrics for Pandora service based on balance data
 * @param synapse - The Synapse instance
 * @param persistencePeriodDays - The desired persistence period in days
 * @param storageCapacity - The storage capacity in bytes
 * @param minDaysThreshold - Minimum days threshold for lockup sufficiency
 * @returns StorageCalculationResult containing all calculated metrics
 */
export const calculateStorageMetrics = async (
  synapse: Synapse,
  persistencePeriodDays: bigint = BigInt(config.persistencePeriod),
  storageCapacity: number = config.storageCapacity * Number(SIZE_CONSTANTS.GiB),
  minDaysThreshold: bigint = BigInt(config.minDaysThreshold)
): Promise<StorageCalculationResult> => {
  // Initialize Pandora service and fetch balance data
  const pandoraService = new PandoraService(
    synapse.getProvider(),
    synapse.getPandoraAddress()
  );
  const pandoraBalance = await pandoraService.checkAllowanceForStorage(
    storageCapacity,
    config.withCDN,
    synapse.payments
  );

  // Calculate rate-related metrics
  const rateNeeded =
    pandoraBalance.rateAllowanceNeeded - pandoraBalance.currentRateUsed;
  const sizeInBytesBigint = BigInt(storageCapacity);

  // Calculate rate per epoch based on storage capacity
  const ratePerEpoch = calculateRatePerEpoch(sizeInBytesBigint);

  // Calculate daily lockup requirements
  const lockupPerDay = TIME_CONSTANTS.EPOCHS_PER_DAY * ratePerEpoch;
  const lockupPerDayAtCurrentRate =
    TIME_CONSTANTS.EPOCHS_PER_DAY * pandoraBalance.currentRateUsed;

  // Calculate remaining lockup and persistence days
  const currentLockupRemaining =
    pandoraBalance.currentLockupAllowance - pandoraBalance.currentLockupUsed;
  const persistenceDaysLeft =
    Number(currentLockupRemaining) / Number(lockupPerDay);
  const persistenceDaysLeftAtCurrentRate =
    lockupPerDayAtCurrentRate > 0n
      ? Number(currentLockupRemaining) / Number(lockupPerDayAtCurrentRate)
      : currentLockupRemaining > 0n
        ? Infinity
        : 0;

  // Calculate required lockup amount
  const lockupNeeded = calculateRequiredLockup(
    persistencePeriodDays,
    persistenceDaysLeft,
    lockupPerDay,
    pandoraBalance.currentLockupUsed
  );

  // Calculate current storage usage
  const { currentStorageBytes, currentStorageGB } =
    calculateCurrentStorageUsage(pandoraBalance, storageCapacity);

  // Determine sufficiency of allowances
  const isRateSufficient = pandoraBalance.currentRateAllowance >= rateNeeded;
  const isLockupSufficient = persistenceDaysLeft >= minDaysThreshold;
  const isSufficient = isRateSufficient && isLockupSufficient;

  const currentRateAllowanceGB = calculateRateAllowanceGB(
    pandoraBalance.currentRateAllowance
  );
  const depositNeeded = lockupNeeded - pandoraBalance.currentLockupAllowance;

  return {
    rateNeeded,
    rateUsed: pandoraBalance.currentRateUsed,
    currentStorageBytes,
    currentStorageGB,
    totalLockupNeeded: lockupNeeded,
    depositNeeded,
    persistenceDaysLeft,
    persistenceDaysLeftAtCurrentRate,
    isRateSufficient,
    isLockupSufficient,
    isSufficient,
    currentRateAllowanceGB,
    currentLockupAllowance: pandoraBalance.currentLockupAllowance,
  };
};

const getPricePerTBPerMonth = (): bigint => {
  return config.withCDN
    ? STORAGE_CONSTANTS.PRICE_PER_TB_PER_MONTH_CDN
    : STORAGE_CONSTANTS.PRICE_PER_TB_PER_MONTH;
};

/**
 * Calculates the rate per epoch based on storage capacity
 */
const calculateRatePerEpoch = (sizeInBytes: bigint): bigint => {
  return (
    (getPricePerTBPerMonth() * sizeInBytes) /
    (SIZE_CONSTANTS.TiB * TIME_CONSTANTS.EPOCHS_PER_MONTH)
  );
};

/**
 * Calculates the storage capacity in GB that can be supported by a given rate allowance
 */
const calculateRateAllowanceGB = (rateAllowance: bigint): number => {
  const monthlyRate = rateAllowance * BigInt(TIME_CONSTANTS.EPOCHS_PER_MONTH);
  const bytesThatCanBeStored =
    (monthlyRate * SIZE_CONSTANTS.TiB) / getPricePerTBPerMonth();
  return Number(bytesThatCanBeStored) / Number(SIZE_CONSTANTS.GiB);
};

/**
 * Calculates the required lockup amount based on persistence period and current lockup
 */
const calculateRequiredLockup = (
  persistencePeriodDays: bigint,
  persistenceDaysLeft: number,
  lockupPerDay: bigint,
  currentLockupUsed: bigint
): bigint => {
  return Number(persistencePeriodDays) > persistenceDaysLeft
    ? BigInt(
        parseInt(
          (
            (Number(persistencePeriodDays) - persistenceDaysLeft) *
              Number(lockupPerDay) +
            Number(currentLockupUsed)
          ).toString()
        )
      )
    : 0n;
};

/**
 * Calculates current storage usage based on rate usage
 */
const calculateCurrentStorageUsage = (
  pandoraBalance: PandoraBalanceData,
  storageCapacity: number
): { currentStorageBytes: bigint; currentStorageGB: number } => {
  let currentStorageBytes = 0n;
  let currentStorageGB = 0;

  if (
    pandoraBalance.currentRateUsed > 0n &&
    pandoraBalance.rateAllowanceNeeded > 0n
  ) {
    try {
      currentStorageBytes =
        (pandoraBalance.currentRateUsed * BigInt(storageCapacity)) /
        pandoraBalance.rateAllowanceNeeded;
      currentStorageGB = Number(currentStorageBytes) / (1024 * 1024 * 1024);
    } catch (error) {
      console.warn("Failed to calculate current storage usage:", error);
    }
  }

  return { currentStorageBytes, currentStorageGB };
};
