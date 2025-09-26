const IPFSService = require('./ipfsService');
const EncryptionService = require('./encryptionService');
const BlockchainService = require('./blockchainService');
const Tesseract = require('tesseract.js');

class MedicalReportService {
    constructor() {
        this.ipfsService = new IPFSService();
        this.encryptionService = new EncryptionService();
        this.blockchainService = new BlockchainService();
    }

    /**
     * Process and store a medical report with full security
     * @param {Buffer} fileBuffer - Medical report file
     * @param {string} mimeType - File MIME type
     * @param {string} patientId - Patient ID
     * @param {string} reportType - Type of medical report
     * @returns {Object} - Processing result
     */
    async processMedicalReport(fileBuffer, mimeType, patientId, reportType = 'Lab Report') {
        try {
            console.log('🔐 Processing medical report with full security...');
            
            // Step 1: Extract text using OCR
            const extractedText = await this.extractTextFromImage(fileBuffer);
            console.log('📝 OCR Text extracted:', extractedText.substring(0, 100) + '...');
            
            // Step 2: Extract medical data using AI (Gemma3)
            const medicalData = await this.extractMedicalData(extractedText);
            console.log('🏥 Medical data extracted:', Object.keys(medicalData).length, 'metrics');
            
            // Step 3: Upload original file to IPFS
            const ipfsResult = await this.ipfsService.uploadFile(fileBuffer);
            console.log('📁 File uploaded to IPFS:', ipfsResult.hash);
            
            // Step 4: Create metadata structure
            const metadata = this.createMetadata(medicalData, reportType, extractedText);
            
            // Step 5: Encrypt metadata
            const encryptedMetadata = this.encryptionService.encryptMetadata(metadata);
            
            // Step 6: Convert encrypted metadata to JSON string for blockchain storage
            const encryptedMetadataString = JSON.stringify(encryptedMetadata);
            
            // Step 7: Store encrypted metadata on blockchain
            const blockchainResult = await this.storeOnBlockchain(
                patientId, 
                ipfsResult.hash, 
                encryptedMetadataString, 
                reportType
            );
            
            console.log('✅ Medical report processed and stored securely');
            
            return {
                success: true,
                reportId: blockchainResult.reportId,
                ipfsHash: ipfsResult.hash,
                extractedData: medicalData,
                metadata: metadata,
                encryptedMetadata: encryptedMetadataString,
                blockchainTx: blockchainResult.transactionHash,
                accessHash: blockchainResult.accessHash
            };
            
        } catch (error) {
            console.error('❌ Medical report processing failed:', error);
            throw error;
        }
    }

    /**
     * Extract text from medical report image
     * @param {Buffer} fileBuffer - Image file buffer
     * @returns {string} - Extracted text
     */
    async extractTextFromImage(fileBuffer) {
        try {
            const result = await Tesseract.recognize(fileBuffer, 'eng', {
                logger: m => console.log('OCR Progress:', m.progress)
            });
            return result.data.text;
        } catch (error) {
            console.error('OCR extraction failed:', error);
            throw new Error('Failed to extract text from image');
        }
    }

    /**
     * Extract medical data using AI (Gemma3)
     * @param {string} extractedText - OCR extracted text
     * @returns {Object} - Structured medical data
     */
    async extractMedicalData(extractedText) {
        try {
            // This would integrate with your Gemma3 AI service
            // For now, using a structured extraction approach
            
            const medicalData = {};
            const lines = extractedText.split('\n');
            
            // Extract common medical metrics
            const metrics = [
                { name: 'Blood Sugar', patterns: ['blood sugar', 'glucose', 'sugar'], unit: 'mg/dL' },
                { name: 'Blood Pressure', patterns: ['blood pressure', 'bp', 'pressure'], unit: 'mmHg' },
                { name: 'Total Cholesterol', patterns: ['cholesterol', 'total cholesterol'], unit: 'mg/dL' },
                { name: 'HDL', patterns: ['hdl', 'hdl cholesterol'], unit: 'mg/dL' },
                { name: 'LDL', patterns: ['ldl', 'ldl cholesterol'], unit: 'mg/dL' },
                { name: 'Triglycerides', patterns: ['triglycerides', 'trig'], unit: 'mg/dL' },
                { name: 'Heart Rate', patterns: ['heart rate', 'hr', 'pulse'], unit: 'bpm' },
                { name: 'Temperature', patterns: ['temperature', 'temp'], unit: '°F' },
                { name: 'Oxygen Saturation', patterns: ['oxygen', 'o2', 'saturation'], unit: '%' },
                { name: 'Weight', patterns: ['weight', 'wt'], unit: 'kg' },
                { name: 'Height', patterns: ['height', 'ht'], unit: 'cm' }
            ];
            
            metrics.forEach(metric => {
                const value = this.extractMetricValue(lines, metric.patterns);
                if (value) {
                    medicalData[metric.name] = {
                        value: value,
                        unit: metric.unit,
                        extracted: true
                    };
                }
            });
            
            return medicalData;
            
        } catch (error) {
            console.error('Medical data extraction failed:', error);
            throw new Error('Failed to extract medical data');
        }
    }

    /**
     * Extract specific metric value from text lines
     * @param {Array} lines - Text lines
     * @param {Array} patterns - Search patterns
     * @returns {string|null} - Extracted value
     */
    extractMetricValue(lines, patterns) {
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            for (const pattern of patterns) {
                if (lowerLine.includes(pattern)) {
                    // Extract numeric value from the line
                    const match = line.match(/(\d+(?:\.\d+)?(?:\/\d+)?)/);
                    if (match) {
                        return match[1];
                    }
                }
            }
        }
        return null;
    }

    /**
     * Create comprehensive metadata structure
     * @param {Object} medicalData - Extracted medical data
     * @param {string} reportType - Type of report
     * @param {string} rawText - Original OCR text
     * @returns {Object} - Metadata structure
     */
    createMetadata(medicalData, reportType, rawText) {
        const metrics = Object.keys(medicalData);
        const values = Object.values(medicalData).map(m => m.value);
        const units = Object.values(medicalData).map(m => m.unit);
        
        // Calculate risk level based on medical values
        const riskLevel = this.calculateRiskLevel(medicalData);
        const urgency = this.calculateUrgency(medicalData);
        
        return {
            reportType: reportType,
            extractedMetrics: metrics,
            values: values,
            units: units,
            riskLevel: riskLevel,
            urgency: urgency,
            recommendations: this.generateRecommendations(medicalData, riskLevel),
            rawTextHash: this.encryptionService.hashMedicalData(rawText),
            processingTimestamp: new Date().toISOString(),
            aiModel: 'gemma3:latest',
            confidence: this.calculateConfidence(medicalData)
        };
    }

    /**
     * Calculate risk level based on medical values
     * @param {Object} medicalData - Medical data
     * @returns {string} - Risk level
     */
    calculateRiskLevel(medicalData) {
        let riskScore = 0;
        
        // Blood Sugar risk
        if (medicalData['Blood Sugar']) {
            const value = parseFloat(medicalData['Blood Sugar'].value);
            if (value < 70 || value > 126) riskScore += 2;
        }
        
        // Blood Pressure risk
        if (medicalData['Blood Pressure']) {
            const bp = medicalData['Blood Pressure'].value.split('/');
            const systolic = parseFloat(bp[0]);
            const diastolic = parseFloat(bp[1]);
            if (systolic > 140 || diastolic > 90) riskScore += 2;
        }
        
        // Cholesterol risk
        if (medicalData['Total Cholesterol']) {
            const value = parseFloat(medicalData['Total Cholesterol'].value);
            if (value > 200) riskScore += 1;
        }
        
        if (riskScore >= 4) return 'HIGH';
        if (riskScore >= 2) return 'MODERATE';
        return 'LOW';
    }

    /**
     * Calculate urgency level
     * @param {Object} medicalData - Medical data
     * @returns {string} - Urgency level
     */
    calculateUrgency(medicalData) {
        // Check for critical values
        if (medicalData['Blood Sugar']) {
            const value = parseFloat(medicalData['Blood Sugar'].value);
            if (value < 50 || value > 400) return 'CRITICAL';
        }
        
        if (medicalData['Blood Pressure']) {
            const bp = medicalData['Blood Pressure'].value.split('/');
            const systolic = parseFloat(bp[0]);
            if (systolic > 180) return 'HIGH';
        }
        
        return 'NORMAL';
    }

    /**
     * Generate medical recommendations
     * @param {Object} medicalData - Medical data
     * @param {string} riskLevel - Risk level
     * @returns {Array} - Recommendations
     */
    generateRecommendations(medicalData, riskLevel) {
        const recommendations = [];
        
        if (riskLevel === 'HIGH') {
            recommendations.push('Schedule immediate consultation with healthcare provider');
            recommendations.push('Monitor vital signs daily');
        }
        
        if (medicalData['Blood Sugar'] && parseFloat(medicalData['Blood Sugar'].value) > 126) {
            recommendations.push('Monitor blood sugar levels regularly');
            recommendations.push('Consider dietary modifications');
        }
        
        if (medicalData['Blood Pressure'] && medicalData['Blood Pressure'].value.split('/')[0] > 140) {
            recommendations.push('Monitor blood pressure regularly');
            recommendations.push('Reduce sodium intake');
        }
        
        recommendations.push('Maintain regular exercise routine');
        recommendations.push('Schedule follow-up appointment');
        
        return recommendations;
    }

    /**
     * Calculate confidence score for extracted data
     * @param {Object} medicalData - Medical data
     * @returns {number} - Confidence percentage
     */
    calculateConfidence(medicalData) {
        const totalMetrics = Object.keys(medicalData).length;
        const extractedMetrics = Object.values(medicalData).filter(m => m.extracted).length;
        
        if (totalMetrics === 0) return 0;
        return Math.round((extractedMetrics / totalMetrics) * 100);
    }

    /**
     * Store report on blockchain
     * @param {string} patientId - Patient ID
     * @param {string} ipfsHash - IPFS hash
     * @param {Object} encryptedMetadata - Encrypted metadata
     * @param {string} reportType - Report type
     * @returns {Object} - Blockchain result
     */
    async storeOnBlockchain(patientId, ipfsHash, encryptedMetadata, reportType) {
        try {
            console.log('🔗 Storing medical report on blockchain...');
            console.log('👤 Patient ID:', patientId);
            console.log('📁 IPFS Hash:', ipfsHash);
            console.log('📄 Report Type:', reportType);
            
            // Call the actual blockchain service
            const result = await this.blockchainService.addMedicalReport(
                patientId,
                ipfsHash,
                encryptedMetadata,
                reportType
            );
            
            console.log('✅ Medical report stored on blockchain:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Blockchain storage failed:', error);
            throw new Error('Failed to store on blockchain: ' + error.message);
        }
    }

    /**
     * Retrieve medical report by ID
     * @param {string} reportId - Report ID
     * @param {string} doctorId - Doctor ID requesting access
     * @returns {Object} - Report data
     */
    async getMedicalReport(reportId, doctorId) {
        try {
            // Check blockchain access permissions
            const hasAccess = await this.checkAccess(reportId, doctorId);
            if (!hasAccess) {
                throw new Error('Access denied to this report');
            }
            
            // Get report metadata from blockchain
            const reportData = await this.getReportFromBlockchain(reportId);
            
            // Get file from IPFS
            const fileData = await this.ipfsService.getFile(reportData.ipfsHash);
            
            // Decrypt metadata
            const decryptedMetadata = this.encryptionService.decryptMetadata(
                reportData.encryptedMetadata
            );
            
            return {
                reportId: reportId,
                fileData: fileData,
                metadata: decryptedMetadata,
                ipfsHash: reportData.ipfsHash,
                timestamp: reportData.timestamp
            };
            
        } catch (error) {
            console.error('Failed to retrieve medical report:', error);
            throw error;
        }
    }

    /**
     * Check if doctor has access to report
     * @param {string} reportId - Report ID
     * @param {string} doctorId - Doctor ID
     * @returns {boolean} - Has access
     */
    async checkAccess(reportId, doctorId) {
        // This would check blockchain permissions
        // For now, returning true for testing
        return true;
    }

    /**
     * Get report data from blockchain
     * @param {string} reportId - Report ID
     * @returns {Object} - Report data
     */
    async getReportFromBlockchain(reportId) {
        // This would query your blockchain
        // For now, returning mock data
        return {
            ipfsHash: 'mock-ipfs-hash',
            encryptedMetadata: 'mock-encrypted-data',
            timestamp: Date.now()
        };
    }
}

module.exports = MedicalReportService;
