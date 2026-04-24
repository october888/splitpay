import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ConnectButton, useAppConfig, shortAddress } from "@/lib/web3";
import { Coins } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const cfg = useAppConfig();

  return (
    <div className="min-h-[100dvh] flex flex-col selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Coins className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">SplitPay</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/create" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/create' ? 'text-primary' : 'text-muted-foreground'}`}>
                Create Split
              </Link>
              <Link href="/me" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/me' ? 'text-primary' : 'text-muted-foreground'}`}>
                My Splits
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative z-0">
        {children}
      </main>

      <footer className="py-8 border-t border-white/5 bg-background/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Connected to {cfg.chainName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Contract: {shortAddress(cfg.splitPayAddress)}</span>
            <a href={`${cfg.explorerUrl}/address/${cfg.splitPayAddress}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              View on Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
