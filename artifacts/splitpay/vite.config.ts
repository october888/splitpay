import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// `@rainbow-me/rainbowkit@2.2.10` imports `{ gemini }` from `wagmi/connectors`,
// but the resolved `@wagmi/connectors@8.0.4` does not export it (it was
// added in a later version).  We never expose the Gemini wallet, so we
// append a stub `gemini` export to the `wagmi/connectors` module at load
// time to keep dependency optimization and the import-analysis plugin
// happy.
function geminiConnectorShim(): Plugin {
  const targetSuffix = "/wagmi/dist/esm/exports/connectors.js";
  const stub =
    "\nexport const gemini = () => { throw new Error('Gemini connector is not available in this build.'); };\n";
  return {
    name: "splitpay:gemini-connector-shim",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(targetSuffix)) return null;
      if (code.includes("export const gemini")) return null;
      return { code: code + stub, map: null };
    },
  };
}

const rawPort = process.env.PORT ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://localhost:3001";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "splitpay:gemini-connector-shim",
          setup(build) {
            build.onLoad(
              { filter: /\/wagmi\/dist\/esm\/exports\/connectors\.js$/ },
              async (args) => {
                const fs = await import("node:fs/promises");
                const original = await fs.readFile(args.path, "utf8");
                return {
                  contents:
                    original +
                    "\nexport const gemini = () => { throw new Error('Gemini connector is not available in this build.'); };\n",
                  loader: "js",
                };
              },
            );
          },
        },
      ],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
