# SplitPay smart contracts

The `SplitPay.sol` contract is the on-chain piece of SplitPay. Each split is created on-chain with a total amount, a participant count, and a split type (`EQUAL` or `CUSTOM`). Participants then pay their share in USDC (or any ERC20 token configured at deploy time) — funds are forwarded directly to the split creator.

This folder is intentionally framework-agnostic. The contract source compiles cleanly with both Foundry and Hardhat. Pick whichever you prefer.

---

## Deploying with Foundry

```bash
# 1. Install Foundry: https://book.getfoundry.sh/getting-started/installation
forge init --no-commit splitpay-foundry
cp SplitPay.sol splitpay-foundry/src/SplitPay.sol

# 2. Compile
cd splitpay-foundry
forge build

# 3. Deploy to Arc Network
#    Pass the on-chain USDC address as the constructor argument.
forge create src/SplitPay.sol:SplitPay \
  --rpc-url $ARC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $USDC_ADDRESS
```

## Deploying with Hardhat

```bash
npm install --save-dev hardhat
npx hardhat init
# Place SplitPay.sol in contracts/

cat > scripts/deploy.ts <<'EOF'
import { ethers } from "hardhat";

async function main() {
  const usdc = process.env.USDC_ADDRESS!;
  const SplitPay = await ethers.getContractFactory("SplitPay");
  const splitpay = await SplitPay.deploy(usdc);
  await splitpay.waitForDeployment();
  console.log("SplitPay deployed at:", await splitpay.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
EOF

USDC_ADDRESS=0x... npx hardhat run scripts/deploy.ts --network arc
```

## Wiring it up

After deployment, set these environment variables for the SplitPay app:

```bash
ARC_CHAIN_ID=...
ARC_CHAIN_NAME="Arc Network"
ARC_RPC_URL=https://...
ARC_EXPLORER_URL=https://explorer.arc.network
USDC_ADDRESS=0x...
SPLITPAY_CONTRACT_ADDRESS=0x...   # the contract you just deployed
```

The frontend reads these through the `/api/config` endpoint, so no rebuild is required.
