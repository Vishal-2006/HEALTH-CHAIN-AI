const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying MedicalReport smart contract...");
    
    // Get the contract factory
    const MedicalReport = await ethers.getContractFactory("MedicalReport");
    
    // Deploy the contract
    const medicalReport = await MedicalReport.deploy();
    
    // Wait for deployment to finish
    await medicalReport.waitForDeployment();
    
    // Get the deployed contract address
    const address = await medicalReport.getAddress();
    
    console.log("✅ MedicalReport deployed to:", address);
    
    // Save deployment info
    const deploymentInfo = {
        contractName: "MedicalReport",
        address: address,
        network: "localhost",
        deployer: (await ethers.getSigners())[0].address,
        timestamp: new Date().toISOString()
    };
    
    // Write to deployment-info.json
    const fs = require('fs');
    const path = require('path');
    
    let existingInfo = {};
    try {
        existingInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));
    } catch (error) {
        console.log("Creating new deployment-info.json");
    }
    
    existingInfo.MedicalReport = deploymentInfo;
    
    fs.writeFileSync('deployment-info.json', JSON.stringify(existingInfo, null, 2));
    
    console.log("📝 Deployment info saved to deployment-info.json");
    console.log("🎯 Contract ready for medical report management!");
    
    return address;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
