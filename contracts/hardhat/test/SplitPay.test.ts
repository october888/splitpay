import { expect } from "chai";
import { ethers } from "hardhat";

describe("SplitPay", () => {
  async function deployFixture() {
    const [creator, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockUsdc");
    const usdc = await Token.deploy();
    await usdc.waitForDeployment();

    const SplitPay = await ethers.getContractFactory("SplitPay");
    const splitpay = await SplitPay.deploy(await usdc.getAddress());
    await splitpay.waitForDeployment();

    // Fund payers
    await usdc.mint(alice.address, 1_000_000n);
    await usdc.mint(bob.address, 1_000_000n);
    await usdc
      .connect(alice)
      .approve(await splitpay.getAddress(), ethers.MaxUint256);
    await usdc
      .connect(bob)
      .approve(await splitpay.getAddress(), ethers.MaxUint256);

    return { creator, alice, bob, usdc, splitpay };
  }

  it("equal split: each payer pays the right share, last covers remainder", async () => {
    const { creator, alice, bob, usdc, splitpay } = await deployFixture();
    // total = 100, 2 payers => 50 each (no remainder)
    const tx = await splitpay
      .connect(creator)
      .createSplit(100n, 2, 0, "Pizza");
    await tx.wait();

    const share = await splitpay.getShareAmount(0n, alice.address);
    expect(share).to.eq(50n);

    await splitpay.connect(alice).payShare(0n, 50n);
    await splitpay.connect(bob).payShare(0n, 50n);

    const balance = await usdc.balanceOf(creator.address);
    expect(balance).to.eq(100n);

    await expect(
      splitpay.connect(alice).payShare(0n, 50n),
    ).to.be.revertedWithCustomError(splitpay, "AlreadyPaid");
  });

  it("equal split with remainder: last payer covers it", async () => {
    const { creator, alice, bob, splitpay } = await deployFixture();
    // total = 101, 2 payers => 50, then last covers 51
    await splitpay.connect(creator).createSplit(101n, 2, 0, "Coffee");

    expect(await splitpay.getShareAmount(0n, alice.address)).to.eq(50n);
    await splitpay.connect(alice).payShare(0n, 50n);

    expect(await splitpay.getShareAmount(0n, bob.address)).to.eq(51n);
    await splitpay.connect(bob).payShare(0n, 51n);
  });

  it("custom split: anyone can pay any amount up to remaining", async () => {
    const { creator, alice, bob, splitpay, usdc } = await deployFixture();
    await splitpay.connect(creator).createSplit(100n, 2, 1, "Bar tab");
    await splitpay.connect(alice).payShare(0n, 30n);
    await splitpay.connect(bob).payShare(0n, 70n);
    expect(await usdc.balanceOf(creator.address)).to.eq(100n);
  });
});
