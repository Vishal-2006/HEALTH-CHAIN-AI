const { v4: uuidv4 } = require('uuid');
const BlockchainService = require('./blockchainService');
const PinataIPFSService = require('./pinataIPFSService');

class WebRTCCallService {
    constructor() {
        this.activeCalls = new Map();
        this.callHistory = new Map();
        this.userSessions = new Map(); // Track user sessions for signaling
        this.realTimeSubscribers = new Map(); // Track real-time subscribers per call
        this.io = null; // Socket.IO instance for real-time updates
        this.blockchainService = new BlockchainService();
        this.pinataIPFSService = new PinataIPFSService();
        console.log('📞 WebRTC call service initialized with real-time state management and blockchain integration');
    }

    /**
     * Set Socket.IO instance for real-time updates
     * @param {Object} io - Socket.IO instance
     */
    setSocketIO(io) {
        this.io = io;
        console.log('📞 Socket.IO instance set for real-time call state management');
    }

    /**
     * Subscribe user to real-time call updates
     * @param {string} callId - Call ID
     * @param {string} userId - User ID
     * @param {string} socketId - Socket ID
     */
    subscribeToCall(callId, userId, socketId) {
        if (!this.realTimeSubscribers.has(callId)) {
            this.realTimeSubscribers.set(callId, new Map());
        }
        
        const callSubscribers = this.realTimeSubscribers.get(callId);
        callSubscribers.set(userId, socketId);
        
        console.log(`📞 User ${userId} subscribed to real-time updates for call ${callId}`);
        
        // Send current call state to new subscriber
        const callData = this.activeCalls.get(callId);
        if (callData && this.io) {
            this.io.to(socketId).emit('call-state-update', {
                callId,
                state: callData,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Unsubscribe user from real-time call updates
     * @param {string} callId - Call ID
     * @param {string} userId - User ID
     */
    unsubscribeFromCall(callId, userId) {
        const callSubscribers = this.realTimeSubscribers.get(callId);
        if (callSubscribers) {
            callSubscribers.delete(userId);
            if (callSubscribers.size === 0) {
                this.realTimeSubscribers.delete(callId);
            }
        }
        console.log(`📞 User ${userId} unsubscribed from real-time updates for call ${callId}`);
    }

    /**
     * Broadcast call state update to all subscribers
     * @param {string} callId - Call ID
     * @param {Object} callData - Updated call data
     * @param {string} eventType - Type of event (state-change, status-update, etc.)
     */
    broadcastCallState(callId, callData, eventType = 'state-change') {
        const callSubscribers = this.realTimeSubscribers.get(callId);
        if (!callSubscribers || !this.io) return;

        const updateData = {
            callId,
            state: callData,
            eventType,
            timestamp: new Date().toISOString()
        };

        // Broadcast to all subscribers of this call
        callSubscribers.forEach((socketId, userId) => {
            this.io.to(socketId).emit('call-state-update', updateData);
        });

        console.log(`📞 Broadcasted ${eventType} for call ${callId} to ${callSubscribers.size} subscribers`);
    }

    /**
     * Create a new call session with real-time state management
     * @param {string} callerId - ID of the caller
     * @param {string} receiverId - ID of the receiver
     * @param {string} callerRole - Role of caller (doctor/patient)
     * @param {string} receiverRole - Role of receiver (doctor/patient)
     * @param {string} callType - 'voice' or 'video'
     * @returns {Object} - Call session data
     */
    async createCall(callerId, receiverId, callerRole, receiverRole, callType = 'voice') {
        try {
            console.log(`📞 Creating ${callType} call: ${callerId} → ${receiverId}`);

            // Generate unique call ID
            const callId = uuidv4();
            const timestamp = new Date().toISOString();

            // Create call session data with enhanced state management
            const callData = {
                callId,
                callerId,
                receiverId,
                callerRole,
                receiverRole,
                callType,
                status: 'initiating', // initiating, ringing, connected, ended, missed
                startTime: timestamp,
                endTime: null,
                duration: 0,
                createdAt: timestamp,
                // Real-time state management
                lastStateUpdate: timestamp,
                stateVersion: 1,
                // WebRTC specific data
                callerSessionId: null,
                receiverSessionId: null,
                signalingData: [],
                // Blockchain integration
                blockchainRecordId: null,
                blockchainTransactionHash: null
            };

            // Store call session
            this.activeCalls.set(callId, callData);

            // Initialize real-time subscribers for this call
            this.realTimeSubscribers.set(callId, new Map());

            console.log(`✅ WebRTC call created: ${callId} (${callType}) with real-time state management`);
            
            return {
                success: true,
                data: callData
            };
        } catch (error) {
            console.error('❌ Failed to create WebRTC call:', error);
            throw error;
        }
    }

    /**
     * Answer a call with real-time state updates
     * @param {string} callId - Call ID
     * @param {string} receiverId - Receiver's user ID
     * @returns {Object} - Updated call data
     */
    async answerCall(callId, receiverId) {
        try {
            console.log(`📞 Attempting to answer call: ${callId} by receiver: ${receiverId}`);
            
            const callData = this.activeCalls.get(callId);
            if (!callData) {
                console.error(`❌ Call not found: ${callId}`);
                throw new Error('Call not found');
            }

            console.log(`📞 Found call data:`, {
                callId: callData.callId,
                status: callData.status,
                receiverId: callData.receiverId,
                callerId: callData.callerId
            });

            if (callData.receiverId !== receiverId) {
                console.error(`❌ Unauthorized: ${receiverId} trying to answer call for ${callData.receiverId}`);
                throw new Error('Unauthorized to answer this call');
            }

            if (callData.status === 'connected') {
                console.error(`❌ Call already answered: ${callId}`);
                throw new Error('Call already answered');
            }

            if (callData.status === 'ended') {
                console.error(`❌ Call already ended: ${callId}`);
                throw new Error('Call already ended');
            }

            // Update call status with real-time state management
            callData.status = 'connected';
            callData.answeredAt = new Date().toISOString();
            callData.lastStateUpdate = new Date().toISOString();
            callData.stateVersion++;

            this.activeCalls.set(callId, callData);

            // Broadcast real-time state update
            this.broadcastCallState(callId, callData, 'call-answered');

            console.log(`✅ WebRTC call answered: ${callId} with real-time broadcast`);
            
            return {
                success: true,
                data: {
                    callId,
                    status: 'connected',
                    callType: callData.callType,
                    stateVersion: callData.stateVersion
                }
            };
        } catch (error) {
            console.error('❌ Failed to answer WebRTC call:', error);
            throw error;
        }
    }

    /**
     * End a call with real-time state updates and blockchain integration
     * @param {string} callId - Call ID
     * @param {string} userId - User ID ending the call
     * @returns {Object} - Call end data
     */
    async endCall(callId, userId) {
        try {
            const callData = this.activeCalls.get(callId);
            if (!callData) {
                // Check if call is already in history (already ended)
                const endedCallData = this.callHistory.get(callId);
                if (endedCallData) {
                    console.log(`ℹ️ Call ${callId} already ended (duration: ${endedCallData.duration}s)`);
                    return {
                        success: true,
                        data: {
                            callId,
                            status: 'ended',
                            duration: endedCallData.duration,
                            endedBy: endedCallData.endedBy
                        }
                    };
                }
                throw new Error('Call not found');
            }

            if (callData.callerId !== userId && callData.receiverId !== userId) {
                throw new Error('Unauthorized to end this call');
            }

            // Calculate call duration
            const startTime = new Date(callData.startTime);
            const endTime = new Date();
            const duration = Math.floor((endTime - startTime) / 1000);

            // Update call data with real-time state management
            callData.status = 'ended';
            callData.endTime = endTime.toISOString();
            callData.duration = duration;
            callData.endedBy = userId;
            callData.lastStateUpdate = new Date().toISOString();
            callData.stateVersion++;

            // Move to call history
            this.callHistory.set(callId, callData);
            this.activeCalls.delete(callId);

            // Clean up user sessions
            this.userSessions.delete(callData.callerId);
            this.userSessions.delete(callData.receiverId);

            // Broadcast real-time state update
            this.broadcastCallState(callId, callData, 'call-ended');

            // Clean up real-time subscribers
            this.realTimeSubscribers.delete(callId);

            console.log(`✅ WebRTC call ended: ${callId} (duration: ${duration}s) with real-time broadcast`);

            // Integrate with blockchain for permanent record
            try {
                await this.recordCallOnBlockchain(callData);
            } catch (blockchainError) {
                console.error('❌ Blockchain recording failed, but call ended successfully:', blockchainError);
                // Don't fail the call end if blockchain recording fails
            }
            
            return {
                success: true,
                data: {
                    callId,
                    status: 'ended',
                    duration,
                    endedBy: userId,
                    stateVersion: callData.stateVersion
                }
            };
        } catch (error) {
            console.error('❌ Failed to end WebRTC call:', error);
            throw error;
        }
    }

    /**
     * Get real-time call state
     * @param {string} callId - Call ID
     * @returns {Object} - Current call state
     */
    async getCallState(callId) {
        try {
            const callData = this.activeCalls.get(callId) || this.callHistory.get(callId);
            if (!callData) {
                throw new Error('Call not found');
            }

            return {
                success: true,
                data: {
                    ...callData,
                    realTimeSubscribers: this.realTimeSubscribers.get(callId)?.size || 0
                }
            };
        } catch (error) {
            console.error('❌ Failed to get call state:', error);
            throw error;
        }
    }

    /**
     * Update call status with real-time broadcast
     * @param {string} callId - Call ID
     * @param {string} status - New status
     * @param {string} userId - User ID making the update
     * @returns {Object} - Updated call data
     */
    async updateCallStatus(callId, status, userId) {
        try {
            const callData = this.activeCalls.get(callId);
            if (!callData) {
                throw new Error('Call not found');
            }

            // Update status
            callData.status = status;
            callData.lastStateUpdate = new Date().toISOString();
            callData.stateVersion++;

            this.activeCalls.set(callId, callData);

            // Broadcast real-time state update
            this.broadcastCallState(callId, callData, 'status-update');

            console.log(`✅ Call status updated: ${callId} -> ${status} by ${userId}`);

            return {
                success: true,
                data: {
                    callId,
                    status,
                    stateVersion: callData.stateVersion
                }
            };
        } catch (error) {
            console.error('❌ Failed to update call status:', error);
            throw error;
        }
    }

    /**
     * Record call on blockchain with IPFS storage
     * @param {Object} callData - Call data to record
     */
    async recordCallOnBlockchain(callData) {
        try {
            console.log(`🔗 Recording call ${callData.callId} on blockchain...`);
            
            // Prepare call metadata for IPFS storage
            const callMetadata = {
                callId: callData.callId,
                callerId: callData.callerId,
                receiverId: callData.receiverId,
                callerRole: callData.callerRole,
                receiverRole: callData.receiverRole,
                callType: callData.callType,
                duration: callData.duration,
                startTime: callData.startTime,
                endTime: callData.endTime,
                status: callData.status,
                endedBy: callData.endedBy,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            // Store call metadata on IPFS
            console.log(`📤 Uploading call metadata to IPFS...`);
            const metadataJson = JSON.stringify(callMetadata, null, 2);
            const ipfsResult = await this.pinataIPFSService.uploadData(metadataJson, `call-metadata-${callId}.json`, {
                callId: callId,
                type: 'call-metadata'
            });
            const ipfsHash = ipfsResult.ipfsHash;
            console.log(`✅ Call metadata uploaded to IPFS: ${ipfsHash}`);

            // Create a unique record ID for the call
            const callRecordId = `call_${callData.callId}`;

            // Store call record using the existing blockchain service
            // We'll use the health record contract to store call metadata
            const blockchainResult = await this.blockchainService.addHealthRecord(
                callData.receiverId, // patientId (receiver)
                callData.callerId,   // doctorId (caller)
                metadataJson,        // healthData (call metadata)
                { type: 'call_record', callId: callData.callId } // metadata
            );

            console.log(`✅ Call ${callData.callId} recorded on blockchain successfully`);
            console.log(`🔗 Transaction hash: ${blockchainResult.transactionHash}`);
            console.log(`📄 Data hash: ${blockchainResult.dataHash}`);
            console.log(`📄 Metadata hash: ${blockchainResult.metadataHash}`);

            // Update call data with blockchain information
            callData.blockchainRecordId = callRecordId;
            callData.blockchainTransactionHash = blockchainResult.transactionHash;
            callData.ipfsHash = ipfsHash;
            callData.blockchainDataHash = blockchainResult.dataHash;
            callData.blockchainMetadataHash = blockchainResult.metadataHash;

            // Update the call in history
            this.callHistory.set(callData.callId, callData);

            return {
                success: true,
                recordId: callRecordId,
                transactionHash: blockchainResult.transactionHash,
                ipfsHash: ipfsHash,
                dataHash: blockchainResult.dataHash,
                metadataHash: blockchainResult.metadataHash
            };

        } catch (error) {
            console.error('❌ Failed to record call on blockchain:', error);
            
            // Return a fallback record for failed blockchain operations
            return {
                success: false,
                error: error.message,
                fallbackRecord: {
                    callId: callData.callId,
                    timestamp: new Date().toISOString(),
                    status: 'blockchain_failed'
                }
            };
        }
    }

    /**
     * Get call data
     * @param {string} callId - Call ID
     * @returns {Object} - Call data
     */
    async getCall(callId) {
        try {
            const callData = this.activeCalls.get(callId) || this.callHistory.get(callId);
            if (!callData) {
                throw new Error('Call not found');
            }

            return {
                success: true,
                data: callData
            };
        } catch (error) {
            console.error('❌ Failed to get WebRTC call:', error);
            throw error;
        }
    }

    /**
     * Get active call for a user
     * @param {string} userId - User ID
     * @returns {Object|null} - Active call data or null
     */
    async getActiveCall(userId) {
        try {
            for (const [callId, callData] of this.activeCalls) {
                if (callData.callerId === userId || callData.receiverId === userId) {
                    return {
                        success: true,
                        data: callData
                    };
                }
            }

            return {
                success: true,
                data: null
            };
        } catch (error) {
            console.error('❌ Failed to get active WebRTC call:', error);
            throw error;
        }
    }

    /**
     * Get call history between two users
     * @param {string} user1Id - First user ID
     * @param {string} user2Id - Second user ID
     * @returns {Array} - Call history
     */
    async getCallHistoryBetweenUsers(user1Id, user2Id) {
        try {
            const calls = [];
            for (const [callId, callData] of this.callHistory) {
                if ((callData.callerId === user1Id && callData.receiverId === user2Id) ||
                    (callData.callerId === user2Id && callData.receiverId === user1Id)) {
                    calls.push(callData);
                }
            }

            // Sort by creation date (newest first)
            calls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return calls;
        } catch (error) {
            console.error('❌ Failed to get WebRTC call history:', error);
            throw error;
        }
    }

    /**
     * Get all calls for a user
     * @param {string} userId - User ID
     * @returns {Array} - User's call history
     */
    async getUserCallHistory(userId) {
        try {
            const calls = [];
            for (const [callId, callData] of this.callHistory) {
                if (callData.callerId === userId || callData.receiverId === userId) {
                    calls.push(callData);
                }
            }

            // Sort by creation date (newest first)
            calls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return calls;
        } catch (error) {
            console.error('❌ Failed to get user WebRTC call history:', error);
            throw error;
        }
    }

    /**
     * Get call statistics
     * @returns {Object} - Call statistics
     */
    async getCallStats() {
        try {
            const totalCalls = this.callHistory.size;
            const activeCalls = this.activeCalls.size;
            let totalDuration = 0;
            let voiceCalls = 0;
            let videoCalls = 0;

            for (const [callId, callData] of this.callHistory) {
                totalDuration += callData.duration || 0;
                if (callData.callType === 'voice') {
                    voiceCalls++;
                } else if (callData.callType === 'video') {
                    videoCalls++;
                }
            }

            return {
                success: true,
                data: {
                    totalCalls,
                    activeCalls,
                    totalDuration,
                    voiceCalls,
                    videoCalls,
                    averageDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
                }
            };
        } catch (error) {
            console.error('❌ Failed to get WebRTC call stats:', error);
            throw error;
        }
    }

    /**
     * Store user session for signaling
     * @param {string} userId - User ID
     * @param {string} sessionId - Session ID
     * @param {string} callId - Call ID
     */
    storeUserSession(userId, sessionId, callId) {
        this.userSessions.set(userId, { sessionId, callId });
        console.log(`📞 Stored user session: ${userId} -> ${sessionId} (call: ${callId})`);
    }

    /**
     * Get user session
     * @param {string} userId - User ID
     * @returns {Object|null} - User session data
     */
    getUserSession(userId) {
        return this.userSessions.get(userId) || null;
    }

    /**
     * Store signaling data for WebRTC connection
     * @param {string} callId - Call ID
     * @param {Object} signalData - Signaling data
     */
    storeSignalingData(callId, signalData) {
        const callData = this.activeCalls.get(callId);
        if (callData) {
            callData.signalingData.push(signalData);
            this.activeCalls.set(callId, callData);
            console.log(`📞 Stored signaling data for call: ${callId}`);
        }
    }

    /**
     * Get signaling data for a call
     * @param {string} callId - Call ID
     * @returns {Array} - Signaling data array
     */
    getSignalingData(callId) {
        const callData = this.activeCalls.get(callId);
        return callData ? callData.signalingData : [];
    }

    /**
     * Get call records from blockchain for a user
     * @param {string} userId - User ID
     * @param {string} userRole - User role (doctor/patient)
     * @returns {Array} - Call records from blockchain
     */
    async getCallRecordsFromBlockchain(userId, userRole) {
        try {
            console.log(`🔍 Retrieving call records from blockchain for ${userRole}: ${userId}`);
            
            // Get health records from blockchain (which include call records)
            const records = await this.blockchainService.getHealthRecordsForUser(userId, userRole);
            
            // Filter for call records
            const callRecords = [];
            for (const record of records) {
                try {
                    // Check if this is a call record by examining metadata
                    if (record.metadata && record.metadata.type === 'call_record') {
                        // Try to get the call data from IPFS
                        let callData = null;
                        try {
                            const ipfsResult = await this.pinataIPFSService.getData(record.dataHash);
                            const ipfsData = ipfsResult.success ? ipfsResult.data : null;
                            callData = JSON.parse(ipfsData);
                        } catch (ipfsError) {
                            console.warn(`⚠️ Could not retrieve call data from IPFS for record ${record.recordId}`);
                            // Use basic record data as fallback
                            callData = {
                                callId: record.metadata.callId,
                                timestamp: record.timestamp,
                                status: 'blockchain_record'
                            };
                        }
                        
                        callRecords.push({
                            ...callData,
                            blockchainRecordId: record.recordId,
                            blockchainTransactionHash: record.transactionHash,
                            ipfsDataUrl: record.ipfsDataUrl,
                            ipfsMetadataUrl: record.ipfsMetadataUrl
                        });
                    }
                } catch (recordError) {
                    console.warn(`⚠️ Error processing record ${record.recordId}:`, recordError);
                }
            }
            
            console.log(`✅ Found ${callRecords.length} call records from blockchain for ${userId}`);
            return callRecords;
            
        } catch (error) {
            console.error('❌ Failed to get call records from blockchain:', error);
            return [];
        }
    }
}

module.exports = WebRTCCallService;
