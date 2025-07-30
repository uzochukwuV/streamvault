import { CONTRACT_ADDRESSES } from "@filoz/synapse-sdk";

// Returns the FilecoinWarmStorage service address for the given network
export const getFilecoinWarmStorageServiceAddress = (
  network: "mainnet" | "calibration"
) => {
  return CONTRACT_ADDRESSES.PANDORA_SERVICE[network];
};

export const MAX_UINT256 = 2n ** 256n - 1n;

// 0.1 USDFC in wei (used for dataset creation fee)
export const DATA_SET_CREATION_FEE = BigInt(0.1 * 10 ** 18);
