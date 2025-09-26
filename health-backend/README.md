# HealthChain AI Backend

A blockchain-based healthcare platform with MongoDB user management and IPFS file storage.

## Architecture

### Database (MongoDB)
- **User Management**: Usernames, passwords, roles, profiles
- **Access Control**: Doctor-patient permissions
- **Session Data**: Active user sessions

### IPFS
- **Medical Files**: Reports, images, PDFs
- **Decentralized Storage**: Tamper-proof file storage

### Blockchain
- **File Hashes**: Links to IPFS content
- **Audit Trail**: Access logs and verification

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Install MongoDB
```bash
# Install MongoDB Community Edition
# Or use MongoDB Atlas for cloud hosting
```

### 3. Environment Variables
Create a `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=healthchain
```

### 4. Start the Server
```bash
node index.js
```

## API Endpoints

### User Management
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/users` - Get all users
- `GET /api/user-status` - Get user status and database info

### Health Checks
- `GET /api/database-status` - Database health check
- `GET /api/blockchain-status` - Blockchain health check

## Default Users

The system automatically creates these default users:

### Admin
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`

### Doctor
- **Username**: `doctor1`
- **Password**: `password123`
- **Role**: `doctor`
- **Specialization**: Cardiology

### Patient
- **Username**: `patient1`
- **Password**: `password123`
- **Role**: `patient`

## Features

✅ **Persistent User Data** - Survives server restarts
✅ **Secure Authentication** - Bcrypt password hashing
✅ **Role-Based Access** - Doctor, patient, admin roles
✅ **Access Control** - Doctor-patient permissions
✅ **Health Monitoring** - Database and blockchain status
✅ **Session Management** - Active user caching

## File Structure
```
health-backend/
├── index.js              # Main server
├── services/
│   ├── databaseService.js    # MongoDB user management
│   ├── blockchainService.js  # Blockchain integration
│   ├── ipfsService.js        # IPFS file storage
│   ├── chatService.js        # Chat functionality
│   └── voiceCallService.js   # Voice call functionality
├── contracts/            # Smart contracts
└── scripts/              # Deployment scripts
```
