// components/TokenPayment.jsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';

interface TokenPaymentProps {
  tokenAddress: string;
  defaultAmount?: string;
}

export function TokenPayment({defaultAmount = "10" }: TokenPaymentProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState('');
  const [amount, setAmount] = useState(defaultAmount);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  const fetchBalance = async () => {
    if (!address) return;
    try {
      setIsBalanceLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);

      // TODO: implement actual balance check using synapse-sdk

      setBalance("1.2");
    } catch (error) {
      console.error('Error fetching balance:', error);
      setStatus('Error fetching balance. Please try again.');
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address]);

  const handlePayment = async () => {
    if (!walletClient || !amount) return;
    if (parseFloat(amount) <= 0) {
      setStatus('❌ Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Preparing transaction...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      //TODO: deposite USDFC to synapse using synapse-sdk

      setStatus('✅ Payment successful!');
      fetchBalance(); // Refresh balance after successful deposit
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ ${err.message || 'Transaction failed. Please try again.'}`);
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
      <div className="flex items-center mb-4">
        <p className="text-sm text-gray-500">
          Your Synapse Balance: {isBalanceLoading ? 'Loading...' : `${balance} USDFC`}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || parseFloat(value) >= 0) {
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
              ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-white hover:text-black'
          }`}
        >
          {isLoading ? 'Processing...' : 'Deposit'}
        </button>
      </div>
      {status && (
        <p className={`mt-2 text-sm ${
          status.includes('❌') ? 'text-red-500' : 
          status.includes('✅') ? 'text-green-500' : 
          'text-gray-500'
        }`}>
          {status}
        </p>
      )}
    </div>
  );
}