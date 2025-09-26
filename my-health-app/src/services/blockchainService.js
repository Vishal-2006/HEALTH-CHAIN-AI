class BlockchainService {
    constructor() {
        this.baseURL = 'http://localhost:5002/api/blockchain';
    }
    
    // Blockchain Status
    async getBlockchainStatus() {
        try {
            const response = await fetch(`${this.baseURL}/status`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get blockchain status:', error);
            throw error;
        }
    }
    
    // Register User on Blockchain
    async registerUser(userId, name, role, specialization = null) {
        try {
            const response = await fetch(`${this.baseURL}/register-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    name,
                    role,
                    specialization
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to register user on blockchain:', error);
            throw error;
        }
    }
    
    // Grant Permission
    async grantPermission(doctorId, patientId, accessLevel = 'read', durationInDays = 30) {
        try {
            const response = await fetch(`${this.baseURL}/grant-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctorId,
                    patientId,
                    accessLevel,
                    durationInDays
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to grant permission:', error);
            throw error;
        }
    }
    
    // Check Permission
    async checkPermission(doctorId, patientId) {
        try {
            const response = await fetch(`${this.baseURL}/check-permission/${doctorId}/${patientId}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to check permission:', error);
            throw error;
        }
    }
    
    // Get Patient Records from Blockchain
    async getPatientRecords(patientId) {
        try {
            const response = await fetch(`${this.baseURL}/patient-records/${patientId}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get patient records:', error);
            throw error;
        }
    }
    
    // Add Health Record to Blockchain
    async addHealthRecord(patientId, doctorId, healthData, metadata = {}) {
        try {
            const response = await fetch(`${this.baseURL}/add-record`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId,
                    doctorId,
                    healthData,
                    metadata
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to add health record to blockchain:', error);
            throw error;
        }
    }
    
    // Utility method to format transaction hash for display
    formatTransactionHash(hash) {
        if (!hash) return 'N/A';
        return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
    }
    
    // Utility method to format timestamp
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }
}

export default new BlockchainService();
