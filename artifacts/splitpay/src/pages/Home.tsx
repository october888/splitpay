import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Users, Zap, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetStats, useListRecentSplits } from "@workspace/api-client-react";
import { formatUsdcDisplay, shortAddress } from "@/lib/web3";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: recentSplits, isLoading: splitsLoading } = useListRecentSplits({ limit: 6 });

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-8">
              <Zap className="w-3.5 h-3.5" />
              <span>Powered by USDC on Arc Network</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Split bills instantly <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-fuchsia-400">with one link.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Bills, group dinners, trips. Settle them on-chain in seconds. Create a split, share the link, and let your friends pay their share in USDC. No sign-ups, no fees, no hassle.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/create">
                <Button size="lg" className="h-14 px-8 text-base font-semibold w-full sm:w-auto shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)]">
                  Create a split
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-14 px-8 text-base font-semibold w-full bg-white/5 border-white/10 hover:bg-white/10">
                  How it works
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x divide-white/5">
            <StatItem label="Total Volume" value={statsLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : formatUsdcDisplay(stats?.totalVolume || "0", { withSymbol: true })} />
            <StatItem label="Active Splits" value={statsLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats?.activeSplits} />
            <StatItem label="Total Splits" value={statsLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats?.totalSplits} />
            <StatItem label="People Paid" value={statsLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : stats?.totalParticipantsPaid} />
          </div>
        </div>
      </section>

      {/* Recent Splits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Recent activity</h2>
            <Link href="/me" className="text-sm font-medium text-primary flex items-center hover:underline">
              View your splits <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {splitsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl bg-white/5" />
              ))
            ) : recentSplits?.length ? (
              recentSplits.map((split, i) => (
                <motion.div
                  key={split.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <Link href={`/split/${split.id}`}>
                    <Card className="h-full bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer group hover:border-primary/50">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Total</div>
                            <div className="font-bold text-lg text-foreground">{formatUsdcDisplay(split.totalAmount, { withSymbol: false })} <span className="text-xs text-primary">USDC</span></div>
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{split.title || "Untitled Split"}</h3>
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Creator: {shortAddress(split.creatorAddress)}</span>
                          <span className="text-primary font-medium">{split.paidCount}/{split.participantCount} paid</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-white/5 rounded-xl border border-white/5">
                No recent splits found. Be the first!
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white/[0.02] border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Create a split</h3>
              <p className="text-muted-foreground">Connect your wallet, enter the total amount, and choose how many people are paying.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Share the link</h3>
              <p className="text-muted-foreground">Send the unique link to your friends. They don't need an account, just a wallet.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Get paid in USDC</h3>
              <p className="text-muted-foreground">Friends pay their share directly to the smart contract, which settles in real-time.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
      <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}
