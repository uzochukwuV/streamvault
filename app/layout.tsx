// app/layout.jsx
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
import Footer from "@/components/ui/Footer";
import { GeolocationProvider } from "@/providers/GeolocationProvider";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [filecoinCalibration, filecoin],
  connectors: [],
  transports: {
    [filecoin.id]: http(),
    [filecoinCalibration.id]: http(),
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>StreamVault - Web3 Music Platform</title>
        <meta
          name="description"
          content="StreamVault - The Web3 music platform where creators own their content and fans invest in their success. Powered by Filecoin."
        />
        <meta
          name="keywords"
          content="StreamVault, Web3, Music, Filecoin, Creator Economy, NFT, Music Streaming, Decentralized"
        />
        <meta name="author" content="StreamVault Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <GeolocationProvider
          onBlocked={(info: any) => {
            console.log("blocked", info);
          }}
        >
          <ThemeProvider>
            <ConfettiProvider>
              <QueryClientProvider client={queryClient}>
                <WagmiProvider config={config}>
                  <RainbowKitProvider
                    modalSize="compact"
                    initialChain={filecoinCalibration.id}
                  >
                    <main className="flex flex-col min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
                      <Navbar />
                      {children}
                    </main>
                   
                  </RainbowKitProvider>
                </WagmiProvider>
              </QueryClientProvider>
            </ConfettiProvider>
          </ThemeProvider>
        </GeolocationProvider>
      </body>
    </html>
  );
}
