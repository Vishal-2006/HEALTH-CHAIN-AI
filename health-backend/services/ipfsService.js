const axios = require('axios');
const FormData = require('form-data');

class IPFSService {
    constructor() {
        this.apiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5002';
        this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://dweb.link';
        this.pathGatewayUrl = process.env.IPFS_PATH_GATEWAY || 'https://ipfs.io';
    }

    // Initialize IPFS service
    async initialize() {
        try {
            console.log('🔍 Initializing IPFS service...');
            const isOnline = await this.isOnline();
            if (isOnline) {
                console.log('✅ IPFS service initialized successfully');
                return true;
            } else {
                console.log('⚠️ IPFS node not available, but service initialized');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to initialize IPFS service:', error);
            return false;
        }
    }

    // Check if IPFS node is online
    async isOnline() {
        try {
            console.log(`🔍 Checking IPFS node at: ${this.apiUrl}/api/v0/version`);
            const response = await axios.post(`${this.apiUrl}/api/v0/version`);
            console.log(`✅ IPFS node response: ${response.status}`);
            return response.status === 200;
        } catch (error) {
            console.error('IPFS node not accessible:', error.message);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data: ${JSON.stringify(error.response.data)}`);
            }
            return false;
        }
    }

    // Get node info
    async getNodeInfo() {
        try {
            const response = await axios.post(`${this.apiUrl}/api/v0/id`);
            return {
                id: response.data.ID,
                addresses: response.data.Addresses,
                agentVersion: response.data.AgentVersion,
                protocolVersion: response.data.ProtocolVersion
            };
        } catch (error) {
            console.error('Failed to get IPFS node info:', error.message);
            return null;
        }
    }

    // Upload file to IPFS
    async uploadFile(fileBuffer, fileName) {
        try {
            const formData = new FormData();
            formData.append('file', fileBuffer, {
                filename: fileName,
                contentType: 'application/octet-stream'
            });

            const response = await axios.post(`${this.apiUrl}/api/v0/add`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            if (response.data && response.data.Hash) {
                return {
                    success: true,
                    hash: response.data.Hash,
                    size: response.data.Size,
                    name: response.data.Name,
                    gatewayUrl: `${this.gatewayUrl}/ipfs/${response.data.Hash}`,
                    pathGatewayUrl: `${this.pathGatewayUrl}/ipfs/${response.data.Hash}`
                };
            } else {
                throw new Error('No hash returned from IPFS');
            }
        } catch (error) {
            console.error('Failed to upload file to IPFS:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload JSON data to IPFS
    async uploadJSON(data) {
        try {
            const jsonString = JSON.stringify(data);
            const buffer = Buffer.from(jsonString, 'utf8');
            
            return await this.uploadFile(buffer, 'data.json');
        } catch (error) {
            console.error('Failed to upload JSON to IPFS:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get file from IPFS
    async getFile(hash) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/v0/cat?arg=${hash}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Failed to get file from IPFS:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Pin file to keep it available
    async pinFile(hash) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/v0/pin/add?arg=${hash}`);
            return {
                success: true,
                pinned: response.data.Pins.includes(hash)
            };
        } catch (error) {
            console.error('Failed to pin file:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get gateway URLs for a hash
    getGatewayUrls(hash) {
        return {
            subdomainGateway: `${this.gatewayUrl}/ipfs/${hash}`,
            pathGateway: `${this.pathGatewayUrl}/ipfs/${hash}`,
            localGateway: `${this.apiUrl}/ipfs/${hash}`
        };
    }

    // Check file status
    async getFileStatus(hash) {
        try {
            const response = await axios.post(`${this.apiUrl}/api/v0/files/stat?arg=/ipfs/${hash}`);
            return {
                success: true,
                size: response.data.Size,
                cumulativeSize: response.data.CumulativeSize,
                blocks: response.data.Blocks,
                type: response.data.Type
            };
        } catch (error) {
            console.error('Failed to get file status:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // List all pinned files
    async listPinnedFiles() {
        try {
            const response = await axios.post(`${this.apiUrl}/api/v0/pin/ls`);
            const pins = response.data.Keys || {};
            return Object.entries(pins).map(([hash, pinInfo]) => ({
                hash,
                name: pinInfo.Name || 'Unnamed',
                type: pinInfo.Type || 'Unknown'
            }));
        } catch (error) {
            console.log('Error listing pinned files:', error.message);
            return [];
        }
    }

    // Try to make file visible in Desktop
    async addToLocalFiles(hash) {
        try {
            // Try to access the file to make it available locally
            await axios.post(`${this.apiUrl}/api/v0/cat?arg=${hash}`);
            return { success: true, message: 'File accessed locally' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = IPFSService;
