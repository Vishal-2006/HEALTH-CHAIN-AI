import io from 'socket.io-client';

class RealTimeCallService {
    constructor() {
        this.socket = null;
        this.callSubscriptions = new Map(); // Track subscriptions per call
        this.stateListeners = new Map(); // Track state change listeners
        this.isConnected = false;
        this.serverUrl = 'http://localhost:5001';
    }

    /**
     * Connect to the real-time server
     * @param {string} userId - User ID
     * @returns {Promise} - Connection promise
     */
    async connect(userId) {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.serverUrl);
                
                this.socket.on('connect', () => {
                    console.log('🔌 Connected to real-time call service');
                    this.isConnected = true;
                    
                    // Join user's personal room
                    this.socket.emit('join-user-room', { userId });
                    
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    console.log('🔌 Disconnected from real-time call service');
                    this.isConnected = false;
                });

                this.socket.on('error', (error) => {
                    console.error('❌ Real-time call service error:', error);
                    reject(error);
                });

                // Handle call state updates
                this.socket.on('call-state-update', (data) => {
                    this.handleCallStateUpdate(data);
                });

                // Handle call state responses
                this.socket.on('call-state-response', (data) => {
                    this.handleCallStateResponse(data);
                });

            } catch (error) {
                console.error('❌ Failed to connect to real-time call service:', error);
                reject(error);
            }
        });
    }

    /**
     * Disconnect from the real-time server
     */
    disconnect() {
        if (this.socket) {
            // Unsubscribe from all calls
            this.callSubscriptions.forEach((callId, userId) => {
                this.unsubscribeFromCall(callId, userId);
            });
            
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.callSubscriptions.clear();
            this.stateListeners.clear();
            
            console.log('🔌 Disconnected from real-time call service');
        }
    }

    /**
     * Subscribe to real-time updates for a specific call
     * @param {string} callId - Call ID
     * @param {string} userId - User ID
     * @param {Function} onStateChange - Callback for state changes
     */
    subscribeToCall(callId, userId, onStateChange) {
        if (!this.isConnected || !this.socket) {
            console.error('❌ Not connected to real-time service');
            return;
        }

        // Store the subscription
        this.callSubscriptions.set(callId, userId);
        
        // Store the state change listener
        if (!this.stateListeners.has(callId)) {
            this.stateListeners.set(callId, new Set());
        }
        this.stateListeners.get(callId).add(onStateChange);

        // Subscribe to the call
        this.socket.emit('subscribe-to-call', { callId, userId });
        
        console.log(`📞 Subscribed to real-time updates for call ${callId}`);
    }

    /**
     * Unsubscribe from real-time updates for a specific call
     * @param {string} callId - Call ID
     * @param {string} userId - User ID
     */
    unsubscribeFromCall(callId, userId) {
        if (!this.isConnected || !this.socket) {
            return;
        }

        // Remove subscription
        this.callSubscriptions.delete(callId);
        
        // Remove state listeners
        this.stateListeners.delete(callId);

        // Unsubscribe from the call
        this.socket.emit('unsubscribe-from-call', { callId, userId });
        
        console.log(`📞 Unsubscribed from real-time updates for call ${callId}`);
    }

    /**
     * Get current call state
     * @param {string} callId - Call ID
     * @returns {Promise} - Call state promise
     */
    async getCallState(callId) {
        if (!this.isConnected || !this.socket) {
            throw new Error('Not connected to real-time service');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout getting call state'));
            }, 5000);

            const handleResponse = (data) => {
                clearTimeout(timeout);
                this.socket.off('call-state-response', handleResponse);
                
                if (data.success) {
                    resolve(data.data);
                } else {
                    reject(new Error(data.error || 'Failed to get call state'));
                }
            };

            this.socket.on('call-state-response', handleResponse);
            this.socket.emit('get-call-state', { callId });
        });
    }

    /**
     * Update call status
     * @param {string} callId - Call ID
     * @param {string} status - New status
     * @param {string} userId - User ID
     * @returns {Promise} - Update promise
     */
    async updateCallStatus(callId, status, userId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/call/${callId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status, userId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update call status');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Failed to update call status:', error);
            throw error;
        }
    }

    /**
     * Handle incoming call state updates
     * @param {Object} data - State update data
     */
    handleCallStateUpdate(data) {
        const { callId, state, eventType, timestamp } = data;
        console.log(`📞 Received call state update for ${callId}:`, { eventType, timestamp });

        // Notify all listeners for this call
        const listeners = this.stateListeners.get(callId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(state, eventType, timestamp);
                } catch (error) {
                    console.error('❌ Error in call state listener:', error);
                }
            });
        }
    }

    /**
     * Handle call state responses
     * @param {Object} data - Response data
     */
    handleCallStateResponse(data) {
        console.log('📞 Received call state response:', data);
        // This is handled by the getCallState promise
    }

    /**
     * Create a call with real-time state management
     * @param {Object} callData - Call creation data
     * @returns {Promise} - Call creation promise
     */
    async createCall(callData) {
        try {
            const response = await fetch(`${this.serverUrl}/api/call/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(callData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create call');
            }

            const result = await response.json();
            
            // Subscribe to real-time updates for the new call
            if (result.success && result.data) {
                this.subscribeToCall(result.data.callId, callData.callerId, (state, eventType) => {
                    console.log(`📞 Call ${result.data.callId} state update:`, eventType, state);
                });
            }

            return result;
        } catch (error) {
            console.error('❌ Failed to create call:', error);
            throw error;
        }
    }

    /**
     * Answer a call with real-time state management
     * @param {string} callId - Call ID
     * @param {string} receiverId - Receiver ID
     * @returns {Promise} - Answer promise
     */
    async answerCall(callId, receiverId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/call/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ callId, receiverId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to answer call');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Failed to answer call:', error);
            throw error;
        }
    }

    /**
     * End a call with real-time state management
     * @param {string} callId - Call ID
     * @param {string} userId - User ID
     * @returns {Promise} - End call promise
     */
    async endCall(callId, userId) {
        try {
            const response = await fetch(`${this.serverUrl}/api/call/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ callId, userId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to end call');
            }

            const result = await response.json();
            
            // Unsubscribe from real-time updates
            this.unsubscribeFromCall(callId, userId);
            
            return result;
        } catch (error) {
            console.error('❌ Failed to end call:', error);
            throw error;
        }
    }

    /**
     * Get connection status
     * @returns {boolean} - Connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Get active subscriptions
     * @returns {Array} - Active subscriptions
     */
    getActiveSubscriptions() {
        return Array.from(this.callSubscriptions.entries()).map(([callId, userId]) => ({
            callId,
            userId
        }));
    }
}

// Create singleton instance
const realTimeCallService = new RealTimeCallService();

export default realTimeCallService;
