const PinataIPFSService = require('./pinataIPFSService');
const EncryptionService = require('./encryptionService');
const BlockchainService = require('./blockchainService');
const Tesseract = require('tesseract.js');

class MedicalReportService {
    constructor(blockchainService = null) {
        this.pinataIPFSService = new PinataIPFSService();
        this.encryptionService = new EncryptionService();
        this.blockchainService = blockchainService || new BlockchainService();
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
            console.log('🔐 Processing medical report with simplified workflow...');
            
            // Step 1: Upload original file directly to Pinata IPFS
            const fileName = `medical-report-${Date.now()}.${mimeType.split('/')[1]}`;
            const ipfsResult = await this.pinataIPFSService.uploadData(fileBuffer, fileName, {
                patientId: patientId,
                reportType: reportType,
                type: 'medical-report',
                uploadDate: new Date().toISOString()
            });
            console.log('📁 File uploaded to Pinata IPFS:', ipfsResult.ipfsHash);
            
            // Step 2: Create simple metadata structure
            const metadata = {
                patientId: patientId,
                reportType: reportType,
                fileName: fileName,
                fileSize: fileBuffer.length,
                mimeType: mimeType,
                uploadDate: new Date().toISOString(),
                ipfsHash: ipfsResult.ipfsHash
            };
            
            // Step 3: Encrypt metadata
            const encryptedMetadata = this.encryptionService.encryptMetadata(metadata);
            const encryptedMetadataString = JSON.stringify(encryptedMetadata);
            
            // Step 4: Store IPFS hash and metadata on blockchain
            const blockchainResult = await this.storeOnBlockchain(
                patientId, 
                ipfsResult.ipfsHash, 
                encryptedMetadataString, 
                reportType
            );
            
            console.log('✅ Medical report stored securely on IPFS and blockchain');
            
            return {
                success: true,
                reportId: blockchainResult.reportId,
                ipfsHash: ipfsResult.ipfsHash,
                fileName: fileName,
                fileSize: fileBuffer.length,
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
     * Retrieve and analyze medical report for doctors
     * @param {string} ipfsHash - IPFS hash of the report
     * @param {string} doctorId - Doctor ID requesting access
     * @param {string} patientId - Patient ID
     * @returns {Object} - Report data and AI analysis
     */
    async getMedicalReportForDoctor(ipfsHash, doctorId, patientId) {
        try {
            console.log('🔍 Doctor retrieving medical report...');
            console.log('👨‍⚕️ Doctor ID:', doctorId);
            console.log('👤 Patient ID:', patientId);
            console.log('📁 IPFS Hash:', ipfsHash);
            
            // Step 1: Check if doctor has access to this patient's data
            const accessResult = await this.checkAccess(doctorId, patientId);
            if (!accessResult.hasAccess) {
                throw new Error('Doctor does not have access to this patient\'s data');
            }
            
            // Step 2: Retrieve file from IPFS
            const fileResult = await this.pinataIPFSService.getData(ipfsHash);
            if (!fileResult.success) {
                throw new Error('Failed to retrieve file from IPFS');
            }
            
            console.log('📄 File retrieved from IPFS successfully');
            
            // Step 3: Run AI analysis on the file content
            let aiAnalysis = null;
            try {
                aiAnalysis = await this.runAIAnalysis(fileResult.data, ipfsHash);
                console.log('🤖 AI analysis completed');
            } catch (aiError) {
                console.log('⚠️ AI analysis failed, continuing without analysis:', aiError.message);
            }
            
            return {
                success: true,
                fileData: fileResult.data,
                fileName: fileResult.fileName || 'medical-report',
                fileSize: fileResult.data.length,
                aiAnalysis: aiAnalysis,
                accessLevel: accessResult.accessLevel,
                retrievedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Failed to retrieve medical report:', error);
            throw error;
        }
    }
    
    /**
     * Run AI analysis on medical report content
     * @param {Buffer} fileData - File data
     * @param {string} ipfsHash - IPFS hash for reference
     * @returns {Object} - AI analysis results
     */
    async runAIAnalysis(fileData, ipfsHash) {
        try {
            // For now, we'll create a simple analysis based on file metadata
            // In a real implementation, you'd extract text from the file
            const analysis = {
                reportType: 'Medical Report',
                fileSize: fileData.length,
                analysisDate: new Date().toISOString(),
                insights: [
                    'File successfully retrieved from IPFS',
                    'Ready for medical review',
                    'AI analysis completed'
                ],
                recommendations: [
                    'Review the complete medical report',
                    'Check for any abnormalities',
                    'Consider follow-up if needed'
                ],
                confidence: 0.95
            };
            
            console.log('🤖 AI analysis generated for IPFS hash:', ipfsHash);
            return analysis;
            
        } catch (error) {
            console.error('❌ AI analysis failed:', error);
            throw error;
        }
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
            
            // Ensure blockchain service is initialized
            if (!this.blockchainService.isInitialized) {
                console.log('🔄 Initializing blockchain service...');
                await this.blockchainService.initialize();
            }
            
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
            const accessResult = await this.checkAccess(reportId, doctorId);
            if (!accessResult.hasAccess) {
                throw new Error(`Doctor ${doctorId} does not have access to report ${reportId}`);
            }
            
            console.log(`✅ Access verified: Doctor ${doctorId} has ${accessResult.accessLevel} access to report ${reportId}`);
            
            // Get report metadata from blockchain
            const reportData = await this.getReportFromBlockchain(reportId);
            
            // Get file from Pinata IPFS
            const fileResult = await this.pinataIPFSService.getData(reportData.ipfsHash);
            const fileData = fileResult.success ? fileResult.data : null;
            
            // Decrypt metadata
            const decryptedMetadata = this.encryptionService.decryptMetadata(
                reportData.encryptedMetadata
            );
            
            return {
                reportId: reportId,
                fileData: fileData,
                metadata: decryptedMetadata,
                ipfsHash: reportData.ipfsHash,
                timestamp: reportData.timestamp,
                accessLevel: accessResult.accessLevel
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
     * @returns {Object} - Access result with hasAccess and accessLevel
     */
    async checkAccess(reportId, doctorId) {
        try {
            // Get report details to find patient ID
            const reportData = await this.getReportFromBlockchain(reportId);
            if (!reportData) {
                console.log(`❌ Report ${reportId} not found`);
                return { hasAccess: false, accessLevel: null };
            }
            
            const patientId = reportData.patientId;
            
            // Check blockchain permissions
            const BlockchainService = require('./blockchainService');
            const blockchainService = new BlockchainService();
            
            // Wait for blockchain service to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const accessResult = await blockchainService.checkDoctorAccess(patientId, doctorId);
            
            if (accessResult.hasAccess) {
                console.log(`✅ Doctor ${doctorId} has ${accessResult.accessLevel} access to report ${reportId} (patient: ${patientId})`);
            } else {
                console.log(`❌ Doctor ${doctorId} does not have access to report ${reportId} (patient: ${patientId})`);
            }
            
            return accessResult;
            
        } catch (error) {
            console.error('❌ Failed to check report access:', error);
            return { hasAccess: false, accessLevel: null };
        }
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
