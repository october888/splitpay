import { Link } from "wouter";
import { motion } from "framer-motion";
import { Wallet, Plus, ChevronRight, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAccount, ConnectButton, formatUsdcDisplay, shortAddress } from "@/lib/web3";
import { useListSplitsByCreator, getListSplitsByCreatorQueryKey } from "@workspace/api-client-react";

export default function MySplits() {
  const { address, isConnected } = useAccount();
  
  const { data: splits, isLoading } = useListSplitsByCreator(address || "", {
    query: {
      queryKey: getListSplitsByCreatorQueryKey(address || ""),
      enabled: !!address && isConnected,
    }
  });

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 text-muted-foreground">
          <Wallet className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Connect to view your splits</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Connect your wallet to see the splits you've created and track incoming payments.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">My Splits</h1>
          <p className="text-muted-foreground">Manage and track bills you've split with others.</p>
        </div>
        <Link href="/create">
          <Button className="shrink-0 shadow-[0_0_20px_-5px_rgba(var(--primary),0.4)]">
            <Plus className="w-4 h-4 mr-2" /> New Split
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : splits?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {splits.map((split, i) => {
            const progress = Math.min(100, Math.max(0, (split.paidCount / split.participantCount) * 100));
            const isDone = split.paidCount >= split.participantCount;

            return (
              <motion.div
                key={split.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link href={`/split/${split.id}`}>
                  <Card className={`h-full bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer group hover:-translate-y-1 ${isDone ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
                    <CardContent className="p-6 flex flex-col h-full relative overflow-hidden">
                      {isDone && (
                        <div className="absolute -right-12 -top-12 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDone ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
                          <LayoutList className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-foreground font-mono">{formatUsdcDisplay(split.totalAmount, { withSymbol: false })} <span className="text-xs text-primary">USDC</span></div>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-4 line-clamp-1">{split.title || "Untitled Split"}</h3>
                      
                      <div className="mt-auto space-y-3">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isDone ? 'bg-primary' : 'bg-foreground/40'}`} 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{split.paidCount} of {split.participantCount} paid</span>
                          <span>{new Date(split.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white/[0.02] border-white/5 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-muted-foreground">
              <LayoutList className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No splits yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              You haven't created any splits yet. Create your first split to start collecting USDC from friends.
            </p>
            <Link href="/create">
              <Button>Create a split</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
