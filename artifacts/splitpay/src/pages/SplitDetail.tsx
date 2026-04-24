import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Share2, Wallet, CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { useGetSplit, useRecordPayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSplitQueryKey } from "@workspace/api-client-react";

export default function SplitDetail() {
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const cfg = useAppConfig();
  const queryClient = useQueryClient();

  const { data: splitDetail, isLoading: isLoadingServer, error } = useGetSplit(id || "");
  const onChainId = splitDetail ? BigInt(splitDetail.onChainId) : undefined;
  
  const { data: onChainData, refetch: refetchOnChain } = useOnChainSplit(onChainId);
  const { data: shareAmount, refetch: refetchShare } = useShareAmount(onChainId, address);
  const { data: hasPaid, refetch: refetchHasPaid } = useHasPaid(onChainId, address);
  
  const { pay, isPending: isPaying } = usePayShare(onChainId);
  const recordPayment = useRecordPayment(id || "");

  const [customPayAmount, setCustomPayAmount] = useState<string>("");

  const isCreator = splitDetail && address && splitDetail.creatorAddress.toLowerCase() === address.toLowerCase();

  const handlePay = async () => {
    if (!onChainId || !address) return;
    
    let amountToPay = shareAmount;
    if (splitDetail?.splitType === "custom" && customPayAmount) {
      amountToPay = parseUsdc(customPayAmount);
    }
    
    if (!amountToPay || amountToPay <= 0n) {
      toast.error("Invalid amount to pay");
      return;
    }

    try {
      const txHash = await pay(amountToPay);
      
      await recordPayment.mutateAsync({
        id: splitDetail.id,
        data: {
          payerAddress: address,
          amount: amountToPay.toString(),
          txHash
        }
      });
      
      toast.success("Payment successful!");
      
      // refresh data
      refetchOnChain();
      refetchShare();
      refetchHasPaid();
      queryClient.invalidateQueries({ queryKey: getGetSplitQueryKey(splitDetail.id) });
      
    } catch (err: any) {
      console.error(err);
      toast.error("Payment failed: " + (err.shortMessage || err.message || "Unknown error"));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (isLoadingServer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
        <p className="text-muted-foreground">Loading split details...</p>
      </div>
    );
  }

  if (error || !splitDetail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-destructive mb-2 text-xl font-bold">Split not found</div>
        <p className="text-muted-foreground text-center">This split doesn't exist or hasn't been synced yet.</p>
      </div>
    );
  }

  const total = onChainData ? onChainData.totalAmount : BigInt(splitDetail.totalAmount);
  const paid = onChainData ? onChainData.paidAmount : splitDetail.payments.reduce((acc, p) => acc + BigInt(p.amount), 0n);
  const participants = onChainData ? onChainData.participantCount : splitDetail.participantCount;
  const paidCount = onChainData ? onChainData.paidCount : splitDetail.paidCount;
  
  const progressPercent = Math.min(100, Math.max(0, Number(paid * 100n / total)));
  const isFull = paid >= total;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{splitDetail.title || "Untitled Split"}</h1>
            {isCreator && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Creator</Badge>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> On-chain ID: {splitDetail.onChainId}</span>
            <span>•</span>
            <a href={`${cfg.explorerUrl}/tx/${splitDetail.txHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              Creation Tx <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        
        <Button variant="outline" onClick={handleCopyLink} className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-foreground">
          <Share2 className="w-4 h-4 mr-2" /> Share Link
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-1 md:col-span-2 bg-white/[0.02] border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
          <CardContent className="p-8 relative z-10">
            <div className="text-muted-foreground font-medium mb-2">Progress</div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold font-mono tracking-tighter">{formatUsdc(paid)}</span>
              <span className="text-2xl text-muted-foreground font-mono">/ {formatUsdc(total)} <span className="text-sm">USDC</span></span>
            </div>
            
            <Progress value={progressPercent} className="h-4 bg-white/10 mb-4" />
            
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-primary">{progressPercent.toFixed(1)}% Funded</span>
              <span className="text-muted-foreground">{paidCount} of {participants} paid</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-white/[0.02] border-white/10 shadow-lg flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Your Share</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {!isConnected ? (
              <div className="text-center py-4">
                <ConnectButton />
              </div>
            ) : hasPaid ? (
              <div className="flex flex-col items-center justify-center text-center text-primary h-full">
                <CheckCircle2 className="w-12 h-12 mb-3" />
                <div className="font-bold text-lg mb-1">You're all set!</div>
                <p className="text-sm text-muted-foreground">You have paid your share.</p>
              </div>
            ) : isFull ? (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                <div className="font-bold text-lg mb-1">Split Complete</div>
                <p className="text-sm">This split has been fully funded.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {splitDetail.splitType === "equal" ? (
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold font-mono text-primary mb-1">
                      {shareAmount ? formatUsdcDisplay(shareAmount, { withSymbol: true }) : "Loading..."}
                    </div>
                    <div className="text-xs text-muted-foreground">Equal split share</div>
                  </div>
                ) : (
                  <div className="mb-6 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Amount to pay (USDC)</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={customPayAmount} 
                      onChange={e => setCustomPayAmount(e.target.value)}
                      className="bg-white/5 border-white/10 font-mono text-lg text-center"
                    />
                    {shareAmount !== undefined && (
                      <div className="text-xs text-center text-muted-foreground">
                        Max remaining: {formatUsdc(shareAmount)}
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  size="lg" 
                  className="w-full mt-auto shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)]"
                  onClick={handlePay}
                  disabled={isPaying || recordPayment.isPending || (splitDetail.splitType === "custom" && !customPayAmount)}
                >
                  {isPaying || recordPayment.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Wallet className="w-5 h-5 mr-2" /> Pay Now</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {splitDetail.payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-white/10 rounded-lg">
              No payments have been made yet.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {splitDetail.payments.map((p) => (
                <div key={p.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary opacity-80" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {shortAddress(p.payerAddress)}
                        {address && p.payerAddress.toLowerCase() === address.toLowerCase() && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-white/10">You</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.paidAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-foreground">{formatUsdcDisplay(p.amount, { withSymbol: false })} <span className="text-xs text-primary">USDC</span></div>
                    <a href={`${cfg.explorerUrl}/tx/${p.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-1">
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
