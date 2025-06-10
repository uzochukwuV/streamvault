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
