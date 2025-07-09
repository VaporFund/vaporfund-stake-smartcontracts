import { ethers } from "hardhat";

async function main() {
  console.log("Deploying VaporFund Staking contracts...");

  // Get the contract factory
  const VaporFundStaking = await ethers.getContractFactory("VaporFundStaking");

  // Replace these with actual token addresses for mainnet/testnet deployment
  const stakingTokenAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual staking token
  const rewardTokenAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual reward token
  const rewardRate = ethers.parseEther("100"); // 100 tokens per second

  // Deploy the contract
  const staking = await VaporFundStaking.deploy(
    stakingTokenAddress,
    rewardTokenAddress,
    rewardRate
  );

  await staking.waitForDeployment();

  const stakingAddress = await staking.getAddress();
  console.log("VaporFundStaking deployed to:", stakingAddress);
  console.log("Staking Token:", stakingTokenAddress);
  console.log("Reward Token:", rewardTokenAddress);
  console.log("Reward Rate:", ethers.formatEther(rewardRate), "tokens/second");

  // Verify on Etherscan if not on localhost
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337n && process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await staking.waitForDeployment();
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: stakingAddress,
        constructorArguments: [stakingTokenAddress, rewardTokenAddress, rewardRate],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});