'use client';
import { FileUploader } from '@/components/FileUploader';
import { ConnectWallet } from '../components/ConnectWallet';
import { TokenPayment } from '../components/TokenPayment';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="flex flex-col items-center p-8 mt-16">
      <h1 className="text-4xl font-bold mb-8 text-center">
        dApp using synapse-sdk
      </h1>
      <ConnectWallet />
      {!isConnected && (
        <p className="mt-8 text-gray-500">
          Please connect your wallet to upload files
        </p>
      )}
      {isConnected && (
        <div className="mt-8 w-full max-w-md space-y-8">
          <TokenPayment
            defaultAmount="10" tokenAddress={'0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0'}          />
          <FileUploader />
        </div>
      )}
    </main>
  );
}
