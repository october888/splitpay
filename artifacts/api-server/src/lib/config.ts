/**
 * Public app config returned by GET /api/config and consumed by the
 * frontend to build the wagmi/viem chain definition and contract addresses.
 *
 * Defaults are wired to the live Arc Testnet (chain id 5042002), so the app
 * works out-of-the-box for development. To target a different network (or
 * Arc Mainnet once Circle launches it), override the env vars below.
 *
 * USDC on Arc lives at the system address `0x36...000` and is BOTH the gas
 * token AND an ERC-20 (6 decimals via the ERC-20 interface). The SplitPay
 * contract talks to it through the standard ERC-20 `transferFrom`.
 */
export const appConfig = {
  chainId: Number(process.env["ARC_CHAIN_ID"] ?? "5042002"),
  chainName: process.env["ARC_CHAIN_NAME"] ?? "Arc Testnet",
  rpcUrl: process.env["ARC_RPC_URL"] ?? "https://rpc.testnet.arc.network",
  explorerUrl:
    process.env["ARC_EXPLORER_URL"] ?? "https://testnet.arcscan.app",
  usdcAddress:
    process.env["USDC_ADDRESS"] ??
    "0x3600000000000000000000000000000000000000",
  splitPayAddress:
    process.env["SPLITPAY_CONTRACT_ADDRESS"] ??
    "0x0000000000000000000000000000000000000000",
} as const;
