const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class PinataIPFSService {
    constructor() {
        this.apiKey = process.env.PINATA_API_KEY;
        this.secretKey = process.env.PINATA_SECRET_KEY;
        this.gatewayUrl = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';
        this.baseUrl = 'https://api.pinata.cloud';
        this.isInitialized = false;
        
        // Initialize synchronously if credentials are available
        if (this.apiKey && this.secretKey) {
            this.isInitialized = true;
            console.log('✅ Pinata IPFS service ready');
        } else {
            console.log('⚠️ Pinata credentials not found in environment variables');
            console.log('   Please add PINATA_API_KEY and PINATA_SECRET_KEY to your .env file');
        }
    }
    
    async initialize() {
        try {
            if (!this.apiKey || !this.secretKey) {
                console.log('⚠️ Pinata credentials not found in environment variables');
                console.log('   Please add PINATA_API_KEY and PINATA_SECRET_KEY to your .env file');
                return;
            }
            
            // Test connection
            await this.testConnection();
            this.isInitialized = true;
            
            console.log('✅ Pinata IPFS service initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Pinata IPFS service:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Test connection to Pinata
     */
    async testConnection() {
        try {
            // Test authentication by trying to get user info
            const response = await axios.get(`${this.baseUrl}/data/userPinnedDataTotal`, {
                headers: {
                    'pinata_api_key': this.apiKey,
                    'pinata_secret_api_key': this.secretKey
                }
            });
            
            if (response.status === 200) {
                console.log('✅ Pinata authentication successful');
                console.log(`📊 Pinata account info: ${response.data.pin_count} pins, ${response.data.pin_size_total} bytes`);
            } else {
                throw new Error('Pinata authentication failed');
            }
            
        } catch (error) {
            throw new Error(`Pinata connection test failed: ${error.message}`);
        }
    }
    
    /**
     * Upload data to Pinata IPFS
     * @param {string|Buffer} data - Data to upload
     * @param {string} fileName - Name for the file
     * @param {Object} metadata - Optional metadata
     * @returns {Object} - Upload result with IPFS hash
     */
    async uploadData(data, fileName = 'data.json', metadata = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Pinata IPFS service not initialized');
            }
            
            const formData = new FormData();
            
            // Add file data
            if (Buffer.isBuffer(data)) {
                formData.append('file', data, fileName);
            } else if (typeof data === 'string') {
                formData.append('file', Buffer.from(data, 'utf8'), fileName);
            } else {
                formData.append('file', Buffer.from(JSON.stringify(data), 'utf8'), fileName);
            }
            
            // Add metadata
            const pinataMetadata = {
                name: fileName,
                keyvalues: {
                    ...metadata,
                    uploadedAt: new Date().toISOString(),
                    service: 'health-chain-ai'
                }
            };
            
            formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
            
            // Add options
            const pinataOptions = {
                cidVersion: 1,
                wrapWithDirectory: false
            };
            
            formData.append('pinataOptions', JSON.stringify(pinataOptions));
            
            const response = await axios.post(`${this.baseUrl}/pinning/pinFileToIPFS`, formData, {
                headers: {
                    'pinata_api_key': this.apiKey,
                    'pinata_secret_api_key': this.secretKey,
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            
            const ipfsHash = response.data.IpfsHash;
            
            console.log(`✅ Data uploaded to Pinata IPFS: ${ipfsHash}`);
            
            return {
                success: true,
                ipfsHash: ipfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
                gatewayUrl: `${this.gatewayUrl}/ipfs/${ipfsHash}`,
                fileName: fileName
            };
            
        } catch (error) {
            console.error('❌ Failed to upload data to Pinata IPFS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Upload file to Pinata IPFS
     * @param {string} filePath - Path to the file
     * @param {Object} metadata - Optional metadata
     * @returns {Object} - Upload result
     */
    async uploadFile(filePath, metadata = {}) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            const fileBuffer = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);
            
            return await this.uploadData(fileBuffer, fileName, metadata);
            
        } catch (error) {
            console.error('❌ Failed to upload file to Pinata IPFS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Retrieve data from Pinata IPFS
     * @param {string} ipfsHash - IPFS hash
     * @returns {Object} - Retrieved data
     */
    async getData(ipfsHash) {
        try {
            if (!this.isInitialized) {
                throw new Error('Pinata IPFS service not initialized');
            }
            
            const response = await axios.get(`${this.gatewayUrl}/ipfs/${ipfsHash}`, {
                timeout: 30000 // 30 second timeout
            });
            
            console.log(`✅ Data retrieved from Pinata IPFS: ${ipfsHash}`);
            
            return {
                success: true,
                data: response.data,
                ipfsHash: ipfsHash,
                contentType: response.headers['content-type']
            };
            
        } catch (error) {
            console.error('❌ Failed to retrieve data from Pinata IPFS:', error);
            return {
                success: false,
                error: error.message,
                ipfsHash: ipfsHash
            };
        }
    }
    
    /**
     * Get file from IPFS
     * @param {string} ipfsHash - IPFS hash
     * @param {string} outputPath - Path to save the file
     * @returns {Object} - Download result
     */
    async getFile(ipfsHash, outputPath) {
        try {
            const result = await this.getData(ipfsHash);
            
            if (result.success) {
                fs.writeFileSync(outputPath, result.data);
                console.log(`✅ File saved to: ${outputPath}`);
                
                return {
                    success: true,
                    filePath: outputPath,
                    ipfsHash: ipfsHash
                };
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Failed to download file from Pinata IPFS:', error);
            return {
                success: false,
                error: error.message,
                ipfsHash: ipfsHash
            };
        }
    }
    
    /**
     * Pin existing IPFS hash to Pinata
     * @param {string} ipfsHash - IPFS hash to pin
     * @param {Object} metadata - Optional metadata
     * @returns {Object} - Pin result
     */
    async pinHash(ipfsHash, metadata = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Pinata IPFS service not initialized');
            }
            
            const pinataMetadata = {
                name: `pinned-${ipfsHash}`,
                keyvalues: {
                    ...metadata,
                    pinnedAt: new Date().toISOString(),
                    service: 'health-chain-ai'
                }
            };
            
            const response = await axios.post(`${this.baseUrl}/pinning/pinByHash`, {
                hashToPin: ipfsHash,
                pinataMetadata: pinataMetadata
            }, {
                headers: {
                    'pinata_api_key': this.apiKey,
                    'pinata_secret_api_key': this.secretKey,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`✅ IPFS hash pinned to Pinata: ${ipfsHash}`);
            
            return {
                success: true,
                ipfsHash: ipfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp
            };
            
        } catch (error) {
            console.error('❌ Failed to pin hash to Pinata:', error);
            return {
                success: false,
                error: error.message,
                ipfsHash: ipfsHash
            };
        }
    }
    
    /**
     * Get pinned files list
     * @param {Object} filters - Optional filters
     * @returns {Object} - List of pinned files
     */
    async getPinnedFiles(filters = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Pinata IPFS service not initialized');
            }
            
            const params = new URLSearchParams();
            
            if (filters.status) params.append('status', filters.status);
            if (filters.pageLimit) params.append('pageLimit', filters.pageLimit);
            if (filters.pageOffset) params.append('pageOffset', filters.pageOffset);
            
            const response = await axios.get(`${this.baseUrl}/data/pinList?${params}`, {
                headers: {
                    'pinata_api_key': this.apiKey,
                    'pinata_secret_api_key': this.secretKey
                }
            });
            
            return {
                success: true,
                files: response.data.rows,
                count: response.data.count
            };
            
        } catch (error) {
            console.error('❌ Failed to get pinned files:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Unpin file from Pinata
     * @param {string} ipfsHash - IPFS hash to unpin
     * @returns {Object} - Unpin result
     */
    async unpinFile(ipfsHash) {
        try {
            if (!this.isInitialized) {
                throw new Error('Pinata IPFS service not initialized');
            }
            
            await axios.delete(`${this.baseUrl}/pinning/unpin/${ipfsHash}`, {
                headers: {
                    'pinata_api_key': this.apiKey,
                    'pinata_secret_api_key': this.secretKey
                }
            });
            
            console.log(`✅ File unpinned from Pinata: ${ipfsHash}`);
            
            return {
                success: true,
                ipfsHash: ipfsHash
            };
            
        } catch (error) {
            console.error('❌ Failed to unpin file from Pinata:', error);
            return {
                success: false,
                error: error.message,
                ipfsHash: ipfsHash
            };
        }
    }
    
    /**
     * Get gateway URL for IPFS hash
     * @param {string} ipfsHash - IPFS hash
     * @returns {string} - Gateway URL
     */
    getGatewayUrl(ipfsHash) {
        return `${this.gatewayUrl}/ipfs/${ipfsHash}`;
    }
    
    /**
     * Check if service is ready
     * @returns {boolean} - Service status
     */
    isReady() {
        return this.isInitialized;
    }
}

module.exports = PinataIPFSService;
