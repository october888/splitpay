import { useMemo, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  RainbowKitProvider,
  getDefaultWallets,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { useGetConfig } from "@workspace/api-client-react";
import { buildArcChain } from "./chain";
import { AppConfigContext } from "./useAppConfig";
import "@rainbow-me/rainbowkit/styles.css";

const WALLETCONNECT_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ??
  "splitpay-dev";

type Props = { children: ReactNode };

export function Web3Provider({ children }: Props) {
  const { data: cfg, isLoading, error } = useGetConfig();

  const wagmiConfig = useMemo(() => {
    if (!cfg) return null;
    const chain = buildArcChain(cfg);
    const { connectors } = getDefaultWallets({
      appName: "SplitPay",
      projectId: WALLETCONNECT_PROJECT_ID,
    });
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
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </AppConfigContext.Provider>
  );
}
