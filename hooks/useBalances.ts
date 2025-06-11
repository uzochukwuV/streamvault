import { useQuery } from "@tanstack/react-query";
import { Synapse, TOKENS } from "@filoz/synapse-sdk";
import { useEthersProvider } from "@/hooks/useEthers";
import { useAccount } from "wagmi";
import { PandoraService } from "@filoz/synapse-sdk/pandora";
import {
  getPandoraAddress,
  ONE_GB_IN_BYTES,
  NUMBER_OF_GB,
  calculateStorageMetrics,
  formatBalance,
} from "@/utils";
import { useNetwork } from "@/hooks/useNetwork";

export function useBalances() {
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
      const pandoraService = new PandoraService(
        provider,
        getPandoraAddress(network)
      );
      const pandoraBalance = await pandoraService.checkAllowanceForStorage(
        NUMBER_OF_GB * ONE_GB_IN_BYTES,
        false,
        synapse.payments
      );

      // Use the utility function to calculate storage metrics
      const storageMetrics = calculateStorageMetrics(pandoraBalance);

      return {
        filBalance: formatBalance(filRaw, 18),
        usdfcBalance: formatBalance(usdfcRaw, usdfcDecimals),
        paymentsBalance: formatBalance(paymentsRaw, usdfcDecimals),
        persistenceDaysLeft: storageMetrics.persistenceDaysLeft,
        isSufficient: storageMetrics.isSufficient,
        isRateSufficient: storageMetrics.isRateSufficient,
        isLockupSufficient: storageMetrics.isLockupSufficient,
        rateNeeded: storageMetrics.rateNeeded,
        lockupNeeded: storageMetrics.lockupNeeded,
      };
    },
  });

  return query;
}
