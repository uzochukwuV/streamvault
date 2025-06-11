import { PandoraService } from "@filoz/synapse-sdk/pandora";
import { useEthersSigner } from "@/hooks/useEthers";
import { useQuery } from "@tanstack/react-query";
import { CONTRACT_ADDRESSES } from "@filoz/synapse-sdk";
import { useNetwork } from "@/hooks/useNetwork";

export function useProofsets() {
  const signer = useEthersSigner();
  const { data: network } = useNetwork();
  return useQuery({
    queryKey: ["proofsets", signer?.address, network],
    queryFn: async () => {
      if (!network) throw new Error("Network not found");
      if (!signer) throw new Error("Signer not found");
      const pandoraService = new PandoraService(
        signer.provider,
        CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
      );
      const providers = await pandoraService.getAllApprovedProviders();

      const proofsets = await pandoraService.getClientProofSetsWithDetails(
        signer.address
      );

      let proofsetDetails = {} as any;
      if (proofsets.length > 0 && providers.length > 0) {
        try {
          proofsetDetails = await Promise.all(
            proofsets
              .map((proofset) =>
                getProofSet(
                  proofset.pdpVerifierProofSetId,
                  providers.find(
                    (provider) => provider.owner === proofset.payee
                  )?.pdpUrl ?? ""
                )
                  .then((details) => {
                    return {
                      ...details,
                    };
                  })
                  .catch((error) => {
                    console.error("Error getting proofset details", error);
                    return null;
                  })
              )
              .filter((details) => details !== null)
          );
        } catch (error) {
          console.error("Error getting proofset details", error);
        }
      }

      return { proofsets, providers, proofsetDetails };
    },
    enabled: !!signer,
  });
}

export const getProofSet = async (
  proofsetId: number,
  pdpUrl: string
): Promise<any> => {
  try {
    const response = await fetch(`${pdpUrl}pdp/proof-sets/${proofsetId}`, {
      method: "GET",
      headers: {},
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as any;
    console.log("result", result);
    return result;
  } catch (error) {
    console.error("Error getting proofset details", error);
    return null;
  }
};
