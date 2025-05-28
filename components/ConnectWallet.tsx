'use client';

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export const ConnectWallet = () => {
  return (
    <div className="flex justify-center">
      <ConnectButton />
    </div>
  );
}; 