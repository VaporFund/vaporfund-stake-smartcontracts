import { ethers, run } from "hardhat";

async function main() {
  console.log("Deploying VaporFund Multi-Token Staking contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  console.log("Deploying to network:", network.name, "Chain ID:", chainId);

  // Configuration based on network
  let multiSigWallet: string;
  let wethAddress: string;

  if (chainId === 1n) {
    // Mainnet
    multiSigWallet = process.env.MAINNET_MULTISIG_WALLET || "0x0000000000000000000000000000000000000000";
    wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Mainnet WETH
  } else if (chainId === 11155111n) {
    // Sepolia
    multiSigWallet = process.env.SEPOLIA_MULTISIG_WALLET || deployer.address;
    wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"; // Sepolia WETH
  } else if (chainId === 5n) {
    // Goerli
    multiSigWallet = process.env.GOERLI_MULTISIG_WALLET || deployer.address;
    wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"; // Goerli WETH
  } else {
    // Local or other networks
    multiSigWallet = process.env.LOCAL_MULTISIG_WALLET || "0xcd3B766CCDd6AE721141F452C550Ca635964ce71";
    // Deploy mock WETH for local testing
    console.log("Deploying mock WETH for local testing...");
    const MockWETH = await ethers.getContractFactory("MockERC20");
    const mockWETH = await MockWETH.deploy("Wrapped Ether", "WETH", 18);
    await mockWETH.waitForDeployment();
    wethAddress = await mockWETH.getAddress();
    console.log("Mock WETH deployed to:", wethAddress);
  }

  // Deploy VaporFundStaking contract
  const VaporFundStaking = await ethers.getContractFactory("VaporFundStaking");
  const staking = await VaporFundStaking.deploy(multiSigWallet, wethAddress);

  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();

  console.log("\n=== Deployment Summary ===");
  console.log("VaporFundStaking deployed to:", stakingAddress);
  console.log("MultiSig Wallet:", multiSigWallet);
  console.log("WETH Address:", wethAddress);
  console.log("Deployer:", deployer.address);

  // Deploy test tokens on testnet
  if (chainId !== 1n) {
    console.log("\n=== Deploying Test Tokens ===");
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    // Deploy test USDC
    const testUSDC = await MockERC20.deploy("Test USDC", "tUSDC", 6);
    await testUSDC.waitForDeployment();
    console.log("Test USDC deployed to:", await testUSDC.getAddress());
    
    // Deploy test USDT
    const testUSDT = await MockERC20.deploy("Test USDT", "tUSDT", 6);
    await testUSDT.waitForDeployment();
    console.log("Test USDT deployed to:", await testUSDT.getAddress());
    
    // Deploy test DAI
    const testDAI = await MockERC20.deploy("Test DAI", "tDAI", 18);
    await testDAI.waitForDeployment();
    console.log("Test DAI deployed to:", await testDAI.getAddress());

    // Whitelist tokens
    console.log("\n=== Whitelisting Tokens ===");
    
    // Whitelist WETH
    await staking.whitelistToken(
      wethAddress,
      ethers.parseEther("0.01"), // 0.01 ETH minimum
      ethers.parseEther("1000") // 1000 ETH maximum
    );
    console.log("WETH whitelisted");
    
    // Whitelist test USDC
    await staking.whitelistToken(
      await testUSDC.getAddress(),
      ethers.parseUnits("10", 6), // 10 USDC minimum
      ethers.parseUnits("1000000", 6) // 1M USDC maximum
    );
    console.log("Test USDC whitelisted");
    
    // Whitelist test USDT
    await staking.whitelistToken(
      await testUSDT.getAddress(),
      ethers.parseUnits("10", 6), // 10 USDT minimum
      ethers.parseUnits("1000000", 6) // 1M USDT maximum
    );
    console.log("Test USDT whitelisted");
    
    // Whitelist test DAI
    await staking.whitelistToken(
      await testDAI.getAddress(),
      ethers.parseEther("10"), // 10 DAI minimum
      ethers.parseEther("1000000") // 1M DAI maximum
    );
    console.log("Test DAI whitelisted");

    // Mint some test tokens to deployer
    console.log("\n=== Minting Test Tokens ===");
    await testUSDC.mint(deployer.address, ethers.parseUnits("10000", 6));
    console.log("Minted 10,000 USDC to deployer");
    
    await testUSDT.mint(deployer.address, ethers.parseUnits("10000", 6));
    console.log("Minted 10,000 USDT to deployer");
    
    await testDAI.mint(deployer.address, ethers.parseEther("10000"));
    console.log("Minted 10,000 DAI to deployer");
  }

  // Verify on Etherscan if not on localhost
  if (chainId !== 31337n && process.env.ETHERSCAN_API_KEY) {
    console.log("\n=== Contract Verification ===");
    console.log("Waiting for block confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: stakingAddress,
        constructorArguments: [multiSigWallet, wethAddress],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  }

  console.log("\n=== Deployment Complete ===");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});