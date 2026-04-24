import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ARC_TESTNET_RPC =
  process.env.ARC_TESTNET_RPC_URL ?? "https://rpc.testnet.arc.network";
const ARC_MAINNET_RPC =
  process.env.ARC_MAINNET_RPC_URL ?? "https://rpc.arc.network";

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Emit metadata so Sourcify can verify the deployed bytecode.
      metadata: { bytecodeHash: "ipfs", appendCBOR: true },
    },
  },
  networks: {
    hardhat: {},
    arcTestnet: {
      url: ARC_TESTNET_RPC,
      chainId: 5042002,
      accounts,
    },
    arcMainnet: {
      // NOTE: Arc Mainnet is not live yet (planned 2026). When Circle
      // publishes the official endpoint, set ARC_MAINNET_RPC_URL accordingly.
      url: ARC_MAINNET_RPC,
      chainId: Number(process.env.ARC_MAINNET_CHAIN_ID ?? 1243),
      accounts,
    },
  },
  // Sourcify is the verification path for Arc — there is no public
  // Etherscan-compatible API for Arcscan as of now. Sourcify works for
  // any EVM chain by chain id.
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.sourcify.dev",
  },
  // Disable Etherscan verification entirely (no API key, not supported).
  etherscan: {
    apiKey: {},
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
