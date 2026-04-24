import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Wallet, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
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

  const { data: view, isLoading, error } = useQuery({
    queryKey: ["participant-view", token],
    queryFn: () => fetchParticipantView(token!),
    enabled: !!token,
    retry: false,
  });

  const onChainId = view ? BigInt(view.onChainId) : undefined;
  const { data: onChainData } = useOnChainSplit(onChainId);
  const { data: shareAmount } = useShareAmount(onChainId, address);
  const { data: hasPaid, refetch: refetchHasPaid } = useHasPaid(onChainId, address);

  const { pay, isPending: isPaying } = usePayShare(onChainId);
  const recordPayment = useRecordPayment(view?.splitId || "");

  const [paying, setPaying] = useState(false);

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
        },
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

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {view.title || "Payment Request"}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>On-chain split #{view.onChainId}</span>
            <span>•</span>
            <a
              href={`${cfg.explorerUrl}/tx/${view.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              Verify on explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <Card className="bg-white/[0.02] border-white/10 shadow-xl mb-6">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-1">Your share</div>
              <div className="text-5xl font-bold font-mono tracking-tighter text-primary mb-1">
                {formatUsdcDisplay(myAmount, { withSymbol: false })}
              </div>
              <div className="text-lg text-muted-foreground">USDC</div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Split type</span>
                <span className="text-foreground capitalize">{view.splitType}</span>
              </div>
              <div className="flex justify-between">
                <span>Total participants</span>
                <span className="text-foreground">{view.participantCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Total amount</span>
                <span className="text-foreground">{formatUsdcDisplay(view.totalAmount)}</span>
              </div>
            </div>

            {onChainData && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall progress</span>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pay Your Share</CardTitle>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="flex flex-col items-center py-4 gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to pay your share in USDC.
                </p>
                <ConnectButton />
              </div>
            ) : hasPaid ? (
              <div className="flex flex-col items-center py-6 text-center text-primary">
                <CheckCircle2 className="w-14 h-14 mb-3" />
                <div className="font-bold text-xl mb-1">You're all set!</div>
                <p className="text-sm text-muted-foreground">
                  Your share has been paid and recorded on-chain.
                </p>
              </div>
            ) : isFull ? (
              <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                <CheckCircle2 className="w-14 h-14 mb-3 opacity-40" />
                <div className="font-bold text-xl mb-1">Split Complete</div>
                <p className="text-sm">This split has been fully funded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Amount due</span>
                  <span className="font-bold text-xl font-mono text-primary">
                    {formatUsdcDisplay(myAmount, { withSymbol: false })} USDC
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)]"
                  onClick={handlePay}
                  disabled={isPaying || paying || recordPayment.isPending}
                >
                  {isPaying || paying || recordPayment.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5 mr-2" /> Pay {formatUsdcDisplay(myAmount)}
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Payment is processed on Arc Network via the SplitPay smart contract.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
