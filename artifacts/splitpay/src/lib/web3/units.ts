import { formatUnits, parseUnits } from "viem";

export const USDC_DECIMALS = 6;

export function formatUsdc(microAmount: bigint | string | number | undefined | null): string {
  try {
    if (microAmount === undefined || microAmount === null) return "0.000000";
    if (typeof microAmount === "bigint") return formatUnits(microAmount, USDC_DECIMALS);
    const n = Number(microAmount);
    if (!Number.isFinite(n) || n < 0) return "0.000000";
    return formatUnits(BigInt(Math.floor(n)), USDC_DECIMALS);
  } catch {
    return "0.000000";
  }
}

export function formatUsdcDisplay(
  microAmount: bigint | string | number | undefined | null,
  opts?: { withSymbol?: boolean },
): string {
  const v = formatUsdc(microAmount);
  const num = Number(v);
  const formatted = Number.isFinite(num)
    ? num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
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
