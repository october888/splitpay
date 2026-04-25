import { useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Loader2, Share2, Wallet, CheckCircle2, Copy, ExternalLink,
  ShieldCheck, MessageSquare, Users, Clock, Link2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  useAccount,
  useOnChainSplit,
  useShareAmount,
  useHasPaid,
  usePayShare,
  useAppConfig,
  ConnectButton,
  formatUsdcDisplay,
  shortAddress,
  formatUsdc,
  parseUsdc
} from "@/lib/web3";
import { useGetSplit, useRecordPayment, getGetSplitQueryKey } from "@workspace/api-client-react";
import type { SplitDetail as SplitDetailType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type ParticipantSlot = {
  index: number;
  token: string;
  name?: string;
  amount: string;
  paid: boolean;
  payerAddress?: string;
  paidAt?: string;
};

type SplitDetailWithParticipants = SplitDetailType & { participants?: ParticipantSlot[] };

export default function SplitDetail() {
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const cfg = useAppConfig();
  const queryClient = useQueryClient();

  const { data: splitDetail, isLoading, error } = useGetSplit(id || "");
  const split = splitDetail as SplitDetailWithParticipants | undefined;
  const onChainId = split ? BigInt(split.onChainId) : undefined;

  const { data: onChainData, refetch: refetchOnChain } = useOnChainSplit(onChainId);
  const { data: shareAmount, refetch: refetchShare } = useShareAmount(onChainId, address);
  const { data: hasPaid, refetch: refetchHasPaid } = useHasPaid(onChainId, address);

  const { pay, isPending: isPaying } = usePayShare(onChainId);
  const recordPayment = useRecordPayment();

  const [customPayAmount, setCustomPayAmount] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isCreator = split && address &&
    split.creatorAddress.toLowerCase() === address.toLowerCase();

  const getParticipantLink = (token: string) =>
    `${window.location.origin}/pay/${token}`;

  const handleCopyLink = (link: string, index: number) => {
    navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Link copied!");
  };

  const handleCopyAll = () => {
    if (!split?.participants) return;
    const lines = split.participants.map((p, i) => {
      const name = p.name || `Person ${i + 1}`;
      const amount = formatUsdcDisplay(BigInt(p.amount), { withSymbol: false });
      const link = getParticipantLink(p.token);
      return `${name} — ${amount} USDC\n${link}`;
    });
    const msg = `💸 Payment request: ${split.title || "Split"}\n\n${lines.join("\n\n")}`;
    navigator.clipboard.writeText(msg);
    toast.success("All links copied as a message!");
  };

  const handlePay = async () => {
    if (!onChainId || !address || !split) return;
    let amountToPay = shareAmount;
    if (split.splitType === "custom" && customPayAmount) {
      amountToPay = parseUsdc(customPayAmount);
    }
    if (!amountToPay || amountToPay <= 0n) {
      toast.error("Invalid amount");
      return;
    }
    try {
      const txHash = await pay(amountToPay);
      await recordPayment.mutateAsync({
        id: split.id,
        data: { payerAddress: address, amount: amountToPay.toString(), txHash }
      });
      toast.success("Payment successful!");
      refetchOnChain();
      refetchShare();
      refetchHasPaid();
      queryClient.invalidateQueries({ queryKey: getGetSplitQueryKey(split.id) });
    } catch (err: any) {
      toast.error("Payment failed: " + (err.shortMessage || err.message || "Unknown error"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground">Loading split...</p>
      </div>
    );
  }

  if (error || !split) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-destructive text-xl font-bold mb-2">Split not found</div>
        <p className="text-muted-foreground text-center">This split doesn't exist or hasn't synced yet.</p>
      </div>
    );
  }

  const totalBig = onChainData ? onChainData.totalAmount : BigInt(split.totalAmount || "0");
  const paidBig = onChainData ? onChainData.paidAmount : split.payments.reduce((acc, p) => acc + BigInt(p.amount || "0"), 0n);
  const participants = onChainData ? onChainData.participantCount : split.participantCount;
  const paidCount = onChainData ? onChainData.paidCount : split.paidCount;
  const progressPercent = totalBig > 0n ? Math.min(100, Math.max(0, Number(paidBig * 100n / totalBig))) : 0;
  const isFull = paidBig >= totalBig && totalBig > 0n;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{split.title || "Untitled Split"}</h1>
            {isCreator && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Creator</Badge>}
            {isFull && <Badge className="bg-primary/20 text-primary border-none">Complete</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> On-chain #{split.onChainId}</span>
            <span>·</span>
            <a href={`${cfg.explorerUrl}/tx/${split.txHash}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors">
              View tx <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Copied!"); }}
          className="bg-white/5 border-white/10 hover:bg-white/10 shrink-0">
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>

      {/* Progress */}
      <Card className="bg-white/[0.02] border-white/10 shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-24 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        <CardContent className="p-8 relative z-10">
          <div className="flex items-end gap-2 mb-5">
            <span className="text-4xl font-bold font-mono tracking-tight">{formatUsdc(paidBig)}</span>
            <span className="text-xl text-muted-foreground font-mono mb-0.5">/ {formatUsdc(totalBig)} USDC</span>
          </div>
          <Progress value={progressPercent} className="h-3 bg-white/10 mb-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary font-medium">{progressPercent.toFixed(0)}% funded</span>
            <span className="text-muted-foreground">{paidCount} of {participants} paid</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Participant tracker */}
        {split.participants && split.participants.length > 0 && (
          <Card className="bg-white/[0.02] border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Who's paid
                </CardTitle>
                {isCreator && (
                  <Button size="sm" variant="ghost" onClick={handleCopyAll}
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10">
                    <MessageSquare className="w-3.5 h-3.5" /> Copy all links
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pb-4">
              {split.participants.map((p, i) => {
                const name = p.name || `Person ${i + 1}`;
                const link = getParticipantLink(p.token);
                const amt = formatUsdcDisplay(BigInt(p.amount), { withSymbol: false });

                return (
                  <motion.div
                    key={p.token}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${p.paid ? 'bg-primary/5' : 'hover:bg-white/5'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${p.paid ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'}`}>
                      {p.paid
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <Clock className="w-4 h-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${p.paid ? 'text-foreground' : 'text-muted-foreground'}`}>{name}</span>
                        {p.paid && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary bg-primary/10">Paid</Badge>}
                      </div>
                      {p.paid && p.payerAddress ? (
                        <div className="text-xs text-muted-foreground truncate">{shortAddress(p.payerAddress)}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">{amt} USDC pending</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">{amt}</span>
                      {isCreator && !p.paid && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10"
                          onClick={() => handleCopyLink(link, i)} title="Copy payment link">
                          {copiedIndex === i
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Your share / pay card */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your share</CardTitle>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">Connect your wallet to pay</p>
                <ConnectButton />
              </div>
            ) : isCreator ? (
              <div className="flex flex-col items-center text-center py-6 text-muted-foreground">
                <Link2 className="w-10 h-10 mb-3 opacity-40" />
                <div className="font-medium text-sm">You created this split.</div>
                <p className="text-xs mt-1 max-w-[200px]">
                  Copy links above and send to each person. They'll see only their own share.
                </p>
              </div>
            ) : hasPaid ? (
              <div className="flex flex-col items-center text-center py-6 text-primary">
                <CheckCircle2 className="w-12 h-12 mb-3" />
                <div className="font-bold text-lg mb-1">You're all set!</div>
                <p className="text-sm text-muted-foreground">Your share is paid.</p>
              </div>
            ) : isFull ? (
              <div className="flex flex-col items-center text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-40" />
                <div className="font-bold text-lg">Split Complete</div>
              </div>
            ) : (
              <div className="space-y-4">
                {split.splitType === "equal" ? (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Your share</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {shareAmount !== undefined
                        ? formatUsdcDisplay(shareAmount, { withSymbol: false })
                        : formatUsdcDisplay(BigInt(split.totalAmount) / BigInt(split.participantCount), { withSymbol: false })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">USDC</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Amount to pay (USDC)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={customPayAmount}
                      onChange={e => setCustomPayAmount(e.target.value)}
                      className="bg-white/5 border-white/10 font-mono text-lg text-center"
                    />
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)]"
                  onClick={handlePay}
                  disabled={isPaying || recordPayment.isPending || (split.splitType === "custom" && !customPayAmount)}
                >
                  {isPaying || recordPayment.isPending
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                    : <><Wallet className="w-5 h-5 mr-2" /> Pay Now</>
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {split.payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-white/10 rounded-lg text-sm">
              No payments yet
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {split.payments.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {shortAddress(p.payerAddress)}
                        {address && p.payerAddress.toLowerCase() === address.toLowerCase() && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-white/10">You</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.paidAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-sm">{formatUsdcDisplay(p.amount, { withSymbol: false })} <span className="text-xs text-primary">USDC</span></div>
                    <a href={`${cfg.explorerUrl}/tx/${p.txHash}`} target="_blank" rel="noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-1">
                      Tx <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
