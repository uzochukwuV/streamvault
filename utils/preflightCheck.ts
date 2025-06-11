import { getPandoraAddress } from "@/utils";
import { Synapse } from "@filoz/synapse-sdk";
import { PandoraService, CONTRACT_ADDRESSES } from "@filoz/synapse-sdk";

export const preflightCheck = async (
  file: File,
  synapse: Synapse,
  network: "mainnet" | "calibration",
  withProofset: boolean,
  setStatus: (status: string) => void,
  setProgress: (progress: number) => void
) => {
  const signer = synapse.getSigner();
  if (!signer) throw new Error("Signer not found");
  if (!signer.provider) throw new Error("Provider not found");

  setStatus("Checking upload USDFC allowance...");

  const pandoraService = new PandoraService(
    signer.provider,
    CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
  );
  const preflight = await pandoraService.checkAllowanceForStorage(
    file.size,
    false,
    synapse.payments
  );

  if (!preflight.sufficient) {
    const tenDaysLockupAllowance =
      preflight.lockupAllowanceNeeded - preflight.currentLockupUsed;

    const oneMonthLockupAllowance = tenDaysLockupAllowance * 30n;

    const proofSetCreationFee = withProofset
      ? BigInt(0.2 * 10 ** 18)
      : BigInt(0);

    const allowanceNeeded =
      oneMonthLockupAllowance +
      proofSetCreationFee +
      preflight.currentLockupUsed;

    setStatus("Approving & depositing USDFC to cover storage costs...");
    await synapse.payments.deposit(allowanceNeeded);

    setStatus("USDFC deposited");
    setProgress(10);

    setStatus("Approving Pandora service USDFC spending rates...");
    await synapse.payments.approveService(
      getPandoraAddress(network),
      preflight.rateAllowanceNeeded,
      allowanceNeeded
    );
    setStatus("Pandora service approved to spend USDFC");
    setProgress(20);
  }
};
