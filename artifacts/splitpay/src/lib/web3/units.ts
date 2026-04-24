import { formatUnits, parseUnits } from "viem";

export const USDC_DECIMALS = 6;

export function formatUsdc(microAmount: bigint | string | number): string {
  const v = typeof microAmount === "bigint" ? microAmount : BigInt(microAmount ?? 0);
  return formatUnits(v, USDC_DECIMALS);
}

export function formatUsdcDisplay(
  microAmount: bigint | string | number,
  opts?: { withSymbol?: boolean },
): string {
  const v = formatUsdc(microAmount);
  const num = Number(v);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : v;
  return opts?.withSymbol === false ? formatted : `${formatted} USDC`;
}

export function parseUsdc(amount: string | number): bigint {
  const s = typeof amount === "number" ? amount.toString() : amount;
  return parseUnits(s.trim() === "" ? "0" : s, USDC_DECIMALS);
}

export function shortAddress(addr?: string | null): string {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
