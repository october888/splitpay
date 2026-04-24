import { defineChain, type Chain } from "viem";
import { ArcTestnet } from "@circle-fin/app-kit/chains";
import type { AppConfig } from "@workspace/api-client-react";

/**
 * Build a viem `Chain` for the running dApp.
 *
 * The canonical chain definition (chain id, RPC, USDC system address, native
 * gas-token decimals, explorer) lives in the **Arc App Kit**
 * (`@circle-fin/app-kit/chains`). We use it as the base, then apply any
 * overrides the API server returned (which may come from env vars — useful for
 * pinning a private RPC endpoint or pointing at Arc Mainnet).
 *
 * Source: https://docs.arc.network/app-kit
 */
export function buildArcChain(cfg: AppConfig): Chain {
  return defineChain({
    id: cfg.chainId,
    name: cfg.chainName,
    nativeCurrency: {
      name: cfg.nativeCurrencyName,
      symbol: cfg.nativeCurrencySymbol,
      // Native gas-token decimals on Arc are 18 (per the App Kit chain def).
      // The USDC ERC-20 still uses 6 decimals — see `cfg.usdcDecimals`.
      decimals: cfg.nativeCurrencyDecimals,
    },
    rpcUrls: {
      default: { http: [cfg.rpcUrl] },
      public: { http: [cfg.rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Arc Explorer", url: cfg.explorerUrl },
    },
    testnet: cfg.isTestnet,
  });
}

/**
 * Re-export the official Arc Testnet chain definition so other modules (e.g.
 * for displaying official kit contract addresses, CCTP domains, or the gateway
 * wallet) can reference Circle's source-of-truth values directly.
 */
export { ArcTestnet };
