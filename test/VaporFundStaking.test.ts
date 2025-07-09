import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VaporFundStaking, MockERC20 } from "../typechain-types";

describe("VaporFundStaking", function () {
  // Fixture to deploy contracts
  async function deployStakingFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));

    // Deploy staking contract
    const VaporFundStaking = await ethers.getContractFactory("VaporFundStaking");
    const rewardRate = ethers.parseEther("100"); // 100 tokens per second
    const staking = await VaporFundStaking.deploy(
      await stakingToken.getAddress(),
      await rewardToken.getAddress(),
      rewardRate
    );

    // Transfer tokens to users
    await stakingToken.transfer(user1.address, ethers.parseEther("10000"));
    await stakingToken.transfer(user2.address, ethers.parseEther("10000"));

    // Transfer reward tokens to staking contract
    await rewardToken.transfer(await staking.getAddress(), ethers.parseEther("100000"));

    return { staking, stakingToken, rewardToken, owner, user1, user2, rewardRate };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      expect(await staking.owner()).to.equal(owner.address);
    });

    it("Should set the correct tokens and reward rate", async function () {
      const { staking, stakingToken, rewardToken, rewardRate } = await loadFixture(deployStakingFixture);
      expect(await staking.stakingToken()).to.equal(await stakingToken.getAddress());
      expect(await staking.rewardToken()).to.equal(await rewardToken.getAddress());
      expect(await staking.rewardRate()).to.equal(rewardRate);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const { staking, stakingToken, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = ethers.parseEther("100");

      // Approve tokens
      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);

      // Stake tokens
      await expect(staking.connect(user1).stake(stakeAmount))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, stakeAmount);

      expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount);
      expect(await staking.totalSupply()).to.equal(stakeAmount);
    });

    it("Should not allow staking 0 tokens", async function () {
      const { staking, user1 } = await loadFixture(deployStakingFixture);
      await expect(staking.connect(user1).stake(0)).to.be.revertedWith("Cannot stake 0");
    });
  });

  describe("Withdrawing", function () {
    it("Should allow users to withdraw staked tokens", async function () {
      const { staking, stakingToken, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");

      // Stake first
      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      // Withdraw
      await expect(staking.connect(user1).withdraw(withdrawAmount))
        .to.emit(staking, "Withdrawn")
        .withArgs(user1.address, withdrawAmount);

      expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount - withdrawAmount);
      expect(await staking.totalSupply()).to.equal(stakeAmount - withdrawAmount);
    });

    it("Should not allow withdrawing more than staked", async function () {
      const { staking, stakingToken, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = ethers.parseEther("100");

      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      await expect(staking.connect(user1).withdraw(ethers.parseEther("200")))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Rewards", function () {
    it("Should calculate rewards correctly", async function () {
      const { staking, stakingToken, user1, rewardRate } = await loadFixture(deployStakingFixture);
      const stakeAmount = ethers.parseEther("100");

      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      // Wait for 10 seconds
      await time.increase(10);

      // Expected reward = stakeAmount * rewardRate * time / totalSupply
      // = 100 * 100 * 10 / 100 = 1000 tokens
      const expectedReward = rewardRate * 10n;
      const earned = await staking.earned(user1.address);
      
      // Allow for small rounding differences
      expect(earned).to.be.closeTo(expectedReward, ethers.parseEther("1"));
    });

    it("Should allow users to claim rewards", async function () {
      const { staking, stakingToken, rewardToken, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = ethers.parseEther("100");

      await stakingToken.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      await time.increase(10);

      const earnedBefore = await staking.earned(user1.address);
      const balanceBefore = await rewardToken.balanceOf(user1.address);

      await expect(staking.connect(user1).getReward())
        .to.emit(staking, "RewardPaid");

      const balanceAfter = await rewardToken.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.be.closeTo(earnedBefore, ethers.parseEther("1"));
      expect(await staking.earned(user1.address)).to.be.lt(ethers.parseEther("1"));
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to update reward rate", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      const newRate = ethers.parseEther("200");

      await expect(staking.connect(owner).setRewardRate(newRate))
        .to.emit(staking, "RewardRateUpdated")
        .withArgs(newRate);

      expect(await staking.rewardRate()).to.equal(newRate);
    });

    it("Should allow owner to pause and unpause", async function () {
      const { staking, stakingToken, owner, user1 } = await loadFixture(deployStakingFixture);

      await staking.connect(owner).pause();
      
      // Staking should fail when paused
      await stakingToken.connect(user1).approve(await staking.getAddress(), ethers.parseEther("100"));
      await expect(staking.connect(user1).stake(ethers.parseEther("100")))
        .to.be.revertedWith("Pausable: paused");

      await staking.connect(owner).unpause();
      
      // Staking should work when unpaused
      await expect(staking.connect(user1).stake(ethers.parseEther("100")))
        .to.emit(staking, "Staked");
    });
  });
});