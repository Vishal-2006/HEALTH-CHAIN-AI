const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 HealthChain AI - Complete Startup Script');
console.log('============================================');

// Check if .env file exists
const envFile = path.join(__dirname, '.env');
if (!fs.existsSync(envFile)) {
    console.log('📝 Creating .env file from example...');
    const exampleFile = path.join(__dirname, 'config.env.example');
    if (fs.existsSync(exampleFile)) {
        fs.copyFileSync(exampleFile, envFile);
        console.log('✅ .env file created successfully!');
    } else {
        console.log('❌ config.env.example not found. Please create .env manually.');
        console.log('📋 Required variables:');
        console.log('   HEALTH_RECORD_CONTRACT_ADDRESS');
        console.log('   ACCESS_CONTROL_CONTRACT_ADDRESS');
        console.log('   BLOCKCHAIN_RPC_URL=http://localhost:8545');
        console.log('   ENCRYPTION_KEY=your-secret-key');
        console.log('   PRIVATE_KEY=your-private-key');
    }
}

console.log('\n🔗 Starting local blockchain network...');
console.log('   This will start Hardhat node on port 8545');
console.log('   Keep this terminal open!');

// Start Hardhat node
const hardhatNode = spawn('npx', ['hardhat', 'node'], {
    stdio: 'inherit',
    shell: true
});

hardhatNode.on('error', (error) => {
    console.error('❌ Failed to start Hardhat node:', error.message);
    console.log('💡 Make sure you have Hardhat installed: npm install -g hardhat');
});

console.log('\n📋 Next steps:');
console.log('1. Wait for Hardhat node to start (you should see 20 accounts)');
console.log('2. Open a NEW terminal and run: npm run blockchain');
console.log('3. Open another terminal and run: npm start');
console.log('4. Open another terminal and run: cd ../my-health-app && npm run dev');
console.log('\n🌐 Your blockchain will be available at: http://localhost:8545');
console.log('🔧 Backend will be available at: http://localhost:5001');
console.log('⚛️  Frontend will be available at: http://localhost:5173');

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    hardhatNode.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    hardhatNode.kill();
    process.exit(0);
});
