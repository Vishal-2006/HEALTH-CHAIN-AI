const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting smart contract deployment...");
    
    // Get the contract factory
    const HealthRecord = await ethers.getContractFactory("HealthRecord");
    const AccessControl = await ethers.getContractFactory("AccessControl");
    
    console.log("📝 Deploying HealthRecord contract...");
    const healthRecord = await HealthRecord.deploy();
    await healthRecord.waitForDeployment();
    const healthRecordAddress = await healthRecord.getAddress();
    
    console.log("🔐 Deploying AccessControl contract...");
    const accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
    const accessControlAddress = await accessControl.getAddress();
    
    console.log("✅ Deployment completed successfully!");
    console.log("📋 Contract Addresses:");
    console.log(`   HealthRecord: ${healthRecordAddress}`);
    console.log(`   AccessControl: ${accessControlAddress}`);
    
    // Verify contracts on Etherscan (if on testnet/mainnet)
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("🔍 Verifying contracts on Etherscan...");
        
        try {
            await hre.run("verify:verify", {
                address: healthRecordAddress,
                constructorArguments: [],
            });
            console.log("✅ HealthRecord contract verified on Etherscan");
        } catch (error) {
            console.log("⚠️  HealthRecord verification failed:", error.message);
        }
        
        try {
            await hre.run("verify:verify", {
                address: accessControlAddress,
                constructorArguments: [],
            });
            console.log("✅ AccessControl contract verified on Etherscan");
        } catch (error) {
            console.log("⚠️  AccessControl verification failed:", error.message);
        }
    }
    
    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        healthRecordAddress: healthRecordAddress,
        accessControlAddress: accessControlAddress,
        deployer: (await ethers.getSigners())[0].address,
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        'deployment-info.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("💾 Deployment info saved to deployment-info.json");
    console.log("🎉 Deployment process completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
