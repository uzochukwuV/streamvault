import { CONTRACT_ADDRESSES, PandoraService } from "@filoz/synapse-sdk";
import { JsonRpcSigner } from "ethers";
import { config } from "@/config";

// Returns the providerId and the proofset with the most used storage for the client
export const getProofset = async (
  signer: JsonRpcSigner,
  network: "mainnet" | "calibration",
  address: string
) => {
  const pandoraService = new PandoraService(
    signer.provider,
    CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
  );
  let providerId;
  let mostUtilizedProofset;
  // Fetch all proofsets for the client
  const allProofSets = await pandoraService.getClientProofSetsWithDetails(
    address
  );

  // Filter proofsets based on CDN usage
  const proofSetsWithCDN = allProofSets.filter((proofSet) => proofSet.withCDN);
  const proofSetsWithoutCDN = allProofSets.filter(
    (proofSet) => !proofSet.withCDN
  );

  // Select proofsets based on config
  const proofSets = config.withCDN ? proofSetsWithCDN : proofSetsWithoutCDN;

  try {
    // Find the proofset with the highest currentRootCount
    mostUtilizedProofset = proofSets.reduce((max, proofSet) => {
      return proofSet.currentRootCount > max.currentRootCount ? proofSet : max;
    }, proofSets[0]);
    if (mostUtilizedProofset) {
      providerId = await pandoraService.getProviderIdByAddress(
        mostUtilizedProofset.payee
      );
    }
  } catch (error) {
    console.error("Error getting providerId", error);
  }
  return { providerId, proofset: mostUtilizedProofset };
};
