# Building a File Upload dApp using Filecoin Synapse

[synapse-sdk](https://github.com/FilOzone/synapse-sdk) is a JS/TS SDK for interacting with **Filecoin Synapse** - a smart-contract based marketplace for a collection of services derived from the Filecoin ecosystem, such as Filecoin onchain payment service, hot storage service using PDP, retrieval service, etc.

This tutorial will guide you through building a decentralized application that allows users to upload files to Filecoin using USDFC (USD Filecoin) as payment through the Filecoin Synapse.

**What You'll Learn**

By following this tutorial, you'll learn how to:

- Set up a modern React dApp with Next.js and TypeScript
- Integrate Web3 wallet connection using RainbowKit and Wagmi
- Integrate Synapse SDK into your dApp to access Filecoin Synapse services:
  - Manage USDFC token deposits and balances
  - Upload files to Filecoin storage using PDP under the hood
- Add light/dark mode with a reusable `ThemeProvider`
- Display fun confetti animations after successful actions

## Prerequisites

- [Node.js](https://nodejs.org/en) 18+ and [npm](https://www.npmjs.com/)
- A Web3 wallet (like MetaMask) with some test USDFC & tFIL tokens
- Basic knowledge of React and TypeScript
- Basic understanding of blockchain concepts

### Getting Testnet tUSDFC

To interact with Synapse and upload files, you'll need testnet USDFC (tUSDFC) tokens on the Filecoin Calibration testnet. There are two ways to mint tUSDFC:

#### Option 1: Mint a Minimum of \$200 tUSDFC

* Use the [Secured Finance testnet dApp](https://stg.usdfc.net/) to mint tUSDFC by creating a trove.
* **Note:** The minting contract currently requires a minimum of \$200 tUSDFC per transaction.
* For more details, see the [Secured Finance documentation](https://docs.secured.finance/usdfc-stablecoin/getting-started).
* Make sure your wallet is connected to the Filecoin Calibration testnet.


#### Option 2: Use the \$1-at-a-time Testnet Faucet

- [https://forest-explorer.rumcajs.dev/faucet/calibnet_usdfc](https://forest-explorer.rumcajs.dev/faucet/calibnet_usdfc) (by ChainSafe Systems)
- This faucet allows you to mint **\$1 tUSDFC per request**, which is handy for development or testing with smaller amounts.
- Enter your Calibration testnet address and click **Mint**. You may be able to repeat the process for additional tUSDFC if needed.

---

**Tip:**
You'll also need some Calibration tFIL (test FIL) for gas. You can get tFIL from [the Filecoin Calibration Faucet](https://faucet.calibration.fildev.network/).

---

## Project Setup

We've created a [starter project](https://github.com/FIL-Builders/fs-upload-dapp/tree/starter) for you to focus on learning how to use `synapse-sdk`. However, if you want to start from scratch:

1. Create a new Next.js project with the app router:

   ```bash
   npx create-next-app@latest fs-upload-app --typescript
   cd fs-upload-app
   ```

2. Install required dependencies:

   ```bash
   npm install wagmi viem @rainbow-me/rainbowkit \
     @tanstack/react-query framer-motion react-confetti ethers
   ```

   Most importantly, install `synapse-sdk` from npm:

   ```bash
   npm install @filoz/synapse-sdk
   ```

## Implementing the dApp

### 1. Configure Web3 Providers

Let's configure Web3 providers in `app/layout.tsx` (full code is [here](https://github.com/FIL-Builders/fs-upload-dapp/blob/starter/app/layout.tsx)) using Wagmi and RainbowKit, so we can:

- Ensure the web3 Provider context is available throughout the entire app
- The providers only mount once and persist across page navigations
- Config networks (Filecoin mainnet and calibration) are available across components

```typescript
"use client";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { filecoin, filecoinCalibration } from "wagmi/chains";
import { http, createConfig } from "@wagmi/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { Navbar } from "@/components/ui/Navbar";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ConfettiProvider } from "@/providers/ConfettiProvider";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [filecoinCalibration, filecoin],
  connectors: [],
  transports: {
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ConfettiProvider>
            <QueryClientProvider client={queryClient}>
              <WagmiProvider config={config}>
                <RainbowKitProvider
                  modalSize="compact"
                  initialChain={filecoinCalibration.id}
                >
                  <Navbar />
                  {children}
                </RainbowKitProvider>
              </WagmiProvider>
            </QueryClientProvider>
          </ConfettiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Create Wallet Connection Component

RainbowKit provides a pre-built `ConnectButton` component that handles all these features with a polished UI, saving us development time and ensuring a consistent user experience.

Let's create a Wallet Connection Component using `rainbowkit` so the dApp will allow users to:

- Connect their Web3 wallet (MetaMask, etc.) to the application
- Switch between different Filecoin networks (mainnet/calibration)
- View their connected account address and balance
- Sign any transactions interacting with the Synapse service

Create `components/ConnectWallet.tsx`:

```typescript
'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectWallet() {
  return (
    <div className="flex justify-center">
      <ConnectButton />
    </div>
  );
}
```

### 3. Implement USDFC Payment Component

Before users can upload files through Filecoin Synapse, they need to deposit [USDFC](https://docs.secured.finance/usdfc-stablecoin/getting-started/getting-test-usdfc-on-testnet) (USD Filecoin) tokens into the Synapse payment contract. Here's why:

- USDFC is the stablecoin used for payments in Filecoin Synapse
- Users deposit USDFC to the Synapse payment contract, which:
  - Acts as an escrow for Synapse storage services
  - Automatically handles payments to storage providers
  - Ensures fair service delivery through PDP (Proof of Data Possession)

Let's create a component that allows users to:

- Check their USDFC balance in Synapse
- Deposit USDFC tokens to the Synapse contract

Create `components/TokenPayment.tsx`, you can copy the full code from [here](https://github.com/FIL-Builders/fs-upload-dapp/blob/starter/components/TokenPayment.tsx).

The code already has the basic structure ready, We will need to:

1. Import synapse from synapse-sdk
   ```TypeScript
   import { Synapse } from '@filecoin-project/synapse-sdk';
   ```
2. Implement the USDFC balance
   ```TypeScript
   const synapse = new Synapse(provider);
   const balance = await synapse.getBalance(address);
   ```
3. Deposit USDFC to the synapse payment contract
   ```TypeScript
   const synapse = new Synapse(signer);
   await synapse.deposit(amount);
   ```

### 4. Create File Upload Component

Now that we have wallet connection and USDFC payment set up, we can implement the core functionality - uploading files to Filecoin through Synapse. The Synapse SDK provides a simple interface to:

- Interact with PDP contracts to create a proofset for PDP (Proof of Data Possession) storage
- Upload files to Filecoin storage with PDP proofset and SP
- Pay for storage using the previously deposited USDFC

Let's create a component that will:

- Allow users to select or drag-and-drop files
- Upload files to Filecoin through Synapse
- Show upload progress and status
- Handle any errors during the process

Create `components/FileUploader.tsx`, you can copy the full code from [here](https://github.com/FIL-Builders/fs-upload-dapp/blob/starter/components/FileUploader.tsx).

The code already has the basic structure ready, we will need to:

1. Import and initialize Synapse SDK
   ```TypeScript
   import { Synapse } from '@filecoin-project/synapse-sdk';
   ```
2. Upload file using Synapse SDK
   This step involves initializing Synapse with web3 wallet as signer, creating Storage to associate with PDP proofset

   ```TypeScript
   //1. initializing Synapse and upload file
   const synapse = new Synapse(signer);
   const fsStorage = await synapse.createStorage();
   const uploadTask = fsStorage.upload(file);

   // Track upload progress
   const commp = await uploadTask.commp();
   setStatus(`Generated CommP: ${commp}`);
   setProgress(1);

   const sp = await uploadTask.store();
   setStatus(`Stored data with provider: ${sp}`);
   setProgress(2);

   const txHash = await uploadTask.done()
   setStatus('✅ File uploaded successfully to Filecoin in tx ' + txHash);
   setProgress(3);
   ```

The Synapse SDK will handle the complex parts under the hood:

- Request existing proofset or create a new proofset with PDP contracts
- Creating a storage request with PDP storage providers
- Managing payment from your USDFC balance
- Verifying successful storage through PDP

### 5. Create a Proof Set Viewer

The latest version of the dApp includes a tab for viewing your PDP proof sets.
We'll create a component that lists proof sets returned from the Pandora
service:

```typescript
"use client";
import { useAccount } from "wagmi";
import { useProofsets } from "@/hooks/useProofsets";

export function ViewProofSets() {
  const { isConnected } = useAccount();
  const { data, isLoading } = useProofsets();

  if (!isConnected) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg">
      {isLoading ? (
        <p>Loading...</p>
      ) : data && data.proofsets?.length ? (
        data.proofsets.map((p) => (
          <pre key={p.railId} className="text-sm overflow-auto">
            {JSON.stringify(p, null, 2)}
          </pre>
        ))
      ) : (
        <p>No proof sets found</p>
      )}
    </div>
  );
}
```

### 6. Put It All Together

Now we'll combine all our components into a cohesive dApp. The flow of our application will be:

1. User connects their wallet (using `ConnectWallet`)
2. User deposits USDFC to Synapse (using `TokenPayment`)
3. User uploads files to Filecoin (using `FileUploader`)
4. User can inspect existing proof sets (using `ViewProofSets`)

Let's update `app/page.tsx` to orchestrate these components, you can copy the full code from [here](https://github.com/FIL-Builders/fs-upload-dapp/blob/starter/app/page.tsx):

1. Import our components
   ```TypeScript
   import { ConnectWallet } from "../components/ConnectWallet";
   import { TokenPayment } from "../components/TokenPayment";
   import { FileUploader } from "../components/FileUploader";
   import { ViewProofSets } from "../components/ViewProofSets";
   import { motion, AnimatePresence } from "framer-motion";
   ```
2. Create the main page layout with animated tabs and confetti
   ```TypeScript
   export default function Home() {
     const { isConnected } = useAccount();
     const [activeTab, setActiveTab] = useState<"deposit" | "upload" | "proof-set">("deposit");
     const { showConfetti } = useConfetti();

     return (
       <>
         {showConfetti && <Confetti recycle={false} numberOfPieces={200} gravity={0.2} />}
         <motion.main className="flex flex-col items-center p-8 mt-16" initial="hidden" animate="visible">
           <motion.h1 className="text-4xl font-bold mb-8 text-center" variants={itemVariants}>
             Demo dApp Powered by synapse-sdk
           </motion.h1>
           <AnimatePresence mode="wait">
             {!isConnected ? (
               <ConnectWallet />
             ) : (
               <motion.div className="mt-8 w-full max-w-md" variants={itemVariants}>
                 <div className="flex mb-6">
                   <button onClick={() => setActiveTab("deposit")}>Deposit USDFC</button>
                   <button onClick={() => setActiveTab("upload")}>Upload File</button>
                   <button onClick={() => setActiveTab("proof-set")}>Proof Set</button>
                 </div>
                 <AnimatePresence mode="wait">
                   {activeTab === "deposit" ? (
                     <TokenPayment />
                   ) : activeTab === "upload" ? (
                     <FileUploader />
                   ) : (
                     <ViewProofSets />
                   )}
                 </AnimatePresence>
               </motion.div>
             )}
           </AnimatePresence>
         </motion.main>
       </>
     );
   }
   ```

Now we have implemented all the components, and you can also check the [finish branch](https://github.com/FIL-Builders/fs-upload-dapp/tree/finish) with all features implemented. Let's start the dApp by running `npm run dev` and open [http://localhost:3000](http://localhost:3000) to view the dApp.

<img width="500" alt="image" src="https://github.com/user-attachments/assets/626d0f37-9861-45e8-ac03-de3ac1752224" />

## How It Works

1. **Wallet Connection**:

   - Users connect their wallet using RainbowKit
   - The app checks for Filecoin network compatibility

2. **USDFC Deposits**:

   - Users can view their Synapse balance
   - Deposit USDFC to their Synapse account
   - Funds are used for storage payments

3. **File Upload**:
   - Users select a file to upload
   - The file is uploaded to Filecoin through Synapse
   - Storage is paid for with deposited USDFC
4. **Proof Sets**:
   - Users can view proof sets created for their uploads
   - Details come directly from the Pandora service

The app also supports a light/dark theme toggle and shows confetti animations on
successful payments and uploads.

## Next Steps

- Add file metadata handling
- Monitor storage deal status
- Add error handling and retries
- Add file retrieval functionality with CDN option

## Resources

- [Synapse SDK](https://github.com/FilOzone/synapse-sdk)
- [USDFC Token Contract](https://docs.filecoin.io/smart-contracts/filecoin-evm/reference/erc20-reference/)
- [Filecoin Network Documentation](https://docs.filecoin.io)
- [RainbowKit Documentation](https://www.rainbowkit.com)
