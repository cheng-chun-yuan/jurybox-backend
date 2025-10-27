import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hederaTestnet: {
      url: process.env.HEDERA_JSON_RPC_URL || "https://testnet.hashio.io/api",
      chainId: 296, // Hedera testnet chain ID
      accounts: (process.env.REGISTRY_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY)
        ? [process.env.REGISTRY_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY].filter(Boolean)
        : [],
    },
    hederaMainnet: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295, // Hedera mainnet chain ID
      accounts: (process.env.REGISTRY_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY)
        ? [process.env.REGISTRY_PRIVATE_KEY || process.env.HEDERA_PRIVATE_KEY || process.env.FACILITATOR_PRIVATE_KEY].filter(Boolean)
        : [],
    },
  },
  etherscan: {
    apiKey: {
      hederaTestnet: "not-required",
      hederaMainnet: "not-required",
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://testnet.hashscan.io/api",
          browserURL: "https://hashscan.io/testnet",
        },
      },
      {
        network: "hederaMainnet",
        chainId: 295,
        urls: {
          apiURL: "https://mainnet.hashscan.io/api",
          browserURL: "https://hashscan.io/mainnet",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
