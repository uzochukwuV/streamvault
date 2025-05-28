'use client';
import { FileUploader } from '@/components/FileUploader';
import { ConnectWallet } from '../components/ConnectWallet';
import { TokenPayment } from '../components/TokenPayment';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

type Tab = 'deposit' | 'upload';

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('deposit');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="flex flex-col items-center p-8 mt-16">
      <h1 className="text-4xl font-bold mb-8 text-center">
        dApp powered by synapse-sdk
      </h1>
      <ConnectWallet />
      {!isConnected && (
        <p className="mt-8 text-gray-500">
          Please connect your wallet to upload dApp
        </p>
      )}
      {isConnected && (
        <div className="mt-8 w-full max-w-md">
          <div className="flex mb-6">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 py-2 px-4 text-center border-b-2 transition-colors ${
                activeTab === 'deposit'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Deposit USDFC
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-4 text-center border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Upload File
            </button>
          </div>
          
          {activeTab === 'deposit' && (
            <TokenPayment
              defaultAmount="10" 
              tokenAddress={'0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0'}
            />
          )}
          {activeTab === 'upload' && <FileUploader />}
        </div>
      )}
    </main>
  );
}
