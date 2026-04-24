/**
 * Public app config returned by `GET /api/config` and consumed by the frontend
 * to build the wagmi/viem chain definition and contract addresses.
 *
 * Source of truth: the **Arc App Kit** chain definitions
 * (`@circle-fin/app-kit/chains`). Defaults below are pulled directly from
 * `ArcTestnet` so we always agree with Circle on chain id, RPC, USDC address,
 * explorer URL, and the native gas-token decimals.
 *
 * Any value can still be overridden via env vars (useful for pointing at a
 * private RPC endpoint, switching to Arc Mainnet when it launches, or pinning
 * a different SplitPay deployment).
 *
 * Notes on USDC on Arc:
 *  - The system USDC contract address (`0x36...000`) is BOTH the gas token
 *    and a standard ERC-20.
 *  - As an ERC-20, USDC has 6 decimals — that's what SplitPay charges in.
 *  - As the native gas token, the chain reports 18 decimals (per the Arc App
 *    Kit chain definition). We expose both so the frontend can be precise.
 */
import { ArcTestnet } from "@circle-fin/app-kit/chains";

const DEFAULT_RPC_URL = ArcTestnet.rpcEndpoints[0];
// `explorerUrl` from app-kit is a tx-template like ".../tx/{hash}". Strip the
// trailing "/tx/{hash}" so the frontend can compose URLs for tx, addresses,
// and blocks consistently.
const DEFAULT_EXPLORER_URL = ArcTestnet.explorerUrl.replace(/\/tx\/\{hash\}$/, "");

export const appConfig = {
  chainId: Number(process.env["ARC_CHAIN_ID"] ?? ArcTestnet.chainId),
  chainName: process.env["ARC_CHAIN_NAME"] ?? ArcTestnet.name,
  rpcUrl: process.env["ARC_RPC_URL"] ?? DEFAULT_RPC_URL,
  explorerUrl: process.env["ARC_EXPLORER_URL"] ?? DEFAULT_EXPLORER_URL,
  usdcAddress: process.env["USDC_ADDRESS"] ?? ArcTestnet.usdcAddress,
  usdcDecimals: 6,
  nativeCurrencyName: ArcTestnet.nativeCurrency.name,
  nativeCurrencySymbol: ArcTestnet.nativeCurrency.symbol,
  nativeCurrencyDecimals: ArcTestnet.nativeCurrency.decimals,
  isTestnet: ArcTestnet.isTestnet,
  splitPayAddress:
    process.env["SPLITPAY_CONTRACT_ADDRESS"] ??
    "0x0000000000000000000000000000000000000000",
} as const;
