export interface Root {
  rootId: number;
  rootCid: string;
  subrootCid: string;
  subrootOffset: number;
}

export interface ProofSetDetails {
  id: number;
  roots: Root[];
  nextChallengeEpoch: number;
}

export interface ProofSet {
  railId: number;
  payer: string;
  payee: string;
  commissionBps: number;
  metadata: string;
  rootMetadata: any[];
  clientDataSetId: number;
  withCDN: boolean;
  pdpVerifierProofSetId: number;
  nextRootId: number;
  currentRootCount: number;
  isLive: boolean;
  isManaged: boolean;
  details: ProofSetDetails | null;
}

export interface ProofSetsResponse {
  proofsets: ProofSet[];
}

/**
 * Interface for formatted balance data returned by useBalances
 */
export interface UseBalancesResponse {
  filBalance: bigint;
  usdfcBalance: bigint;
  pandoraBalance: bigint;
  filBalanceFormatted: number;
  usdfcBalanceFormatted: number;
  pandoraBalanceFormatted: number;
  persistenceDaysLeft: number;
  persistenceDaysLeftAtCurrentRate: number;
  isSufficient: boolean;
  isRateSufficient: boolean;
  isLockupSufficient: boolean;
  rateNeeded: bigint;
  totalLockupNeeded: bigint;
  additionalLockupNeeded: bigint;
  currentRateAllowanceGB: number;
  currentStorageGB: number;
  currentLockupAllowance: bigint;
}

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
  totalLockupNeeded: bigint;
  /** The additional lockup amount needed for storage persistence */
  additionalLockupNeeded: bigint;
  /** Number of days left before lockup expires */
  persistenceDaysLeft: number;
  /** Number of days left before lockup expires at current rate */
  persistenceDaysLeftAtCurrentRate: number;
  /** Whether the current rate allowance is sufficient */
  isRateSufficient: boolean;
  /** Whether the current lockup allowance is sufficient for at least the minimum days threshold */
  isLockupSufficient: boolean;
  /** Whether both rate and lockup allowances are sufficient */
  isSufficient: boolean;
  /** The current rate allowance in GB */
  currentRateAllowanceGB: number;
  /** The current lockup allowance in USDFC */
  currentLockupAllowance: bigint;
}
