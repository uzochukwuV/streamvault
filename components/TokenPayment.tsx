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

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        // TODO: Replace with actual synapse balance check
        // This is a placeholder - implement actual balance check using synapse-sdk
        setBalance('0.00');
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    fetchBalance();
  }, [address]);

  const handlePayment = async () => {
    if (!walletClient || !amount) return;

    try {
      setStatus('Preparing transaction...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      //TODO: use synapse-sdk to deposite USDFC to synapse

      setStatus('✅ Payment successful!');
      // Refresh balance after successful deposit
      const fetchBalance = async () => {
        // TODO: Implement actual balance check
        setBalance('0.00');
      };
      fetchBalance();
    } catch (err) {
      console.error(err);
      setStatus('❌ Transaction failed.');
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-2">Deposite USDFC to Synapse</h3>
      <p className="text-sm text-gray-500 mb-4">
        Your Synapse Balance: {balance} USDFC
      </p>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="border rounded px-3 py-2 mr-2"
      />
      <button 
        onClick={handlePayment}
        className="px-4 py-2 bg-black text-white rounded-[20px] hover:bg-white hover:text-black border-2 border-black transition-all"
      >
        Deposite
      </button>
      <p className="mt-2">{status}</p>
    </div>
  );
}
