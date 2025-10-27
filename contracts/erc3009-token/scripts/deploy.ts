import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying SimpleERC20WithERC3009...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying from account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HBAR");

  // Token configuration
  const TOKEN_NAME = process.env.TOKEN_NAME || "JuryBox Payment Token";
  const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || "JBPT";
  const TOKEN_DECIMALS = process.env.TOKEN_DECIMALS || "18";
  const INITIAL_MINT_AMOUNT = process.env.INITIAL_MINT_AMOUNT || "1000000"; // 1M tokens

  console.log("\n📋 Token Configuration:");
  console.log("   Name:", TOKEN_NAME);
  console.log("   Symbol:", TOKEN_SYMBOL);
  console.log("   Decimals:", TOKEN_DECIMALS);
  console.log("   Initial Mint:", INITIAL_MINT_AMOUNT);

  // Deploy contract
  const SimpleERC20WithERC3009 = await ethers.getContractFactory("SimpleERC20WithERC3009");
  const token = await SimpleERC20WithERC3009.deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    parseInt(TOKEN_DECIMALS)
  );

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("\n✅ Token deployed successfully!");
  console.log("📍 Contract address:", tokenAddress);

  // Mint initial supply to deployer
  if (parseInt(INITIAL_MINT_AMOUNT) > 0) {
    console.log("\n🪙 Minting initial supply...");
    const mintAmount = ethers.parseUnits(INITIAL_MINT_AMOUNT, parseInt(TOKEN_DECIMALS));
    const mintTx = await token.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log("✅ Minted", INITIAL_MINT_AMOUNT, TOKEN_SYMBOL, "to", deployer.address);
  }

  // Verify deployment
  const totalSupply = await token.totalSupply();
  const deployerBalance = await token.balanceOf(deployer.address);
  const domainSeparator = await token.DOMAIN_SEPARATOR();

  console.log("\n📊 Deployment Summary:");
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, parseInt(TOKEN_DECIMALS)), TOKEN_SYMBOL);
  console.log("   Deployer Balance:", ethers.formatUnits(deployerBalance, parseInt(TOKEN_DECIMALS)), TOKEN_SYMBOL);
  console.log("   Domain Separator:", domainSeparator);

  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.chainId === 296n ? 'testnet' : network.chainId === 295n ? 'mainnet' : 'unknown',
    chainId: network.chainId.toString(),
    contractAddress: tokenAddress,
    deployer: deployer.address,
    tokenName: TOKEN_NAME,
    tokenSymbol: TOKEN_SYMBOL,
    decimals: TOKEN_DECIMALS,
    totalSupply: totalSupply.toString(),
    domainSeparator: domainSeparator,
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🔍 To verify on Hedera HashScan:");
  console.log(`   https://hashscan.io/${deploymentInfo.network}/contract/${tokenAddress}`);

  console.log("\n📝 Save this address to your .env file:");
  console.log(`   ERC3009_TOKEN_ADDRESS=${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
