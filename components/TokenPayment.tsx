// components/TokenPayment.jsx
'use client';

import { useState } from 'react';
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

  const handlePayment = async () => {
    if (!walletClient || !amount) return;

    try {
      setStatus('Preparing transaction...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      //TODO: use synapse-sdk to deposite USDFC to synapse

      setStatus('✅ Payment successful!');
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
      <h3 className="text-lg font-medium mb-4">Deposite USDFC to Synapse</h3>
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
