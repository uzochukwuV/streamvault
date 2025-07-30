import {
  CONTRACT_ADDRESSES,
  PandoraService as FilecoinWarmStorageService,
} from "@filoz/synapse-sdk";
import { JsonRpcSigner } from "ethers";
import { config } from "@/config";

// Returns the providerId and the dataset with the most used storage for the client
export const getDataset = async (
  signer: JsonRpcSigner,
  network: "mainnet" | "calibration",
  address: string
) => {
  const filecoinWarmStorageService = new FilecoinWarmStorageService(
    signer.provider,
    CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
  );
  let providerId;
  let mostUtilizedDataset;
  // Fetch all datasets for the client
  const allDatasets =
    await filecoinWarmStorageService.getClientProofSetsWithDetails(address);

  // Filter datasets based on CDN usage
  const datasetsWithCDN = allDatasets.filter((dataset) => dataset.withCDN);
  const datasetsWithoutCDN = allDatasets.filter((dataset) => !dataset.withCDN);

  // Select datasets based on config
  const datasets = config.withCDN ? datasetsWithCDN : datasetsWithoutCDN;

  try {
    // Find the dataset with the highest currentRootCount
    mostUtilizedDataset = datasets.reduce((max, dataset) => {
      return dataset.currentRootCount > max.currentRootCount ? dataset : max;
    }, datasets[0]);
    if (mostUtilizedDataset) {
      providerId = await filecoinWarmStorageService.getProviderIdByAddress(
        mostUtilizedDataset.payee
      );
    }
  } catch (error) {
    console.error("Error getting providerId", error);
  }
  return { providerId, dataset: mostUtilizedDataset };
};
