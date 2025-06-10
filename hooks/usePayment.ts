import { useMutation } from "@tanstack/react-query";
import { useEthersSigner } from "@/hooks/useEthers";
import { useState } from "react";
import { useConfetti } from "@/hooks/useConfetti";
import { useNetwork } from "@/hooks/useNetwork";
import { Synapse } from "@filoz/synapse-sdk";
import { getPandoraAddress, getUSDFCID } from "@/utils";
import { usePublicClient } from "wagmi";

const PROOF_SET_CREATION_FEE = BigInt(0.2 * 10 ** 18);

export function usePayment() {
  const signer = useEthersSigner();
  const [status, setStatus] = useState<string>("");
  const { triggerConfetti } = useConfetti();
  const { data: network } = useNetwork();
  const publicClient = usePublicClient();
  const mutation = useMutation({
    mutationFn: async ({
      amount,
      epochRate,
    }: {
      amount: bigint;
      epochRate: bigint;
    }) => {
      if (!signer) throw new Error("Signer not found");
      if (!network) throw new Error("Network not found");
      if (!publicClient) throw new Error("Public client not found");
      const _amount = amount + PROOF_SET_CREATION_FEE;
      setStatus("Preparing transaction...");
      const synapse = await Synapse.create({
        signer,
        disableNonceManager: false,
      });
      setStatus("Approving USDFC spending...");
      let txHash = await synapse.payments.approve(
        getUSDFCID(),
        getPandoraAddress(network),
        _amount
      );
      setStatus("Successfully approved USDFC spending");

      setStatus("Depositing USDFC to cover storage costs...");
      txHash = await synapse.payments.deposit(_amount);
      setStatus("Successfully deposited USDFC to cover storage costs");

      setStatus("Approving Pandora service USDFC spending rates...");
      txHash = await synapse.payments.approveService(
        getPandoraAddress(network),
        epochRate,
        _amount
      );
      setStatus("Successfully approved Pandora spending rates");
      // 5) Return transaction hash
      return txHash;
    },
    onSuccess: () => {
      setStatus("✅ Payment successful!");
      triggerConfetti();
    },
    onError: (error) => {
      setStatus(
        `❌ ${error.message || "Transaction failed. Please try again."}`
      );
    },
  });
  return { mutation, status };
}
