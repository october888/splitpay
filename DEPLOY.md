# Deploying SplitPay to Vercel + Arc Testnet

This guide walks through a full production-style deploy of SplitPay using
**Vercel** for the web app + API and **Arc Testnet** for the smart contract.
You'll end up with:

- A live URL on Vercel
- A verified `SplitPay` contract on Arc Testnet
- A managed Postgres for the metadata indexer
- A path to flip to Arc Mainnet later by changing env vars only

> Heads up: Arc Mainnet is not live yet (Circle has it on the roadmap for
> 2026). Until then, "production" in this guide means **Arc Testnet with real
> wallets**. No real money is at risk — testnet USDC is free from
> <https://faucet.circle.com>.

---

## 1. Prerequisites

- A Vercel account (<https://vercel.com>)
- A wallet with some Arc-testnet USDC for deploying the contract — get USDC
  from <https://faucet.circle.com>
- A managed Postgres. Recommended free options:
  - **Neon** (<https://neon.tech>) — works great with Vercel
  - **Vercel Postgres** — one-click from the Vercel dashboard
- (Optional) A WalletConnect Cloud project for mobile wallet connections:
  <https://cloud.walletconnect.com>

---

## 2. Deploy the smart contract

```bash
cd contracts/hardhat
cp .env.example .env
# Open .env and set DEPLOYER_PRIVATE_KEY=<your testnet private key>

pnpm install
pnpm compile
pnpm test                      # sanity-check against a mock USDC
pnpm deploy:arc-testnet
```

You'll see something like:

```
SplitPay deployed at: 0xAbC...123
```

Save that address.

### Verify the contract on Sourcify

```bash
pnpm verify:sourcify --network arcTestnet
```

That uploads the source + metadata to Sourcify; the contract will then show
as verified in any Sourcify-aware explorer (and a public link at
<https://repo.sourcify.dev/contracts/full_match/5042002/{ADDRESS}/>).

> Note: Arcscan does not yet expose a public Etherscan-compatible verification
> API. Sourcify is the right path on Arc today.

---

## 3. Provision a Postgres database

Pick one:

**Neon (recommended):**
1. Create a project at <https://neon.tech>.
2. Copy the **pooled** connection string (looks like
   `postgresql://...neon.tech/...?sslmode=require&pgbouncer=true`).

**Vercel Postgres:**
1. In your Vercel project → Storage → Create Database → Postgres.
2. The `DATABASE_URL` is auto-injected as a project env var.

Push the schema once:

```bash
DATABASE_URL=<your-connection-string> \
  pnpm --filter @workspace/db run push
```

---

## 4. Push the repo to Vercel

You can either use the Vercel CLI or the dashboard.

**Dashboard:**
1. Push the repo to GitHub/GitLab/Bitbucket.
2. In Vercel → "Add New Project" → import the repo.
3. Set the **Build settings** (Vercel will auto-detect most of this from
   `vercel.json`):
   - **Framework Preset:** Other
   - **Install Command:** `pnpm install --frozen-lockfile=false`
   - **Build Command:** `pnpm --filter @workspace/api-spec run codegen && BASE_PATH=/ pnpm --filter @workspace/splitpay run build`
   - **Output Directory:** `artifacts/splitpay/dist/public`
4. Add the env vars in the next step.

**CLI:**

```bash
npm i -g vercel
vercel link
vercel env add ...   # see below
vercel --prod
```

---

## 5. Set Vercel environment variables

In your Vercel project → Settings → Environment Variables, add the following
for **Production** (and Preview, if you want):

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://...` | From step 3 |
| `ARC_CHAIN_ID` | `5042002` | Arc Testnet chain id |
| `ARC_CHAIN_NAME` | `Arc Testnet` | |
| `ARC_RPC_URL` | `https://rpc.testnet.arc.network` | Or an Alchemy/dRPC URL |
| `ARC_EXPLORER_URL` | `https://testnet.arcscan.app` | |
| `USDC_ADDRESS` | `0x3600000000000000000000000000000000000000` | Arc system USDC |
| `SPLITPAY_CONTRACT_ADDRESS` | `0x575f1AA76CAdC580723Ba98e6B79BA5463aA7886` | Latest deploy on Arc Testnet (step 2 if redeploying) |
| `VITE_WALLETCONNECT_PROJECT_ID` | `<project-id>` | Optional, for mobile wallets |
| `NODE_ENV` | `production` | |

The Vite-prefixed vars (`VITE_*`) are baked into the frontend bundle at build
time, so changing them requires a redeploy. The non-prefixed ones are read at
runtime by the API and exposed via `GET /api/config`, so the frontend picks
them up without rebuilding.

---

## 6. Deploy

Trigger a deploy (push to your default branch, or `vercel --prod`).
Once it finishes:

1. Open the Vercel URL.
2. Click **Connect Wallet** — your wallet should prompt to add **Arc Testnet**
   if it doesn't have it already.
3. Top up your wallet with USDC from <https://faucet.circle.com>.
4. Create a split, share the link, and have a friend pay their share.

Verify the on-chain side: each `payShare` transaction should appear on the
deployed `SplitPay` contract at <https://testnet.arcscan.app>.

---

## 7. Switching to Arc Mainnet later

When Arc Mainnet launches:

1. Redeploy the contract: `pnpm deploy:arc-mainnet` (after setting the mainnet
   RPC + chain id in `contracts/hardhat/.env`).
2. Verify it: `pnpm verify:sourcify --network arcMainnet`.
3. Update these Vercel env vars and redeploy:
   - `ARC_CHAIN_ID` → mainnet chain id
   - `ARC_CHAIN_NAME` → `Arc`
   - `ARC_RPC_URL` → mainnet RPC
   - `ARC_EXPLORER_URL` → `https://arcscan.app` (or whatever Circle publishes)
   - `SPLITPAY_CONTRACT_ADDRESS` → new mainnet address
   - `USDC_ADDRESS` → keep `0x36...000` (the system address is the same)

That's it — no code changes needed.

---

## Troubleshooting

- **API returns 500 with `DATABASE_URL` errors** — make sure you used the
  pooled connection string (with `pgbouncer=true` on Neon). Vercel functions
  open many short-lived connections.
- **Frontend shows the wrong chain** — `ARC_CHAIN_ID` mismatch. The frontend
  fetches `/api/config` once at load; hard-refresh after changing it.
- **`payShare` reverts with "wrong amount"** — for `EQUAL` splits the contract
  enforces the exact share returned by `getShareAmount`. The frontend already
  reads this; if you're calling the contract directly, fetch it first.
- **Wallet won't add the network** — chain id `5042002`, RPC
  `https://rpc.testnet.arc.network`, currency `USDC` (6 decimals). Some
  wallets cache rejected networks; remove and re-add.
