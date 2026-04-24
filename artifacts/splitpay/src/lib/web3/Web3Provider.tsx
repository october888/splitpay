import { useMemo, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { useGetConfig } from "@workspace/api-client-react";
import { buildArcChain } from "./chain";
import { AppConfigContext } from "./useAppConfig";
import { NetworkGuard } from "./NetworkGuard";
import "@rainbow-me/rainbowkit/styles.css";

// We intentionally only ship MetaMask + generic injected wallets so the dApp
// does not require a WalletConnect Cloud project id.  RainbowKit's
// `connectorsForWallets` accepts a fake `projectId` in this configuration
// because no WalletConnect-based wallet is registered, but the field is still
// required by the typings.
const FAKE_WALLETCONNECT_PROJECT_ID = "splitpay-no-walletconnect";

type Props = { children: ReactNode };

export function Web3Provider({ children }: Props) {
  const { data: cfg, isLoading, error } = useGetConfig();

  const wagmiConfig = useMemo(() => {
    if (!cfg) return null;
    const chain = buildArcChain(cfg);
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Recommended",
          wallets: [injectedWallet],
        },
      ],
      {
        appName: "SplitPay",
        projectId: FAKE_WALLETCONNECT_PROJECT_ID,
      },
    );
    return createConfig({
      chains: [chain],
      connectors,
      transports: {
        [chain.id]: http(cfg.rpcUrl),
      },
      ssr: false,
    });
  }, [cfg]);

  if (isLoading || !cfg || !wagmiConfig) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          {error ? "Could not load chain config." : "Loading…"}
        </div>
      </div>
    );
  }

  return (
    <AppConfigContext.Provider value={cfg}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "hsl(var(--primary))",
            accentColorForeground: "hsl(var(--primary-foreground))",
            borderRadius: "medium",
          })}
        >
          <NetworkGuard />
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </AppConfigContext.Provider>
  );
}
