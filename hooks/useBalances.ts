import { useQuery } from "@tanstack/react-query";
import { Synapse, TIME_CONSTANTS, TOKENS } from "@filoz/synapse-sdk";
import { useEthersProvider } from "@/hooks/useEthers";
import { useAccount } from "wagmi";
import { PandoraService } from "@filoz/synapse-sdk/pandora";
import { getPandoraAddress } from "@/utils";
import { useNetwork } from "./useNetwork";

const formatBalance = (balance: bigint, decimals: number) => {
  return Number(balance) / 10 ** decimals;
};

const ONE_GB_IN_BYTES = 1024 * 1024 * 1024;
const NUMBER_OF_GB = 10;
const PERSISTENCE_PERIOD_IN_DAYS = 30n;
const EPOCHS_PER_DAY = 2880n;
const PANDORA_PROOF_SET_CREATION_FEE = BigInt(0.2 * 10 ** 18);

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

      const RATE_NEEDED =
        pandoraBalance.rateAllowanceNeeded - pandoraBalance.currentRateUsed;
      let LOCKUP_NEEDED =
        PERSISTENCE_PERIOD_IN_DAYS * EPOCHS_PER_DAY * RATE_NEEDED;

      const LOCKUP_REMAINING =
        (pandoraBalance.currentLockupAllowance >=
        pandoraBalance.currentLockupUsed
          ? pandoraBalance.currentLockupAllowance -
            pandoraBalance.currentLockupUsed
          : pandoraBalance.currentLockupAllowance) -
        PANDORA_PROOF_SET_CREATION_FEE;
      const LOCKUP_DAYS_LEFT = LOCKUP_REMAINING / EPOCHS_PER_DAY / RATE_NEEDED;

      if (LOCKUP_DAYS_LEFT < 10n) {
        LOCKUP_NEEDED = LOCKUP_NEEDED + LOCKUP_REMAINING;
      }

      const isRateSufficient =
        pandoraBalance.currentRateAllowance >= RATE_NEEDED;
      const isLockupSufficient = LOCKUP_DAYS_LEFT >= 10n;
      const isSufficient = isRateSufficient && isLockupSufficient;

      return {
        filBalance: formatBalance(filRaw, 18),
        usdfcBalance: formatBalance(usdfcRaw, usdfcDecimals),
        paymentsBalance: formatBalance(paymentsRaw, usdfcDecimals),
        persistenceDaysLeft: LOCKUP_DAYS_LEFT,
        isSufficient,
        isRateSufficient,
        isLockupSufficient,
        rateNeeded: RATE_NEEDED,
        lockupNeeded: LOCKUP_NEEDED,
      };
    },
  });

  return query;
}
