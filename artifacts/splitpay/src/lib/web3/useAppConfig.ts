import { createContext, useContext } from "react";
import type { AppConfig } from "@workspace/api-client-react";

export const AppConfigContext = createContext<AppConfig | null>(null);

export function useAppConfig(): AppConfig {
  const cfg = useContext(AppConfigContext);
  if (!cfg) {
    throw new Error("useAppConfig must be used inside <Web3Provider>");
  }
  return cfg;
}
