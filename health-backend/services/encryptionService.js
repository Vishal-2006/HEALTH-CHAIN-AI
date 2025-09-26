const crypto = require('crypto');

class EncryptionService {
    constructor() {
        // In production, use environment variables for these keys
        this.algorithm = 'aes-256-gcm';
        // Create a proper 32-byte key for AES-256-GCM
        this.secretKey = this.generateSecureKey(process.env.ENCRYPTION_KEY || 'healthchain-ai-secure-key-2024');
        this.ivLength = 16;
        this.tagLength = 16;
    }

    /**
     * Generate a secure 32-byte key for AES-256-GCM
     * @param {string} seed - Seed string for key generation
     * @returns {Buffer} - 32-byte key
     */
    generateSecureKey(seed) {
        // Use crypto.createHash to create a consistent 32-byte key from the seed
        return crypto.createHash('sha256').update(seed).digest();
    }

    /**
     * Encrypt medical report metadata
     * @param {Object} metadata - Medical report metadata to encrypt
     * @returns {Object} - Encrypted data with IV and auth tag
     */
    encryptMetadata(metadata) {
        try {
            // Debug: Check key length
            console.log('🔐 Encryption Debug:');
            console.log('  Algorithm:', this.algorithm);
            console.log('  Key length:', this.secretKey.length, 'bytes');
            console.log('  Key type:', typeof this.secretKey);
            console.log('  IV length:', this.ivLength, 'bytes');
            
            // Generate random IV
            const iv = crypto.randomBytes(this.ivLength);
            
            // Create cipher using modern createCipheriv method
            const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
            cipher.setAAD(Buffer.from('medical-report', 'utf8'));
            
            // Encrypt the metadata
            const jsonString = JSON.stringify(metadata);
            let encrypted = cipher.update(jsonString, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Get authentication tag
            const tag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                algorithm: this.algorithm
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt metadata');
        }
    }

    /**
     * Decrypt medical report metadata
     * @param {Object} encryptedData - Encrypted data object
     * @returns {Object} - Decrypted metadata
     */
    decryptMetadata(encryptedData) {
        try {
            const { encrypted, iv, tag, algorithm } = encryptedData;
            
            // Create decipher using modern createDecipheriv method
            const decipher = crypto.createDecipheriv(algorithm, this.secretKey, Buffer.from(iv, 'hex'));
            decipher.setAAD(Buffer.from('medical-report', 'utf8'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            
            // Decrypt the data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt metadata');
        }
    }

    /**
     * Generate hash for access control
     * @param {string} patientId - Patient ID
     * @param {string} ipfsHash - IPFS hash
     * @param {number} timestamp - Timestamp
     * @returns {string} - Access hash
     */
    generateAccessHash(patientId, ipfsHash, timestamp) {
        const data = `${patientId}_${ipfsHash}_${timestamp}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Hash sensitive medical data
     * @param {Object} medicalData - Medical data to hash
     * @returns {string} - Hash of the data
     */
    hashMedicalData(medicalData) {
        const jsonString = JSON.stringify(medicalData);
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    /**
     * Generate secure random ID
     * @param {number} length - Length of the ID
     * @returns {string} - Random ID
     */
    generateSecureId(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Encrypt file content for IPFS storage
     * @param {Buffer} fileBuffer - File buffer to encrypt
     * @returns {Object} - Encrypted file data
     */
    encryptFile(fileBuffer) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
            cipher.setAAD(Buffer.from('medical-file', 'utf8'));
            
            let encrypted = cipher.update(fileBuffer);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                algorithm: this.algorithm
            };
        } catch (error) {
            console.error('File encryption failed:', error);
            throw new Error('Failed to encrypt file');
        }
    }

    /**
     * Decrypt file content from IPFS
     * @param {Object} encryptedData - Encrypted file data
     * @returns {Buffer} - Decrypted file buffer
     */
    decryptFile(encryptedData) {
        try {
            const { encrypted, iv, tag, algorithm } = encryptedData;
            
            const decipher = crypto.createDecipheriv(algorithm, this.secretKey, Buffer.from(iv, 'hex'));
            decipher.setAAD(Buffer.from('medical-file', 'utf8'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted;
        } catch (error) {
            console.error('File decryption failed:', error);
            throw new Error('Failed to decrypt file');
        }
    }
}

module.exports = EncryptionService;
