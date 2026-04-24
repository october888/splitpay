import { useCallback, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { decodeEventLog, maxUint256 } from "viem";
import { ERC20_ABI, SPLITPAY_ABI, SplitTypeEnum } from "./abi";
import { useAppConfig } from "./useAppConfig";

export type CreatedSplitInfo = {
  onChainId: bigint;
  txHash: `0x${string}`;
};

/**
 * Create a split on-chain. Returns helpers and tx state.
 *
 * Flow:
 *   const { create, isPending, isConfirming, info } = useCreateSplit();
 *   const { onChainId, txHash } = await create({ totalAmount, participantCount, splitType, title });
 */
export function useCreateSplit() {
  const cfg = useAppConfig();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const create = useCallback(
    async (params: {
      totalAmount: bigint;
      participantCount: number;
      splitType: "equal" | "custom";
      title: string;
    }): Promise<CreatedSplitInfo> => {
      if (!publicClient) throw new Error("No public client");
      const txHash = await writeContractAsync({
        address: cfg.splitPayAddress as `0x${string}`,
        abi: SPLITPAY_ABI,
        functionName: "createSplit",
        args: [
          params.totalAmount,
          params.participantCount,
          SplitTypeEnum[params.splitType],
          params.title,
        ],
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      let onChainId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: SPLITPAY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "SplitCreated") {
            onChainId = decoded.args.splitId as bigint;
            break;
          }
        } catch {
          /* ignore non-matching logs */
        }
      }
      if (onChainId === null) {
        throw new Error("SplitCreated event not found in receipt");
      }
      return { onChainId, txHash };
    },
    [cfg.splitPayAddress, publicClient, writeContractAsync],
  );

  return { create, isPending };
}

/**
 * Pay your share of a split: approves USDC if needed, then calls payShare.
 */
export function usePayShare(onChainId?: bigint) {
  const cfg = useAppConfig();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const pay = useCallback(
    async (amount: bigint): Promise<`0x${string}`> => {
      if (onChainId === undefined) throw new Error("Missing onChainId");
      if (!address) throw new Error("Wallet not connected");
      if (!publicClient) throw new Error("No public client");

      const allowance = (await publicClient.readContract({
        address: cfg.usdcAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, cfg.splitPayAddress as `0x${string}`],
      })) as bigint;

      if (allowance < amount) {
        const approveHash = await writeContractAsync({
          address: cfg.usdcAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [cfg.splitPayAddress as `0x${string}`, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const txHash = await writeContractAsync({
        address: cfg.splitPayAddress as `0x${string}`,
        abi: SPLITPAY_ABI,
        functionName: "payShare",
        args: [onChainId, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      return txHash;
    },
    [
      address,
      cfg.splitPayAddress,
      cfg.usdcAddress,
      onChainId,
      publicClient,
      writeContractAsync,
    ],
  );

  return { pay, isPending };
}

export type OnChainSplit = {
  creator: `0x${string}`;
  totalAmount: bigint;
  paidAmount: bigint;
  participantCount: number;
  paidCount: number;
  splitType: "equal" | "custom";
};

export function useOnChainSplit(onChainId?: bigint) {
  const cfg = useAppConfig();
  const result = useReadContract({
    address: cfg.splitPayAddress as `0x${string}`,
    abi: SPLITPAY_ABI,
    functionName: "getSplitDetails",
    args: onChainId !== undefined ? [onChainId] : undefined,
    query: { enabled: onChainId !== undefined, refetchInterval: 8_000 },
  });
  const data = useMemo<OnChainSplit | null>(() => {
    if (!result.data) return null;
    const [creator, totalAmount, paidAmount, participantCount, paidCount, st] =
      result.data as readonly [
        `0x${string}`,
        bigint,
        bigint,
        number,
        number,
        number,
      ];
    return {
      creator,
      totalAmount,
      paidAmount,
      participantCount,
      paidCount,
      splitType: st === 0 ? "equal" : "custom",
    };
  }, [result.data]);
  return { ...result, data };
}

export function useShareAmount(onChainId?: bigint, payer?: `0x${string}`) {
  const cfg = useAppConfig();
  return useReadContract({
    address: cfg.splitPayAddress as `0x${string}`,
    abi: SPLITPAY_ABI,
    functionName: "getShareAmount",
    args:
      onChainId !== undefined && payer !== undefined
        ? [onChainId, payer]
        : undefined,
    query: { enabled: onChainId !== undefined && !!payer, refetchInterval: 8_000 },
  });
}

export function useHasPaid(onChainId?: bigint, payer?: `0x${string}`) {
  const cfg = useAppConfig();
  return useReadContract({
    address: cfg.splitPayAddress as `0x${string}`,
    abi: SPLITPAY_ABI,
    functionName: "hasPaid",
    args:
      onChainId !== undefined && payer !== undefined
        ? [onChainId, payer]
        : undefined,
    query: { enabled: onChainId !== undefined && !!payer, refetchInterval: 8_000 },
  });
}

export function useUsdcBalance(address?: `0x${string}`) {
  const cfg = useAppConfig();
  return useReadContract({
    address: cfg.usdcAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 12_000 },
  });
}

// Re-exports so the design subagent imports everything from one place.
export {
  useAccount,
  useWaitForTransactionReceipt,
};
