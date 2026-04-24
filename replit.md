# SplitPay

## Overview

SplitPay is a web3 dApp for splitting bills with USDC on Arc Network. Create a split, share a link, friends pay their share on-chain.

## Architecture

- **Frontend** (`artifacts/splitpay`): React + Vite + wagmi + RainbowKit + viem. Dark-themed fintech UI with framer-motion. Pages: `/` (landing), `/create`, `/split/:id`, `/me`, 404. All web3 helpers live in `src/lib/web3/`.
- **Backend** (`artifacts/api-server`): Express 5 + Drizzle, used purely as a metadata indexer for share links and stats. Routes in `src/routes/{splits,stats,health}.ts`.
- **Smart contract** (`contracts/SplitPay.sol`): Standalone Solidity contract, ERC20-driven. Deployable with Foundry or Hardhat — see `contracts/README.md`.
- **Database**: PostgreSQL via Drizzle. Schema in `lib/db/src/schema/splits.ts` (`splits`, `payments` tables).
- **API contract**: `lib/api-spec/openapi.yaml`. Run `pnpm --filter @workspace/api-spec run codegen` after changes.

## Required environment for production

The frontend reads chain configuration through `GET /api/config`, which is populated from these server env vars (defaults used for local dev):

- `ARC_CHAIN_ID` (default `512`)
- `ARC_CHAIN_NAME` (default `"Arc Network"`)
- `ARC_RPC_URL` (default `https://rpc.arc.network`)
- `ARC_EXPLORER_URL` (default `https://explorer.arc.network`)
- `USDC_ADDRESS` — USDC ERC20 token address on Arc
- `SPLITPAY_CONTRACT_ADDRESS` — the deployed `SplitPay` contract

Optional frontend env:

- `VITE_WALLETCONNECT_PROJECT_ID` — project id from WalletConnect Cloud (for mobile wallet connections)

## Stack

- React 19, Vite, Tailwind, shadcn/ui, framer-motion, lucide-react
- wagmi v3, viem, RainbowKit v2
- Express 5, Drizzle ORM, PostgreSQL
- Orval for OpenAPI codegen, Zod (`zod/v4`)

## Key commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/zod
- `pnpm --filter @workspace/db run push` — push DB schema (dev)
