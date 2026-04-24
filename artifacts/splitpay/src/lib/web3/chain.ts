import { defineChain, type Chain } from "viem";
import type { AppConfig } from "@workspace/api-client-react";

export function buildArcChain(cfg: AppConfig): Chain {
  return defineChain({
    id: cfg.chainId,
    name: cfg.chainName,
    nativeCurrency: {
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
    },
    rpcUrls: {
      default: { http: [cfg.rpcUrl] },
      public: { http: [cfg.rpcUrl] },
    },
    blockExplorers: {
      default: { name: "Arc Explorer", url: cfg.explorerUrl },
    },
    testnet: true,
  });
}
