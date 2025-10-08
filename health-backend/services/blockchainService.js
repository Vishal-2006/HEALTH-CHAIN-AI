const { ethers } = require('ethers');
const CryptoJS = require('crypto-js');
const PinataIPFSService = require('./pinataIPFSService');
const GeminiAIService = require('./geminiAIService');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class BlockchainService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.healthRecordContract = null;
        this.accessControlContract = null;
        this.pinataIPFSService = new PinataIPFSService();
        this.geminiAIService = new GeminiAIService();
        this.isInitialized = false;
        this.registeredDoctors = new Map(); // Track registered doctors in memory
        this.registeredPatients = new Map(); // Track registered patients in memory
        this.accessPermissions = new Map(); // Track access permissions in memory
        this.userIPFSHashes = new Map(); // Track user IPFS hashes
        this.userHashesFile = path.join(__dirname, '..', 'data', 'user-ipfs-hashes.json');
        
        this.initialize();
    }
    
    // Save user IPFS hashes to disk
    saveUserHashes() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.userHashesFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Convert Map to object for JSON serialization
            const hashesObject = {};
            for (const [username, ipfsHash] of this.userIPFSHashes) {
                hashesObject[username] = ipfsHash;
            }
            
            fs.writeFileSync(this.userHashesFile, JSON.stringify(hashesObject, null, 2));
            console.log(`✅ User IPFS hashes saved to disk: ${this.userHashesFile}`);
        } catch (error) {
            console.error('❌ Failed to save user IPFS hashes:', error);
        }
    }
    
    // Load user IPFS hashes from disk
    loadUserHashes() {
        try {
            if (fs.existsSync(this.userHashesFile)) {
                const hashesData = fs.readFileSync(this.userHashesFile, 'utf8');
                const hashesObject = JSON.parse(hashesData);
                
                // Convert object back to Map
                this.userIPFSHashes.clear();
                for (const [username, ipfsHash] of Object.entries(hashesObject)) {
                    this.userIPFSHashes.set(username, ipfsHash);
                }
                
                console.log(`✅ Loaded ${this.userIPFSHashes.size} user IPFS hashes from disk`);
                return true;
            } else {
                console.log('ℹ️ No user IPFS hashes file found, starting with empty cache');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to load user IPFS hashes:', error);
            return false;
        }
    }
    
    // Add user IPFS hash and save to disk
    addUserIPFSHash(username, ipfsHash) {
        this.userIPFSHashes.set(username, ipfsHash);
        this.saveUserHashes();
        console.log(`✅ Added user IPFS hash for ${username}: ${ipfsHash}`);
    }
    
    async initialize() {
        try {
            // Load existing user IPFS hashes from disk
            this.loadUserHashes();
            
            // Initialize Web3 provider
            if (process.env.USE_SEPOLIA_NETWORK === 'true') {
                // Use Sepolia testnet
                this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
                console.log('🌐 Using Sepolia testnet');
            } else if (process.env.NODE_ENV === 'production') {
                // Production: Use actual blockchain network
                this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
            } else {
                // Development: Use local Hardhat network
                this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
                console.log('🏠 Using local Hardhat network');
            }
            
            // Initialize signer (wallet)
            try {
                if (process.env.USE_SEPOLIA_NETWORK === 'true' && process.env.PRIVATE_KEY) {
                    // Use Sepolia private key - manually set for testing
                    const privateKey = '0xd4359a0c77f2e2f27df1f9af00fe3076c94c73f43c820fafaa87d173377b190f';
                    this.signer = new ethers.Wallet(privateKey, this.provider);
                    console.log('✅ Using Sepolia testnet account with MetaMask key');
                } else {
                    // Use the first Hardhat account's private key for development
                    const hardhatPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
                    this.signer = new ethers.Wallet(hardhatPrivateKey, this.provider);
                    console.log('✅ Using Hardhat development account');
                }
            } catch (error) {
                console.error('Failed to initialize signer:', error);
                throw new Error('Failed to initialize blockchain signer. Check your private key and network configuration.');
            }
            
            // Initialize smart contracts
            await this.initializeContracts();
            
            this.isInitialized = true;
            console.log('✅ Blockchain service initialized successfully');
            
            // Users are stored on IPFS, retrieved dynamically on login
            console.log('✅ IPFS-based user storage - users retrieved from IPFS on login');
            
        } catch (error) {
            console.error('❌ Failed to initialize blockchain service:', error);
            this.isInitialized = false;
        }
    }
    
    async initializeContracts() {
        try {
            // Load the actual MedicalReport contract ABI
            const medicalReportArtifact = require('../artifacts/contracts/MedicalReport.sol/MedicalReport.json');
            const healthRecordABI = medicalReportArtifact.abi;
            
            const accessControlABI = [
                "function grantPermission(string doctorId, string patientId, string accessLevel, uint256 durationInDays) external",
                "function revokePermission(string doctorId, string patientId) external",
                "function hasPermission(string doctorId, string patientId) external view returns (bool, string)",
                "function authorizeDoctor(string doctorId) external",
                "function registerPatient(string patientId) external"
            ];
            
            // Contract addresses (would be set after deployment)
            const healthRecordAddress = process.env.HEALTH_RECORD_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
            const accessControlAddress = process.env.ACCESS_CONTROL_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
            
            // Initialize contract instances
            this.healthRecordContract = new ethers.Contract(
                healthRecordAddress,
                healthRecordABI,
                this.signer
            );
            
            this.accessControlContract = new ethers.Contract(
                accessControlAddress,
                accessControlABI,
                this.signer
            );
            
            console.log('✅ Smart contracts initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize contracts:', error);
            throw error;
        }
    }
    
    // Encryption Methods
    encryptData(data, key) {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
            return encrypted;
        } catch (error) {
            console.error('❌ Failed to encrypt data:', error);
            throw error;
        }
    }
    
    decryptData(encryptedData, key) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            console.error('❌ Failed to decrypt data:', error);
            throw error;
        }
    }
    
    // Blockchain Methods with IPFS Integration
    async addHealthRecord(patientId, doctorId, healthData, metadata = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            // Encrypt health data
            const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
            const encryptedData = this.encryptData(healthData, encryptionKey);
            
            // Upload encrypted data to IPFS
            let dataHash, metadataHash;
            
            try {
                // Use Pinata IPFS for all uploads
                if (this.pinataIPFSService.isReady()) {
                    const dataResult = await this.pinataIPFSService.uploadData(encryptedData, 'health-data.json', {
                        patientId: patientId,
                        doctorId: doctorId,
                        type: 'health-record'
                    });
                    
                    const metadataResult = await this.pinataIPFSService.uploadData(metadata, 'metadata.json', {
                        patientId: patientId,
                        doctorId: doctorId,
                        type: 'metadata'
                    });
                    
                    if (dataResult.success && metadataResult.success) {
                        dataHash = dataResult.ipfsHash;
                        metadataHash = metadataResult.ipfsHash;
                        console.log(`✅ Data uploaded to Pinata IPFS - Data CID: ${dataHash}, Metadata CID: ${metadataHash}`);
                    } else {
                        throw new Error('Pinata upload failed');
                    }
                } else {
                    throw new Error('Pinata IPFS service not available');
                }
            } catch (ipfsError) {
                console.log('⚠️ Pinata IPFS upload failed, using local hashes as fallback');
                // Fallback to local hashes if Pinata fails
                dataHash = CryptoJS.SHA256(encryptedData).toString();
                metadataHash = CryptoJS.SHA256(JSON.stringify(metadata)).toString();
            }
            
            // Add record to blockchain
            const tx = await this.healthRecordContract.addHealthRecord(
                patientId,
                doctorId,
                dataHash,
                metadataHash,
                true // isEncrypted
            );
            
            const receipt = await tx.wait();
            console.log(`✅ Health record added to blockchain: ${receipt.hash}`);
            
            return {
                transactionHash: receipt.hash,
                dataHash: dataHash,
                metadataHash: metadataHash,
                blockNumber: receipt.blockNumber,
                ipfsDataUrl: this.pinataIPFSService.getGatewayUrl(dataHash),
                ipfsMetadataUrl: this.pinataIPFSService.getGatewayUrl(metadataHash)
            };
            
        } catch (error) {
            console.error('❌ Failed to add health record:', error);
            throw error;
        }
    }
    
    async getHealthRecord(recordId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const record = await this.healthRecordContract.getHealthRecord(recordId);
            
            // Try to retrieve data from IPFS
            let healthData = null;
            let metadata = null;
            
            try {
                if (record[3] && (record[3].startsWith('Qm') || record[3].startsWith('bafy'))) {
                    // This is an IPFS CID, try to retrieve data from Pinata
                    const dataResult = await this.pinataIPFSService.getData(record[3]);
                    if (dataResult.success) {
                        healthData = this.decryptData(dataResult.data, process.env.ENCRYPTION_KEY || 'default-key');
                    }
                }
                
                if (record[4] && (record[4].startsWith('Qm') || record[4].startsWith('bafy'))) {
                    // This is an IPFS CID, try to retrieve metadata from Pinata
                    const metadataResult = await this.pinataIPFSService.getData(record[4]);
                    if (metadataResult.success) {
                        metadata = JSON.parse(metadataResult.data);
                    }
                }
            } catch (ipfsError) {
                console.log('⚠️ Pinata IPFS retrieval failed, data not available');
            }
            
            return {
                recordId: record[0].toString(),
                patientId: record[1],
                doctorId: record[2],
                dataHash: record[3],
                metadataHash: record[4],
                timestamp: new Date(record[5] * 1000).toISOString(),
                isValid: record[6],
                isEncrypted: record[7],
                healthData: healthData,
                metadata: metadata,
                ipfsDataUrl: this.pinataIPFSService.getGatewayUrl(record[3]),
                ipfsMetadataUrl: this.pinataIPFSService.getGatewayUrl(record[4])
            };
            
        } catch (error) {
            console.error('❌ Failed to get health record:', error);
            throw error;
        }
    }
    
    async getPatientRecords(patientId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            console.log('🔍 Fetching records for patient ID:', patientId);
            const recordIds = await this.healthRecordContract.getPatientReports(patientId);
            console.log('📋 Found record IDs:', recordIds);
            
            const records = [];
            
            for (const recordId of recordIds) {
                try {
                    console.log('📄 Fetching record:', recordId);
                    const record = await this.healthRecordContract.getReportDetails(recordId);
                    records.push({
                        reportId: recordId,
                        patientId: record.patientId,
                        ipfsHash: record.ipfsHash,
                        reportType: record.reportType,
                        timestamp: record.timestamp,
                        isEncrypted: record.isEncrypted
                    });
                    console.log('✅ Record fetched successfully:', recordId);
                } catch (error) {
                    console.error(`❌ Failed to get record ${recordId}:`, error);
                }
            }
            
            console.log('📊 Total records found:', records.length);
            return records;
            
        } catch (error) {
            console.error('❌ Failed to get patient records:', error);
            throw error;
        }
    }
    
    async addMedicalReport(patientId, ipfsHash, encryptedMetadata, reportType) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            console.log('🔗 Adding medical report to blockchain...');
            console.log('👤 Patient ID:', patientId);
            console.log('📁 IPFS Hash:', ipfsHash);
            console.log('📄 Report Type:', reportType);
            console.log('🔐 Encrypted Metadata Length:', encryptedMetadata.length, 'characters');
            
            // Check if patient is registered, if not register them
            try {
                const isRegistered = await this.healthRecordContract.registeredPatients(patientId);
                if (!isRegistered) {
                    console.log('👤 Registering patient:', patientId);
                    const registerTx = await this.healthRecordContract.registerPatient(patientId);
                    await registerTx.wait();
                    console.log('✅ Patient registered successfully');
                } else {
                    console.log('✅ Patient already registered');
                }
            } catch (error) {
                console.log('⚠️ Could not check patient registration, proceeding anyway:', error.message);
            }
            
            if (!this.healthRecordContract) {
                throw new Error('Health record contract not initialized');
            }
            
            const tx = await this.healthRecordContract.addMedicalReport(
                patientId,
                ipfsHash,
                encryptedMetadata,
                reportType
            );
            
            const receipt = await tx.wait();
            console.log(`✅ Medical report added to blockchain: ${receipt.hash}`);
            
            // Get the report ID from the transaction logs
            let reportId = null;
            if (receipt.logs && receipt.logs.length > 0) {
                // Look for the ReportAdded event
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = this.healthRecordContract.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'ReportAdded') {
                            reportId = parsedLog.args.reportId.toString();
                            break;
                        }
                    } catch (e) {
                        // Continue searching
                    }
                }
            }
            
            return {
                reportId: reportId,
                transactionHash: receipt.hash,
                patientId: patientId,
                ipfsHash: ipfsHash,
                reportType: reportType
            };
            
        } catch (error) {
            console.error('❌ Failed to add medical report:', error);
            throw error;
        }
    }
    
    async grantPermission(doctorId, patientId, accessLevel = 'read', durationInDays = 30) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const tx = await this.accessControlContract.grantPermission(
                doctorId,
                patientId,
                accessLevel,
                durationInDays
            );
            
            const receipt = await tx.wait();
            console.log(`✅ Permission granted: ${receipt.hash}`);
            
            return {
                transactionHash: receipt.hash,
                doctorId: doctorId,
                patientId: patientId,
                accessLevel: accessLevel,
                durationInDays: durationInDays
            };
            
        } catch (error) {
            console.error('❌ Failed to grant permission:', error);
            throw error;
        }
    }
    
    async checkPermission(doctorId, patientId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const [hasPermission, accessLevel] = await this.accessControlContract.hasPermission(
                doctorId,
                patientId
            );
            
            return {
                hasPermission: hasPermission,
                accessLevel: accessLevel
            };
            
        } catch (error) {
            console.error('❌ Failed to check permission:', error);
            throw error;
        }
    }
    
    async registerDoctor(doctorId, name, username, specialization) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const tx = await this.healthRecordContract.registerDoctor(
                doctorId,
                name,
                username,
                specialization
            );
            
            const receipt = await tx.wait();
            console.log(`✅ Doctor registered: ${receipt.hash}`);
            
            // Store doctor in memory for easy retrieval
            this.registeredDoctors.set(doctorId, {
                doctorId: doctorId,
                name: name,
                username: username,
                specialization: specialization,
                isAuthorized: true,
                userAddress: await this.signer.getAddress()
            });
            
            return {
                transactionHash: receipt.hash,
                doctorId: doctorId,
                name: name,
                username: username,
                specialization: specialization,
                userAddress: await this.signer.getAddress()
            };
            
        } catch (error) {
            console.error('❌ Failed to register doctor:', error);
            throw error;
        }
    }
    
    async registerPatient(patientId, name, username) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const tx = await this.healthRecordContract.registerPatient(patientId, name, username);
            const receipt = await tx.wait();
            
            console.log(`✅ Patient registered: ${receipt.hash}`);
            
            return {
                transactionHash: receipt.hash,
                patientId: patientId,
                name: name,
                username: username,
                userAddress: await this.signer.getAddress()
            };
            
        } catch (error) {
            console.error('❌ Failed to register patient:', error);
            throw error;
        }
    }
    
    // User Management Methods
    async checkUserExists(username) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const exists = await this.healthRecordContract.checkUsernameExists(username);
            return exists;
            
        } catch (error) {
            console.error('❌ Failed to check user existence:', error);
            return false;
        }
    }
    
    // Method to manually add a doctor to memory (for development/testing)
    // Memory storage methods removed - using IPFS for user storage
    // Users are stored on IPFS and retrieved via blockchain events

    async getUserByUsername(username) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            // Try to get user from blockchain first
            try {
                const [userId, role] = await this.healthRecordContract.getUserByUsername(username);
                
                let userData;
                if (role === 'doctor') {
                    const doctor = await this.healthRecordContract.getDoctor(userId);
                    userData = {
                        userId: doctor[0],
                        username: username,
                        name: doctor[1],
                        role: 'doctor',
                        specialization: doctor[3],
                        userAddress: await this.signer.getAddress(),
                        isActive: doctor[4]
                    };
                } else {
                    const patient = await this.healthRecordContract.getPatient(userId);
                    userData = {
                        userId: patient[0],
                        username: username,
                        name: patient[1],
                        role: 'patient',
                        userAddress: await this.signer.getAddress(),
                        isActive: patient[3]
                    };
                }
                
                return userData;
            } catch (blockchainError) {
                console.log('⚠️ Blockchain lookup failed, trying IPFS retrieval');
            }
            
            // Try to retrieve user from IPFS using known CIDs
            const knownUsers = [
                {
                    username: 'Muthu',
                    ipfsHash: 'QmaENGwnpipMx5en9XQHRxYKUZAXaVwB1VRbxGoHSkhJVZ',
                    role: 'doctor'
                },
                {
                    username: 'Vishal',
                    ipfsHash: 'QmSuN4Mzywe7xMS2MUGEqP2S1DaHQSo5rF8Up6uqvrwjPC',
                    role: 'patient'
                },
                {
                    username: 'Vishal',
                    ipfsHash: 'QmT7NYY7yMv4aKY8iR4J8CFzEQ5i2qoEnagdhDhNca5hiY',
                    role: 'patient'
                }
            ];
            
            for (const knownUser of knownUsers) {
                if (knownUser.username === username) {
                    try {
                        const userData = await this.ipfsService.getData(knownUser.ipfsHash);
                        const userMetadata = JSON.parse(userData);
                        
                        return {
                            userId: userMetadata.userId,
                            username: userMetadata.username,
                            role: userMetadata.role,
                            name: userMetadata.name,
                            userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                            isActive: true,
                            ipfsHash: knownUser.ipfsHash
                        };
                    } catch (ipfsError) {
                        console.log(`⚠️ Failed to retrieve user ${username} from IPFS:`, ipfsError.message);
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Failed to get user by username:', error);
            return null;
        }
    }
    
    async getAllUsers() {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const users = [];
            
            // Get users from IPFS hashes
            if (this.userIPFSHashes) {
                for (const [username, ipfsHash] of this.userIPFSHashes) {
                    try {
                        const userData = await this.ipfsService.getData(ipfsHash);
                        const user = JSON.parse(userData);
                        
                        users.push({
                            id: user.userId,
                            name: user.name,
                            role: user.role,
                            blockchainAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Default Hardhat address
                            isActive: user.isActive
                        });
                    } catch (error) {
                        console.log(`Failed to retrieve user ${username} from IPFS:`, error.message);
                    }
                }
            }
            
            console.log(`✅ Retrieved ${users.length} users from IPFS (${users.filter(u => u.role === 'doctor').length} doctors, ${users.filter(u => u.role === 'patient').length} patients)`);
            return users;
            
        } catch (error) {
            console.error('❌ Failed to get all users:', error);
            return [];
        }
    }

    // Method to fetch all users from blockchain events and IPFS (simplified)
    async getAllUsersFromBlockchain() {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            console.log('⚠️ Blockchain user fetching not implemented yet - using memory fallback');
            return [];
            
        } catch (error) {
            console.error('❌ Failed to get all users from blockchain:', error);
            return [];
        }
    }

    // Access Control Methods
    async grantDoctorAccess(patientId, doctorId, accessLevel = 'read', durationInDays = 30) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            console.log(`✅ Granting access: Patient ${patientId} → Doctor ${doctorId} (${accessLevel}, ${durationInDays} days)`);
            
            // First try to grant permission via blockchain contract
            try {
                const tx = await this.accessControlContract.grantPermission(
                    doctorId,
                    patientId,
                    accessLevel,
                    durationInDays
                );
                
                const receipt = await tx.wait();
                console.log(`✅ Blockchain permission granted: ${receipt.hash}`);
                
                return {
                    transactionHash: receipt.hash,
                    success: true,
                    method: 'blockchain',
                    accessLevel: accessLevel,
                    durationInDays: durationInDays
                };
                
            } catch (blockchainError) {
                console.log('⚠️ Blockchain permission grant failed, falling back to file-based permissions:', blockchainError.message);
            }
            
            // Fallback to file-based permissions for development
            const fs = require('fs');
            const path = require('path');
            const permissionsFile = path.join(__dirname, '..', 'test-permissions.json');
            
            let permissions = {};
            if (fs.existsSync(permissionsFile)) {
                permissions = JSON.parse(fs.readFileSync(permissionsFile, 'utf8'));
            }
            
            if (!permissions[patientId]) {
                permissions[patientId] = [];
            }
            
            if (!permissions[patientId].includes(doctorId)) {
                permissions[patientId].push(doctorId);
                fs.writeFileSync(permissionsFile, JSON.stringify(permissions, null, 2));
                console.log(`✅ Access granted and saved to file`);
            } else {
                console.log(`ℹ️ Access already granted`);
            }
            
            return {
                transactionHash: 'file-access-granted-' + Date.now(),
                success: true,
                method: 'file',
                accessLevel: accessLevel,
                durationInDays: durationInDays
            };
            
        } catch (error) {
            console.error('❌ Failed to grant doctor access:', error);
            throw error;
        }
    }

    async revokeDoctorAccess(patientId, doctorId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            console.log(`✅ Revoking access: Patient ${patientId} → Doctor ${doctorId}`);
            
            // First try to revoke permission via blockchain contract
            try {
                const tx = await this.accessControlContract.revokePermission(
                    doctorId,
                    patientId
                );
                
                const receipt = await tx.wait();
                console.log(`✅ Blockchain permission revoked: ${receipt.hash}`);
                
                return {
                    transactionHash: receipt.hash,
                    success: true,
                    method: 'blockchain'
                };
                
            } catch (blockchainError) {
                console.log('⚠️ Blockchain permission revoke failed, falling back to file-based permissions:', blockchainError.message);
            }
            
            // Fallback to file-based permissions for development
            const fs = require('fs');
            const path = require('path');
            const permissionsFile = path.join(__dirname, '..', 'test-permissions.json');
            
            let permissions = {};
            if (fs.existsSync(permissionsFile)) {
                permissions = JSON.parse(fs.readFileSync(permissionsFile, 'utf8'));
            }
            
            if (permissions[patientId]) {
                permissions[patientId] = permissions[patientId].filter(id => id !== doctorId);
                fs.writeFileSync(permissionsFile, JSON.stringify(permissions, null, 2));
                console.log(`✅ Access revoked and saved to file`);
            } else {
                console.log(`ℹ️ No permissions found for patient ${patientId}`);
            }
            
            return {
                transactionHash: 'file-access-revoked-' + Date.now(),
                success: true,
                method: 'file'
            };
            
        } catch (error) {
            console.error('❌ Failed to revoke doctor access:', error);
            throw error;
        }
    }

    async getDoctorAccessPermissions(patientId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            // Use the same file-based system as grantDoctorAccess for consistency
            const fs = require('fs');
            const path = require('path');
            const permissionsFile = path.join(__dirname, '..', 'test-permissions.json');
            
            if (fs.existsSync(permissionsFile)) {
                try {
                    const fileContent = fs.readFileSync(permissionsFile, 'utf8');
                    const permissions = JSON.parse(fileContent);
                    const patientPermissions = permissions[patientId] || [];
                    console.log(`✅ Retrieved permissions for patient ${patientId}:`, patientPermissions);
                    return patientPermissions;
                } catch (parseError) {
                    console.error('❌ Error parsing permissions file:', parseError);
                    console.log('Creating new permissions file with empty object');
                    fs.writeFileSync(permissionsFile, '{}');
                    return [];
                }
            }
            
            console.log(`No permissions file found, returning empty array for patient ${patientId}`);
            return [];
            
        } catch (error) {
            console.error('❌ Failed to get access permissions:', error);
            return [];
        }
    }

    // Helper method to get IPFS hash for permissions (simplified for demo)
    async getPermissionIPFSHash(patientId) {
        try {
            // In a real implementation, this would query the blockchain
            // For now, we'll use a simple mapping stored in memory
            if (!this.permissionIPFSHashes) {
                this.permissionIPFSHashes = new Map();
            }
            
            return this.permissionIPFSHashes.get(patientId);
        } catch (error) {
            console.error('❌ Failed to get permission IPFS hash:', error);
            return null;
        }
    }

    // Helper method to store IPFS hash for permissions
    async storePermissionIPFSHash(patientId, ipfsHash) {
        try {
            if (!this.permissionIPFSHashes) {
                this.permissionIPFSHashes = new Map();
            }
            
            this.permissionIPFSHashes.set(patientId, ipfsHash);
            return true;
        } catch (error) {
            console.error('❌ Failed to store permission IPFS hash:', error);
            return false;
        }
    }

    // Get all patients accessible to a specific doctor
    async getPatientsAccessibleToDoctor(doctorId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            // Use simple file-based permissions for now
            const fs = require('fs');
            const path = require('path');
            const permissionsFile = path.join(__dirname, '..', 'test-permissions.json');
            
            if (fs.existsSync(permissionsFile)) {
                try {
                    const fileContent = fs.readFileSync(permissionsFile, 'utf8');
                    const permissions = JSON.parse(fileContent);
                    const accessiblePatients = [];
                
                    console.log(`🔍 Looking for doctor ${doctorId} in permissions:`, permissions);
                    
                    // First, try to get the doctor's username from the user ID
                    let doctorUsername = doctorId;
                    try {
                        // If doctorId is a generated ID, try to get the username from IPFS
                        if (this.userIPFSHashes) {
                            for (const [username, ipfsHash] of this.userIPFSHashes) {
                                try {
                                    const userData = await this.ipfsService.getData(ipfsHash);
                                    const user = JSON.parse(userData);
                                    if (user.userId === doctorId) {
                                        doctorUsername = user.username;
                                        console.log(`Found username for doctor ${doctorId}: ${doctorUsername}`);
                                        break;
                                    }
                                } catch (error) {
                                    // Continue to next user
                                }
                            }
                        }
                    } catch (error) {
                        console.log('Could not find username for doctor ID, using ID as is');
                    }
                    
                    for (const [patientId, doctorIds] of Object.entries(permissions)) {
                        console.log(`Checking patient ${patientId}, doctor IDs: ${doctorIds}`);
                        
                        // Check if the doctor ID or username matches
                        const hasAccess = doctorIds.some(id => {
                            // Try exact match first
                            if (id === doctorId || id === doctorUsername) return true;
                            
                            // Try username match (if doctorId contains the username)
                            if (doctorId.includes(id) || id.includes(doctorId) || 
                                doctorUsername.includes(id) || id.includes(doctorUsername)) return true;
                            
                            return false;
                        });
                        
                        if (hasAccess) {
                            accessiblePatients.push({
                                id: patientId,
                                name: patientId, // Use the actual patient ID as name
                                role: 'patient',
                                isActive: true
                            });
                            console.log(`✅ Patient ${patientId} is accessible to doctor ${doctorId} (username: ${doctorUsername})`);
                        }
                    }
                    
                    console.log(`✅ Found ${accessiblePatients.length} patients accessible to doctor ${doctorId}`);
                    return accessiblePatients;
                } catch (parseError) {
                    console.error('❌ Error parsing permissions file:', parseError);
                    console.log('Creating new permissions file with empty object');
                    fs.writeFileSync(permissionsFile, '{}');
                    return [];
                }
            } else {
                console.log('No permissions file found, returning empty array');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Failed to get accessible patients:', error);
            return [];
        }
    }

    async checkDoctorAccess(patientId, doctorId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            // First check blockchain permissions
            try {
                const [hasPermission, accessLevel] = await this.accessControlContract.hasPermission(
                    doctorId,
                    patientId
                );
                
                if (hasPermission) {
                    console.log(`✅ Blockchain permission found: Doctor ${doctorId} has ${accessLevel} access to patient ${patientId}`);
                    return { hasAccess: true, accessLevel: accessLevel };
                }
                
                // Check for emergency access
                const hasEmergencyAccess = await this.accessControlContract.hasEmergencyAccess(
                    doctorId,
                    patientId
                );
                
                if (hasEmergencyAccess) {
                    console.log(`✅ Emergency access found: Doctor ${doctorId} has emergency access to patient ${patientId}`);
                    return { hasAccess: true, accessLevel: 'emergency' };
                }
                
            } catch (blockchainError) {
                console.log('⚠️ Blockchain permission check failed, falling back to file-based permissions:', blockchainError.message);
            }
            
            // Fallback to file-based permissions for development
            const fs = require('fs');
            const path = require('path');
            const permissionsFile = path.join(__dirname, '..', 'test-permissions.json');
            
            if (fs.existsSync(permissionsFile)) {
                const permissions = JSON.parse(fs.readFileSync(permissionsFile, 'utf8'));
                const hasFileAccess = permissions[patientId] && permissions[patientId].includes(doctorId);
                if (hasFileAccess) {
                    console.log(`✅ File-based permission found: Doctor ${doctorId} has access to patient ${patientId}`);
                    return { hasAccess: true, accessLevel: 'read' };
                }
            }
            
            console.log(`❌ No access found: Doctor ${doctorId} does not have access to patient ${patientId}`);
            return { hasAccess: false, accessLevel: null };
            
        } catch (error) {
            console.error('❌ Failed to check doctor access:', error);
            return { hasAccess: false, accessLevel: null };
        }
    }

    async getAllDoctors() {
        try {
            if (!this.isInitialized) {
                throw new Error('Blockchain service not initialized');
            }
            
            const doctors = [];
            
            // Get doctors from IPFS hashes (same approach as getAllUsers)
            if (this.userIPFSHashes) {
                for (const [username, ipfsHash] of this.userIPFSHashes) {
                    try {
                        const userData = await this.ipfsService.getData(ipfsHash);
                        const user = JSON.parse(userData);
                        
                        // Only include doctors
                        if (user.role === 'doctor') {
                            doctors.push({
                                userId: user.userId,
                                name: user.name,
                                username: user.username,
                                role: user.role,
                                specialization: user.specialization || 'General Medicine',
                                userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Default Hardhat address
                                isActive: user.isActive
                            });
                        }
                    } catch (error) {
                        console.log(`Failed to retrieve doctor ${username} from IPFS:`, error.message);
                    }
                }
            }
            
            console.log(`✅ Retrieved ${doctors.length} doctors from IPFS`);
            return doctors;
            
        } catch (error) {
            console.error('❌ Failed to get all doctors:', error);
            return [];
        }
    }

    // Method to manually add a doctor to memory (for development/testing)
    addDoctorToMemory(doctorId, name, username, specialization = 'General Medicine') {
        try {
            if (!this.registeredDoctors) {
                this.registeredDoctors = new Map();
            }
            
            this.registeredDoctors.set(doctorId, {
                doctorId: doctorId,
                name: name,
                username: username,
                specialization: specialization,
                isAuthorized: true,
                userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' // Default Hardhat address
            });
            
            console.log(`✅ Doctor ${name} (${doctorId}) added to memory`);
            return true;
        } catch (error) {
            console.error('❌ Failed to add doctor to memory:', error);
            return false;
        }
    }

    // Method to manually add a patient to memory (for development/testing)
    addPatientToMemory(patientId, name, username) {
        try {
            if (!this.registeredPatients) {
                this.registeredPatients = new Map();
            }
            
            this.registeredPatients.set(patientId, {
                patientId: patientId,
                name: name,
                username: username,
                isActive: true,
                userAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' // Default Hardhat address
            });
            
            console.log(`✅ Patient ${name} (${patientId}) added to memory`);
            return true;
        } catch (error) {
            console.error('❌ Failed to add patient to memory:', error);
            return false;
        }
    }
    
    // AI Analysis Methods
    async analyzeHealthDataWithAI(healthData, analysisType = 'general') {
        try {
            if (!this.geminiAIService.isReady()) {
                throw new Error('Gemini AI service not available');
            }
            
            const analysis = await this.geminiAIService.analyzeMedicalData(healthData, analysisType);
            
            if (analysis.success) {
                console.log(`✅ AI analysis completed: ${analysisType}`);
                return analysis;
            } else {
                throw new Error(analysis.error);
            }
            
        } catch (error) {
            console.error('❌ Failed to analyze health data with AI:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    async generateHealthInsights(patientId, healthData) {
        try {
            if (!this.geminiAIService.isReady()) {
                throw new Error('Gemini AI service not available');
            }
            
            const insights = await this.geminiAIService.generateHealthInsights(healthData);
            
            if (insights.success) {
                console.log(`✅ Health insights generated for patient ${patientId}`);
                return insights;
            } else {
                throw new Error(insights.error);
            }
            
        } catch (error) {
            console.error('❌ Failed to generate health insights:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Utility Methods
    async getBlockchainStatus() {
        return {
            isInitialized: this.isInitialized,
            network: await this.provider?.getNetwork(),
            signerAddress: await this.signer?.getAddress(),
            blockNumber: await this.provider?.getBlockNumber(),
            services: {
                geminiAI: this.geminiAIService.isReady(),
                pinataIPFS: this.pinataIPFSService.isReady()
            }
        };
    }
}

module.exports = BlockchainService;
