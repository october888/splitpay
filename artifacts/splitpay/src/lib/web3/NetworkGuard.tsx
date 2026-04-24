import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAppConfig } from "./useAppConfig";

/**
 * Watches the connected wallet's chain id; when it differs from the
 * configured Arc chain, pops up a modal asking the user to switch.
 *
 * Clicking "Switch network" calls wagmi's `switchChain`, which under the hood
 * sends `wallet_switchEthereumChain` to MetaMask. If MetaMask doesn't yet
 * have Arc configured, it will follow up with `wallet_addEthereumChain` so
 * the user gets the standard MetaMask "Add network" prompt automatically.
 */
export function NetworkGuard() {
  const cfg = useAppConfig();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);

  const wrongNetwork = isConnected && chainId !== cfg.chainId;
  const open = wrongNetwork && !dismissed;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true);
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="dialog-wrong-network">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center">Wrong network</DialogTitle>
          <DialogDescription className="text-center">
            SplitPay runs on{" "}
            <span className="font-medium text-foreground">{cfg.chainName}</span>{" "}
            (chain id {cfg.chainId}). Your wallet is connected to a different
            network. Switch to continue.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p
            className="text-xs text-red-400 text-center"
            data-testid="text-switch-error"
          >
            {error.message}
          </p>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-network"
          >
            Not now
          </Button>
          <Button
            onClick={() => switchChain({ chainId: cfg.chainId })}
            disabled={isPending}
            data-testid="button-switch-network"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Switching…
              </>
            ) : (
              `Switch to ${cfg.chainName}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
