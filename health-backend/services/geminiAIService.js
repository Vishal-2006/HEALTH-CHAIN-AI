const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiAIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            if (!this.apiKey) {
                console.log('⚠️ GEMINI_API_KEY not found in environment variables');
                console.log('   Please add GEMINI_API_KEY to your .env file');
                return;
            }
            
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            this.isInitialized = true;
            
            console.log('✅ Gemini AI service initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Gemini AI service:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Analyze medical data using Gemini AI
     * @param {Object} medicalData - Medical data to analyze
     * @param {string} analysisType - Type of analysis (diagnosis, risk_assessment, treatment_recommendation)
     * @returns {Object} - AI analysis results
     */
    async analyzeMedicalData(medicalData, analysisType = 'general') {
        try {
            if (!this.isInitialized) {
                throw new Error('Gemini AI service not initialized');
            }
            
            const prompt = this.buildMedicalPrompt(medicalData, analysisType);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse the AI response
            const analysis = this.parseAIResponse(text, analysisType);
            
            console.log(`✅ Gemini AI analysis completed for ${analysisType}`);
            return {
                success: true,
                analysisType: analysisType,
                results: analysis,
                rawResponse: text,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Failed to analyze medical data with Gemini AI:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Build medical analysis prompt
     * @param {Object} medicalData - Medical data
     * @param {string} analysisType - Type of analysis
     * @returns {string} - Formatted prompt
     */
    buildMedicalPrompt(medicalData, analysisType) {
        const basePrompt = `You are a medical AI assistant. Analyze the following medical data and provide professional insights.`;
        
        const analysisPrompts = {
            diagnosis: `Focus on potential diagnoses based on the symptoms and test results. Provide differential diagnoses with confidence levels.`,
            risk_assessment: `Assess health risks and provide risk stratification. Identify modifiable and non-modifiable risk factors.`,
            treatment_recommendation: `Provide evidence-based treatment recommendations. Include medication suggestions, lifestyle modifications, and follow-up care.`,
            general: `Provide a comprehensive medical analysis including observations, potential concerns, and general recommendations.`
        };
        
        const specificPrompt = analysisPrompts[analysisType] || analysisPrompts.general;
        
        return `${basePrompt}\n\n${specificPrompt}\n\nMedical Data:\n${JSON.stringify(medicalData, null, 2)}\n\nPlease provide a structured analysis with the following sections:
1. Summary
2. Key Findings
3. Recommendations
4. Risk Factors (if applicable)
5. Follow-up Actions

Format your response in a clear, professional manner suitable for healthcare providers.`;
    }
    
    /**
     * Parse AI response into structured format
     * @param {string} response - Raw AI response
     * @param {string} analysisType - Type of analysis
     * @returns {Object} - Parsed analysis
     */
    parseAIResponse(response, analysisType) {
        try {
            // Extract sections from the response
            const sections = {
                summary: this.extractSection(response, 'Summary'),
                keyFindings: this.extractSection(response, 'Key Findings'),
                recommendations: this.extractSection(response, 'Recommendations'),
                riskFactors: this.extractSection(response, 'Risk Factors'),
                followUpActions: this.extractSection(response, 'Follow-up Actions')
            };
            
            return {
                sections: sections,
                fullText: response,
                analysisType: analysisType,
                confidence: this.extractConfidence(response)
            };
            
        } catch (error) {
            console.error('❌ Failed to parse AI response:', error);
            return {
                fullText: response,
                analysisType: analysisType,
                error: 'Failed to parse structured response'
            };
        }
    }
    
    /**
     * Extract specific section from AI response
     * @param {string} response - Full response
     * @param {string} sectionName - Section to extract
     * @returns {string} - Section content
     */
    extractSection(response, sectionName) {
        const regex = new RegExp(`${sectionName}[:\n]*(.*?)(?=\n\d+\.|$)`, 'is');
        const match = response.match(regex);
        return match ? match[1].trim() : '';
    }
    
    /**
     * Extract confidence level from response
     * @param {string} response - AI response
     * @returns {number} - Confidence level (0-100)
     */
    extractConfidence(response) {
        const confidenceMatch = response.match(/confidence[:\s]*(\d+)%/i);
        return confidenceMatch ? parseInt(confidenceMatch[1]) : 85; // Default confidence
    }
    
    /**
     * Generate health insights from patient data
     * @param {Object} patientData - Patient health data
     * @returns {Object} - Health insights
     */
    async generateHealthInsights(patientData) {
        try {
            const insights = await this.analyzeMedicalData(patientData, 'general');
            
            if (insights.success) {
                return {
                    success: true,
                    insights: insights.results,
                    recommendations: insights.results.sections.recommendations,
                    riskLevel: this.assessRiskLevel(insights.results),
                    timestamp: new Date().toISOString()
                };
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
    
    /**
     * Assess risk level from analysis
     * @param {Object} analysis - AI analysis results
     * @returns {string} - Risk level (low, medium, high)
     */
    assessRiskLevel(analysis) {
        const text = analysis.fullText.toLowerCase();
        
        if (text.includes('high risk') || text.includes('urgent') || text.includes('critical')) {
            return 'high';
        } else if (text.includes('moderate risk') || text.includes('caution')) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    /**
     * Check if service is ready
     * @returns {boolean} - Service status
     */
    isReady() {
        return this.isInitialized && this.model !== null;
    }
}

module.exports = GeminiAIService;
