import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Wallet, CheckCircle2, ExternalLink, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  useAccount,
  useOnChainSplit,
  useShareAmount,
  useHasPaid,
  usePayShare,
  useAppConfig,
  ConnectButton,
  formatUsdcDisplay,
  formatUsdc,
} from "@/lib/web3";
import { useRecordPayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type ParticipantView = {
  splitId: string;
  title?: string;
  totalAmount: string;
  participantCount: number;
  splitType: "equal" | "custom";
  onChainId: string;
  txHash: string;
  participantIndex: number;
  participantAmount: string;
  participantName?: string;
  hasPaid: boolean;
  payerAddress?: string;
};

async function fetchParticipantView(token: string): Promise<ParticipantView> {
  const res = await fetch(`/api/splits/by-token/${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || "Token not found");
  }
  return res.json();
}

export default function ParticipantPay() {
  const { token } = useParams<{ token: string }>();
  const { address, isConnected } = useAccount();
  const cfg = useAppConfig();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);

  const { data: view, isLoading, error } = useQuery({
    queryKey: ["participant-view", token],
    queryFn: () => fetchParticipantView(token!),
    enabled: !!token,
    retry: false,
    refetchInterval: 10000,
  });

  const onChainId = view ? BigInt(view.onChainId) : undefined;
  const { data: onChainData } = useOnChainSplit(onChainId);
  const { data: shareAmount } = useShareAmount(onChainId, address);
  const { data: hasPaidOnChain, refetch: refetchHasPaid } = useHasPaid(onChainId, address);
  const { pay, isPending: isPaying } = usePayShare(onChainId);
  const recordPayment = useRecordPayment();

  const isPaid = view?.hasPaid || hasPaidOnChain;

  const handlePay = async () => {
    if (!onChainId || !address || !view) return;
    const amountToPay = shareAmount ?? BigInt(view.participantAmount);
    if (!amountToPay || amountToPay <= 0n) {
      toast.error("Invalid payment amount");
      return;
    }
    setPaying(true);
    try {
      const txHash = await pay(amountToPay);
      await recordPayment.mutateAsync({
        id: view.splitId,
        data: {
          payerAddress: address,
          amount: amountToPay.toString(),
          txHash,
          token,
        } as any,
      });
      toast.success("Payment successful! Your share is settled.");
      refetchHasPaid();
      queryClient.invalidateQueries({ queryKey: ["participant-view", token] });
    } catch (err: any) {
      console.error(err);
      toast.error("Payment failed: " + (err.shortMessage || err.message || "Unknown error"));
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground">Loading your share...</p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-destructive mb-2 text-xl font-bold">Link not found</div>
        <p className="text-muted-foreground">This payment link is invalid or has expired.</p>
      </div>
    );
  }

  const total = onChainData ? onChainData.totalAmount : BigInt(view.totalAmount);
  const paid = onChainData ? onChainData.paidAmount : 0n;
  const progressPercent = total > 0n ? Math.min(100, Math.max(0, Number(paid * 100n / total))) : 0;
  const myAmount = shareAmount ?? BigInt(view.participantAmount);
  const isFull = onChainData ? onChainData.paidAmount >= onChainData.totalAmount : false;
  const displayName = view.participantName || `Person ${view.participantIndex + 1}`;

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white/5 border border-white/10 rounded-full px-3 py-1 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> On-chain verified
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {view.title || "Payment Request"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {displayName}'s share
            <span className="mx-2">·</span>
            <a
              href={`${cfg.explorerUrl}/tx/${view.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              Verify <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <Card className="bg-white/[0.02] border-white/10 shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-2">Your share</div>
              <div className="text-6xl font-bold font-mono tracking-tighter text-primary mb-1">
                {formatUsdcDisplay(myAmount, { withSymbol: false })}
              </div>
              <div className="text-lg text-muted-foreground font-medium">USDC</div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total bill</span>
                <span className="text-foreground font-medium">{formatUsdc(BigInt(view.totalAmount))} USDC</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Split between</span>
                <span className="text-foreground font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {view.participantCount} people</span>
              </div>
            </div>

            {onChainData && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Overall progress</span>
                  <span className="text-primary font-medium">
                    {onChainData.paidCount} of {onChainData.participantCount} paid
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2 bg-white/10" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.02] border-white/10 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pay with wallet</CardTitle>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="flex flex-col items-center py-4 gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to pay your share in USDC on Arc Network.
                </p>
                <ConnectButton />
              </div>
            ) : isPaid ? (
              <div className="flex flex-col items-center py-8 text-center text-primary">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <CheckCircle2 className="w-16 h-16 mb-4" />
                </motion.div>
                <div className="font-bold text-2xl mb-1">All done!</div>
                <p className="text-sm text-muted-foreground">
                  Your share has been paid and confirmed on-chain.
                </p>
              </div>
            ) : isFull ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-14 h-14 mb-3 opacity-40" />
                <div className="font-bold text-xl mb-1">Split Complete</div>
                <p className="text-sm">This split has been fully funded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Amount due</span>
                  <span className="font-bold text-2xl font-mono text-primary">
                    {formatUsdcDisplay(myAmount, { withSymbol: false })} <span className="text-base">USDC</span>
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full h-13 text-base font-semibold shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)]"
                  onClick={handlePay}
                  disabled={isPaying || paying || recordPayment.isPending}
                >
                  {isPaying || paying || recordPayment.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Wallet className="w-5 h-5 mr-2" /> Pay {formatUsdc(myAmount)} USDC</>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Processed on Arc Network via the SplitPay smart contract.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
