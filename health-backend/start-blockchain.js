const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🔗 Starting HealthChain AI Blockchain...");
    
    try {
        // Check if contracts are already deployed
        const deploymentFile = path.join(__dirname, 'deployment-info.json');
        let deploymentInfo = null;
        
        if (fs.existsSync(deploymentFile)) {
            deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
            console.log("📋 Found existing deployment info");
            console.log(`   HealthRecord: ${deploymentInfo.healthRecordAddress}`);
            console.log(`   AccessControl: ${deploymentInfo.accessControlAddress}`);
        }
        
        // Deploy contracts if not already deployed
        if (!deploymentInfo || !deploymentInfo.healthRecordAddress) {
            console.log("🚀 Deploying smart contracts...");
            
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
            
            // Save deployment info
            deploymentInfo = {
                network: 'localhost',
                healthRecordAddress: healthRecordAddress,
                accessControlAddress: accessControlAddress,
                deployer: (await ethers.getSigners())[0].address,
                timestamp: new Date().toISOString()
            };
            
            fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
            console.log("💾 Deployment info saved");
        }
        
        // Create .env file with contract addresses
        const envContent = `# Blockchain Configuration
HEALTH_RECORD_CONTRACT_ADDRESS=${deploymentInfo.healthRecordAddress}
ACCESS_CONTROL_CONTRACT_ADDRESS=${deploymentInfo.accessControlAddress}
BLOCKCHAIN_RPC_URL=http://localhost:8545
ENCRYPTION_KEY=healthchain-ai-secure-key-2024

        # IPFS Configuration (Matching your IPFS Desktop)
        IPFS_GATEWAY_URL=https://dweb.link
        IPFS_API_URL=http://127.0.0.1:5002
        IPFS_PATH_GATEWAY=https://ipfs.io

# Environment
NODE_ENV=development
PORT=5001
`;
        
        const envFile = path.join(__dirname, '.env');
        fs.writeFileSync(envFile, envContent);
        console.log("🔧 Environment file created/updated");
        
        console.log("✅ Blockchain startup completed successfully!");
        console.log("🌐 Local blockchain running on: http://localhost:8545");
        console.log("📋 Contract addresses saved to .env file");
        console.log("🚀 You can now start your backend server!");
        
    } catch (error) {
        console.error("❌ Blockchain startup failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Startup failed:", error);
        process.exit(1);
    });
