import { ethers, network } from "hardhat";

async function main() {
  const usdc = process.env.USDC_ADDRESS;
  if (!usdc || !/^0x[0-9a-fA-F]{40}$/.test(usdc)) {
    throw new Error(
      "USDC_ADDRESS env var is required (a 40-hex-char 0x-prefixed address).",
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Network:    ${network.name}`);
  console.log(`Deployer:   ${deployer.address}`);
  console.log(`USDC:       ${usdc}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:    ${ethers.formatUnits(balance, 6)} USDC (gas)`);

  const SplitPay = await ethers.getContractFactory("SplitPay");
  const splitpay = await SplitPay.deploy(usdc);
  console.log(`Tx hash:    ${splitpay.deploymentTransaction()?.hash}`);
  await splitpay.waitForDeployment();
  const address = await splitpay.getAddress();
  console.log("");
  console.log(`SplitPay deployed at: ${address}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Set SPLITPAY_CONTRACT_ADDRESS=" + address + " on Vercel.");
  console.log("  2. Verify the source on Sourcify:");
  console.log(`       pnpm verify:sourcify --network ${network.name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
