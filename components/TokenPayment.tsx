// components/TokenPayment.tsx
"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { Synapse } from "@filoz/synapse-sdk";

export function TokenPayment() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Separate state for each balance
  const [filBalance, setFilBalance] = useState<number>(0);
  const [usdfcBalance, setUsdfcBalance] = useState<number>(0);
  const [paymentsBalance, setPaymentsBalance] = useState<number>(0);
  const [status, setStatus] = useState("");
  const [amount, setAmount] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const fetchBalances = async () => {
    if (!address) return;
    try {
      setIsBalanceLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const synapse = await Synapse.create({ provider });

      // Get FIL balance (wallet)
      const filRaw: bigint = await synapse.walletBalance();
      // Get USDFC balance (wallet)
      const usdfcRaw: bigint = await synapse.walletBalance(Synapse.USDFC);
      // Get USDFC contract balance (payments contract)
      const paymentsRaw: bigint = await synapse.balance(Synapse.USDFC);

      // Get decimals for USDFC (should be 18)
      const usdfcDecimals: number = await synapse.decimals(Synapse.USDFC);

      setFilBalance(Number(filRaw) / 1e18);
      setUsdfcBalance(Number(usdfcRaw) / 10 ** usdfcDecimals);
      setPaymentsBalance(Number(paymentsRaw) / 10 ** usdfcDecimals);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setStatus("Error fetching balances. Please try again.");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handlePayment = async () => {
    if (!walletClient || !amount) return;
    if (parseFloat(amount) <= 0) {
      setStatus("❌ Please enter a valid amount");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Preparing transaction...");
      const provider = new ethers.BrowserProvider(window.ethereum);

      const synapse = await Synapse.create({ provider });
      const decimals: number = await synapse.decimals(Synapse.USDFC);

      // Parse amount to base units (bigint)
      const amt = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

      await synapse.deposit(amt);

      setStatus("✅ Payment successful!");
      fetchBalances(); // Refresh balances after deposit
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ ${err.message || "Transaction failed. Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-2">Deposit USDFC to Synapse</h3>
      <div className="flex flex-col gap-1 mb-4 text-sm text-gray-500">
        <div>
          <span className="font-medium">FIL wallet balance:</span>{" "}
          {isBalanceLoading
            ? "Loading..."
            : `${filBalance.toLocaleString()} FIL`}
        </div>
        <div>
          <span className="font-medium">USDFC wallet balance:</span>{" "}
          {isBalanceLoading
            ? "Loading..."
            : `${usdfcBalance.toLocaleString()} USDFC`}
        </div>
        <div>
          <span className="font-medium">USDFC in Synapse contract:</span>{" "}
          {isBalanceLoading
            ? "Loading..."
            : `${paymentsBalance.toLocaleString()} USDFC`}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "" || parseFloat(value) >= 0) {
              setAmount(value);
            }
          }}
          placeholder="Amount"
          className="border rounded px-3 py-2 flex-grow"
          min="0"
          step="0.01"
          disabled={isLoading}
        />
        <button
          onClick={handlePayment}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
          className={`px-6 py-2 rounded-[20px] border-2 border-black transition-all ${
            isLoading || !amount || parseFloat(amount) <= 0
              ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-black text-white hover:bg-white hover:text-black"
          }`}
        >
          {isLoading ? "Processing..." : "Deposit"}
        </button>
      </div>
      {status && (
        <p
          className={`mt-2 text-sm ${
            status.includes("❌")
              ? "text-red-500"
              : status.includes("✅")
                ? "text-green-500"
                : "text-gray-500"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
