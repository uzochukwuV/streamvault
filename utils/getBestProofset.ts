import { CONTRACT_ADDRESSES, PandoraService } from "@filoz/synapse-sdk";
import { JsonRpcSigner } from "ethers";

// Pick the provider that has the most used storage
// in a proofset with the client
export const getBestProofset = async (
  signer: JsonRpcSigner,
  network: "mainnet" | "calibration",
  address: string
) => {
  const pandoraService = new PandoraService(
    signer.provider,
    CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
  );
  let providerId;
  let bestProofset;
  const proofSets = await pandoraService.getClientProofSetsWithDetails(address);

  try {
    bestProofset = proofSets.reduce((max, proofSet) => {
      return proofSet.currentRootCount > max.currentRootCount ? proofSet : max;
    }, proofSets[0]);
    providerId = await pandoraService.getProviderIdByAddress(
      bestProofset.payee
    );
  } catch (error) {
    console.error("Error getting providerId", error);
  }
  return { providerId, bestProofset };
};
