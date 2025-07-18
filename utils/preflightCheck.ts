import { getPandoraServiceAddress } from "@/utils";
import { Synapse } from "@filoz/synapse-sdk";
import { PandoraService, CONTRACT_ADDRESSES } from "@filoz/synapse-sdk";
import { config } from "@/config";
import { ethers } from "ethers";
import { checkAllowances } from "./pandoraUtils";

/**
 * Performs a preflight check before file upload to ensure sufficient USDFC balance and allowances
 * for storage costs. This function:
 * 1. Verifies signer and provider availability
 * 2. Checks if there's enough USDFC allowance for the file size
 * 3. If insufficient, handles the deposit and approval process
 *
 * @param file - The file to be uploaded
 * @param synapse - Synapse SDK instance
 * @param network - Network to use (mainnet or calibration)
 * @param includeProofsetCreationFee - Whether to include proofset creation fee
 * @param updateStatus - Callback to update status messages
 * @param updateProgress - Callback to update progress percentage
 */
export const preflightCheck = async (
  file: File,
  synapse: Synapse,
  network: "mainnet" | "calibration",
  includeProofsetCreationFee: boolean,
  updateStatus: (status: string) => void,
  updateProgress: (progress: number) => void
) => {
  // Verify signer and provider are available
  const signer = synapse.getSigner();
  if (!signer) throw new Error("Signer not found");
  if (!signer.provider) throw new Error("Provider not found");

  // Initialize Pandora service for allowance checks
  const pandoraService = new PandoraService(
    signer.provider,
    CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
  );

  // Step 1: Check if current allowance is sufficient for the file size
  const pandoraBalance = await pandoraService.checkAllowanceForStorage(
    file.size,
    config.withCDN,
    synapse.payments,
    config.persistencePeriod
  );

  // Step 2: Check if allowances and balances are sufficient for storage and proofset creation
  const {
    isSufficient,
    rateAllowanceNeeded,
    lockupAllowanceNeeded,
    depositAmountNeeded,
  } = await checkAllowances(
    pandoraBalance,
    config.minDaysThreshold,
    includeProofsetCreationFee
  );

  // If allowance is insufficient, handle deposit and approval process
  if (!isSufficient) {
    updateStatus("💰 Insufficient USDFC allowance...");

    // Step 3: Deposit USDFC to cover storage costs
    updateStatus("💰 Depositing USDFC to cover storage costs...");
    const depositTx = await synapse.payments.deposit(
      depositAmountNeeded,
      "USDFC",
      {
        onDepositStarting: () => updateStatus("💰 Depositing USDFC..."),
        onAllowanceCheck: (current: bigint, required: bigint) =>
          updateStatus(
            `💰 Allowance check ${
              current > required ? "sufficient" : "insufficient"
            }`
          ),
        onApprovalTransaction: async (tx: ethers.TransactionResponse) => {
          updateStatus(`💰 Approving USDFC... ${tx.hash}`);
          const receipt = await tx.wait();
          updateStatus(`💰 USDFC approved ${receipt?.hash}`);
        },
      }
    );
    await depositTx.wait();
    updateStatus("💰 USDFC deposited successfully");
    updateProgress(10);

    // Step 4: Approve Pandora service to spend USDFC at specified rates
    updateStatus("💰 Approving Pandora service USDFC spending rates...");
    const approvalTx = await synapse.payments.approveService(
      getPandoraServiceAddress(network),
      rateAllowanceNeeded,
      lockupAllowanceNeeded
    );
    await approvalTx.wait();
    updateStatus("💰 Pandora service approved to spend USDFC");
    updateProgress(20);
  }
};
