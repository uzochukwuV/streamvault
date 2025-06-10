import { CONTRACT_ADDRESSES, TOKENS } from "@filoz/synapse-sdk";

export const getPandoraAddress = (network: "mainnet" | "calibration") => {
  return CONTRACT_ADDRESSES.PANDORA_SERVICE[network];
};

export const getUSDFCAddress = (network: "mainnet" | "calibration") => {
  return CONTRACT_ADDRESSES.USDFC[network];
};

export const getUSDFCID = () => {
  return TOKENS.USDFC;
};

export const ONE_GB_IN_BYTES = 1024 * 1024 * 1024;
export const NUMBER_OF_GB = 10;
export const PERSISTENCE_PERIOD_IN_DAYS = 30n;
export const EPOCHS_PER_DAY = 2880n;

export const PROOF_SET_CREATION_FEE = BigInt(0.2 * 10 ** 18);