import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Synapse, CONTRACT_ADDRESSES } from "@filoz/synapse-sdk";
import { useEthersSigner } from "@/hooks/useEthers";
import { useConfetti } from "@/hooks/useConfetti";
import { PandoraService } from "@filoz/synapse-sdk/pandora";
import { useAccount } from "wagmi";
import { useNetwork } from "./useNetwork";
import { getPandoraAddress, getUSDFCID } from "@/utils";
import { usePublicClient } from "wagmi";
import { Hex } from "viem";

export function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [uploadedInfo, setUploadedInfo] = useState<{
    fileName: string;
    fileSize: number;
    commp: string;
    txHash: string;
  } | null>(null);

  const signer = useEthersSigner();
  const { triggerConfetti } = useConfetti();
  const { address, chainId } = useAccount();
  const { data: network } = useNetwork();
  const publicClient = usePublicClient();
  const mutation = useMutation({
    mutationKey: ["file-upload", address, chainId],
    mutationFn: async (file: File) => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");
      if (!chainId) throw new Error("Chain ID not found");
      if (!network) throw new Error("Network not found");
      if (!publicClient) throw new Error("Public client not found");
      setProgress(0);
      setUploadedInfo(null);
      setStatus("Preparing upload...");

      // 1) Convert File → ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      // 2) Convert ArrayBuffer → Uint8Array
      const uint8ArrayBytes = new Uint8Array(arrayBuffer);

      setStatus("Checking upload USDFC allowance...");

      const pandoraService = new PandoraService(
        signer.provider,
        CONTRACT_ADDRESSES.PANDORA_SERVICE[network]
      );

      const synapse = await Synapse.create({
        signer,
        disableNonceManager: false,
      });
      const allowance = await pandoraService.checkAllowanceForStorage(
        5 * 1024 * 1024 * 1024,
        false,
        synapse.payments
      );
      console.log("allowance", allowance);

      // Prepare storage upload
      const preflight = await pandoraService.prepareStorageUpload(
        {
          // 5GB in bytes to prevent asking for allowance on every upload
          dataSize: 5 * 1024 * 1024 * 1024,
          withCDN: false,
        },
        synapse.payments
      );
      console.log("preflight", preflight);

      if (!preflight.allowanceCheck.sufficient) {
        const monthlyLockupAllowance = preflight.estimatedCost.perMonth;
        const proofSetCreationFee = BigInt(0.2 * 10 ** 18);

        const requiredAllowance = monthlyLockupAllowance + proofSetCreationFee;

        const tokenBalance = await synapse.payments.balance();
        const tokenAllowance =
          (await synapse.payments.allowance(
            getUSDFCID(),
            getPandoraAddress(network)
          )) ?? BigInt(0);
        if (tokenBalance < requiredAllowance) {
          let txHash = "";
          if (tokenAllowance < requiredAllowance) {
            setStatus("Approving service to spend USDFC...");
            txHash = await synapse.payments.approve(
              getUSDFCID(),
              getPandoraAddress(network),
              requiredAllowance
            );
            await publicClient.waitForTransactionReceipt({
              hash: txHash as Hex,
              confirmations: 2,
            });
          }

          setStatus("USDFC approved");
          setProgress(5);

          setStatus("Depositing USDFC to cover storage costs...");
          txHash = await synapse.payments.deposit(requiredAllowance);
          await publicClient.waitForTransactionReceipt({
            hash: txHash as Hex,
          });

          setStatus("USDFC deposited");
          setProgress(10);
        }

        setStatus("Approving Pandora service USDFC spending rates...");
        const txHash = await synapse.payments.approveService(
          getPandoraAddress(network),
          preflight.estimatedCost.perEpoch,
          proofSetCreationFee
        );
        await publicClient.waitForTransactionReceipt({
          hash: txHash as Hex,
          confirmations: 2,
        });
        setStatus("Pandora service approved to spend USDFC");
        setProgress(20);
      }

      const storageService = await synapse.createStorage({
        providerId: 1,
        callbacks: {
          onProofSetResolved: (info) => {
            console.log("Proof set resolved:", info);
          },
          onProofSetCreationStarted: (txHash, statusUrl) => {
            console.log("Proof set creation started:", txHash, statusUrl);
            setStatus("Proof set creation started");
            setProgress(35);
          },
          onProofSetCreationProgress: (status) => {
            console.log("Proof set creation progress:", status);
            if (status.transactionSuccess) {
              setStatus(`Proof set transaction confirmed`);
              setProgress(40);
            }
            if (status.serverConfirmed) {
              setStatus(`Proof set created in: ${status.elapsedMs / 1000}s`);
              setProgress(40);
            }
          },
          onProviderSelected: (provider) => {
            console.log("Provider selected:", provider);
          },
        },
      });

      setStatus("Uploading file...");
      setProgress(30);

      const { commp, size } = await storageService.upload(uint8ArrayBytes, {
        onUploadComplete: (commp) => {
          setStatus("Upload completed starting adding roots...");
          setProgress(80);
        },
        onRootAdded: () => {
          setStatus("Root added");
        },
      });

      setProgress(100);
      setStatus("✅ File uploaded successfully (mock)!");
      setUploadedInfo({
        fileName: file.name,
        fileSize: file.size,
        commp: commp,
        txHash: "",
      });
      triggerConfetti();
    },
    onSuccess: () => {
      setStatus("✅ File uploaded successfully!");
    },
    onError: (error) => {
      setStatus(`❌ ${error.message || "Upload failed. Please try again."}`);
    },
  });

  const handleReset = () => {
    setProgress(0);
    setUploadedInfo(null);
    setStatus("");
  };

  return {
    uploadFileMutation: mutation,
    progress,
    uploadedInfo,
    handleReset,
    status,
  };
}
