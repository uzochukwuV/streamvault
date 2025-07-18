import {
  PandoraService,
  SIZE_CONSTANTS,
  Synapse,
  TIME_CONSTANTS,
} from "@filoz/synapse-sdk";
import { config } from "@/config";
import { PandoraBalanceData, StorageCosts } from "@/types";
import { PROOF_SET_CREATION_FEE } from "./constants";

/**
 * Fetches the current storage costs from the Pandora service.
 * @param synapse - The Synapse instance
 * @returns The storage costs object
 */
export const fetchPandoraStorageCosts = async (
  synapse: Synapse
): Promise<StorageCosts> => {
  const pandoraService = new PandoraService(
    synapse.getProvider(),
    synapse.getPandoraAddress()
  );
  return pandoraService.getServicePrice();
};

/**
 * Fetches the current Pandora balance data for a given storage capacity (in bytes) and period (in days).
 * @param synapse - The Synapse instance
 * @param storageCapacityBytes - Storage capacity in bytes
 * @param persistencePeriodDays - Desired persistence period in days
 * @returns The Pandora balance data object
 */
export const fetchPandoraBalanceData = async (
  synapse: Synapse,
  storageCapacityBytes: number,
  persistencePeriodDays: number
): Promise<PandoraBalanceData> => {
  const pandoraService = new PandoraService(
    synapse.getProvider(),
    synapse.getPandoraAddress()
  );
  return pandoraService.checkAllowanceForStorage(
    storageCapacityBytes,
    config.withCDN,
    synapse.payments,
    persistencePeriodDays
  );
};

/**
 * Calculates current storage usage based on rate usage and storage capacity.
 *
 * @param pandoraBalance - The Pandora balance data
 * @param storageCapacityBytes - The storage capacity in bytes
 * @returns Object with currentStorageBytes and currentStorageGB
 */
export const calculateCurrentStorageUsage = (
  pandoraBalance: PandoraBalanceData,
  storageCapacityBytes: number
): { currentStorageBytes: bigint; currentStorageGB: number } => {
  let currentStorageBytes = 0n;
  let currentStorageGB = 0;

  if (
    pandoraBalance.currentRateUsed > 0n &&
    pandoraBalance.rateAllowanceNeeded > 0n
  ) {
    try {
      // Proportionally calculate storage usage based on rate used
      currentStorageBytes =
        (pandoraBalance.currentRateUsed * BigInt(storageCapacityBytes)) /
        pandoraBalance.rateAllowanceNeeded;
      // Convert bytes to GB
      currentStorageGB =
        Number(currentStorageBytes) / Number(SIZE_CONSTANTS.GiB);
    } catch (error) {
      console.warn("Failed to calculate current storage usage:", error);
    }
  }

  return { currentStorageBytes, currentStorageGB };
};

/**
 * Checks if the current allowances and balances are sufficient for storage and proofset creation.
 *
 * @param pandoraBalance - The Pandora balance data
 * @param minDaysThreshold - Minimum days threshold for lockup sufficiency
 * @param includeProofsetCreationFee - Whether to include the proofset creation fee in calculations
 * @returns Object with sufficiency flags and allowance details
 */
export const checkAllowances = async (
  pandoraBalance: PandoraBalanceData,
  minDaysThreshold: number,
  includeProofsetCreationFee: boolean
) => {
  // Calculate the rate needed per epoch
  const rateNeeded = pandoraBalance.costs.perEpoch;

  // Calculate daily lockup requirements
  const lockupPerDay = TIME_CONSTANTS.EPOCHS_PER_DAY * rateNeeded;

  // Calculate remaining lockup and persistence days
  const currentLockupRemaining =
    pandoraBalance.currentLockupAllowance - pandoraBalance.currentLockupUsed;

  // Calculate total allowance needed including proofset creation fee if required
  const proofSetCreationFee = includeProofsetCreationFee
    ? PROOF_SET_CREATION_FEE
    : BigInt(0);

  // Use available properties for lockup and deposit
  const totalLockupNeeded = pandoraBalance.lockupAllowanceNeeded;
  const depositNeeded = pandoraBalance.depositAmountNeeded;

  // Use the greater of current or needed rate allowance
  const rateAllowanceNeeded =
    pandoraBalance.currentRateAllowance > pandoraBalance.rateAllowanceNeeded
      ? pandoraBalance.currentRateAllowance
      : pandoraBalance.rateAllowanceNeeded;

  // Add proofset creation fee to lockup and deposit if needed
  const lockupAllowanceNeeded = totalLockupNeeded + proofSetCreationFee;
  const depositAmountNeeded = depositNeeded + proofSetCreationFee;

  // Check if lockup balance is sufficient for proofset creation
  const isLockupBalanceSufficientForProofsetCreation =
    currentLockupRemaining >= lockupAllowanceNeeded;

  // Calculate how many days of persistence are left
  const persistenceDaysLeft =
    Number(currentLockupRemaining) / Number(lockupPerDay);

  // Determine sufficiency of allowances
  const isRateSufficient =
    pandoraBalance.currentRateAllowance >= rateAllowanceNeeded;
  // Lockup is sufficient if enough days remain and enough for proofset creation
  const isLockupSufficient =
    persistenceDaysLeft >= Number(minDaysThreshold) &&
    isLockupBalanceSufficientForProofsetCreation;
  // Both must be sufficient
  const isSufficient = isRateSufficient && isLockupSufficient;

  // Return detailed sufficiency and allowance info
  return {
    isSufficient, // true if both rate and lockup are sufficient
    isLockupSufficient, // true if lockup is sufficient
    isRateSufficient, // true if rate is sufficient
    rateAllowanceNeeded, // rate allowance required
    lockupAllowanceNeeded, // lockup allowance required
    depositAmountNeeded, // deposit required
    currentLockupRemaining, // current lockup remaining
    lockupPerDay, // lockup needed per day
    persistenceDaysLeft, // days of persistence left
  };
};
