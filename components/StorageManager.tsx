// components/TokenPayment.tsx
"use client";

import { useAccount } from "wagmi";
import { useBalances } from "@/hooks/useBalances";
import { usePayment } from "@/hooks/usePayment";
import { config } from "@/config";
import { formatUnits } from "viem";
import { UseBalancesResponse } from "@/types";

interface RateIncreaseActionProps {
  currentLockupAllowance?: bigint;
  rateNeeded?: bigint;
  isProcessingPayment: boolean;
  onPayment: (params: {
    lockupAllowance: bigint;
    epochRateAllowance: bigint;
    depositAmount: bigint;
  }) => Promise<void>;
  onRefetch: () => Promise<void>;
}

interface StatusMessageProps {
  status?: string;
}

interface SectionProps {
  balances?: UseBalancesResponse;
  isLoading: boolean;
}

interface ActionSectionProps extends SectionProps {
  isProcessingPayment: boolean;
  onPayment: (params: {
    lockupAllowance: bigint;
    epochRateAllowance: bigint;
    depositAmount: bigint;
  }) => Promise<void>;
  onRefetch: () => Promise<void>;
}

/**
 * Component to display and manage token payments for storage
 */
export const StorageManager = () => {
  const { isConnected } = useAccount();
  const {
    data: balances,
    isLoading: isBalanceLoading,
    refetch: refetchBalances,
  } = useBalances();
  const { mutation: paymentMutation, status } = usePayment();
  const { mutateAsync: handlePayment, isPending: isProcessingPayment } =
    paymentMutation;

  const handleRefetch = async () => {
    await refetchBalances();
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <StorageBalanceHeader />
      <div className="mt-4 space-y-4">
        <WalletBalancesSection
          balances={balances}
          isLoading={isBalanceLoading}
        />
        <StorageStatusSection
          balances={balances}
          isLoading={isBalanceLoading}
        />
        <AllowanceStatusSection
          balances={balances}
          isLoading={isBalanceLoading}
        />
        <ActionSection
          balances={balances}
          isLoading={isBalanceLoading}
          isProcessingPayment={isProcessingPayment}
          onPayment={handlePayment}
          onRefetch={handleRefetch}
        />
        <StatusMessage status={status} />
      </div>
    </div>
  );
};

/**
 * Section displaying allowance status
 */
const AllowanceStatusSection = ({ balances, isLoading }: SectionProps) => {
  const additionalLockupNeededFormatted = Number(
    formatUnits(balances?.additionalLockupNeeded ?? 0n, 18)
  ).toFixed(3);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Allowance Status
      </h4>
      <div className="space-y-3">
        <AllowanceItem
          label="Rate Allowance"
          isSufficient={balances?.isRateSufficient}
          isLoading={isLoading}
        />
        {!isLoading && !balances?.isRateSufficient && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800">
              ⚠️ Max configured storage is {config.storageCapacity} GB. Your
              current covered storage is{" "}
              {balances?.currentRateAllowanceGB?.toLocaleString()} GB.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              You are currently using{" "}
              {balances?.currentStorageGB?.toLocaleString()} GB.
            </p>
          </div>
        )}
        <AllowanceItem
          label="Lockup Allowance"
          isSufficient={balances?.isLockupSufficient}
          isLoading={isLoading}
        />
        {!isLoading && !balances?.isLockupSufficient && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800">
              ⚠️ Max configured lockup is {config.persistencePeriod} days. Your
              current covered lockup is{" "}
              {balances?.persistenceDaysLeft.toFixed(1)} days. Which is less
              than the notice period of {config.minDaysThreshold} days.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              You are currently using{" "}
              {balances?.currentStorageGB?.toLocaleString()} GB. Please deposit{" "}
              {additionalLockupNeededFormatted} USDFC to extend your lockup for{" "}
              {(
                config.persistencePeriod - (balances?.persistenceDaysLeft ?? 0)
              ).toFixed(1)}{" "}
              more days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Section for payment actions
 */
const ActionSection = ({
  balances,
  isLoading,
  isProcessingPayment,
  onPayment,
  onRefetch,
}: ActionSectionProps) => {
  if (isLoading || !balances) return null;

  if (balances.isSufficient) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-800">
          ✅ Your storage balance is sufficient for {config.storageCapacity}GB
          of storage for {balances.persistenceDaysLeft.toFixed(1)} days.
        </p>
      </div>
    );
  }

  const additionalLockupNeededFormatted = Number(
    formatUnits(balances?.additionalLockupNeeded ?? 0n, 18)
  ).toFixed(3);

  return (
    <div className="space-y-4">
      {balances.isRateSufficient && !balances.isLockupSufficient && (
        <LockupIncreaseAction
          additionalLockupNeededFormatted={additionalLockupNeededFormatted}
          totalLockupNeeded={balances.totalLockupNeeded}
          additionalLockNeeded={balances.additionalLockupNeeded}
          rateNeeded={balances.rateNeeded}
          isProcessingPayment={isProcessingPayment}
          onPayment={onPayment}
          onRefetch={onRefetch}
        />
      )}
      {!balances.isRateSufficient && balances.isLockupSufficient && (
        <RateIncreaseAction
          currentLockupAllowance={balances.currentLockupAllowance}
          rateNeeded={balances.rateNeeded}
          isProcessingPayment={isProcessingPayment}
          onPayment={onPayment}
          onRefetch={onRefetch}
        />
      )}
      {!balances.isRateSufficient && !balances.isLockupSufficient && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex flex-col gap-2">
          <p className="text-red-800">
            ⚠️ Your storage balance is insufficient. You need to deposit{" "}
            {additionalLockupNeededFormatted} USDFC & Increase your rate
            allowance to meet your storage needs.
          </p>
          <button
            onClick={async () => {
              await onPayment({
                lockupAllowance: balances.totalLockupNeeded,
                epochRateAllowance: balances.rateNeeded,
                depositAmount: balances.additionalLockupNeeded,
              });
              await onRefetch();
            }}
            disabled={isProcessingPayment}
            className={`w-full px-6 py-3 rounded-lg border-2 border-black transition-all ${
              isProcessingPayment
                ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:bg-white hover:text-black"
            }`}
          >
            {isProcessingPayment
              ? "Processing transactions..."
              : "Deposit & Increase Allowances"}
          </button>
        </div>
      )}
    </div>
  );
};

interface LockupIncreaseActionProps {
  additionalLockupNeededFormatted?: string;
  totalLockupNeeded?: bigint;
  additionalLockNeeded?: bigint;
  rateNeeded?: bigint;
  isProcessingPayment: boolean;
  onPayment: (params: {
    lockupAllowance: bigint;
    epochRateAllowance: bigint;
    depositAmount: bigint;
  }) => Promise<void>;
  onRefetch: () => Promise<void>;
}
/**
 * Component for handling lockup deposit action
 */
const LockupIncreaseAction = ({
  additionalLockupNeededFormatted,
  totalLockupNeeded,
  additionalLockNeeded,
  rateNeeded,
  isProcessingPayment,
  onPayment,
  onRefetch,
}: LockupIncreaseActionProps) => {
  if (!totalLockupNeeded || !additionalLockNeeded || !rateNeeded) return null;

  return (
    <>
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800">
          ⚠️ Additional USDFC needed to meet your storage needs.
        </p>
        <p className="text-sm text-yellow-700 mt-2">
          Deposit {additionalLockupNeededFormatted} USDFC to extend storage.
        </p>
      </div>
      <button
        onClick={async () => {
          await onPayment({
            lockupAllowance: totalLockupNeeded,
            epochRateAllowance: rateNeeded,
            depositAmount: additionalLockNeeded,
          });
          await onRefetch();
        }}
        disabled={isProcessingPayment}
        className={`w-full px-6 py-3 rounded-lg border-2 border-black transition-all ${
          isProcessingPayment
            ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-black text-white hover:bg-white hover:text-black"
        }`}
      >
        {isProcessingPayment
          ? "Processing transactions..."
          : "Deposit & Increase Lockup"}
      </button>
    </>
  );
};

/**
 * Component for handling rate deposit action
 */
const RateIncreaseAction = ({
  currentLockupAllowance,
  rateNeeded,
  isProcessingPayment,
  onPayment,
  onRefetch,
}: RateIncreaseActionProps) => {
  if (!currentLockupAllowance || !rateNeeded) return null;

  return (
    <>
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800">
          ⚠️ Increase your rate allowance to meet your storage needs.
        </p>
      </div>
      <button
        onClick={async () => {
          await onPayment({
            lockupAllowance: currentLockupAllowance,
            epochRateAllowance: rateNeeded,
            depositAmount: 0n,
          });
          await onRefetch();
        }}
        disabled={isProcessingPayment}
        className={`w-full px-6 py-3 rounded-lg border-2 border-black transition-all ${
          isProcessingPayment
            ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-black text-white hover:bg-white hover:text-black"
        }`}
      >
        {isProcessingPayment ? "Increasing Rate..." : "Increase Rate"}
      </button>
    </>
  );
};

/**
 * Header section with title and USDFC faucet button
 */
const StorageBalanceHeader = () => (
  <div className="flex justify-between items-center pb-4 border-b">
    <div>
      <h3 className="text-xl font-semibold text-gray-900">Storage Balance</h3>
      <p className="text-sm text-gray-500 mt-1">
        Manage your USDFC deposits for Filecoin storage
      </p>
    </div>
    <button
      className="px-4 py-2 text-sm h-9 flex items-center justify-center rounded-lg border-2 border-black transition-all bg-black text-white hover:bg-white hover:text-black"
      onClick={() => {
        window.open(
          "https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc",
          "_blank"
        );
      }}
    >
      Get USDFC
    </button>
  </div>
);

/**
 * Section displaying wallet balances
 */
const WalletBalancesSection = ({ balances, isLoading }: SectionProps) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h4 className="text-sm font-medium text-gray-900 mb-3">Wallet Balances</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">FIL Balance</span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : `${balances?.filBalanceFormatted?.toLocaleString()} FIL`}
        </span>
      </div>
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">USDFC Balance</span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : `${balances?.usdfcBalanceFormatted?.toLocaleString()} USDFC`}
        </span>
      </div>
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">Pandora Balance</span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : `${balances?.pandoraBalanceFormatted?.toLocaleString()} USDFC`}
        </span>
      </div>
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">Rate Allowance</span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : `${balances?.currentRateAllowanceGB?.toLocaleString()} GB`}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Section displaying storage status
 */
const StorageStatusSection = ({ balances, isLoading }: SectionProps) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h4 className="text-sm font-medium text-gray-900 mb-3">Storage Status</h4>
    <div className="space-y-3">
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">Storage Usage</span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : ` ${balances?.currentStorageGB?.toLocaleString()} GB / ${balances?.currentRateAllowanceGB?.toLocaleString()} GB.`}
        </span>
      </div>
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">
          Persistence days left at max usage (max rate:{" "}
          {balances?.currentRateAllowanceGB?.toLocaleString()} GB)
        </span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : `${balances?.persistenceDaysLeft.toFixed(1)} days`}
        </span>
      </div>
      <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
        <span className="text-sm text-gray-600">
          Persistence days left at current usage (current rate:{" "}
          {balances?.currentStorageGB?.toLocaleString()} GB)
        </span>
        <span className="font-medium text-gray-600">
          {isLoading
            ? "..."
            : `${balances?.persistenceDaysLeftAtCurrentRate.toFixed(1)} days`}
        </span>
      </div>
    </div>
  </div>
);

interface AllowanceItemProps {
  label: string;
  isSufficient?: boolean;
  isLoading: boolean;
}
/**
 * Component for displaying an allowance status
 */
const AllowanceItem = ({
  label,
  isSufficient,
  isLoading,
}: AllowanceItemProps) => (
  <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
    <span className="text-sm text-gray-600">{label}</span>
    <span
      className={`font-medium ${isSufficient ? "text-green-600" : "text-red-600"}`}
    >
      {isLoading ? "..." : isSufficient ? "Sufficient" : "Insufficient"}
    </span>
  </div>
);

/**
 * Component for displaying status messages
 */
const StatusMessage = ({ status }: StatusMessageProps) => {
  if (!status) return null;

  return (
    <div
      className={`mt-4 p-3 rounded-lg ${
        status.includes("❌")
          ? "bg-red-50 border border-red-200 text-red-800"
          : status.includes("✅")
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-blue-50 border border-blue-200 text-blue-800"
      }`}
    >
      {status}
    </div>
  );
};
