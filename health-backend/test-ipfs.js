const IPFSService = require('./services/ipfsService');
const ipfsService = new IPFSService();

async function testIPFS() {
    console.log('🧪 Testing IPFS Service...');
    console.log('========================');
    
    try {
        // Test 1: Check if IPFS is online
        console.log('\n1️⃣ Testing IPFS connectivity...');
        const isOnline = await ipfsService.isOnline();
        console.log(`   Status: ${isOnline ? '✅ Online' : '❌ Offline'}`);
        
        if (isOnline) {
            // Test 2: Get node info
            console.log('\n2️⃣ Getting node information...');
            const nodeInfo = await ipfsService.getNodeInfo();
            if (nodeInfo) {
                console.log(`   Node ID: ${nodeInfo.id || 'N/A'}`);
                console.log(`   Agent Version: ${nodeInfo.agentVersion || 'N/A'}`);
                console.log(`   Protocol Version: ${nodeInfo.protocolVersion || 'N/A'}`);
                console.log(`   Addresses: ${nodeInfo.addresses ? nodeInfo.addresses.length : 0} found`);
            }
            
            // Test 3: Test JSON upload
            console.log('\n3️⃣ Testing JSON upload...');
            const testData = {
                test: true,
                message: 'Hello from HealthChain AI!',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            };
            
            const uploadResult = await ipfsService.uploadJSON(testData);
            if (uploadResult.success) {
                console.log(`   ✅ Upload successful!`);
                console.log(`   Hash: ${uploadResult.hash}`);
                console.log(`   Size: ${uploadResult.size} bytes`);
                console.log(`   Gateway URLs:`);
                console.log(`     Subdomain: ${uploadResult.gatewayUrl}`);
                console.log(`     Path: ${uploadResult.pathGatewayUrl}`);
                
                // Test 4: Test file retrieval
                console.log('\n4️⃣ Testing file retrieval...');
                const fileResult = await ipfsService.getFile(uploadResult.hash);
                if (fileResult.success) {
                    console.log(`   ✅ Retrieval successful!`);
                    console.log(`   Data: ${JSON.stringify(fileResult.data)}`);
                } else {
                    console.log(`   ❌ Retrieval failed: ${fileResult.error}`);
                }
                
                // Test 5: Test pinning
                console.log('\n5️⃣ Testing file pinning...');
                const pinResult = await ipfsService.pinFile(uploadResult.hash);
                if (pinResult.success) {
                    console.log(`   ✅ Pinning successful!`);
                    console.log(`   Pinned: ${pinResult.pinned}`);
                } else {
                    console.log(`   ❌ Pinning failed: ${pinResult.error}`);
                }
                
            } else {
                console.log(`   ❌ Upload failed: ${uploadResult.error}`);
            }
        }
        
        console.log('\n🎯 Test Summary:');
        console.log(`   IPFS Online: ${isOnline ? '✅ Yes' : '❌ No'}`);
        console.log(`   API URL: ${process.env.IPFS_API_URL || 'http://127.0.0.1:5002'}`);
        console.log(`   Gateway: ${process.env.IPFS_GATEWAY_URL || 'https://dweb.link'}`);
        
        if (!isOnline) {
            console.log('\n💡 Troubleshooting Tips:');
            console.log('   1. Make sure IPFS Desktop is running');
            console.log('   2. Check if port 5002 is accessible');
            console.log('   3. Verify your .env file has correct IPFS_API_URL');
            console.log('   4. Try restarting IPFS Desktop');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testIPFS();
