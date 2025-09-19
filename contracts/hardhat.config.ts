import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";
import dotenv from "dotenv"

const PRIVATE_KEY = process.env.PRIVATE_KEY

dotenv.config()

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
    calibration: {
      type: "http",
      chainId: 314159,
      url: "https://api.calibration.node.glif.io/rpc/v1",
      accounts: [configVariable("PRIVATE_KEY")],
  },
  filecoinMainnet: {
    type: "http",
      chainId: 314,
      url: "https://api.node.glif.io",
      accounts: [configVariable("PRIVATE_KEY")],
  },
  },
};

export default config;
