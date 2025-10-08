require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs'); // For hashing passwords
const axios = require('axios'); // For external API calls
const BlockchainService = require('./services/blockchainService'); // Blockchain integration
const DatabaseService = require('./services/databaseService'); // Database service
const ChatService = require('./services/chatService'); // Chat functionality
const WebRTCCallService = require('./services/webrtcCallService'); // WebRTC call functionality

// --- Server Setup ---
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
const port = 5001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database-First User Management ---
// Users are stored in MongoDB for persistence and performance
const userCache = new Map(); // Temporary cache for active sessions

// --- File Upload & AI Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- AI Configuration ---
console.log('🤖 Using Gemini AI for medical analysis');

// Initialize blockchain service
const blockchainService = new BlockchainService();
// Initialize the blockchain service
blockchainService.initialize().then(() => {
    console.log('🔗 Blockchain service initialized');
}).catch((error) => {
    console.error('❌ Failed to initialize blockchain service:', error);
});

// Initialize database service
const databaseService = new DatabaseService();
console.log('🗄️ Database service initialized');

// Connect to database
databaseService.connect().then(() => {
    console.log('✅ Database connected successfully');
}).catch(error => {
    console.error('❌ Database connection failed:', error);
    console.log('⚠️ Some features may not work without database connection');
});

// Initialize chat service
const chatService = new ChatService();
chatService.initialize().then(() => {
    console.log('💬 Chat service initialized');
}).catch(error => {
    console.error('❌ Failed to initialize chat service:', error);
});

// Initialize WebRTC call service
const webrtcCallService = new WebRTCCallService();
console.log('📞 WebRTC call service initialized');

// No default users - all users must be registered through the registration process
console.log('✅ No default users - all users must register through the application');

// Test Gemini AI connection
const testGeminiConnection = async () => {
  try {
    if (blockchainService.geminiAIService && blockchainService.geminiAIService.isReady()) {
      console.log('✅ Gemini AI connection successful');
      return true;
    } else {
      console.log('⚠️  Gemini AI not available. Check your API key.');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Gemini AI connection failed:', error.message);
    return false;
  }
};

// Initialize Gemini AI connection
setTimeout(testGeminiConnection, 3000); // Wait for blockchain service to initialize

// --- Gemini AI Functions ---
const getGeminiPrediction = async (healthData) => {
  try {
    if (blockchainService.geminiAIService && blockchainService.geminiAIService.isReady()) {
      const analysis = await blockchainService.analyzeHealthDataWithAI(healthData, 'general');
      if (analysis.success) {
        return analysis.results;
      }
    }
    return null;
  } catch (error) {
    console.error('Gemini AI prediction error:', error);
    return null;
  }
};

const getGeminiOCR = async (fileBuffer, mimeType) => {
  try {
    // Check if it's a supported image type
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    
    if (!supportedImageTypes.includes(mimeType)) {
      console.log(`Unsupported file type: ${mimeType}. Using fallback data.`);
      return null; // This will trigger fallback response
    }
    
    // Use Tesseract.js for OCR extraction
    const Tesseract = require('tesseract.js');
    
    const ocrResult = await Tesseract.recognize(fileBuffer, 'eng');
    const extractedText = ocrResult.data.text;
    
    // Use Gemini AI to parse the extracted text
    if (blockchainService.geminiAIService && blockchainService.geminiAIService.isReady()) {
      const healthData = { extractedText: extractedText, source: 'ocr' };
      const analysis = await blockchainService.analyzeHealthDataWithAI(healthData, 'general');
      if (analysis.success) {
        return analysis.results;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Gemini OCR error:', error);
    return null;
  }
};

// Prompt generation is now handled by Gemini AI service

// OCR prompt generation is now handled by Gemini AI service

// Response parsing is now handled by Gemini AI service

// Helper function for image processing (kept for compatibility)
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

// --- API Endpoints ---

// 1. User Registration Endpoint (Database-First)
app.post('/api/register', async (req, res) => {
    const { username, password, role, email, name, medicalLicense, hospitalName, specialization, dateOfBirth, phoneNumber } = req.body;
    
    if (!username || !password || !role || !name || !email) {
        return res.status(400).json({ message: 'Username, password, name, email, and role are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    try {
        // Check if user already exists
        const existingUser = await databaseService.findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        // Check if email already exists
        const existingEmail = await databaseService.findUserByEmail(email);
        if (existingEmail) {
            return res.status(409).json({ message: 'Email address already registered.' });
        }

        // Prevent multiple admin registrations
        if (role === 'admin') {
            const existingAdmin = await databaseService.users.findOne({ role: 'admin', isActive: true });
            if (existingAdmin) {
                return res.status(403).json({ message: 'Admin user already exists. Only one admin is allowed.' });
            }
        }

        // Create user data with all provided fields
        const userData = {
            username,
            password,
            name,
            email,
            role,
            // Doctor-specific fields
            ...(role === 'doctor' && { 
                specialization: specialization || 'General Medicine',
                medicalLicense: medicalLicense || 'N/A',
                hospitalName: hospitalName || 'N/A'
            }),
            // Patient-specific fields
            ...(role === 'patient' && {
                dateOfBirth: dateOfBirth || null,
                phoneNumber: phoneNumber || null
            }),
            // Admin-specific fields (if needed in the future)
            ...(role === 'admin' && {
                adminLevel: 'full',
                permissions: ['user_management', 'system_admin']
            })
        };

        // Create user in database
        const result = await databaseService.createUser(userData);
        
        console.log('✅ New user registered:', { 
            username, 
            name, 
            email, 
            role, 
            userId: result.userId,
            ...(role === 'doctor' && { specialization, medicalLicense, hospitalName }),
            ...(role === 'patient' && { dateOfBirth, phoneNumber })
        });
        
        res.status(201).json({ 
            message: 'User registered successfully!',
            userId: result.userId,
            username: result.username,
            name: result.name,
            email: result.email,
            role: result.role
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Failed to register user.' });
    }
});

// 2. User Login Endpoint (Database-First)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        // Check if user exists in database
        const user = await databaseService.findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify password
        const isPasswordValid = await databaseService.verifyPassword(username, password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Cache the user for active sessions
        userCache.set(username, {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email
        });

        const userToSend = { 
            id: user._id, 
            username: user.username,
            name: user.name, 
            role: user.role,
            email: user.email
        };
        
        console.log('✅ User logged in:', userToSend);
        res.status(200).json({ 
            message: 'Login successful!', 
            user: userToSend
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Failed to authenticate user.' });
    }
});

// --- GET ALL USERS FROM DATABASE ---
app.get('/api/users', async (req, res) => {
    try {
        // Fetch all users from database
        const users = await databaseService.getAllUsers();
        
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users from database:', error);
        res.status(500).json({ error: 'Failed to fetch users from database' });
    }
});

// --- GET ALL DOCTORS FROM DATABASE ---
app.get('/api/doctors', async (req, res) => {
    try {
        // Fetch all doctors from database
        const doctors = await databaseService.getUsersByRole('doctor');
        
        // Add additional doctor-specific fields if they exist
        const enhancedDoctors = doctors.map(doctor => ({
            id: doctor.id,
            name: doctor.name,
            username: doctor.username,
            email: doctor.email,
            role: doctor.role,
            isActive: doctor.isActive,
            // Add doctor-specific fields from the database
            specialization: doctor.specialization || 'General Medicine',
            medicalLicense: doctor.medicalLicense || 'N/A',
            hospitalName: doctor.hospitalName || 'N/A'
        }));
        
        console.log(`✅ Fetched ${enhancedDoctors.length} doctors from database`);
        res.status(200).json(enhancedDoctors);
    } catch (error) {
        console.error('Error fetching doctors from database:', error);
        res.status(500).json({ error: 'Failed to fetch doctors from database' });
    }
});

// --- ENDPOINT TO MANUALLY ADD DOCTOR TO MEMORY ---
app.post('/api/doctors/add-to-memory', async (req, res) => {
    try {
        const { doctorId, name, username, specialization } = req.body;
        
        if (!doctorId || !name || !username) {
            return res.status(400).json({ error: 'Missing required fields: doctorId, name, username' });
        }
        
        blockchainService.addDoctorToMemory(doctorId, name, username, specialization || 'General Medicine');
        
        res.status(200).json({ 
            message: 'Doctor added to memory successfully',
            doctor: { doctorId, name, username, specialization: specialization || 'General Medicine' }
        });
    } catch (error) {
        console.error('Error adding doctor to memory:', error);
        res.status(500).json({ error: 'Failed to add doctor to memory' });
    }
});

// --- ENDPOINT TO MANUALLY ADD PATIENT TO MEMORY ---
app.post('/api/patients/add-to-memory', async (req, res) => {
    try {
        const { patientId, name, username } = req.body;
        
        if (!patientId || !name || !username) {
            return res.status(400).json({ error: 'Missing required fields: patientId, name, username' });
        }
        
        blockchainService.addPatientToMemory(patientId, name, username);
        
        res.status(200).json({ 
            message: 'Patient added to memory successfully',
            patient: { patientId, name, username }
        });
    } catch (error) {
        console.error('Error adding patient to memory:', error);
        res.status(500).json({ error: 'Failed to add patient to memory' });
    }
});

// --- BLOCKCHAIN STATUS ENDPOINT ---
app.get('/api/blockchain-status', async (req, res) => {
    try {
        const status = await blockchainService.getBlockchainStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error getting blockchain status:', error);
        res.status(500).json({ error: 'Failed to get blockchain status' });
    }
});

// --- DATABASE STATUS ENDPOINT ---
app.get('/api/database-status', async (req, res) => {
    try {
        const status = await databaseService.healthCheck();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error getting database status:', error);
        res.status(500).json({ error: 'Failed to get database status' });
    }
});

// --- USER STATUS ENDPOINT FOR DEBUGGING ---
app.get('/api/user-status', async (req, res) => {
    try {
        const users = await databaseService.getAllUsers();
        const dbStatus = await databaseService.healthCheck();
        
        res.status(200).json({
            totalUsers: users.length,
            databaseStatus: dbStatus,
            users: users,
            cacheStatus: {
                userCacheSize: userCache.size
            }
        });
    } catch (error) {
        console.error('Error getting user status:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// --- CLEAR ALL USERS ENDPOINT (FOR DEVELOPMENT/TESTING) ---
app.delete('/api/clear-all-users', async (req, res) => {
    try {
        const result = await databaseService.clearAllUsers();
        res.status(200).json({
            message: 'All users cleared successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing all users:', error);
        res.status(500).json({ error: 'Failed to clear all users' });
    }
});

// --- DELETE INDIVIDUAL USER ENDPOINT ---
app.delete('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        console.log(`Attempting to delete user with ID: ${userId}`);
        const result = await databaseService.deleteUserById(userId);
        
        if (result.success) {
            res.status(200).json({
                message: 'User deleted successfully',
                userId: userId
            });
        } else {
            res.status(404).json({ error: result.message || 'User not found' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: `Failed to delete user: ${error.message}` });
    }
});
// ------------------------------------

// --- BLOCKCHAIN ENDPOINTS ---

// 5. Blockchain Status Endpoint
app.get('/api/blockchain/status', async (req, res) => {
    try {
        const status = await blockchainService.getBlockchainStatus();
        res.json(status);
    } catch (error) {
        console.error('Blockchain status error:', error);
        res.status(500).json({ error: 'Failed to get blockchain status' });
    }
});

// 6. Register User on Blockchain
app.post('/api/blockchain/register-user', async (req, res) => {
    const { userId, name, role, specialization } = req.body;
    
    if (!userId || !name || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        let result;
        if (role === 'doctor') {
            result = await blockchainService.registerDoctor(userId, name, specialization || 'General');
        } else {
            result = await blockchainService.registerPatient(userId, name);
        }
        
        res.json({ 
            message: 'User registered on blockchain successfully',
            transactionHash: result.transactionHash,
            userId: userId
        });
    } catch (error) {
        console.error('Blockchain registration error:', error);
        res.status(500).json({ error: 'Failed to register user on blockchain' });
    }
});

// 7. Grant Permission Endpoint
app.post('/api/blockchain/grant-permission', async (req, res) => {
    const { doctorId, patientId, accessLevel, durationInDays } = req.body;
    
    if (!doctorId || !patientId) {
        return res.status(400).json({ error: 'Doctor ID and Patient ID are required' });
    }
    
    try {
        const result = await blockchainService.grantPermission(
            doctorId,
            patientId,
            accessLevel || 'read',
            durationInDays || 30
        );
        
        res.json({
            message: 'Permission granted successfully',
            transactionHash: result.transactionHash,
            doctorId: doctorId,
            patientId: patientId,
            accessLevel: result.accessLevel,
            durationInDays: result.durationInDays
        });
    } catch (error) {
        console.error('Permission grant error:', error);
        res.status(500).json({ error: 'Failed to grant permission' });
    }
});

// 8. Check Permission Endpoint
app.get('/api/blockchain/check-permission/:doctorId/:patientId', async (req, res) => {
    const { doctorId, patientId } = req.params;
    
    try {
        const permission = await blockchainService.checkPermission(doctorId, patientId);
        res.json(permission);
    } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Failed to check permission' });
    }
});

// 9. Get Patient Records from Blockchain
app.get('/api/blockchain/patient-records/:patientId', async (req, res) => {
    const { patientId } = req.params;
    
    try {
        const records = await blockchainService.getPatientRecords(patientId);
        res.json({ records: records });
    } catch (error) {
        console.error('Get patient records error:', error);
        res.status(500).json({ error: 'Failed to get patient records from blockchain' });
    }
});

// 10. Add Health Record to Blockchain
app.post('/api/blockchain/add-record', async (req, res) => {
    const { patientId, doctorId, healthData, metadata } = req.body;
    
    if (!patientId || !doctorId || !healthData) {
        return res.status(400).json({ error: 'Patient ID, Doctor ID, and Health Data are required' });
    }
    
    try {
        const result = await blockchainService.addHealthRecord(patientId, doctorId, healthData, metadata);
        
        res.json({
            message: 'Health record added to blockchain successfully',
            transactionHash: result.transactionHash,
            dataHash: result.dataHash,
            metadataHash: result.metadataHash,
            blockNumber: result.blockNumber
        });
    } catch (error) {
        console.error('Add health record error:', error);
        res.status(500).json({ error: 'Failed to add health record to blockchain' });
    }
});

// 11. Grant Doctor Access to Patient Records
app.post('/api/grant-access', async (req, res) => {
    const { patientId, doctorId } = req.body;
    
    if (!patientId || !doctorId) {
        return res.status(400).json({ error: 'Patient ID and Doctor ID are required' });
    }
    
    try {
        const result = await blockchainService.grantDoctorAccess(patientId, doctorId);
        
        res.json({
            message: 'Doctor access granted successfully',
            patientId: patientId,
            doctorId: doctorId,
            transactionHash: result.transactionHash,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Grant access error:', error);
        res.status(500).json({ error: 'Failed to grant doctor access' });
    }
});

// 12. Revoke Doctor Access from Patient Records
app.post('/api/revoke-access', async (req, res) => {
    const { patientId, doctorId } = req.body;
    
    if (!patientId || !doctorId) {
        return res.status(400).json({ error: 'Patient ID and Doctor ID are required' });
    }
    
    try {
        const result = await blockchainService.revokeDoctorAccess(patientId, doctorId);
        
        res.json({
            message: 'Doctor access revoked successfully',
            patientId: patientId,
            doctorId: doctorId,
            transactionHash: result.transactionHash,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Revoke access error:', error);
        res.status(500).json({ error: 'Failed to revoke doctor access' });
    }
});

// 13. Get Doctor Access Permissions
app.get('/api/access-permissions/:patientId', async (req, res) => {
    const { patientId } = req.params;
    
    try {
        const permissions = await blockchainService.getDoctorAccessPermissions(patientId);
        
        res.json({
            patientId: patientId,
            permissions: permissions
        });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({ error: 'Failed to get access permissions' });
    }
});

// 14. Get Patients Accessible to Doctor
app.get('/api/doctor-accessible-patients/:doctorId', async (req, res) => {
    const { doctorId } = req.params;
    
    try {
        const accessiblePatients = await blockchainService.getPatientsAccessibleToDoctor(doctorId);
        
        res.json({
            doctorId: doctorId,
            accessiblePatients: accessiblePatients
        });
    } catch (error) {
        console.error('Get accessible patients error:', error);
        res.status(500).json({ error: 'Failed to get accessible patients' });
    }
});

// --- IPFS ENDPOINTS ---

// IPFS Status Endpoint
app.get('/api/ipfs/status', async (req, res) => {
    try {
        const PinataIPFSService = require('./services/pinataIPFSService');
        const pinataService = new PinataIPFSService();
        if (pinataService.isReady()) {
            res.json({
                success: true,
                online: true,
                service: 'Pinata IPFS',
                gateway: 'https://gateway.pinata.cloud',
                apiUrl: 'https://api.pinata.cloud'
            });
        } else {
            res.json({
                success: false,
                online: false,
                error: 'Pinata IPFS service not available'
            });
        }
    } catch (error) {
        console.error('IPFS status check failed:', error);
        res.status(500).json({
            success: false,
            online: false,
            error: error.message,
            apiUrl: process.env.IPFS_API_URL || 'http://127.0.0.1:5002'
        });
    }
});

// IPFS File Upload Endpoint
app.post('/api/ipfs/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }

        const PinataIPFSService = require('./services/pinataIPFSService');
        const pinataService = new PinataIPFSService();
        const result = await ipfsService.uploadFile(req.file.buffer, req.file.originalname);

        if (result.success) {
            // Pin the file to keep it available
            await ipfsService.pinFile(result.hash);
            
            res.json({
                success: true,
                hash: result.hash,
                size: result.size,
                name: result.name,
                gatewayUrls: ipfsService.getGatewayUrls(result.hash)
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('File upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// IPFS JSON Upload Endpoint
app.post('/api/ipfs/upload-json', async (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'No data provided'
            });
        }

        const PinataIPFSService = require('./services/pinataIPFSService');
        const pinataService = new PinataIPFSService();
        const result = await ipfsService.uploadJSON(data);

        if (result.success) {
            // Pin the data to keep it available
            await ipfsService.pinFile(result.hash);
            
            res.json({
                success: true,
                hash: result.hash,
                size: result.size,
                gatewayUrls: ipfsService.getGatewayUrls(result.hash)
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('JSON upload failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


    // 3. Enhanced Secure Medical Report Upload Endpoint
app.post('/api/ocr-upload', upload.single('report'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    try {
        // Get patient ID from request (in production, get from JWT token)
        const patientId = req.body.patientId || 'patient_' + Date.now();
        const reportType = req.body.reportType || 'Lab Report';
        
        console.log('🔐 Processing medical report with enhanced security...');
        console.log('👤 Patient ID:', patientId);
        console.log('📄 Report Type:', reportType);
        
        // Use the new MedicalReportService for secure processing
        const MedicalReportService = require('./services/medicalReportService');
        const medicalReportService = new MedicalReportService(blockchainService);
        
        const result = await medicalReportService.processMedicalReport(
            req.file.buffer,
            req.file.mimetype,
            patientId,
            reportType
        );
        
        console.log('✅ Medical report processed securely');
        console.log('📊 Extracted metrics:', Object.keys(result.extractedData).length);
        console.log('🔒 IPFS Hash:', result.ipfsHash);
        console.log('⛓️ Blockchain TX:', result.blockchainTx);
        
        res.json({
            success: true,
            extractedData: result.extractedData,
            metadata: result.metadata,
            reportId: result.reportId,
            ipfsHash: result.ipfsHash,
            blockchainTx: result.blockchainTx,
            accessHash: result.accessHash,
            message: 'Medical report processed and stored securely on blockchain and IPFS'
        });
        
    } catch (error) {
        console.error('❌ Secure medical report processing failed:', error);
        res.status(500).json({ 
            error: 'Failed to process medical report securely',
            details: error.message
        });
    }
});

    // 4. Doctor Retrieve Medical Report by IPFS Hash
app.get('/api/doctor/medical-report/:ipfsHash', async (req, res) => {
    try {
        const { ipfsHash } = req.params;
        const doctorId = req.query.doctorId || 'doctor_' + Date.now(); // In production, get from JWT
        const patientId = req.query.patientId; // Required for access control
        
        if (!patientId) {
            return res.status(400).json({ error: 'Patient ID is required' });
        }
        
        console.log('🔍 Doctor retrieving medical report...');
        console.log('👨‍⚕️ Doctor ID:', doctorId);
        console.log('👤 Patient ID:', patientId);
        console.log('📁 IPFS Hash:', ipfsHash);
        
        const MedicalReportService = require('./services/medicalReportService');
        const medicalReportService = new MedicalReportService(blockchainService);
        
        // Retrieve and analyze the report
        const result = await medicalReportService.getMedicalReportForDoctor(ipfsHash, doctorId, patientId);
        
        res.json({
            success: true,
            message: 'Medical report retrieved and analyzed successfully',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Failed to retrieve medical report for doctor:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve medical report',
            details: error.message
        });
    }
});

    // 5. Secure Medical Report Retrieval Endpoint (Legacy)
app.get('/api/medical-report/:reportId', async (req, res) => {
    try {
        const { reportId } = req.params;
        const doctorId = req.query.doctorId || 'doctor_' + Date.now(); // In production, get from JWT
        
        console.log('🔍 Retrieving medical report:', reportId, 'for doctor:', doctorId);
        
        const MedicalReportService = require('./services/medicalReportService');
        const medicalReportService = new MedicalReportService(blockchainService);
        
        const report = await medicalReportService.getMedicalReport(reportId, doctorId);
        
        res.json({
            success: true,
            report: report
        });
        
    } catch (error) {
        console.error('❌ Failed to retrieve medical report:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve medical report',
            details: error.message
        });
    }
});

    // 5. AI Health Prediction Endpoint
app.post('/api/ai-prediction', async (req, res) => {
    const { healthData } = req.body;
    
    console.log('=== AI PREDICTION REQUEST ===');
    console.log('Received health data:', JSON.stringify(healthData, null, 2));
    
    if (!healthData) {
        return res.status(400).json({ error: 'Health data is required.' });
    }

    try {
        // Process with Gemini AI
        console.log('Processing with Gemini AI...');
        const geminiPrediction = await getGeminiPrediction(healthData);
        if (geminiPrediction) {
            console.log('Gemini Prediction Generated:', geminiPrediction);
            console.log('=== END AI PREDICTION REQUEST ===');
            return res.json({ prediction: geminiPrediction });
        }
        
        // Use deterministic fallback for consistent results
        console.log('Using deterministic fallback prediction for consistency');
        const fallbackPrediction = generateFallbackPrediction(healthData);
        console.log('=== END AI PREDICTION REQUEST ===');
        res.json({ prediction: fallbackPrediction });
        
    } catch (error) {
        console.error('AI Prediction Error:', error);
        const fallbackPrediction = generateFallbackPrediction(healthData);
        res.json({ prediction: fallbackPrediction });
    }
});

// Helper function to generate fallback predictions
function generateFallbackPrediction(healthData) {
    console.log('Generating deterministic fallback prediction for:', healthData);
    
    let riskScore = 0;
    let primaryDisease = "Normal Health Status";
    let severity = "low";
    let urgency = "low";
    let recommendations = [];
    let secondaryRisks = [];
    let medicalNotes = "";
    
    // Analyze blood sugar
    if (healthData.bloodSugar > 126) {
        riskScore += 40;
        primaryDisease = "Diabetes";
        severity = "high";
        urgency = "high";
        medicalNotes += "Blood sugar levels indicate diabetes. ";
    } else if (healthData.bloodSugar > 100) {
        riskScore += 20;
        secondaryRisks.push({ disease: "Pre-diabetes", riskPercentage: 35, severity: "moderate" });
        medicalNotes += "Blood sugar levels are elevated but not in diabetic range. ";
    } else {
        medicalNotes += "Blood sugar levels are within normal range. ";
    }
    
    // Analyze blood pressure
    if (healthData.bloodPressure?.systolic > 140 || healthData.bloodPressure?.diastolic > 90) {
        riskScore += 30;
        if (primaryDisease === "Normal Health Status") {
            primaryDisease = "Hypertension";
            severity = "high";
            urgency = "high";
        }
        medicalNotes += "Blood pressure is elevated. ";
    } else if (healthData.bloodPressure?.systolic > 120 || healthData.bloodPressure?.diastolic > 80) {
        riskScore += 15;
        secondaryRisks.push({ disease: "Pre-hypertension", riskPercentage: 25, severity: "moderate" });
        medicalNotes += "Blood pressure is in pre-hypertensive range. ";
    } else {
        medicalNotes += "Blood pressure is within normal range. ";
    }
    
    // Analyze cholesterol
    if (healthData.cholesterol > 240) {
        riskScore += 25;
        if (primaryDisease === "Normal Health Status") {
            primaryDisease = "High Cholesterol";
            severity = "high";
            urgency = "high";
        }
        secondaryRisks.push({ disease: "High Cholesterol", riskPercentage: 45, severity: "high" });
        medicalNotes += "Total cholesterol is elevated. ";
    } else if (healthData.cholesterol > 200) {
        riskScore += 10;
        if (primaryDisease === "Normal Health Status") {
            primaryDisease = "Borderline Cholesterol";
            severity = "low";
        }
        secondaryRisks.push({ disease: "Borderline Cholesterol", riskPercentage: 20, severity: "low" });
        medicalNotes += "Total cholesterol is borderline elevated. ";
    } else {
        medicalNotes += "Total cholesterol is within normal range. ";
    }
    
    // Analyze heart rate
    if (healthData.heartRate > 100) {
        riskScore += 15;
        secondaryRisks.push({ disease: "Tachycardia", riskPercentage: 30, severity: "moderate" });
        medicalNotes += "Heart rate is elevated. ";
    } else if (healthData.heartRate < 60) {
        riskScore += 10;
        secondaryRisks.push({ disease: "Bradycardia", riskPercentage: 25, severity: "moderate" });
        medicalNotes += "Heart rate is below normal range. ";
    } else {
        medicalNotes += "Heart rate is within normal range. ";
    }
    
    // Determine overall severity and urgency
    if (riskScore > 70) {
        severity = "critical";
        urgency = "critical";
    } else if (riskScore > 50) {
        severity = "high";
        urgency = "high";
    } else if (riskScore > 30) {
        severity = "moderate";
        urgency = "moderate";
    }
    
    // Always provide exactly 4 consistent recommendations based on health status
    const baseRecommendations = [
        "Continue regular health monitoring",
        "Maintain healthy lifestyle habits",
        "Schedule annual check-up with healthcare provider",
        "Consider preventive health screenings"
    ];
    
    // Add specific recommendations based on findings
    if (healthData.bloodSugar > 100) {
        baseRecommendations[0] = "Monitor blood sugar levels regularly";
    }
    if (healthData.bloodPressure?.systolic > 120 || healthData.bloodPressure?.diastolic > 80) {
        baseRecommendations[1] = "Reduce sodium intake and increase physical activity";
    }
    if (healthData.cholesterol > 200) {
        baseRecommendations[2] = "Consider dietary changes to lower cholesterol";
    }
    if (healthData.heartRate > 100 || healthData.heartRate < 60) {
        baseRecommendations[3] = "Monitor heart rate and avoid stimulants";
    }
    
    recommendations = baseRecommendations;
    
    const finalRiskPercentage = Math.max(5, Math.min(riskScore, 95)); // Minimum 5% risk
    
    const prediction = {
        primaryRisk: {
            disease: primaryDisease,
            riskPercentage: finalRiskPercentage,
            confidence: 85,
            severity: severity
        },
        secondaryRisks: secondaryRisks,
        recommendations: recommendations.slice(0, 4), // Ensure exactly 4 recommendations
        medicalNotes: medicalNotes + `Overall risk assessment: ${finalRiskPercentage}% risk score. ${severity === 'critical' || severity === 'high' ? 'Immediate medical attention recommended.' : 'Regular monitoring advised.'}`,
        urgency: urgency,
        nextSteps: urgency === 'critical' || urgency === 'high' ? 
            "Schedule immediate consultation with healthcare provider" : 
            "Schedule follow-up appointment with healthcare provider for comprehensive evaluation"
    };
    
    console.log('Generated consistent prediction:', prediction);
    return prediction;
}

// --- CHAT ENDPOINTS ---

// 15. Send a message
app.post('/api/chat/send', async (req, res) => {
    const { senderId, receiverId, message, senderRole } = req.body;
    
    console.log('💬 Chat send request:', { senderId, receiverId, message: message.substring(0, 50) + '...', senderRole });
    
    if (!senderId || !receiverId || !message || !senderRole) {
        console.log('❌ Missing required fields:', { senderId, receiverId, message, senderRole });
        return res.status(400).json({ error: 'Missing required fields: senderId, receiverId, message, senderRole' });
    }
    
    // Determine which user is patient and which is doctor for permission check
    const patientId = senderRole === 'patient' ? senderId : receiverId;
    const doctorId = senderRole === 'doctor' ? senderId : receiverId;
    
    console.log('💬 Permission check:', { 
        senderId, 
        receiverId, 
        senderRole, 
        patientId, 
        doctorId 
    });
    
    try {
        // Check if users can chat (patient must have granted access to doctor)
        const receiverRole = senderRole === 'patient' ? 'doctor' : 'patient';
        
        // Determine which user is patient and which is doctor for permission check
        const patientId = senderRole === 'patient' ? senderId : receiverId;
        const doctorId = senderRole === 'doctor' ? senderId : receiverId;
        
        const canChat = await chatService.canChat(patientId, doctorId, 'patient', 'doctor');
        
        if (!canChat) {
            return res.status(403).json({ error: 'Chat not allowed between these users' });
        }
        
        const result = await chatService.sendMessage(senderId, receiverId, message, senderRole);
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: result
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// 16. Get chat history between two users
app.get('/api/chat/history/:user1Id/:user2Id', async (req, res) => {
    const { user1Id, user2Id } = req.params;
    
    try {
        const messages = await chatService.getChatHistory(user1Id, user2Id);
        
        res.json({
            success: true,
            messages: messages
        });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

// 17. Get all chats for a user
app.get('/api/chat/user/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const chats = await chatService.getUserChats(userId);
        
        res.json({
            success: true,
            chats: chats
        });
    } catch (error) {
        console.error('Get user chats error:', error);
        res.status(500).json({ error: 'Failed to get user chats' });
    }
});

// 18. Mark messages as read
app.post('/api/chat/mark-read', async (req, res) => {
    const { userId, senderId } = req.body;
    
    if (!userId || !senderId) {
        return res.status(400).json({ error: 'Missing required fields: userId, senderId' });
    }
    
    try {
        await chatService.markMessagesAsRead(userId, senderId);
        
        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Mark messages as read error:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// 19. Get unread message count
app.get('/api/chat/unread/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const unreadCount = await chatService.getUnreadCount(userId);
        
        res.json({
            success: true,
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// --- VOICE CALL ENDPOINTS ---

// 20. Create a new call
app.post('/api/call/create', async (req, res) => {
    const { callerId, receiverId, callerRole, receiverRole, callType = 'voice' } = req.body;
    
    console.log('📞 Call create request:', { callerId, receiverId, callerRole, receiverRole, callType });
    
    if (!callerId || !receiverId || !callerRole || !receiverRole) {
        console.log('❌ Missing required fields for call creation');
        return res.status(400).json({ error: 'Missing required fields: callerId, receiverId, callerRole, receiverRole' });
    }
    
    try {
        // Determine which user is patient and which is doctor for permission check
        const patientId = callerRole === 'patient' ? callerId : receiverId;
        const doctorId = callerRole === 'doctor' ? callerId : receiverId;
        
        // For now, allow all calls between doctors and patients
        // You can implement permission logic here later
        const result = await webrtcCallService.createCall(callerId, receiverId, callerRole, receiverRole, callType);
        
        // Emit incoming call event to the receiver
        const callData = result.data;
        
        // Get caller's name from database
        let callerName = 'Unknown';
        try {
            const users = await databaseService.getAllUsers();
            const caller = users.find(u => u.id === callerId);
            if (caller) {
                callerName = caller.name;
            }
        } catch (error) {
            console.error('Failed to fetch caller name:', error);
        }
        
        const incomingCallData = {
            callId: callData.callId,
            callerId: callerId,
            callerName: callerName,
            callType: callType,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📞 Emitting incoming call to ${receiverId}:`, incomingCallData);
        console.log(`🔍 Checking if room ${receiverId} exists...`);
        
        // Check if the room exists
        const room = io.sockets.adapter.rooms.get(receiverId);
        if (room) {
            console.log(`✅ Room ${receiverId} found with ${room.size} socket(s)`);
            io.to(receiverId).emit('incoming-call', incomingCallData);
        } else {
            console.log(`❌ Room ${receiverId} not found! User might not be connected.`);
            console.log('📊 Available rooms:', Array.from(io.sockets.adapter.rooms.keys()));
        }
        
        res.json({
            success: true,
            message: 'Call created successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Create call error:', error);
        res.status(500).json({ error: 'Failed to create call' });
    }
});

// 21. Answer a call
app.post('/api/call/answer', async (req, res) => {
    const { callId, receiverId } = req.body;
    
    if (!callId || !receiverId) {
        return res.status(400).json({ error: 'Missing required fields: callId, receiverId' });
    }
    
    try {
        const result = await webrtcCallService.answerCall(callId, receiverId);
        
        // Get the full call data to include callerId and receiverId
        const fullCallData = await webrtcCallService.getCall(callId);
        if (fullCallData.success && fullCallData.data) {
            const callInfo = fullCallData.data;
            console.log(`📞 Emitting call-answered to ${callInfo.callerId}:`, callInfo);
            
            // Emit call-answered event to the caller
            io.to(callInfo.callerId).emit('call-answered', {
                callId: callId,
                receiverId: receiverId,
                timestamp: new Date().toISOString()
            });
            
            // Emit to the receiver to confirm their answer was successful
            io.to(callInfo.receiverId).emit('call-answered', {
                callId: callId,
                receiverId: receiverId,
                timestamp: new Date().toISOString()
            });
            
            // Emit to all other users to end their calls (but exclude the caller and receiver)
            // Use a more compatible approach for older Socket.IO versions
            const connectedSockets = await io.fetchSockets();
            for (const socket of connectedSockets) {
                const socketUserId = socket.userId; // Assuming userId is stored on socket
                if (socketUserId && socketUserId !== callInfo.callerId && socketUserId !== callInfo.receiverId) {
                    socket.emit('call-answered', {
                        callId: callId,
                        receiverId: receiverId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        res.json({
            success: true,
            message: 'Call answered successfully',
            data: result
        });
    } catch (error) {
        console.error('Answer call error:', error);
        res.status(500).json({ error: 'Failed to answer call' });
    }
});

// 22. End a call
app.post('/api/call/end', async (req, res) => {
    const { callId, userId } = req.body;
    
    if (!callId || !userId) {
        return res.status(400).json({ error: 'Missing required fields: callId, userId' });
    }
    
    try {
        const result = await webrtcCallService.endCall(callId, userId);
        
        // Emit call ended event to both users
        const callData = result.data;
        if (callData) {
            // Get the full call data to include callerId and receiverId
            const fullCallData = await webrtcCallService.getCall(callId);
            if (fullCallData.success && fullCallData.data) {
                const callInfo = fullCallData.data;
                console.log(`📞 Emitting call-ended to ${callInfo.callerId} and ${callInfo.receiverId}:`, callInfo);
                
                // Emit to user's personal rooms
                io.to(callInfo.callerId).emit('call-ended', callInfo);
                io.to(callInfo.receiverId).emit('call-ended', callInfo);
                
                // Also emit to the call room itself
                io.to(callId).emit('call-ended', callInfo);
                
                console.log(`📞 Call-ended event emitted to rooms: ${callInfo.callerId}, ${callInfo.receiverId}, ${callId}`);
            } else {
                console.log('⚠️ Could not get full call data for call-ended event');
            }
        }
        
        res.json({
            success: true,
            message: 'Call ended successfully',
            data: result
        });
    } catch (error) {
        console.error('End call error:', error);
        res.status(500).json({ error: 'Failed to end call' });
    }
});

// 23. Get call history between two users
app.get('/api/call/history/:user1Id/:user2Id', async (req, res) => {
    const { user1Id, user2Id } = req.params;
    
    try {
        const calls = await webrtcCallService.getCallHistoryBetweenUsers(user1Id, user2Id);
        
        res.json({
            success: true,
            calls: calls
        });
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({ error: 'Failed to get call history' });
    }
});

// 24. Get a specific call by ID
app.get('/api/call/:callId', async (req, res) => {
    const { callId } = req.params;
    
    try {
        const result = await webrtcCallService.getCall(callId);
        
        res.json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Get call error:', error);
        res.status(404).json({ error: 'Call not found' });
    }
});

// 25. Get all calls for a user
app.get('/api/call/user/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const calls = await webrtcCallService.getUserCallHistory(userId);
        
        res.json({
            success: true,
            calls: calls
        });
    } catch (error) {
        console.error('Get user calls error:', error);
        res.status(500).json({ error: 'Failed to get user calls' });
    }
});

// 25. Get active call for a user
app.get('/api/call/active/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const activeCall = await webrtcCallService.getActiveCall(userId);
        
        res.json({
            success: true,
            activeCall: activeCall
        });
    } catch (error) {
        console.error('Get active call error:', error);
        res.status(500).json({ error: 'Failed to get active call' });
    }
});

// 26. Get call tokens for joining a call
app.post('/api/call/tokens', async (req, res) => {
    const { callId, callerId, receiverId } = req.body;
    
    if (!callId || !callerId || !receiverId) {
        return res.status(400).json({ error: 'Missing required fields: callId, callerId, receiverId' });
    }
    
    try {
        const result = await webrtcCallService.getCall(callId);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get call tokens error:', error);
        res.status(500).json({ error: 'Failed to get call tokens' });
    }
});

// 27. Get real-time call state
app.get('/api/call/:callId/state', async (req, res) => {
    const { callId } = req.params;
    
    try {
        const result = await webrtcCallService.getCallState(callId);
        res.json(result);
    } catch (error) {
        console.error('Get call state error:', error);
        res.status(500).json({ error: 'Failed to get call state' });
    }
});

// 28. Update call status (for real-time state management)
app.post('/api/call/:callId/status', async (req, res) => {
    const { callId } = req.params;
    const { status, userId } = req.body;
    
    if (!status || !userId) {
        return res.status(400).json({ error: 'Missing required fields: status, userId' });
    }
    
    try {
        const result = await webrtcCallService.updateCallStatus(callId, status, userId);
        res.json(result);
    } catch (error) {
        console.error('Update call status error:', error);
        res.status(500).json({ error: 'Failed to update call status' });
    }
});

// 27. Create video call
app.post('/api/call/create-video', async (req, res) => {
    const { callerId, receiverId, callerRole, receiverRole } = req.body;
    
    console.log('📹 Video call create request:', { callerId, receiverId, callerRole, receiverRole });
    
    if (!callerId || !receiverId || !callerRole || !receiverRole) {
        console.log('❌ Missing required fields for video call creation');
        return res.status(400).json({ error: 'Missing required fields: callerId, receiverId, callerRole, receiverRole' });
    }
    
    try {
        // For now, allow all video calls between doctors and patients
        // You can implement permission logic here later
        const result = await webrtcCallService.createCall(callerId, receiverId, callerRole, receiverRole, 'video');
        
        res.json({
            success: true,
            message: 'Video call created successfully',
            data: result
        });
    } catch (error) {
        console.error('Create video call error:', error);
        res.status(500).json({ error: 'Failed to create video call' });
    }
});

// 28. Get call statistics
app.get('/api/call/stats', async (req, res) => {
    try {
        const stats = await webrtcCallService.getCallStats();
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Get call stats error:', error);
        res.status(500).json({ error: 'Failed to get call statistics' });
    }
});

// 29. Test incoming call (for debugging)
app.post('/api/call/test-incoming', async (req, res) => {
    const { receiverId, callerName = 'Test Doctor' } = req.body;
    
    if (!receiverId) {
        return res.status(400).json({ error: 'Missing receiverId' });
    }
    
    try {
        const testCallData = {
            callId: 'test-call-' + Date.now(),
            callerId: 'test-caller',
            callerName: callerName,
            callType: 'voice',
            timestamp: new Date().toISOString()
        };
        
        console.log(`🧪 Testing incoming call to ${receiverId}:`, testCallData);
        
        // Check if the room exists
        const room = io.sockets.adapter.rooms.get(receiverId);
        if (room) {
            console.log(`✅ Room ${receiverId} found with ${room.size} socket(s)`);
            io.to(receiverId).emit('incoming-call', testCallData);
            res.json({ success: true, message: 'Test call sent', data: testCallData });
        } else {
            console.log(`❌ Room ${receiverId} not found!`);
            console.log('📊 Available rooms:', Array.from(io.sockets.adapter.rooms.keys()));
            res.json({ success: false, message: 'User not connected', availableRooms: Array.from(io.sockets.adapter.rooms.keys()) });
        }
    } catch (error) {
        console.error('Test incoming call error:', error);
        res.status(500).json({ error: 'Failed to send test call' });
    }
});

// Set Socket.IO instance for real-time call state management
webrtcCallService.setSocketIO(io);

// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Join user's personal room for incoming calls
    socket.on('join-user-room', (data) => {
        const { userId } = data;
        socket.join(userId);
        console.log(`👤 User ${userId} joined personal room for incoming calls`);
        console.log(`🔌 Socket ID: ${socket.id}`);
        console.log(`🏠 Room: ${userId}`);
        
        // Store user session for incoming calls
        socket.userId = userId;
        
        // Log all connected users
        console.log('📊 Currently connected users:');
        for (const [room, sockets] of io.sockets.adapter.rooms) {
            if (room !== socket.id) { // Skip socket's own room
                console.log(`  Room ${room}: ${sockets.size} socket(s)`);
            }
        }
    });

    // Subscribe to real-time call updates
    socket.on('subscribe-to-call', (data) => {
        const { callId, userId } = data;
        webrtcCallService.subscribeToCall(callId, userId, socket.id);
        console.log(`📞 User ${userId} subscribed to real-time updates for call ${callId}`);
    });

    // Unsubscribe from real-time call updates
    socket.on('unsubscribe-from-call', (data) => {
        const { callId, userId } = data;
        webrtcCallService.unsubscribeFromCall(callId, userId);
        console.log(`📞 User ${userId} unsubscribed from real-time updates for call ${callId}`);
    });

    // Get real-time call state
    socket.on('get-call-state', async (data) => {
        const { callId } = data;
        try {
            const result = await webrtcCallService.getCallState(callId);
            socket.emit('call-state-response', result);
        } catch (error) {
            socket.emit('call-state-response', { success: false, error: error.message });
        }
    });

    // Join call room
    socket.on('join-call', (data) => {
        const { callId, userId } = data;
        socket.join(callId);
        console.log(`👤 User ${userId} joined call room: ${callId}`);
        
        // Notify other users in the room
        socket.to(callId).emit('user-joined', { userId });
        
        // Store user session
        webrtcCallService.storeUserSession(userId, socket.id, callId);
    });

    // Handle WebRTC signaling
    socket.on('signal', (data) => {
        const { callId, signalData, userId } = data;
        console.log(`📡 Signal from ${userId} in call ${callId}`);
        
        if (!callId) {
            console.log('⚠️ Signal received without callId, ignoring...');
            return;
        }
        
        // Store signaling data
        webrtcCallService.storeSignalingData(callId, { signalData, userId });
        
        // Forward signal to other users in the room
        socket.to(callId).emit('signal', { signalData, userId });
    });

    // Handle local call ended (immediate synchronization)
    socket.on('local-call-ended', (data) => {
        console.log('📞 Local call ended event received:', data);
        const { callId, userId } = data;
        
        // Broadcast to all connected users
        io.emit('local-call-ended', data);
        console.log(`📞 Local call-ended event broadcasted to all users for call: ${callId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
        
        // Find and clean up user session
        for (const [userId, session] of webrtcCallService.userSessions) {
            if (session.sessionId === socket.id) {
                console.log(`👤 User ${userId} left call: ${session.callId}`);
                socket.to(session.callId).emit('user-left', { userId });
                webrtcCallService.userSessions.delete(userId);
                break;
            }
        }
    });
});

// --- BLOCKCHAIN CALL RECORDS ENDPOINTS ---

// 30. Get call records from blockchain for a user
app.get('/api/call/blockchain-records/:userId', async (req, res) => {
    const { userId } = req.params;
    const { role } = req.query; // 'doctor' or 'patient'
    
    if (!userId || !role) {
        return res.status(400).json({ error: 'Missing required parameters: userId and role' });
    }
    
    try {
        console.log(`🔍 Retrieving blockchain call records for ${role}: ${userId}`);
        
        const callRecords = await webrtcCallService.getCallRecordsFromBlockchain(userId, role);
        
        res.json({
            success: true,
            data: callRecords,
            count: callRecords.length
        });
    } catch (error) {
        console.error('❌ Failed to get blockchain call records:', error);
        res.status(500).json({ error: 'Failed to retrieve blockchain call records' });
    }
});

// 31. Get combined call history (local + blockchain)
app.get('/api/call/history/:userId', async (req, res) => {
    const { userId } = req.params;
    const { role } = req.query; // 'doctor' or 'patient'
    
    if (!userId || !role) {
        return res.status(400).json({ error: 'Missing required parameters: userId and role' });
    }
    
    try {
        console.log(`🔍 Retrieving combined call history for ${role}: ${userId}`);
        
        // Get local call history
        const localCalls = await webrtcCallService.getUserCallHistory(userId);
        
        // Get blockchain call records
        const blockchainCalls = await webrtcCallService.getCallRecordsFromBlockchain(userId, role);
        
        // Combine and deduplicate calls
        const allCalls = [...localCalls, ...blockchainCalls];
        const uniqueCalls = new Map();
        
        for (const call of allCalls) {
            const key = call.callId || call.blockchainRecordId;
            if (key && !uniqueCalls.has(key)) {
                uniqueCalls.set(key, call);
            }
        }
        
        const combinedCalls = Array.from(uniqueCalls.values());
        
        // Sort by timestamp (newest first)
        combinedCalls.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.createdAt || a.startTime);
            const timeB = new Date(b.timestamp || b.createdAt || b.startTime);
            return timeB - timeA;
        });
        
        res.json({
            success: true,
            data: combinedCalls,
            stats: {
                total: combinedCalls.length,
                local: localCalls.length,
                blockchain: blockchainCalls.length
            }
        });
    } catch (error) {
        console.error('❌ Failed to get combined call history:', error);
        res.status(500).json({ error: 'Failed to retrieve call history' });
    }
});

// --- APPOINTMENT BOOKING SYSTEM ---

// Appointments will now be stored in the database
// The appointments array is kept for backward compatibility during transition
let appointments = [];

// Helper function to generate unique appointment ID
const generateAppointmentId = () => {
    return 'appt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Helper function to validate appointment time
const isValidAppointmentTime = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    // Check if appointment is in the future
    if (start <= now) {
        return false;
    }
    
    // Check if end time is after start time
    if (end <= start) {
        return false;
    }
    
    // Check if appointment duration is reasonable (15 minutes to 2 hours)
    const durationMs = end - start;
    const minDuration = 15 * 60 * 1000; // 15 minutes
    const maxDuration = 2 * 60 * 60 * 1000; // 2 hours
    
    return durationMs >= minDuration && durationMs <= maxDuration;
};

// Helper function to check for time conflicts
const hasTimeConflict = (doctorId, startTime, endTime, excludeAppointmentId = null) => {
    return appointments.some(appointment => {
        if (appointment.doctorId !== doctorId) return false;
        if (excludeAppointmentId && appointment.id === excludeAppointmentId) return false;
        
        const existingStart = new Date(appointment.startTime);
        const existingEnd = new Date(appointment.endTime);
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);
        
        // Check for overlap
        return (newStart < existingEnd && newEnd > existingStart);
    });
};

// 32. Set doctor availability
app.post('/api/appointments/availability', async (req, res) => {
    const { doctorId, date, timeSlots } = req.body;
    
    if (!doctorId || !date || !timeSlots || !Array.isArray(timeSlots)) {
        return res.status(400).json({ error: 'Missing required parameters: doctorId, date, and timeSlots array' });
    }
    
    try {
        console.log(`📅 Setting availability for doctor ${doctorId} on ${date}`);
        
        // Validate doctor exists
        const doctor = await databaseService.findUserById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        const selectedDate = new Date(date);
        const createdAppointments = [];
        
        // Clear existing available appointments for this doctor on this date
        console.log(`🗑️ Clearing existing appointments for doctor ${doctorId} on ${date}`);
        const deleteResult = await databaseService.deleteAppointmentsByDoctorAndDate(doctorId, date);
        console.log(`🗑️ Delete result:`, deleteResult);
        
        for (const timeSlot of timeSlots) {
            const { startTime, endTime } = timeSlot;
            
            // Validate time slot
            if (!isValidAppointmentTime(startTime, endTime)) {
                continue; // Skip invalid time slots
            }
            
            // Check if an appointment already exists for this exact time slot
            const existingAppointment = await databaseService.findAppointmentByTimeAndDoctor(doctorId, startTime, endTime);
            
            if (existingAppointment) {
                console.log(`⚠️ Appointment slot already exists for ${startTime} - ${endTime}, skipping`);
                continue;
            }
            
            // Create appointment slot in database
            const appointment = {
                doctorId: doctorId,
                patientId: null,
                startTime: startTime,
                endTime: endTime,
                status: 'available',
                type: 'video'
            };
            
            console.log(`📅 Creating appointment slot:`, {
                doctorId: doctorId,
                startTime: startTime,
                endTime: endTime,
                status: 'available'
            });
            
            const result = await databaseService.createAppointment(appointment);
            appointment.id = result.appointmentId.toString();
            createdAppointments.push(appointment);
            
            console.log(`✅ Created appointment with ID: ${appointment.id}`);
        }
        
        console.log(`✅ Created ${createdAppointments.length} available appointment slots`);
        
        res.json({
            success: true,
            message: `Created ${createdAppointments.length} available appointment slots`,
            appointments: createdAppointments
        });
        
    } catch (error) {
        console.error('❌ Failed to set doctor availability:', error);
        console.error('Error details:', {
            doctorId,
            date,
            timeSlotsCount: timeSlots?.length,
            errorMessage: error.message,
            errorStack: error.stack
        });
        res.status(500).json({ error: 'Failed to set doctor availability' });
    }
});

// 33. Get doctor availability
app.get('/api/appointments/availability/:doctorId', async (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query;
    
    if (!doctorId) {
        return res.status(400).json({ error: 'Missing required parameter: doctorId' });
    }
    
    try {
        console.log(`📅 Getting availability for doctor ${doctorId}${date ? ` on ${date}` : ''}`);
        
        // Validate doctor exists
        const doctor = await databaseService.findUserById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        // Get appointments from database
        const availableAppointments = await databaseService.getAppointmentsByDoctor(doctorId, date);
        
        // Filter for available appointments only
        const filteredAppointments = availableAppointments.filter(appointment => 
            appointment.status === 'available'
        );
        
        // Sort by start time
        filteredAppointments.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        res.json({
            success: true,
            data: filteredAppointments,
            count: filteredAppointments.length
        });
        
    } catch (error) {
        console.error('❌ Failed to get doctor availability:', error);
        res.status(500).json({ error: 'Failed to get doctor availability' });
    }
});

// 34. Book appointment
app.put('/api/appointments/book/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    const { patientId, reason } = req.body;
    
    if (!patientId) {
        return res.status(400).json({ error: 'Missing required parameter: patientId' });
    }
    
    try {
        console.log(`📅 Booking appointment ${appointmentId} for patient ${patientId}`);
        console.log(`📅 Request body:`, req.body);
        
        // Validate patient exists
        console.log(`🔍 Validating patient ${patientId}...`);
        const patient = await databaseService.findUserById(patientId);
        console.log(`🔍 Patient lookup result:`, patient ? { id: patient._id, username: patient.username, role: patient.role } : 'Not found');
        
        if (!patient || patient.role !== 'patient') {
            console.log(`❌ Patient validation failed:`, { patient, role: patient?.role });
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        console.log(`✅ Patient validation passed: ${patient.username}`);
        
        // Find appointment in database
        console.log(`🔍 Looking for appointment with ID: ${appointmentId}`);
        
        const appointment = await databaseService.findAppointmentById(appointmentId);
        console.log(`🔍 Appointment lookup result:`, appointment ? { 
            id: appointment._id, 
            status: appointment.status, 
            doctorId: appointment.doctorId,
            startTime: appointment.startTime,
            endTime: appointment.endTime
        } : 'Not found');
        
        if (!appointment) {
            console.log(`❌ Appointment ${appointmentId} not found`);
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        if (appointment.status !== 'available') {
            console.log(`❌ Appointment ${appointmentId} is not available (status: ${appointment.status})`);
            return res.status(400).json({ error: 'Appointment is not available for booking' });
        }
        
        console.log(`✅ Appointment validation passed: ${appointment._id}`);
        
        // Double-check: ensure no other patient has booked this slot
        if (appointment.patientId && appointment.patientId !== patientId) {
            console.log(`❌ Appointment ${appointmentId} is already booked by another patient`);
            return res.status(400).json({ error: 'Appointment is already booked by another patient' });
        }

        // Additional protection: Check if this exact time slot is already booked by any patient
        console.log(`🔍 Checking for time slot conflicts...`);
        const existingBookedAppointment = await databaseService.findAppointmentByTimeAndDoctor(
            appointment.doctorId, 
            appointment.startTime, 
            appointment.endTime
        );
        
        console.log(`🔍 Time slot conflict check result:`, existingBookedAppointment ? {
            id: existingBookedAppointment._id,
            status: existingBookedAppointment.status,
            patientId: existingBookedAppointment.patientId
        } : 'No conflicts found');
        
        // Check for any conflicting appointments (booked or in progress)
        if (existingBookedAppointment && 
            (existingBookedAppointment.status === 'booked' || 
             existingBookedAppointment.status === 'in-progress')) {
            console.log(`❌ Time slot ${appointment.startTime} - ${appointment.endTime} is already ${existingBookedAppointment.status}`);
            return res.status(400).json({ error: `This time slot is already ${existingBookedAppointment.status}` });
        }
        
        // Additional check: ensure this specific appointment hasn't been modified since we fetched it
        if (appointment.updatedAt) {
            const currentAppointment = await databaseService.findAppointmentById(appointmentId);
            if (currentAppointment.updatedAt.getTime() !== appointment.updatedAt.getTime()) {
                console.log(`❌ Appointment ${appointmentId} was modified by another request`);
                return res.status(409).json({ error: 'Appointment was modified by another request. Please try again.' });
            }
        }
        
        console.log(`✅ Time slot conflict check passed`);
        
        // Update appointment in database
        const updateData = {
            patientId: patientId,
            status: 'booked',
            reason: reason || 'General consultation',
            type: req.body.type || 'voice' // Default to voice call if not specified
        };
        
        const updateResult = await databaseService.updateAppointment(appointmentId, updateData);
        
        if (!updateResult.success) {
            console.error(`❌ Failed to update appointment ${appointmentId}:`, updateResult.message);
            return res.status(500).json({ error: 'Failed to update appointment: ' + updateResult.message });
        }
        
        console.log(`✅ Appointment ${appointmentId} updated successfully`);
        
        console.log(`✅ Appointment ${appointmentId} booked successfully`);
        
        // Get updated appointment data
        const updatedAppointment = await databaseService.findAppointmentById(appointmentId);
        
        res.json({
            success: true,
            message: 'Appointment booked successfully',
            appointment: {
                id: updatedAppointment._id.toString(),
                doctorId: updatedAppointment.doctorId,
                patientId: updatedAppointment.patientId,
                startTime: updatedAppointment.startTime,
                endTime: updatedAppointment.endTime,
                status: updatedAppointment.status,
                type: updatedAppointment.type,
                reason: updatedAppointment.reason
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to book appointment:', error);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// 35. Cleanup duplicate appointments (admin only)
app.post('/api/appointments/cleanup-duplicates', async (req, res) => {
    try {
        console.log('🧹 Cleanup duplicate appointments requested');
        
        const result = await databaseService.cleanupDuplicateAppointments();
        
        res.json({
            success: true,
            message: `Cleanup completed. Removed ${result.cleanedCount} duplicate appointments.`,
            cleanedCount: result.cleanedCount
        });
        
    } catch (error) {
        console.error('❌ Failed to cleanup duplicate appointments:', error);
        res.status(500).json({ error: 'Failed to cleanup duplicate appointments' });
    }
});

// 35.1. Cleanup duplicate appointments (public endpoint for immediate use)
app.post('/api/appointments/cleanup-duplicates-public', async (req, res) => {
    try {
        console.log('🧹 Public cleanup duplicate appointments requested');
        
        const result = await databaseService.cleanupDuplicateAppointments();
        
        res.json({
            success: true,
            message: `Cleanup completed. Removed ${result.cleanedCount} duplicate appointments.`,
            cleanedCount: result.cleanedCount
        });
        
    } catch (error) {
        console.error('❌ Failed to cleanup duplicate appointments:', error);
        res.status(500).json({ error: 'Failed to cleanup duplicate appointments' });
    }
});

// 36. Complete appointment (doctor only)
app.put('/api/appointments/complete/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    const { doctorId, notes } = req.body;
    
    if (!doctorId) {
        return res.status(400).json({ error: 'Missing required parameter: doctorId' });
    }
    
    try {
        console.log(`✅ Completing appointment ${appointmentId} by doctor ${doctorId}`);
        
        // Validate doctor exists
        const doctor = await databaseService.findUserById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        // Find appointment in database
        const appointment = await databaseService.findAppointmentById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        // Verify the doctor owns this appointment
        if (appointment.doctorId !== doctorId) {
            return res.status(403).json({ error: 'You can only complete your own appointments' });
        }
        
        // Check if appointment is in a valid state to complete
        if (appointment.status !== 'booked') {
            return res.status(400).json({ error: 'Only booked appointments can be completed' });
        }
        
        // Update appointment status to completed
        const updateData = {
            status: 'completed',
            notes: notes || 'Appointment completed',
            completedAt: new Date()
        };
        
        console.log(`📝 Updating appointment with data:`, updateData);
        
        try {
            const updateResult = await databaseService.updateAppointment(appointmentId, updateData);
            console.log(`📝 Update result:`, updateResult);
            
            if (!updateResult.success) {
                console.error(`❌ Update failed:`, updateResult.message);
                return res.status(500).json({ error: 'Failed to complete appointment: ' + updateResult.message });
            }
        } catch (updateError) {
            console.error(`❌ Update error:`, updateError);
            return res.status(500).json({ error: 'Failed to complete appointment: ' + updateError.message });
        }
        
        // Get updated appointment data
        const updatedAppointment = await databaseService.findAppointmentById(appointmentId);
        
        res.json({
            success: true,
            message: 'Appointment completed successfully',
            appointment: {
                id: updatedAppointment._id.toString(),
                doctorId: updatedAppointment.doctorId,
                patientId: updatedAppointment.patientId,
                startTime: updatedAppointment.startTime,
                endTime: updatedAppointment.endTime,
                status: updatedAppointment.status,
                type: updatedAppointment.type,
                reason: updatedAppointment.reason,
                notes: updatedAppointment.notes,
                completedAt: updatedAppointment.completedAt
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to complete appointment:', error);
        res.status(500).json({ error: 'Failed to complete appointment' });
    }
});

// 37. Cancel appointment
app.put('/api/appointments/cancel/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    const { userId, reason } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'Missing required parameter: userId' });
    }
    
    try {
        console.log(`❌ Cancelling appointment ${appointmentId} by user ${userId}`);
        
        // Validate user exists
        const user = await databaseService.findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Find appointment in database
        const appointment = await databaseService.findAppointmentById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        // Verify the user has permission to cancel this appointment
        if (user.role === 'doctor' && appointment.doctorId !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own appointments' });
        }
        
        if (user.role === 'patient' && appointment.patientId !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own appointments' });
        }
        
        // Check if appointment can be cancelled
        if (appointment.status === 'completed' || appointment.status === 'cancelled') {
            return res.status(400).json({ error: 'Cannot cancel completed or already cancelled appointments' });
        }
        
        // Update appointment status to cancelled
        const updateData = {
            status: 'cancelled',
            cancellationReason: reason || 'Appointment cancelled',
            cancelledAt: new Date()
        };
        
        const updateResult = await databaseService.updateAppointment(appointmentId, updateData);
        
        if (!updateResult.success) {
            return res.status(500).json({ error: 'Failed to cancel appointment' });
        }
        
        // Get updated appointment data
        const updatedAppointment = await databaseService.findAppointmentById(appointmentId);
        
        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            appointment: {
                id: updatedAppointment._id.toString(),
                doctorId: updatedAppointment.doctorId,
                patientId: updatedAppointment.patientId,
                startTime: updatedAppointment.startTime,
                endTime: updatedAppointment.endTime,
                status: updatedAppointment.status,
                type: updatedAppointment.type,
                reason: updatedAppointment.reason,
                cancellationReason: updatedAppointment.cancellationReason,
                cancelledAt: updatedAppointment.cancelledAt
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to cancel appointment:', error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

// 38. Get user appointments (for both doctors and patients)
app.get('/api/appointments/:userId', async (req, res) => {
    const { userId } = req.params;
    const { status, type } = req.query;
    
    if (!userId) {
        return res.status(400).json({ error: 'Missing required parameter: userId' });
    }
    
    try {
        console.log(`📅 Getting appointments for user ${userId}`);
        
        // Validate user exists
        const user = await databaseService.findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        let userAppointments = [];
        
        if (user.role === 'doctor') {
            userAppointments = await databaseService.getAppointmentsByDoctor(userId);
        } else if (user.role === 'patient') {
            userAppointments = await databaseService.getAppointmentsByPatient(userId);
        }

        // Add user details to appointments
        for (const appointment of userAppointments) {
            try {
                if (user.role === 'doctor' && appointment.patientId) {
                    // For doctors, get patient details
                    const patient = await databaseService.findUserById(appointment.patientId);
                    if (patient) {
                        appointment.patientName = patient.name;
                    }
                } else if (user.role === 'patient' && appointment.doctorId) {
                    // For patients, get doctor details
                    const doctor = await databaseService.findUserById(appointment.doctorId);
                    if (doctor) {
                        appointment.doctorName = doctor.name;
                    }
                }
            } catch (error) {
                console.error('Error fetching user details for appointment:', error);
            }
        }
        
        // Filter by status if provided
        if (status) {
            userAppointments = userAppointments.filter(appointment => appointment.status === status);
        }
        
        // Filter by type if provided
        if (type) {
            userAppointments = userAppointments.filter(appointment => appointment.type === type);
        }
        
        // Sort by start time (newest first)
        userAppointments.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        res.json({
            success: true,
            data: userAppointments,
            count: userAppointments.length
        });
        
    } catch (error) {
        console.error('❌ Failed to get user appointments:', error);
        res.status(500).json({ error: 'Failed to get user appointments' });
    }
});

// 36. Cancel appointment
app.put('/api/appointments/cancel/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    const { userId, reason } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'Missing required parameter: userId' });
    }
    
    try {
        console.log(`📅 Canceling appointment ${appointmentId} by user ${userId}`);
        
        // Find appointment
        const appointmentIndex = appointments.findIndex(appointment => 
            appointment.id === appointmentId
        );
        
        if (appointmentIndex === -1) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const appointment = appointments[appointmentIndex];
        
        // Validate user can cancel this appointment
        const user = await databaseService.findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.role === 'patient' && appointment.patientId !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own appointments' });
        }
        
        if (user.role === 'doctor' && appointment.doctorId !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own appointments' });
        }
        
        // Update appointment status
        appointment.status = 'cancelled';
        appointment.cancellationReason = reason || 'No reason provided';
        appointment.cancelledBy = userId;
        appointment.updatedAt = new Date();
        
        appointments[appointmentIndex] = appointment;
        
        console.log(`✅ Appointment ${appointmentId} cancelled successfully`);
        
        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            appointment: appointment
        });
        
    } catch (error) {
        console.error('❌ Failed to cancel appointment:', error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

// 37. Complete appointment
app.put('/api/appointments/complete/:appointmentId', async (req, res) => {
    const { appointmentId } = req.params;
    const { doctorId, notes } = req.body;
    
    if (!doctorId) {
        return res.status(400).json({ error: 'Missing required parameter: doctorId' });
    }
    
    try {
        console.log(`📅 Completing appointment ${appointmentId} by doctor ${doctorId}`);
        
        // Find appointment
        const appointmentIndex = appointments.findIndex(appointment => 
            appointment.id === appointmentId && 
            appointment.doctorId === doctorId &&
            appointment.status === 'booked'
        );
        
        if (appointmentIndex === -1) {
            return res.status(404).json({ error: 'Appointment not found or not authorized' });
        }
        
        const appointment = appointments[appointmentIndex];
        
        // Update appointment status
        appointment.status = 'completed';
        appointment.notes = notes || '';
        appointment.completedAt = new Date();
        appointment.updatedAt = new Date();
        
        appointments[appointmentIndex] = appointment;
        
        console.log(`✅ Appointment ${appointmentId} completed successfully`);
        
        res.json({
            success: true,
            message: 'Appointment completed successfully',
            appointment: appointment
        });
        
    } catch (error) {
        console.error('❌ Failed to complete appointment:', error);
        res.status(500).json({ error: 'Failed to complete appointment' });
    }
});

// 38. Get all doctors for appointment booking
app.get('/api/doctors/available', async (req, res) => {
    try {
        console.log('👨‍⚕️ Getting list of available doctors');
        
        const doctors = await databaseService.getUsersByRole('doctor');
        
        // Add availability count for each doctor
        const doctorsWithAvailability = await Promise.all(doctors.map(async (doctor) => {
            try {
                // Get available appointments from database for this doctor
                const availableAppointments = await databaseService.getAppointmentsByDoctor(doctor.id);
                const availableSlots = availableAppointments.filter(appointment => 
                    appointment.status === 'available'
                ).length;
                
                console.log(`👨‍⚕️ Doctor ${doctor.name}: ${availableSlots} available slots`);
                
                return {
                    ...doctor,
                    availableSlots
                };
            } catch (error) {
                console.error(`❌ Error getting availability for doctor ${doctor.name}:`, error);
                return {
                    ...doctor,
                    availableSlots: 0
                };
            }
        }));
        
        res.json({
            success: true,
            data: doctorsWithAvailability,
            count: doctorsWithAvailability.length
        });
        
    } catch (error) {
        console.error('❌ Failed to get available doctors:', error);
        res.status(500).json({ error: 'Failed to get available doctors' });
    }
});

// --- Start the Server ---
server.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
    console.log('📞 WebRTC signaling server is ready');
    console.log('🔗 Blockchain integration is active');
    console.log('📅 Appointment booking system is active');
});
