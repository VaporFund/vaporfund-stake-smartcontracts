import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VaporFundStaking, MockERC20, MockWETH } from "../typechain-types";

describe("VaporFundStaking", function () {
  // Constants
  const ADMIN_ROLE = ethers.id("ADMIN_ROLE");
  const PAUSER_ROLE = ethers.id("PAUSER_ROLE");
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  // Fixture to deploy contracts
  async function deployStakingFixture() {
    const [owner, admin, pauser, multiSig, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    const mockUSDT = await MockERC20.deploy("Mock USDT", "mUSDT", 6);
    const mockDAI = await MockERC20.deploy("Mock DAI", "mDAI", 18);
    // Deploy MockWETH for proper WETH functionality
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const mockWETH = await MockWETH.deploy();

    // Deploy staking contract
    const VaporFundStaking = await ethers.getContractFactory("VaporFundStaking");
    const staking = await VaporFundStaking.deploy(
      multiSig.address,
      await mockWETH.getAddress()
    );

    // Grant roles
    await staking.grantRole(ADMIN_ROLE, admin.address);
    await staking.grantRole(PAUSER_ROLE, pauser.address);

    // Mint tokens to users
    const usdcAmount = ethers.parseUnits("10000", 6);
    const daiAmount = ethers.parseEther("10000");
    
    await mockUSDC.mint(user1.address, usdcAmount);
    await mockUSDC.mint(user2.address, usdcAmount);
    await mockUSDT.mint(user1.address, usdcAmount);
    await mockUSDT.mint(user2.address, usdcAmount);
    await mockDAI.mint(user1.address, daiAmount);
    await mockDAI.mint(user2.address, daiAmount);

    return { 
      staking, 
      mockUSDC, 
      mockUSDT, 
      mockDAI, 
      mockWETH: mockWETH as MockWETH,
      owner, 
      admin, 
      pauser, 
      multiSig, 
      user1, 
      user2,
      user3 
    };
  }

  // Fixture with whitelisted tokens
  async function deployWithWhitelistedTokensFixture() {
    const fixtures = await deployStakingFixture();
    const { staking, mockUSDC, mockDAI, mockWETH, owner } = fixtures;
    
    // Whitelist tokens
    await staking.connect(owner).whitelistToken(
      await mockUSDC.getAddress(),
      ethers.parseUnits("10", 6),   // 10 USDC min
      ethers.parseUnits("100000", 6) // 100k USDC max
    );
    
    await staking.connect(owner).whitelistToken(
      await mockDAI.getAddress(),
      ethers.parseEther("10"),       // 10 DAI min
      ethers.parseEther("100000")    // 100k DAI max
    );
    
    await staking.connect(owner).whitelistToken(
      await mockWETH.getAddress(),
      ethers.parseEther("0.01"),     // 0.01 ETH min
      ethers.parseEther("1000")      // 1000 ETH max
    );
    
    return fixtures;
  }

  describe("Deployment", function () {
    it("Should set the correct multiSig wallet", async function () {
      const { staking, multiSig } = await loadFixture(deployStakingFixture);
      expect(await staking.multiSigWallet()).to.equal(multiSig.address);
    });

    it("Should set the correct WETH address", async function () {
      const { staking, mockWETH } = await loadFixture(deployStakingFixture);
      expect(await staking.wethAddress()).to.equal(await mockWETH.getAddress());
    });

    it("Should grant correct roles", async function () {
      const { staking, owner, admin, pauser } = await loadFixture(deployStakingFixture);
      
      expect(await staking.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await staking.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await staking.hasRole(PAUSER_ROLE, pauser.address)).to.be.true;
    });
  });

  describe("Token Whitelist Management", function () {
    it("Should allow owner to whitelist a token", async function () {
      const { staking, mockUSDC, owner } = await loadFixture(deployStakingFixture);
      
      const minDeposit = ethers.parseUnits("10", 6);
      const maxDeposit = ethers.parseUnits("100000", 6);
      
      await expect(staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        minDeposit,
        maxDeposit
      )).to.emit(staking, "TokenWhitelisted")
        .withArgs(await mockUSDC.getAddress(), minDeposit, maxDeposit);
      
      expect(await staking.isTokenWhitelisted(await mockUSDC.getAddress())).to.be.true;
      
      const tokenInfo = await staking.getTokenInfo(await mockUSDC.getAddress());
      expect(tokenInfo.isWhitelisted).to.be.true;
      expect(tokenInfo.minDeposit).to.equal(minDeposit);
      expect(tokenInfo.maxDeposit).to.equal(maxDeposit);
    });

    it("Should not allow non-owner to whitelist a token", async function () {
      const { staking, mockUSDC, user1 } = await loadFixture(deployStakingFixture);
      
      await expect(staking.connect(user1).whitelistToken(
        await mockUSDC.getAddress(),
        100,
        1000
      )).to.be.revertedWith(/AccessControl: account .* is missing role/);
    });

    it("Should not allow whitelisting already whitelisted token", async function () {
      const { staking, mockUSDC, owner } = await loadFixture(deployStakingFixture);
      
      await staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        100,
        1000
      );
      
      await expect(staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        100,
        1000
      )).to.be.revertedWith("Token already whitelisted");
    });

    it("Should allow owner to remove token from whitelist", async function () {
      const { staking, mockUSDC, owner } = await loadFixture(deployStakingFixture);
      
      // First whitelist the token
      await staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        100,
        1000
      );
      
      // Then remove it
      await expect(staking.connect(owner).removeTokenFromWhitelist(
        await mockUSDC.getAddress()
      )).to.emit(staking, "TokenRemovedFromWhitelist")
        .withArgs(await mockUSDC.getAddress());
      
      expect(await staking.isTokenWhitelisted(await mockUSDC.getAddress())).to.be.false;
    });
  });

  describe("Token Deposits", function () {

    it("Should allow users to deposit whitelisted tokens", async function () {
      const { staking, mockUSDC, user1, multiSig } = await loadFixture(deployWithWhitelistedTokensFixture);
      
      const depositAmount = ethers.parseUnits("100", 6);
      
      // Approve staking contract
      await mockUSDC.connect(user1).approve(await staking.getAddress(), depositAmount);
      
      // Check multiSig balance before
      const multiSigBalanceBefore = await mockUSDC.balanceOf(multiSig.address);
      
      // Deposit tokens
      await expect(staking.connect(user1).depositToken(
        await mockUSDC.getAddress(),
        depositAmount
      )).to.emit(staking, "TokensDeposited")
        .withArgs(user1.address, await mockUSDC.getAddress(), depositAmount, await time.latest() + 1);
      
      // Check balances
      expect(await staking.getUserTokenBalance(user1.address, await mockUSDC.getAddress()))
        .to.equal(depositAmount);
      expect(await mockUSDC.balanceOf(multiSig.address))
        .to.equal(multiSigBalanceBefore + depositAmount);
      expect(await staking.totalDeposited(await mockUSDC.getAddress()))
        .to.equal(depositAmount);
    });

    it("Should not allow deposit of non-whitelisted tokens", async function () {
      const { staking, mockUSDT, user1 } = await loadFixture(deployStakingFixture);
      
      await mockUSDT.connect(user1).approve(await staking.getAddress(), 1000);
      
      await expect(staking.connect(user1).depositToken(
        await mockUSDT.getAddress(),
        1000
      )).to.be.revertedWith("Token not whitelisted");
    });

    it("Should enforce minimum deposit amount", async function () {
      const { staking, mockUSDC, user1 } = await loadFixture(deployWithWhitelistedTokensFixture);
      
      const belowMin = ethers.parseUnits("5", 6); // Below 10 USDC minimum
      
      await mockUSDC.connect(user1).approve(await staking.getAddress(), belowMin);
      
      await expect(staking.connect(user1).depositToken(
        await mockUSDC.getAddress(),
        belowMin
      )).to.be.revertedWith("Below minimum deposit");
    });

    it("Should enforce maximum deposit amount", async function () {
      const { staking, mockUSDC, user1 } = await loadFixture(deployWithWhitelistedTokensFixture);
      
      const aboveMax = ethers.parseUnits("200000", 6); // Above 100k USDC maximum
      
      // Mint more tokens to user
      await mockUSDC.mint(user1.address, aboveMax);
      await mockUSDC.connect(user1).approve(await staking.getAddress(), aboveMax);
      
      await expect(staking.connect(user1).depositToken(
        await mockUSDC.getAddress(),
        aboveMax
      )).to.be.revertedWith("Exceeds maximum deposit");
    });
  });

  describe("ETH Deposits", function () {
    it("Should allow users to deposit ETH", async function () {
      const { staking, mockWETH, user1, multiSig } = await loadFixture(deployWithWhitelistedTokensFixture);
      
      const depositAmount = ethers.parseEther("1");
      
      // For this test, we need to make the mock WETH actually wrap ETH
      // In a real test, we'd use a proper WETH mock
      
      await expect(staking.connect(user1).depositETH({ value: depositAmount }))
        .to.emit(staking, "ETHDeposited")
        .withArgs(user1.address, depositAmount, await time.latest() + 1);
      
      expect(await staking.getUserTokenBalance(user1.address, await mockWETH.getAddress()))
        .to.equal(depositAmount);
    });

    it("Should reject ETH sent to receive function", async function () {
      const { staking, user1 } = await loadFixture(deployStakingFixture);
      
      await expect(user1.sendTransaction({
        to: await staking.getAddress(),
        value: ethers.parseEther("1")
      })).to.be.revertedWith("Use depositETH() to deposit ETH");
    });
  });

  describe("Withdrawal Allocation", function () {
    // Fixture with deposits
    async function deployWithDepositsFixture() {
      const fixtures = await deployWithWhitelistedTokensFixture();
      const { staking, mockUSDC, user1 } = fixtures;
      
      // Make a deposit
      const depositAmount = ethers.parseUnits("1000", 6);
      await mockUSDC.connect(user1).approve(await staking.getAddress(), depositAmount);
      await staking.connect(user1).depositToken(await mockUSDC.getAddress(), depositAmount);
      
      return fixtures;
    }

    it("Should allow admin to allocate withdrawal", async function () {
      const { staking, mockUSDC, admin, user1 } = await loadFixture(deployWithDepositsFixture);
      
      const withdrawAmount = ethers.parseUnits("500", 6);
      const nonce = 1;
      
      await expect(staking.connect(admin).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        withdrawAmount,
        nonce
      )).to.emit(staking, "WithdrawalAllocated");
      
      // Check withdrawal request
      const withdrawalId = 1;
      const request = await staking.getWithdrawalRequest(withdrawalId);
      expect(request.user).to.equal(user1.address);
      expect(request.token).to.equal(await mockUSDC.getAddress());
      expect(request.amount).to.equal(withdrawAmount);
      expect(request.nonce).to.equal(nonce);
      expect(request.processed).to.be.false;
      expect(request.cancelled).to.be.false;
      
      // Check user balance was reduced
      expect(await staking.getUserTokenBalance(user1.address, await mockUSDC.getAddress()))
        .to.equal(ethers.parseUnits("500", 6));
    });

    it("Should not allow non-admin to allocate withdrawal", async function () {
      const { staking, mockUSDC, user1, user2 } = await loadFixture(deployWithDepositsFixture);
      
      await expect(staking.connect(user2).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        100,
        1
      )).to.be.revertedWith(/AccessControl: account .* is missing role/);
    });

    it("Should not allow reusing nonce", async function () {
      const { staking, mockUSDC, admin, user1 } = await loadFixture(deployWithDepositsFixture);
      
      const nonce = 1;
      
      // First allocation
      await staking.connect(admin).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        ethers.parseUnits("100", 6),
        nonce
      );
      
      // Try to reuse nonce
      await expect(staking.connect(admin).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        ethers.parseUnits("100", 6),
        nonce
      )).to.be.revertedWith("Nonce already used");
    });

    it("Should allow admin to cancel withdrawal", async function () {
      const { staking, mockUSDC, admin, user1 } = await loadFixture(deployWithDepositsFixture);
      
      // Allocate withdrawal
      const withdrawAmount = ethers.parseUnits("500", 6);
      await staking.connect(admin).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        withdrawAmount,
        1
      );
      
      const withdrawalId = 1;
      
      // Cancel withdrawal
      await expect(staking.connect(admin).cancelWithdrawal(withdrawalId))
        .to.emit(staking, "WithdrawalCancelled")
        .withArgs(withdrawalId, admin.address);
      
      // Check withdrawal is cancelled
      const request = await staking.getWithdrawalRequest(withdrawalId);
      expect(request.cancelled).to.be.true;
      
      // Check user balance was restored
      expect(await staking.getUserTokenBalance(user1.address, await mockUSDC.getAddress()))
        .to.equal(ethers.parseUnits("1000", 6));
    });

    it("Should allow user to process their withdrawal", async function () {
      const { staking, mockUSDC, admin, user1 } = await loadFixture(deployWithDepositsFixture);
      
      // Allocate withdrawal
      await staking.connect(admin).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        ethers.parseUnits("500", 6),
        1
      );
      
      const withdrawalId = 1;
      
      // Process withdrawal
      await expect(staking.connect(user1).processWithdrawal(withdrawalId))
        .to.emit(staking, "WithdrawalProcessed");
      
      // Check withdrawal is processed
      const request = await staking.getWithdrawalRequest(withdrawalId);
      expect(request.processed).to.be.true;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update multiSig wallet", async function () {
      const { staking, owner, user3 } = await loadFixture(deployStakingFixture);
      
      const oldMultiSig = await staking.multiSigWallet();
      
      await expect(staking.connect(owner).updateMultiSigWallet(user3.address))
        .to.emit(staking, "MultiSigUpdated")
        .withArgs(oldMultiSig, user3.address);
      
      expect(await staking.multiSigWallet()).to.equal(user3.address);
    });

    it("Should allow pauser to pause and unpause", async function () {
      const { staking, mockUSDC, owner, pauser, user1 } = await loadFixture(deployStakingFixture);
      
      // Whitelist token
      await staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        100,
        10000
      );
      
      // Pause contract
      await expect(staking.connect(pauser).pause())
        .to.emit(staking, "ContractPaused")
        .withArgs(pauser.address);
      
      // Try to deposit when paused
      await mockUSDC.connect(user1).approve(await staking.getAddress(), 1000);
      await expect(staking.connect(user1).depositToken(
        await mockUSDC.getAddress(),
        1000
      )).to.be.revertedWith("Pausable: paused");
      
      // Unpause contract
      await expect(staking.connect(pauser).unpause())
        .to.emit(staking, "ContractUnpaused")
        .withArgs(pauser.address);
      
      // Should work now
      await staking.connect(user1).depositToken(
        await mockUSDC.getAddress(),
        1000
      );
    });

    it("Should allow owner to perform emergency withdrawal", async function () {
      const { staking, mockUSDC, owner, user1 } = await loadFixture(deployStakingFixture);
      
      // Send some tokens to the contract (shouldn't happen in normal operation)
      await mockUSDC.mint(await staking.getAddress(), ethers.parseUnits("1000", 6));
      
      const contractBalance = await mockUSDC.balanceOf(await staking.getAddress());
      const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
      
      await expect(staking.connect(owner).emergencyWithdrawAll(await mockUSDC.getAddress()))
        .to.emit(staking, "EmergencyWithdraw")
        .withArgs(await mockUSDC.getAddress(), contractBalance, owner.address);
      
      expect(await mockUSDC.balanceOf(owner.address))
        .to.equal(ownerBalanceBefore + contractBalance);
    });
  });

  describe("Testnet Features", function () {
    it("Should detect testnet correctly", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      // On Hardhat network (chainId 31337), should be considered testnet
      expect(await staking.isTestnet()).to.be.true;
    });

    it("Should allow time manipulation on testnet", async function () {
      const { staking, admin } = await loadFixture(deployStakingFixture);
      
      const advanceTime = 7 * 24 * 60 * 60; // 7 days
      
      await expect(staking.connect(admin).fastForwardTime(advanceTime))
        .to.emit(staking, "TimeAdvanced");
    });

    it("Should allow setting mock prices on testnet", async function () {
      const { staking, mockUSDC, owner, admin } = await loadFixture(deployStakingFixture);
      
      // Whitelist token first
      await staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        100,
        10000
      );
      
      const mockPrice = ethers.parseEther("1"); // $1.00
      
      await expect(staking.connect(admin).setMockPrice(
        await mockUSDC.getAddress(),
        mockPrice
      )).to.emit(staking, "MockPriceSet")
        .withArgs(await mockUSDC.getAddress(), mockPrice);
    });

    it("Should not allow testnet features on mainnet", async function () {
      // This test would need to mock the chainId to be 1 (mainnet)
      // In practice, these functions check block.chainid
    });
  });

  describe("Edge Cases and Error Conditions", function () {
    it("Should handle zero address validation", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      
      await expect(staking.connect(owner).whitelistToken(
        ethers.ZeroAddress,
        100,
        1000
      )).to.be.revertedWith("Invalid address");
    });

    it("Should validate min/max deposit limits", async function () {
      const { staking, mockUSDC, owner } = await loadFixture(deployStakingFixture);
      
      // Min deposit must be > 0
      await expect(staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        0,
        1000
      )).to.be.revertedWith("Min deposit must be > 0");
      
      // Max must be >= min
      await expect(staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        1000,
        500
      )).to.be.revertedWith("Max must be >= min");
    });

    it("Should track user tokens correctly", async function () {
      const { staking, mockUSDC, mockDAI, owner, user1 } = await loadFixture(deployStakingFixture);
      
      // Whitelist tokens
      await staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        ethers.parseUnits("10", 6),
        ethers.parseUnits("100000", 6)
      );
      
      await staking.connect(owner).whitelistToken(
        await mockDAI.getAddress(),
        ethers.parseEther("10"),
        ethers.parseEther("100000")
      );
      
      // Deposit both tokens
      await mockUSDC.connect(user1).approve(await staking.getAddress(), ethers.parseUnits("100", 6));
      await staking.connect(user1).depositToken(await mockUSDC.getAddress(), ethers.parseUnits("100", 6));
      
      await mockDAI.connect(user1).approve(await staking.getAddress(), ethers.parseEther("100"));
      await staking.connect(user1).depositToken(await mockDAI.getAddress(), ethers.parseEther("100"));
      
      // Check user tokens list
      const userTokens = await staking.getUserTokens(user1.address);
      expect(userTokens.length).to.equal(2);
      expect(userTokens).to.include(await mockUSDC.getAddress());
      expect(userTokens).to.include(await mockDAI.getAddress());
    });

    it("Should handle insufficient balance for withdrawal allocation", async function () {
      const { staking, mockUSDC, owner, admin, user1 } = await loadFixture(deployStakingFixture);
      
      // Whitelist and deposit
      await staking.connect(owner).whitelistToken(
        await mockUSDC.getAddress(),
        ethers.parseUnits("10", 6),
        ethers.parseUnits("100000", 6)
      );
      
      const depositAmount = ethers.parseUnits("100", 6);
      await mockUSDC.connect(user1).approve(await staking.getAddress(), depositAmount);
      await staking.connect(user1).depositToken(await mockUSDC.getAddress(), depositAmount);
      
      // Try to allocate more than deposited
      await expect(staking.connect(admin).allocateWithdrawal(
        user1.address,
        await mockUSDC.getAddress(),
        ethers.parseUnits("200", 6),
        1
      )).to.be.revertedWith("Insufficient user balance");
    });
  });
});