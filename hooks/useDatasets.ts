import { WarmStorageService } from "@filoz/synapse-sdk/warm-storage";
import { useEthersSigner } from "@/hooks/useEthers";
import { useQuery } from "@tanstack/react-query";
import { EnhancedDataSetInfo, Synapse, PDPServer } from "@filoz/synapse-sdk";
import { useAccount } from "wagmi";
import { DataSet } from "@/types";

/**
 * Hook to fetch and manage datasets
 * @returns Query result containing datasets and their details
 */
export const useDatasets = () => {
  const signer = useEthersSigner();
  const { address } = useAccount();

  return useQuery({
    enabled: !!address,
    queryKey: ["datasets", address],
    queryFn: async () => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");

      const synapse = await Synapse.create({
        signer,
        disableNonceManager: false,
      });

      // Initialize Pandora service
      const warmStorageService = new WarmStorageService(
        synapse.getProvider(),
        synapse.getWarmStorageAddress(),
        synapse.getPDPVerifierAddress()
      );

      // Fetch providers and datasets in parallel
      const [providers, datasets] = await Promise.all([
        warmStorageService.getAllApprovedProviders(),
        warmStorageService.getClientDataSetsWithDetails(address),
      ]);

      // Create a map of provider URLs for quick lookup
      const providerUrlMap = new Map(
        providers.map((provider) => [
          provider.serviceProvider.toLowerCase(),
          provider.serviceURL,
        ])
      );

      // Fetch dataset details in parallel with proper error handling
      const datasetDetailsPromises = datasets.map(
        async (dataset: EnhancedDataSetInfo) => {
          const serviceURL = providerUrlMap.get(dataset.payee.toLowerCase());
          // Find the full provider details
          const provider = providers.find(
            (p) =>
              p.serviceProvider.toLowerCase() === dataset.payee.toLowerCase()
          );
          try {
            const pdpServer = new PDPServer(null, serviceURL || "");
            const data = await pdpServer.getDataSet(
              dataset.pdpVerifierDataSetId
            );
            return {
              ...dataset,
              provider: provider,
              data,
            } as DataSet;
          } catch (error) {
            console.error(
              "Error getting dataset data for dataset : ",
              dataset.pdpVerifierDataSetId,
              error
            );
            return {
              ...dataset,
            } as DataSet;
          }
        }
      );

      const datasetDataResults = await Promise.all(datasetDetailsPromises);

      // Combine datasets with their details
      const datasetsWithDetails = datasets.map((dataset) => {
        const dataResult = datasetDataResults.find(
          (result) =>
            result.pdpVerifierDataSetId === dataset.pdpVerifierDataSetId
        );
        return dataResult;
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
