const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting smart contract deployment to Sepolia...");
  
  // Explicitly set the provider and signer
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/oFQssLRZ3fxNIkR9gHXGG");
  const wallet = new ethers.Wallet("0x1d07F6840D4dA402E13AfEc5A118bB10Fb92FDad", provider);
  
  console.log("📡 Connected to Sepolia testnet");
  console.log("👤 Deploying from address:", wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("❌ No ETH in account. Please get Sepolia ETH from a faucet.");
    return;
  }
  
  // Deploy AccessControl contract
  console.log("🔐 Deploying AccessControl contract...");
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.connect(wallet).deploy();
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log("✅ AccessControl deployed to:", accessControlAddress);
  
  // Deploy HealthRecord contract
  console.log("🏥 Deploying HealthRecord contract...");
  const HealthRecord = await ethers.getContractFactory("HealthRecord");
  const healthRecord = await HealthRecord.connect(wallet).deploy();
  await healthRecord.waitForDeployment();
  const healthRecordAddress = await healthRecord.getAddress();
  console.log("✅ HealthRecord deployed to:", healthRecordAddress);
  
  // Deploy MedicalReport contract
  console.log("📄 Deploying MedicalReport contract...");
  const MedicalReport = await ethers.getContractFactory("MedicalReport");
  const medicalReport = await MedicalReport.connect(wallet).deploy();
  await medicalReport.waitForDeployment();
  const medicalReportAddress = await medicalReport.getAddress();
  console.log("✅ MedicalReport deployed to:", medicalReportAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    timestamp: new Date().toISOString(),
    contracts: {
      AccessControl: accessControlAddress,
      HealthRecord: healthRecordAddress,
      MedicalReport: medicalReportAddress
    },
    deployer: wallet.address,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/oFQssLRZ3fxNIkR9gHXGG"
  };
  
  const fs = require('fs');
  fs.writeFileSync('deployment-info-sepolia.json', JSON.stringify(deploymentInfo, null, 2));
  
  console.log("📝 Deployment info saved to deployment-info-sepolia.json");
  console.log("🎉 All contracts deployed successfully to Sepolia!");
  
  console.log("\n📋 Contract Addresses:");
  console.log("AccessControl:", accessControlAddress);
  console.log("HealthRecord:", healthRecordAddress);
  console.log("MedicalReport:", medicalReportAddress);
  
  console.log("\n🔗 View on Etherscan:");
  console.log(`AccessControl: https://sepolia.etherscan.io/address/${accessControlAddress}`);
  console.log(`HealthRecord: https://sepolia.etherscan.io/address/${healthRecordAddress}`);
  console.log(`MedicalReport: https://sepolia.etherscan.io/address/${medicalReportAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
