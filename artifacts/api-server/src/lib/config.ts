export const appConfig = {
  chainId: Number(process.env["ARC_CHAIN_ID"] ?? "512"),
  chainName: process.env["ARC_CHAIN_NAME"] ?? "Arc Network",
  rpcUrl: process.env["ARC_RPC_URL"] ?? "https://rpc.arc.network",
  explorerUrl:
    process.env["ARC_EXPLORER_URL"] ?? "https://explorer.arc.network",
  usdcAddress:
    process.env["USDC_ADDRESS"] ??
    "0x0000000000000000000000000000000000000000",
  splitPayAddress:
    process.env["SPLITPAY_CONTRACT_ADDRESS"] ??
    "0x0000000000000000000000000000000000000000",
} as const;
