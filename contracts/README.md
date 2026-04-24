# SplitPay smart contract

The on-chain piece of SplitPay lives at `contracts/hardhat/contracts/SplitPay.sol`.
It is a self-contained ERC-20-driven splitter: each `Split` has a creator (the
payee), a total amount, a participant count, and a split type (`EQUAL` or
`CUSTOM`). Participants approve USDC, call `payShare`, and the contract forwards
the funds straight to the creator. There is no escrow and no contract-held
balance — the contract only enforces the split rules.

The Hardhat project under `./hardhat/` is the canonical way to compile, test,
deploy, and verify the contract.

## Quick start

```bash
cd contracts/hardhat
cp .env.example .env          # then fill in DEPLOYER_PRIVATE_KEY
pnpm install                  # or: npm install / yarn install
pnpm compile
pnpm test                     # local sanity tests against a mock USDC
```

## Deploy to Arc Testnet

Get yourself some testnet USDC from <https://faucet.circle.com> first — USDC is
the gas token on Arc, so the deployer needs a small balance.

```bash
cd contracts/hardhat
USDC_ADDRESS=0x3600000000000000000000000000000000000000 \
  pnpm deploy:arc-testnet
```

The script prints the deployed address. Save it — you'll set it on Vercel as
`SPLITPAY_CONTRACT_ADDRESS`.

## Verify the source on Sourcify

Arcscan does not (yet) expose a public Etherscan-compatible verification API,
so verification goes through Sourcify, which works for any EVM chain by chain
id and is independent of the explorer.

```bash
cd contracts/hardhat
pnpm verify:sourcify --network arcTestnet
```

After it succeeds you can look the contract up at
<https://repo.sourcify.dev/contracts/full_match/5042002/{ADDRESS}/> and most
explorers (including Arcscan, once they index Sourcify) will show it as
verified.

## Switching to Arc Mainnet (when it launches)

Arc Mainnet is planned for 2026. Once Circle publishes the official endpoint:

1. Set `ARC_MAINNET_RPC_URL` and `ARC_MAINNET_CHAIN_ID` in `.env`.
2. `pnpm deploy:arc-mainnet`
3. `pnpm verify:sourcify --network arcMainnet`
4. Update the Vercel env vars (`ARC_CHAIN_ID`, `ARC_RPC_URL`,
   `ARC_EXPLORER_URL`, `SPLITPAY_CONTRACT_ADDRESS`) and redeploy.

No frontend rebuild is required — the app reads chain config from
`GET /api/config` at runtime.
