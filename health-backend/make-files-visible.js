const IPFSService = require('./services/ipfsService');

const ipfsService = new IPFSService();

async function makeFilesVisible() {
    console.log('🔍 Making IPFS files visible in Desktop...\n');
    
    try {
        // Check if IPFS is online
        console.log('1. Checking IPFS status...');
        const isOnline = await ipfsService.isOnline();
        if (!isOnline) {
            console.log('❌ IPFS is not online. Please start IPFS Desktop first.');
            return;
        }
        console.log('   ✅ IPFS is online');
        
        // List all pinned files
        console.log('\n2. Listing all pinned files...');
        try {
            const pinnedFiles = await ipfsService.listPinnedFiles();
            console.log(`   📌 Found ${pinnedFiles.length} pinned files`);
            
            if (pinnedFiles.length === 0) {
                console.log('   ℹ️  No pinned files found. Files may not be properly pinned.');
            } else {
                pinnedFiles.forEach((file, index) => {
                    console.log(`   ${index + 1}. ${file.name || 'Unnamed'} - ${file.hash}`);
                });
            }
        } catch (error) {
            console.log(`   ⚠️  Could not list pinned files: ${error.message}`);
        }
        
        // Check if our test files exist
        console.log('\n3. Checking test file status...');
        const testHashes = [
            'QmcoWMojA9gTsnfn4p39YbtZj6dvjx2knkoaLTSqwoXEpD' // From previous PNG test
        ];
        
        for (const hash of testHashes) {
            try {
                const fileStatus = await ipfsService.getFileStatus(hash);
                console.log(`   📁 Hash: ${hash}`);
                console.log(`      Exists: ${fileStatus.exists ? '✅ Yes' : '❌ No'}`);
                console.log(`      Size: ${fileStatus.size || 'Unknown'} bytes`);
                
                if (fileStatus.exists) {
                    // Try to add to local files
                    console.log(`      🔗 Adding to local files...`);
                    try {
                        // Use IPFS add command to make it visible
                        const addResult = await ipfsService.addToLocalFiles(hash);
                        console.log(`      ✅ Added to local files: ${addResult.success ? 'Yes' : 'No'}`);
                    } catch (addError) {
                        console.log(`      ⚠️  Could not add to local files: ${addError.message}`);
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error checking hash ${hash}: ${error.message}`);
            }
        }
        
        // Alternative: Create a new visible file
        console.log('\n4. Creating a new visible test file...');
        try {
            const testData = Buffer.from('Hello from Health Chain AI! This file should be visible in IPFS Desktop.', 'utf8');
            const uploadResult = await ipfsService.uploadFile(testData, 'health-chain-test.txt', 'text/plain');
            
            console.log(`   ✅ New file created:`);
            console.log(`      Hash: ${uploadResult.hash}`);
            console.log(`      Name: ${uploadResult.name}`);
            console.log(`      Size: ${uploadResult.size} bytes`);
            
            // Pin the file
            const pinResult = await ipfsService.pinFile(uploadResult.hash);
            console.log(`      📌 Pinned: ${pinResult.success ? 'Yes' : 'No'}`);
            
            console.log(`\n   🌐 Access URLs:`);
            console.log(`      IPFS Gateway: https://dweb.link/ipfs/${uploadResult.hash}`);
            console.log(`      Local Gateway: http://127.0.0.1:5002/ipfs/${uploadResult.hash}`);
            
        } catch (error) {
            console.log(`   ❌ Error creating new file: ${error.message}`);
        }
        
        console.log('\n5. 📋 Next Steps:');
        console.log('   1. Refresh IPFS Desktop (click refresh button)');
        console.log('   2. Check "Files" section for new files');
        console.log('   3. If still not visible, try importing manually:');
        console.log(`      - Click "+ Import" in IPFS Desktop`);
        console.log(`      - Use hash: ${uploadResult?.hash || 'N/A'}`);
        console.log('   4. Check "Pinned" section for pinned files');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the function
makeFilesVisible();
