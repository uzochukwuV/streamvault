import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Synapse } from "@filoz/synapse-sdk";
import { useEthersSigner } from "@/hooks/useEthers";
import { useConfetti } from "@/hooks/useConfetti";
import { useAccount } from "wagmi";
import { useNetwork } from "@/hooks/useNetwork";
import { preflightCheck } from "@/utils/preflightCheck";
import { getBestProofset } from "@/utils/getBestProofset";

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
  const mutation = useMutation({
    mutationKey: ["file-upload", address, chainId],
    mutationFn: async (file: File) => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");
      if (!chainId) throw new Error("Chain ID not found");
      if (!network) throw new Error("Network not found");
      setProgress(0);
      setUploadedInfo(null);
      setStatus("Preparing upload...");

      // 1) Convert File → ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      // 2) Convert ArrayBuffer → Uint8Array
      const uint8ArrayBytes = new Uint8Array(arrayBuffer);

      const synapse = await Synapse.create({
        provider: signer.provider,
        disableNonceManager: false,
      });

      const { providerId } = await getBestProofset(signer, network, address);

      const withProofset = !!providerId;

      // Check if we have enough USDFC to cover the storage costs and deposit if not
      await preflightCheck(
        file,
        synapse,
        network,
        withProofset,
        setStatus,
        setProgress
      );

      const storageService = await synapse.createStorage({
        providerId,
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

      const { commp } = await storageService.upload(uint8ArrayBytes, {
        onUploadComplete: (commp) => {
          console.log("Upload complete with commp:", commp);
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
