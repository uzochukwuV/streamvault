import { PandoraService as FilecoinWarmStorageService } from "@filoz/synapse-sdk/pandora";
import { useEthersSigner } from "@/hooks/useEthers";
import { useQuery } from "@tanstack/react-query";
import {
  EnhancedProofSetInfo as EnhancedDatasetInfo,
  Synapse,
} from "@filoz/synapse-sdk";
import { useNetwork } from "@/hooks/useNetwork";
import { useAccount } from "wagmi";
import { DatasetsResponse, DatasetDetails, Provider, DataSet } from "@/types";

/**
 * Fetches dataset details from a provider's API
 * @param datasetId - The ID of the dataset
 * @param pdpUrl - The URL of the provider's API
 * @returns Promise resolving to the dataset details or null if not found
 */
const fetchDatasetDetails = async (
  datasetId: number,
  pdpUrl: string
): Promise<DatasetDetails | null> => {
  try {
    if (!pdpUrl.endsWith("/")) {
      pdpUrl = `${pdpUrl}/`;
    }
    // TODO: rename to datasets
    const response = await fetch(`${pdpUrl}pdp/proof-sets/${datasetId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching proofset ${datasetId}:`, error);
    return null;
  }
};

/**
 * Hook to fetch and manage datasets
 * @returns Query result containing datasets and their details
 */
export const useDatasets = () => {
  const signer = useEthersSigner();
  const { data: network } = useNetwork();
  const { address } = useAccount();

  return useQuery<DatasetsResponse, Error>({
    enabled: !!address,
    queryKey: ["datasets", address],
    queryFn: async () => {
      if (!network) throw new Error("Network not found");
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");

      const synapse = await Synapse.create({
        signer,
        disableNonceManager: false,
      });

      // Initialize Pandora service
      const filecoinWarmStorageService = new FilecoinWarmStorageService(
        synapse.getProvider(),
        synapse.getPandoraAddress(),
        synapse.getPDPVerifierAddress()
      );

      // Fetch providers and datasets in parallel
      const [providers, datasets] = await Promise.all([
        filecoinWarmStorageService.getAllApprovedProviders(),
        filecoinWarmStorageService.getClientProofSetsWithDetails(address),
      ]);

      // Create a map of provider URLs for quick lookup
      const providerUrlMap = new Map(
        providers.map((provider: Provider) => [provider.owner, provider.pdpUrl])
      );

      // Fetch dataset details in parallel with proper error handling
      const datasetDetailsPromises = datasets.map(
        async (dataset: EnhancedDatasetInfo) => {
          const pdpUrl = providerUrlMap.get(dataset.payee);
          if (!pdpUrl) {
            console.warn(`No provider URL found for payee ${dataset.payee}`);
            return {
              datasetId: dataset.pdpVerifierProofSetId,
              details: null,
              pdpUrl: null,
              provider: null,
            };
          }

          try {
            const details = await fetchDatasetDetails(
              dataset.pdpVerifierProofSetId,
              pdpUrl
            );

            // Find the full provider details
            const provider = providers.find(
              (p: Provider) => p.owner === dataset.payee
            );

            return {
              datasetId: dataset.pdpVerifierProofSetId,
              details: details ? { ...details, pdpUrl } : null,
              pdpUrl,
              provider,
            };
          } catch (error) {
            console.error(
              `Error fetching details for dataset ${dataset.pdpVerifierProofSetId}:`,
              error
            );
            return {
              datasetId: dataset.pdpVerifierProofSetId,
              details: null,
              pdpUrl,
              provider:
                providers.find((p: Provider) => p.owner === dataset.payee) ||
                null,
            };
          }
        }
      );

      const datasetDetailsResults = await Promise.all(datasetDetailsPromises);

      // Combine datasets with their details
      const datasetsWithDetails = datasets.map((dataset) => {
        const detailsResult = datasetDetailsResults.find(
          (result) => result.datasetId === dataset.pdpVerifierProofSetId
        );

        return {
          ...dataset,
          details: detailsResult?.details ?? null,
          pdpUrl: detailsResult?.pdpUrl ?? null,
          provider: detailsResult?.provider ?? null,
        };
      });

      return { datasets: datasetsWithDetails };
    },
    retry: false,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};
