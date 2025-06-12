import { useQuery } from "@tanstack/react-query";
import { Synapse, TOKENS } from "@filoz/synapse-sdk";
import { useEthersProvider } from "@/hooks/useEthers";
import { useAccount } from "wagmi";
import { calculateStorageMetrics } from "@/utils/pandoraCalculations";
import { useNetwork } from "@/hooks/useNetwork";
import { formatUnits } from "viem";
import { config } from "@/config";

export const useBalances = () => {
  const provider = useEthersProvider();
  const { address } = useAccount();
  const { data: network } = useNetwork();
  const query = useQuery({
    enabled: !!address && !!provider && !!network,
    queryKey: ["balances", address, network],
    queryFn: async () => {
      if (!provider) throw new Error("Provider not found");
      if (!network) throw new Error("Network not found");
      const synapse = await Synapse.create({ provider });
      const filRaw: bigint = await synapse.payments.walletBalance();
      const usdfcRaw: bigint = await synapse.payments.walletBalance(
        TOKENS.USDFC
      );
      const paymentsRaw: bigint = await synapse.payments.balance(TOKENS.USDFC);
      const usdfcDecimals: number = synapse.payments.decimals(TOKENS.USDFC);

      // Use the utility function to calculate storage metrics
      const storageMetrics = await calculateStorageMetrics(synapse);

      const storageUsageMessage = ` ${storageMetrics.currentStorageGB.toFixed(3)} GB / ${config.storageCapacity} GB.`;

      return {
        filBalance: formatUnits(filRaw, 18),
        usdfcBalance: formatUnits(usdfcRaw, usdfcDecimals),
        pandoraBalance: formatUnits(paymentsRaw, usdfcDecimals),
        persistenceDaysLeft: storageMetrics.persistenceDaysLeft,
        isSufficient: storageMetrics.isSufficient,
        isRateSufficient: storageMetrics.isRateSufficient,
        isLockupSufficient: storageMetrics.isLockupSufficient,
        rateNeeded: storageMetrics.rateNeeded,
        lockupNeeded: storageMetrics.lockupNeeded,
        storageUsageMessage,
      };
    },
  });

  return query;
}
