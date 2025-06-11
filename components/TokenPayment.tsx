// components/TokenPayment.tsx
"use client";

import { useAccount } from "wagmi";
import { useBalances } from "@/hooks/useBalances";
import { usePayment } from "@/hooks/usePayment";
import { PERSISTENCE_PERIOD_IN_DAYS, NUMBER_OF_GB } from "@/utils";

export function TokenPayment() {
  const { isConnected } = useAccount();

  const {
    data: balances,
    isLoading: isBalanceLoading,
    refetch: refetchBalances,
  } = useBalances();

  const {
    filBalance,
    usdfcBalance,
    paymentsBalance,
    persistenceDaysLeft,
    isSufficient,
    isRateSufficient,
    isLockupSufficient,
    rateNeeded,
    lockupNeeded,
  } = balances || {
    filBalance: 0,
    usdfcBalance: 0,
    paymentsBalance: 0,
    persistenceDaysLeft: 0,
    isSufficient: false,
    rateNeeded: 0,
    lockupNeeded: 0,
  };

  const { mutation: paymentMutation, status } = usePayment();
  const { mutateAsync: handlePayment, isPending: isProcessingPayment } =
    paymentMutation;

  if (!isConnected) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center pb-3">
        <h3 className="text-lg font-medium">Deposit USDFC to Synapse</h3>
        <button
          className="px-6 py-2 text-sm h-8 flex items-center justify-center rounded-[20px] border-2 border-black transition-all bg-black text-white hover:bg-white hover:text-black"
          onClick={() => {
            window.open(
              "https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc",
              "_blank"
            );
          }}
        >
          USDFC Faucet
        </button>
      </div>
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
        <div>
          <span className="font-medium">Days until current rate drained:</span>{" "}
          {isBalanceLoading ? "Loading..." : `${persistenceDaysLeft} days`}
        </div>
        <div>
          <span className="font-medium">Is sufficient:</span>{" "}
          {isBalanceLoading ? "Loading..." : isSufficient ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-medium">Is rate sufficient:</span>{" "}
          {isBalanceLoading ? "Loading..." : isRateSufficient ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-medium">Is lockup sufficient:</span>{" "}
          {isBalanceLoading ? "Loading..." : isLockupSufficient ? "Yes" : "No"}
        </div>
      </div>
      <div
        className={`flex flex-col sm:flex-row gap-2 ${isBalanceLoading ? "hidden" : ""}`}
      >
        {isSufficient && (
          <div>
            You have enough USDFC to cover the storage costs for {NUMBER_OF_GB}
            GB for {PERSISTENCE_PERIOD_IN_DAYS} days.
          </div>
        )}
        {!isSufficient && (
          <div className="flex justify-between items-center gap-2">
            <div className="text-sm w-1/2">
              You do not have enough USDFC to cover the storage costs for{" "}
              {NUMBER_OF_GB}GB for {PERSISTENCE_PERIOD_IN_DAYS} days.
            </div>
            <button
              onClick={async () => {
                await handlePayment({
                  amount: BigInt(lockupNeeded),
                  epochRate: BigInt(rateNeeded),
                });
                await refetchBalances();
              }}
              disabled={isProcessingPayment}
              className={`px-6 py-2 rounded-[20px] border-2 border-black transition-all ${
                isProcessingPayment
                  ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-white hover:text-black"
              }`}
            >
              {isProcessingPayment ? "Processing..." : "Deposit"}
            </button>
          </div>
        )}
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
