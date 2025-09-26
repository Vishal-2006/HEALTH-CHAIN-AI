const fs = require('fs');
const path = require('path');
const IPFSService = require('./services/ipfsService');

const ipfsService = new IPFSService();

// Define different image formats with their MIME types and sample data
const imageFormats = {
    'png': {
        mimeType: 'image/png',
        extension: '.png',
        data: Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // Color type, compression, filter, interlace
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
            0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF, // Compressed data
            0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, // End of compressed data
            0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, // IEND chunk
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82        // End of PNG
        ])
    },
    'jpg': {
        mimeType: 'image/jpeg',
        extension: '.jpg',
        data: Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, // JPEG SOI + APP0
            0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, // JFIF identifier
            0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, // DQT marker
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, // Quantization table
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, // (minimal JPEG data)
            0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, // for testing purposes
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, // This creates a valid
            0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, // JPEG structure
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, // but minimal content
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, // for quick testing
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, // of IPFS storage
            0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01, // SOF0 marker
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, // 1x1 image
            0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, // DHT marker
            0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Huffman tables
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // (minimal)
            0x00, 0x00, 0x00, 0x06, 0xFF, 0xDA, 0x00, 0x08, // SOS marker
            0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, // Scan data
            0xD9 // EOI marker
        ])
    },
    'gif': {
        mimeType: 'image/gif',
        extension: '.gif',
        data: Buffer.from([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a header
            0x01, 0x00, 0x01, 0x00, // 1x1 image dimensions
            0x80, 0x00, 0x00, // Color table info
            0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, // Color table (white, black)
            0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, // Graphics control extension
            0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, // Image descriptor
            0x00, 0x00, // Image data size
            0x02, 0x16, 0x8C, 0x2D, 0x99, 0x87, 0x2A, 0x1C, // LZW compressed data
            0xDC, 0x33, 0xA0, 0x02, 0x75, 0xEC, 0x95, 0xFA, // (minimal for testing)
            0xA8, 0xDE, 0x60, 0x8C, 0x04, 0x91, 0x4C, 0x01, // This creates a valid
            0x00, 0x3B // GIF structure but minimal content
        ])
    },
    'webp': {
        mimeType: 'image/webp',
        extension: '.webp',
        data: Buffer.from([
            0x52, 0x49, 0x46, 0x46, // RIFF header
            0x1C, 0x00, 0x00, 0x00, // File size
            0x57, 0x45, 0x42, 0x50, // WEBP identifier
            0x56, 0x50, 0x38, 0x20, // VP8 chunk
            0x10, 0x00, 0x00, 0x00, // VP8 data size
            0x9D, 0x01, 0x2A, 0x01, // VP8 frame header
            0x00, 0x01, 0x00, 0x01, // 1x1 image dimensions
            0x00, 0x00, 0x00, 0x00, // Frame data (minimal)
            0x00, 0x00, 0x00, 0x00, // for testing purposes
            0x00, 0x00, 0x00, 0x00, // This creates a valid
            0x00, 0x00, 0x00, 0x00, // WebP structure
            0x00, 0x00, 0x00, 0x00  // but minimal content
        ])
    },
    'svg': {
        mimeType: 'image/svg+xml',
        extension: '.svg',
        data: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">
  <rect width="1" height="1" fill="blue"/>
</svg>`, 'utf8')
    },
    'bmp': {
        mimeType: 'image/bmp',
        extension: '.bmp',
        data: Buffer.from([
            0x42, 0x4D, // BM signature
            0x1E, 0x00, 0x00, 0x00, // File size
            0x00, 0x00, 0x00, 0x00, // Reserved
            0x1A, 0x00, 0x00, 0x00, // Data offset
            0x0C, 0x00, 0x00, 0x00, // DIB header size
            0x01, 0x00, 0x01, 0x00, // Width and height (1x1)
            0x01, 0x00, // Color planes
            0x18, 0x00, // Bits per pixel
            0x00, 0x00, 0x00, 0x00, // Compression
            0x04, 0x00, 0x00, 0x00, // Image size
            0x00, 0x00, 0x00, 0x00, // Horizontal resolution
            0x00, 0x00, 0x00, 0x00, // Vertical resolution
            0x00, 0x00, 0x00, 0x00, // Colors in palette
            0x00, 0x00, 0x00, 0x00, // Important colors
            0xFF, 0x00, 0x00, 0x00  // Pixel data (red)
        ])
    },
    'ico': {
        mimeType: 'image/x-icon',
        extension: '.ico',
        data: Buffer.from([
            0x00, 0x00, // Reserved
            0x01, 0x00, // Image type (1 = ICO)
            0x01, 0x00, // Number of images
            0x01, 0x00, // Width (1)
            0x01, 0x00, // Height (1)
            0x00, // Color count
            0x00, // Reserved
            0x01, 0x00, // Color planes
            0x18, 0x00, // Bits per pixel
            0x04, 0x00, 0x00, 0x00, // Image size
            0x16, 0x00, 0x00, 0x00, // Image offset
            0x28, 0x00, 0x00, 0x00, // BITMAPINFOHEADER size
            0x01, 0x00, 0x00, 0x00, // Width
            0x01, 0x00, 0x00, 0x00, // Height
            0x01, 0x00, // Color planes
            0x18, 0x00, // Bits per pixel
            0x00, 0x00, 0x00, 0x00, // Compression
            0x04, 0x00, 0x00, 0x00, // Image size
            0x00, 0x00, 0x00, 0x00, // Horizontal resolution
            0x00, 0x00, 0x00, 0x00, // Vertical resolution
            0x00, 0x00, 0x00, 0x00, // Colors in palette
            0x00, 0x00, 0x00, 0x00, // Important colors
            0xFF, 0x00, 0x00, 0x00  // Pixel data (red)
        ])
    }
};

async function testImageUpload() {
    console.log('🖼️ Testing IPFS Image Upload for All Formats...\n');
    
    try {
        // Check if IPFS is online
        console.log('1. Checking IPFS status...');
        const isOnline = await ipfsService.isOnline();
        console.log(`   IPFS Online: ${isOnline ? '✅ Yes' : '❌ No'}`);
        
        if (!isOnline) {
            console.log('❌ IPFS is not online. Please start IPFS Desktop first.');
            return;
        }
        
        // Get IPFS node info
        console.log('\n2. Getting IPFS node info...');
        const nodeInfo = await ipfsService.getNodeInfo();
        console.log(`   Node ID: ${nodeInfo.nodeId || 'N/A'}`);
        console.log(`   Version: ${nodeInfo.version || 'N/A'}`);
        console.log(`   API URL: ${nodeInfo.apiUrl || 'N/A'}`);
        
        console.log('\n3. Testing all image formats...');
        const results = [];
        
        // Test each image format
        for (const [format, imageData] of Object.entries(imageFormats)) {
            console.log(`\n   📸 Testing ${format.toUpperCase()} format...`);
            
            try {
                // Upload image to IPFS
                const uploadResult = await ipfsService.uploadFile(
                    imageData.data, 
                    `test-image.${format}`, 
                    imageData.mimeType
                );
                
                console.log(`      ✅ ${format.toUpperCase()} uploaded successfully!`);
                console.log(`      Hash: ${uploadResult.hash}`);
                console.log(`      Size: ${uploadResult.size} bytes`);
                console.log(`      MIME: ${imageData.mimeType}`);
                
                // Pin the file
                const pinResult = await ipfsService.pinFile(uploadResult.hash);
                console.log(`      📌 Pinned: ${pinResult.success ? 'Yes' : 'No'}`);
                
                // Store result
                results.push({
                    format: format.toUpperCase(),
                    hash: uploadResult.hash,
                    size: uploadResult.size,
                    mimeType: imageData.mimeType,
                    success: true
                });
                
            } catch (error) {
                console.log(`      ❌ ${format.toUpperCase()} upload failed: ${error.message}`);
                results.push({
                    format: format.toUpperCase(),
                    error: error.message,
                    success: false
                });
            }
        }
        
        // Summary
        console.log('\n4. 📊 Upload Summary:');
        console.log('   ┌─────────────┬─────────────────────────────────────────────────────┬─────────┬─────────────┐');
        console.log('   │ Format      │ IPFS Hash                                           │ Size    │ Status      │');
        console.log('   ├─────────────┼─────────────────────────────────────────────────────┼─────────┼─────────────┤');
        
        results.forEach(result => {
            if (result.success) {
                const hash = result.hash.slice(0, 12) + '...' + result.hash.slice(-8);
                console.log(`   │ ${result.format.padEnd(11)} │ ${hash.padEnd(51)} │ ${result.size.toString().padStart(7)} │ ✅ Success  │`);
            } else {
                console.log(`   │ ${result.format.padEnd(11)} │ ${'N/A'.padEnd(51)} │ ${'N/A'.padStart(7)} │ ❌ Failed   │`);
            }
        });
        
        console.log('   └─────────────┴─────────────────────────────────────────────────────┴─────────┴─────────────┘');
        
        // Display access URLs for successful uploads
        const successfulUploads = results.filter(r => r.success);
        if (successfulUploads.length > 0) {
            console.log('\n5. 🌐 Access URLs:');
            successfulUploads.forEach(result => {
                console.log(`\n   📱 ${result.format} Image:`);
                console.log(`      IPFS Gateway: https://dweb.link/ipfs/${result.hash}`);
                console.log(`      IPFS.io: https://ipfs.io/ipfs/${result.hash}`);
                console.log(`      Local Gateway: http://127.0.0.1:5002/ipfs/${result.hash}`);
            });
        }
        
        // Statistics
        const successCount = successfulUploads.length;
        const totalCount = results.length;
        
        console.log('\n6. 📈 Statistics:');
        console.log(`   Total formats tested: ${totalCount}`);
        console.log(`   Successful uploads: ${successCount}`);
        console.log(`   Failed uploads: ${totalCount - successCount}`);
        console.log(`   Success rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
        
        if (successCount === totalCount) {
            console.log('\n🎉 All image formats uploaded successfully to IPFS!');
            console.log('   Your IPFS node now supports: PNG, JPG, GIF, WebP, SVG, BMP, and ICO files.');
        } else {
            console.log('\n⚠️  Some formats failed. Check the error messages above.');
        }
        
    } catch (error) {
        console.error('❌ Error during image upload test:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testImageUpload();
