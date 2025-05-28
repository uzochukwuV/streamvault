# Filecoin Synapse dApp Tutorial

This repo will serve with tutorial to demonstrate how to build a decentralized application (dApp) that interacts with Filecoin Synapse - a smart-contract based marketplace for storage and other services in the Filecoin ecosystem.

## Overview

This dApp showcases:
- Connecting to Filecoin networks (Mainnet/Calibration)
- Installing synapse-sdk to your project.
- Depositing funds to Synapse contracts using USDFC token.
- Uploading files to Filecoin through Synapse

## Prerequisites

- Node.js 18+ and npm
- A web3 wallet (like MetaMask)
- Basic understanding of React and TypeScript
- Some USDFC tokens on Filecoin Calibration testnet

## Getting Started

1. Clone this repository:
```bash
git clone https://github.com/yourusername/fs-upload-app
cd fs-upload-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dApp.

## Key Components

### Wallet Connection
The dApp uses RainbowKit for seamless wallet connection, configured specifically for Filecoin networks:
- Filecoin Mainnet
- Filecoin Calibration (testnet)

### USDFC Token Payments
Demonstrates how to:
- Depositing funds to Synapse contracts using USDFC token

### File Upload
Shows how to:
- Create a user-friendly file upload interface
- Upload file to Filecoin using synapse-sdk
- Monitor upload status
- Download filecoin from Filecoin using synapse-sdk

## Learn More

- [Filecoin synapse-sdk](https://github.com/FilOzone/synapse-sdk)
- [USDFC Token Documentation](https://docs.secured.finance/usdfc-stablecoin/getting-started)
- [Wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://www.rainbowkit.com)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
