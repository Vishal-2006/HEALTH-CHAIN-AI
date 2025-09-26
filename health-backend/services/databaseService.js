const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

class DatabaseService {
    constructor() {
        this.client = null;
        this.db = null;
        this.users = null;
        this.appointments = null;
        this.isConnected = false;
        this.mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        this.dbName = process.env.DB_NAME || 'healthchain';
    }

    async connect() {
        try {
            this.client = new MongoClient(this.mongoUrl);
            await this.client.connect();
            
            this.db = this.client.db(this.dbName);
            this.users = this.db.collection('users');
            this.appointments = this.db.collection('appointments');
            
            // Create indexes for better performance
            await this.users.createIndex({ username: 1 }, { unique: true });
            
            // Handle email index creation with proper error handling
            try {
                await this.users.createIndex({ email: 1 }, { unique: true, sparse: true });
            } catch (error) {
                if (error.code === 86) { // IndexKeySpecsConflict
                    console.log('⚠️ Email index already exists, skipping creation');
                } else {
                    throw error;
                }
            }
            
            await this.users.createIndex({ role: 1 });
            
            // Create indexes for appointments
            await this.appointments.createIndex({ doctorId: 1 });
            await this.appointments.createIndex({ patientId: 1 });
            await this.appointments.createIndex({ status: 1 });
            await this.appointments.createIndex({ startTime: 1 });
            
            // Create unique compound index to prevent duplicate appointments
            try {
                await this.appointments.createIndex(
                    { doctorId: 1, startTime: 1, endTime: 1, status: 1 }, 
                    { unique: true }
                );
                console.log('✅ Created unique compound index for appointments');
            } catch (error) {
                if (error.code === 85) { // Index already exists
                    console.log('⚠️ Unique compound index already exists, skipping creation');
                } else {
                    console.log('⚠️ Could not create unique index:', error.message);
                }
            }
            
            this.isConnected = true;
            console.log('✅ MongoDB connected successfully');
            
            // No default users - all users must register through the application
            console.log('✅ No default users - all users must register through the application');
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('✅ MongoDB disconnected');
        }
    }



    // User Management Methods
    async createUser(userData) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            // Hash password if provided
            if (userData.password) {
                userData.password = await bcrypt.hash(userData.password, 10);
            }

            // Add timestamps
            userData.createdAt = new Date();
            userData.updatedAt = new Date();
            userData.isActive = true;

            const result = await this.users.insertOne(userData);
            console.log(`✅ User created: ${userData.username}`);
            
            return {
                success: true,
                userId: result.insertedId,
                username: userData.username,
                name: userData.name,
                email: userData.email,
                role: userData.role
            };
        } catch (error) {
            console.error('❌ Failed to create user:', error);
            throw error;
        }
    }

    async findUserByUsername(username) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const user = await this.users.findOne({ username, isActive: true });
            return user;
        } catch (error) {
            console.error('❌ Failed to find user:', error);
            throw error;
        }
    }

    async findUserByEmail(email) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const user = await this.users.findOne({ email, isActive: true });
            return user;
        } catch (error) {
            console.error('❌ Failed to find user by email:', error);
            throw error;
        }
    }

    async findUserById(userId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            console.log(`🔍 Looking up user by ID: ${userId} (type: ${typeof userId})`);

            // Convert string ID to ObjectId if needed
            let objectId;
            try {
                const { ObjectId } = require('mongodb');
                objectId = new ObjectId(userId);
                console.log(`✅ Converted to ObjectId: ${objectId}`);
            } catch (error) {
                console.log(`⚠️ ObjectId conversion failed, using string ID: ${userId}`);
                // If conversion fails, try with string ID directly
                objectId = userId;
            }

            const user = await this.users.findOne({ _id: objectId, isActive: true });
            
            if (user) {
                console.log(`✅ User found: ${user.username} (${user.role})`);
            } else {
                console.log(`❌ No user found with ID: ${userId}`);
            }
            
            return user;
        } catch (error) {
            console.error('❌ Failed to find user by ID:', error);
            throw error;
        }
    }

    async verifyPassword(username, password) {
        try {
            const user = await this.findUserByUsername(username);
            if (!user) {
                return false;
            }

            return await bcrypt.compare(password, user.password);
        } catch (error) {
            console.error('❌ Password verification failed:', error);
            return false;
        }
    }

    async getAllUsers() {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const users = await this.users.find({ isActive: true }).toArray();
            return users.map(user => ({
                id: user._id.toString(), // Convert ObjectId to string
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            }));
        } catch (error) {
            console.error('❌ Failed to get all users:', error);
            throw error;
        }
    }

    async getUsersByRole(role) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const users = await this.users.find({ role, isActive: true }).toArray();
            return users.map(user => ({
                id: user._id.toString(), // Convert ObjectId to string
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                // Include role-specific fields
                ...(role === 'doctor' && {
                    specialization: user.specialization,
                    medicalLicense: user.medicalLicense,
                    hospitalName: user.hospitalName
                }),
                ...(role === 'patient' && {
                    dateOfBirth: user.dateOfBirth,
                    phoneNumber: user.phoneNumber
                })
            }));
        } catch (error) {
            console.error('❌ Failed to get users by role:', error);
            throw error;
        }
    }

    async updateUser(username, updateData) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            updateData.updatedAt = new Date();
            
            const result = await this.users.updateOne(
                { username },
                { $set: updateData }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ User updated: ${username}`);
                return { success: true };
            } else {
                return { success: false, message: 'User not found' };
            }
        } catch (error) {
            console.error('❌ Failed to update user:', error);
            throw error;
        }
    }

    async deleteUser(username) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const result = await this.users.updateOne(
                { username },
                { $set: { isActive: false, updatedAt: new Date() } }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ User deactivated: ${username}`);
                return { success: true };
            } else {
                return { success: false, message: 'User not found' };
            }
        } catch (error) {
            console.error('❌ Failed to delete user:', error);
            throw error;
        }
    }

    async deleteUserById(userId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            console.log(`🔍 Attempting to delete user with ID: ${userId} (type: ${typeof userId})`);

            // Convert string ID to ObjectId if needed
            let objectId;
            try {
                const { ObjectId } = require('mongodb');
                objectId = new ObjectId(userId);
                console.log(`✅ Converted to ObjectId: ${objectId}`);
            } catch (error) {
                console.log(`⚠️ ObjectId conversion failed, using string ID: ${userId}`);
                // If conversion fails, try with string ID directly
                objectId = userId;
            }

            const result = await this.users.deleteOne({ _id: objectId });
            console.log(`🗑️ Delete result: ${JSON.stringify(result)}`);

            if (result.deletedCount > 0) {
                console.log(`✅ User deleted by ID: ${userId}`);
                return { success: true };
            } else {
                console.log(`❌ No user found with ID: ${userId}`);
                return { success: false, message: 'User not found' };
            }
        } catch (error) {
            console.error('❌ Failed to delete user by ID:', error);
            throw error;
        }
    }

    async clearAllUsers() {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const result = await this.users.deleteMany({});
            console.log(`✅ Cleared all users from database. Deleted ${result.deletedCount} users.`);
            return { success: true, deletedCount: result.deletedCount };
        } catch (error) {
            console.error('❌ Failed to clear all users:', error);
            throw error;
        }
    }

    async clearAdminUsers() {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const result = await this.users.deleteMany({ role: 'admin' });
            console.log(`✅ Cleared admin users from database. Deleted ${result.deletedCount} admin users.`);
            return { success: true, deletedCount: result.deletedCount };
        } catch (error) {
            console.error('❌ Failed to clear admin users:', error);
            throw error;
        }
    }

    // Access Control Methods
    async grantAccess(doctorId, patientId, accessLevel = 'read') {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const permissions = this.db.collection('permissions');
            
            await permissions.updateOne(
                { doctorId, patientId },
                { 
                    $set: { 
                        accessLevel, 
                        grantedAt: new Date(),
                        isActive: true 
                    } 
                },
                { upsert: true }
            );

            console.log(`✅ Access granted: Doctor ${doctorId} → Patient ${patientId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to grant access:', error);
            throw error;
        }
    }

    async revokeAccess(doctorId, patientId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const permissions = this.db.collection('permissions');
            
            const result = await permissions.updateOne(
                { doctorId, patientId },
                { $set: { isActive: false, revokedAt: new Date() } }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ Access revoked: Doctor ${doctorId} → Patient ${patientId}`);
                return { success: true };
            } else {
                return { success: false, message: 'Permission not found' };
            }
        } catch (error) {
            console.error('❌ Failed to revoke access:', error);
            throw error;
        }
    }

    async checkAccess(doctorId, patientId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const permissions = this.db.collection('permissions');
            
            const permission = await permissions.findOne({
                doctorId,
                patientId,
                isActive: true
            });

            return permission ? { hasAccess: true, accessLevel: permission.accessLevel } : { hasAccess: false };
        } catch (error) {
            console.error('❌ Failed to check access:', error);
            throw error;
        }
    }

    async getAccessiblePatients(doctorId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const permissions = this.db.collection('permissions');
            
            const patientIds = await permissions.distinct('patientId', {
                doctorId,
                isActive: true
            });

            // Convert string IDs to ObjectIds for the query
            const { ObjectId } = require('mongodb');
            const objectIds = patientIds.map(id => {
                try {
                    return new ObjectId(id);
                } catch (error) {
                    console.log(`⚠️ Invalid ObjectId in patientIds: ${id}`);
                    return null;
                }
            }).filter(id => id !== null);

            const patients = await this.users.find({
                _id: { $in: objectIds },
                role: 'patient',
                isActive: true
            }).toArray();

            return patients.map(patient => ({
                id: patient._id.toString(), // Convert ObjectId to string
                username: patient.username,
                name: patient.name,
                email: patient.email
            }));
        } catch (error) {
            console.error('❌ Failed to get accessible patients:', error);
            throw error;
        }
    }

    // Appointment Management Methods
    async createAppointment(appointmentData) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            // Check for existing appointment with same time slot and doctor
            const existingAppointment = await this.findAppointmentByTimeAndDoctor(
                appointmentData.doctorId,
                appointmentData.startTime,
                appointmentData.endTime
            );

            if (existingAppointment) {
                console.log(`⚠️ Appointment slot already exists for ${appointmentData.startTime} - ${appointmentData.endTime}`);
                return {
                    success: false,
                    message: 'Appointment slot already exists for this time',
                    existingAppointmentId: existingAppointment._id
                };
            }

            // Add timestamps
            appointmentData.createdAt = new Date();
            appointmentData.updatedAt = new Date();

            const result = await this.appointments.insertOne(appointmentData);
            console.log(`✅ Appointment created: ${result.insertedId}`);
            
            return {
                success: true,
                appointmentId: result.insertedId,
                appointment: appointmentData
            };
        } catch (error) {
            console.error('❌ Failed to create appointment:', error);
            throw error;
        }
    }

    async updateAppointment(appointmentId, updateData) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            updateData.updatedAt = new Date();
            
            // Convert string ID to ObjectId if needed
            let objectId;
            try {
                const { ObjectId } = require('mongodb');
                objectId = new ObjectId(appointmentId);
            } catch (error) {
                objectId = appointmentId;
            }
            
            // Use updateOne for better compatibility
            const result = await this.appointments.updateOne(
                { _id: objectId },
                { $set: updateData }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ Appointment updated: ${appointmentId}`);
                return { success: true };
            } else {
                console.log(`❌ Appointment ${appointmentId} not found`);
                return { success: false, message: 'Appointment not found' };
            }
        } catch (error) {
            console.error('❌ Failed to update appointment:', error);
            throw error;
        }
    }

    async findAppointmentById(appointmentId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            // Convert string ID to ObjectId if needed
            let objectId;
            try {
                const { ObjectId } = require('mongodb');
                objectId = new ObjectId(appointmentId);
            } catch (error) {
                objectId = appointmentId;
            }

            const appointment = await this.appointments.findOne({ _id: objectId });
            return appointment;
        } catch (error) {
            console.error('❌ Failed to find appointment by ID:', error);
            throw error;
        }
    }

    async findAppointmentByTimeAndDoctor(doctorId, startTime, endTime) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            // Find any appointment with the same time slot (regardless of status)
            const appointment = await this.appointments.findOne({
                doctorId: doctorId,
                startTime: startTime,
                endTime: endTime
            });
            
            return appointment;
        } catch (error) {
            console.error('❌ Failed to find appointment by time and doctor:', error);
            throw error;
        }
    }

    async getAppointmentsByDoctor(doctorId, date = null) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            let query = { doctorId: doctorId };
            
            if (date) {
                const selectedDate = new Date(date);
                const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
                
                query.startTime = {
                    $gte: startOfDay.toISOString(),
                    $lt: endOfDay.toISOString()
                };
            }

            const appointments = await this.appointments.find(query).toArray();
            return appointments.map(appointment => ({
                id: appointment._id.toString(),
                doctorId: appointment.doctorId,
                patientId: appointment.patientId,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                status: appointment.status,
                type: appointment.type,
                reason: appointment.reason,
                createdAt: appointment.createdAt,
                updatedAt: appointment.updatedAt
            }));
        } catch (error) {
            console.error('❌ Failed to get appointments by doctor:', error);
            throw error;
        }
    }

    async getAppointmentsByPatient(patientId) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const appointments = await this.appointments.find({ patientId: patientId }).toArray();
            return appointments.map(appointment => ({
                id: appointment._id.toString(),
                doctorId: appointment.doctorId,
                patientId: appointment.patientId,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                status: appointment.status,
                type: appointment.type,
                reason: appointment.reason,
                createdAt: appointment.createdAt,
                updatedAt: appointment.updatedAt
            }));
        } catch (error) {
            console.error('❌ Failed to get appointments by patient:', error);
            throw error;
        }
    }

    async deleteAppointmentsByDoctorAndDate(doctorId, date) {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            const selectedDate = new Date(date);
            const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            
            console.log(`🗑️ Deleting appointments for doctor ${doctorId} on ${date}`);
            console.log(`🗑️ Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
            
            // First, let's see what appointments exist for this doctor and date
            const existingAppointments = await this.appointments.find({
                doctorId: doctorId,
                status: 'available'
            }).toArray();
            
            console.log(`🗑️ Found ${existingAppointments.length} existing available appointments for doctor ${doctorId}`);
            
            // Filter appointments that fall within the date range
            const appointmentsToDelete = existingAppointments.filter(appointment => {
                const appointmentDate = new Date(appointment.startTime);
                return appointmentDate >= startOfDay && appointmentDate < endOfDay;
            });
            
            console.log(`🗑️ ${appointmentsToDelete.length} appointments fall within the date range`);
            
            if (appointmentsToDelete.length > 0) {
                const appointmentIds = appointmentsToDelete.map(app => app._id);
                const result = await this.appointments.deleteMany({
                    _id: { $in: appointmentIds }
                });
                
                console.log(`🗑️ Deleted ${result.deletedCount} appointments for doctor ${doctorId} on ${date}`);
                return { success: true, deletedCount: result.deletedCount };
            } else {
                console.log(`🗑️ No appointments to delete for doctor ${doctorId} on ${date}`);
                return { success: true, deletedCount: 0 };
            }
        } catch (error) {
            console.error('❌ Failed to delete appointments:', error);
            throw error;
        }
    }

    async cleanupDuplicateAppointments() {
        try {
            if (!this.isConnected) {
                throw new Error('Database not connected');
            }

            console.log('🧹 Starting cleanup of duplicate appointments...');
            
            // Find all appointments
            const allAppointments = await this.appointments.find({}).toArray();
            console.log(`📊 Total appointments in database: ${allAppointments.length}`);
            
            const duplicates = [];
            const seen = new Set();
            const duplicateGroups = new Map();
            
            // Group appointments by doctor, time, and status
            for (const appointment of allAppointments) {
                const key = `${appointment.doctorId}-${appointment.startTime}-${appointment.endTime}-${appointment.status}`;
                
                if (seen.has(key)) {
                    duplicates.push(appointment);
                    if (!duplicateGroups.has(key)) {
                        duplicateGroups.set(key, []);
                    }
                    duplicateGroups.get(key).push(appointment);
                } else {
                    seen.add(key);
                }
            }
            
            if (duplicates.length > 0) {
                console.log(`🧹 Found ${duplicates.length} duplicate appointments`);
                
                // Log duplicate groups for debugging
                for (const [key, group] of duplicateGroups) {
                    console.log(`🧹 Duplicate group: ${key} (${group.length} appointments)`);
                }
                
                // Keep the first occurrence of each duplicate group, delete the rest
                const duplicateIds = duplicates.map(app => app._id);
                const result = await this.appointments.deleteMany({
                    _id: { $in: duplicateIds }
                });
                
                console.log(`🧹 Cleaned up ${result.deletedCount} duplicate appointments`);
                return { success: true, cleanedCount: result.deletedCount };
            } else {
                console.log('🧹 No duplicate appointments found');
                return { success: true, cleanedCount: 0 };
            }
        } catch (error) {
            console.error('❌ Failed to cleanup duplicate appointments:', error);
            throw error;
        }
    }

    // Health Check
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected' };
            }

            await this.db.admin().ping();
            const userCount = await this.users.countDocuments();
            const appointmentCount = await this.appointments.countDocuments();
            
            return {
                status: 'connected',
                userCount,
                appointmentCount,
                database: this.dbName
            };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = DatabaseService;
