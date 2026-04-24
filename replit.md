# SplitPay

## Overview

SplitPay is a web3 dApp for splitting bills with USDC on Circle's **Arc Network**.
Create a split, share a link, friends pay their share on-chain. The repo is
configured to deploy on **Vercel** with the contract running on **Arc Testnet**
(Arc Mainnet is planned for 2026 — see `DEPLOY.md` for the migration path).

## Architecture

- **Frontend** (`artifacts/splitpay`): React + Vite + wagmi + RainbowKit + viem.
  Dark fintech UI with framer-motion. Pages: `/`, `/create`, `/split/:id`,
  `/me`, 404. Web3 helpers in `src/lib/web3/`.
- **Backend** (`artifacts/api-server`): Express 5 + Drizzle ORM. Used as a
  metadata indexer and config endpoint. Routes in `src/routes/`. Reused on
  Vercel via the `api/index.ts` serverless wrapper at the repo root.
- **Smart contract** (`contracts/hardhat/`): Full Hardhat project with
  compile / test / deploy / Sourcify-verify scripts. The contract is
  `contracts/hardhat/contracts/SplitPay.sol`.
- **Database**: Postgres via Drizzle (Neon recommended on Vercel). Schema in
  `lib/db/src/schema/splits.ts` (`splits`, `payments`).
- **API contract**: `lib/api-spec/openapi.yaml`. Run
  `pnpm --filter @workspace/api-spec run codegen` after any change.

### Arc App Kit as the source of truth

Chain configuration (chain id, RPC, USDC system address, native gas-token
decimals, explorer URL) is sourced from the official Circle **Arc App Kit**
(`@circle-fin/app-kit/chains`) instead of hand-rolled constants. See
[App Kit docs](https://docs.arc.network/app-kit).

- `artifacts/api-server/src/lib/config.ts` reads defaults from `ArcTestnet`
  and exposes them on `GET /api/config`. Env vars override individual fields
  (e.g. `ARC_RPC_URL`, `SPLITPAY_CONTRACT_ADDRESS`).
- `artifacts/splitpay/src/lib/web3/chain.ts` builds a viem `Chain` from the
  API config and re-exports `ArcTestnet` for any module that needs the
  canonical kit contract addresses (CCTP, gateway, bridge).
- USDC is the native gas token (18 decimals on the chain) and a standard
  ERC-20 with **6 decimals** at `0x36...000`. SplitPay charges in microUSDC.

### Deployed contract

- **Network**: Arc Testnet (chain id `5042002`)
- **SplitPay address**: `0x575f1AA76CAdC580723Ba98e6B79BA5463aA7886`
- **Deployer**: `0xA133F5d357602f485835229C2bB8ECF536575c33`
- **Explorer**: https://testnet.arcscan.app/address/0x575f1AA76CAdC580723Ba98e6B79BA5463aA7886
- **Sourcify**: https://repo.sourcify.dev/contracts/full_match/5042002/0x575f1AA76CAdC580723Ba98e6B79BA5463aA7886/

The contract address is wired into the app via the `SPLITPAY_CONTRACT_ADDRESS`
shared env var; the deployer key lives in the `DEPLOYER_PRIVATE_KEY` Replit
secret. To redeploy, run
`USDC_ADDRESS=0x36...000 pnpm --dir contracts/hardhat run deploy:arc-testnet`.

## Running on Replit

The repo runs as a single workflow (`Start application`) that boots both
servers in parallel via the root `dev` script:

- **API server** on `localhost:3001` (Express, `artifacts/api-server`)
- **Frontend** on port `5000` (Vite, `artifacts/splitpay`) — Vite proxies
  `/api/*` to the API server, so the browser only ever talks to port 5000.

`DATABASE_URL` is provided by Replit's built-in PostgreSQL. `BASE_PATH`
defaults to `/` and `API_PROXY_TARGET` defaults to `http://localhost:3001`
in the Vite config; both can be overridden via env vars.

To re-push the Drizzle schema after editing `lib/db/src/schema/`, run
`pnpm --filter @workspace/db run push`. After editing `lib/api-spec/openapi.yaml`,
run `pnpm --filter @workspace/api-spec run codegen`.

## Deployment (Vercel)

The full step-by-step guide lives in [`DEPLOY.md`](./DEPLOY.md). Short version:

1. Deploy the contract: `cd contracts/hardhat && pnpm deploy:arc-testnet`
2. Verify on Sourcify: `pnpm verify:sourcify --network arcTestnet`
3. Provision Postgres (Neon / Vercel Postgres) and push the schema.
4. Import the repo into Vercel — it picks up `vercel.json` automatically.
5. Set the Vercel env vars listed in `DEPLOY.md` and redeploy.

## Required production environment

The frontend reads chain config from `GET /api/config`, populated from these
server env vars (defaults are wired to Arc Testnet):

- `ARC_CHAIN_ID` (default `5042002`)
- `ARC_CHAIN_NAME` (default `"Arc Testnet"`)
- `ARC_RPC_URL` (default `https://rpc.testnet.arc.network`)
- `ARC_EXPLORER_URL` (default `https://testnet.arcscan.app`)
- `USDC_ADDRESS` (default `0x3600000000000000000000000000000000000000`, the
  Arc system USDC address — works on both testnet and mainnet)
- `SPLITPAY_CONTRACT_ADDRESS` — the contract address from your deploy
- `DATABASE_URL` — Postgres connection (use the pooled URL on Vercel)
- `VITE_WALLETCONNECT_PROJECT_ID` — optional, baked into the frontend at build
  time

## Stack

- React 19, Vite, Tailwind, shadcn/ui, framer-motion, lucide-react
- wagmi v3, viem, RainbowKit v2
- Express 5, Drizzle ORM, Postgres
- Hardhat 2 + hardhat-verify (Sourcify) for the contract
- Orval for OpenAPI codegen, Zod (`zod/v4`)
- Vercel serverless functions (Node) for the API

## Key commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/zod
- `pnpm --filter @workspace/db run push` — push DB schema (dev/prod)
- `cd contracts/hardhat && pnpm test` — run contract unit tests
- `cd contracts/hardhat && pnpm deploy:arc-testnet` — deploy contract
- `cd contracts/hardhat && pnpm verify:sourcify --network arcTestnet` — verify
