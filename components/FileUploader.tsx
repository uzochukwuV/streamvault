"use client";
import { ethers } from "ethers";
import { useState, useCallback } from "react";
import { useAccount } from "wagmi";

import { Synapse } from "@filoz/synapse-sdk";
import { calculate as calculateCommP } from "@filoz/synapse-sdk/commp";

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isConnected } = useAccount();
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedInfo, setUploadedInfo] = useState<{
    fileName: string;
    fileSize: number;
    commp: string;
    txHash: string;
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setIsLoading(true);
      setProgress(0);
      setStatus("Preparing upload...");

      // 1) Convert File → Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8ArrayBytes = new Uint8Array(arrayBuffer);

      // 2) Initialize ethers provider & signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // (Note: Synapse.create({ provider }) will pick up the signer automatically)

      // 3) Create Synapse instance
      const synapse = await Synapse.create({ provider });
      const balance = await synapse.walletBalance();
      console.log("FIL balance:", balance.toString());

      // 4) Create (mock) StorageService
      //    Because the real StorageService is “pending,” this will return MockStorageService
      const storage = await synapse.createStorage({
        storageProvider: "f01234", // replace with a valid provider ID or leave as mock
      });

      // 5) Kick off upload (→ MockStorageService.upload under the hood)
      setStatus("Uploading to mock storage service...");
      const uploadTask = storage.upload(uint8ArrayBytes);

      // 6) Wait for CommP calculation (mock)
      const commp = await uploadTask.commp();
      console.log("CommP (mock):", commp);

      // 7) (Optional) If you want to display intermediate progress, you could do that here.
      //    But MockStorageService usually just resolves immediately.
      setProgress(50);
      setStatus("Finalizing upload...");

      // 8) Wait for “chain commit” (mock)
      const txHash = await uploadTask.done();
      console.log("Mock txHash:", txHash);

      setProgress(100);
      setStatus("✅ File uploaded successfully (mock)!");
      setUploadedInfo({
        fileName: file.name,
        fileSize: file.size,
        commp: commp.toLocaleString(),
        txHash: txHash,
      });
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ ${err.message || "Upload failed. Please try again."}`);
    } finally {
      setIsLoading(false);
      // Optionally reset progress after a short delay, or leave at 100%
      setTimeout(() => setProgress(0), 1500);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus("");
    setProgress(0);
    setUploadedInfo(null);
  };

  if (!isConnected) {
    return null;
  }

  console.log(uploadedInfo);
  return (
    <div className="w-full max-w-md">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <input
          id="fileInput"
          type="file"
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <svg
            className={`w-10 h-10 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-medium">
            {file ? file.name : "Drop your file here, or click to select"}
          </p>
          {!file && (
            <p className="text-sm text-gray-500">
              Drag and drop your file, or click to browse
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={handleSubmit}
          disabled={!file || isLoading}
          className={`px-6 py-2 rounded-[20px] text-center border-2 border-black transition-all ${
            !file || isLoading
              ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-white hover:text-black"
          }`}
        >
          {isLoading ? "Uploading..." : "Submit"}
        </button>
        <button
          onClick={handleReset}
          disabled={!file || isLoading}
          className={`px-6 py-2 rounded-[20px] text-center border-2 transition-all ${
            !file || isLoading
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-black text-black hover:bg-black hover:text-white"
          }`}
        >
          Reset
        </button>
      </div>
      {status && (
        <div className="mt-4 text-center">
          <p
            className={`text-sm ${
              status.includes("❌")
                ? "text-red-500"
                : status.includes("✅")
                  ? "text-green-500"
                  : "text-gray-500"
            }`}
          >
            {status}
          </p>
          {isLoading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-black h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
      {/* Uploaded file info panel */}
      {uploadedInfo && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
          <h4 className="font-semibold mb-2">File Upload Details</h4>
          <div className="text-sm">
            <div>
              <span className="font-medium">File name:</span>{" "}
              {uploadedInfo.fileName}
            </div>
            <div>
              <span className="font-medium">File size:</span>{" "}
              {uploadedInfo.fileSize.toLocaleString()} bytes
            </div>
            <div className="break-all">
              <span className="font-medium">CommP:</span>{" "}
              {uploadedInfo.commp}
            </div>
            <div className="break-all">
              <span className="font-medium">Tx Hash:</span>{" "}
              {uploadedInfo.txHash}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
