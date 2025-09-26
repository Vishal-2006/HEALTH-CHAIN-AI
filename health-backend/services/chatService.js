const IPFSService = require('./ipfsService');

class ChatService {
    constructor() {
        this.ipfsService = new IPFSService();
        this.activeChats = new Map(); // Store active chat sessions
        this.messageHistory = new Map(); // Cache for recent messages
    }

    // Initialize chat service
    async initialize() {
        try {
            await this.ipfsService.initialize();
            console.log('✅ Chat service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize chat service:', error);
        }
    }

    // Send a message from sender to receiver
    async sendMessage(senderId, receiverId, message, senderRole) {
        try {
            console.log(`💬 ChatService.sendMessage called with:`, { senderId, receiverId, message: message.substring(0, 30) + '...', senderRole });
            
            const timestamp = new Date().toISOString();
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const messageData = {
                messageId,
                senderId,
                receiverId,
                senderRole,
                message: message.trim(),
                timestamp,
                isRead: false
            };

            console.log(`💬 Message data created:`, messageData);

            // Store message on IPFS
            console.log(`💬 Uploading message to IPFS...`);
            const ipfsResult = await this.ipfsService.uploadJSON(messageData);
            console.log(`💬 IPFS upload result:`, ipfsResult);
            
            // Create chat session key (sorted to ensure consistency)
            const chatKey = this.getChatKey(senderId, receiverId);
            console.log(`💬 Chat key:`, chatKey);
            
            // Update message history
            if (!this.messageHistory.has(chatKey)) {
                this.messageHistory.set(chatKey, []);
                console.log(`💬 Created new chat session:`, chatKey);
            }
            
            const chatMessages = this.messageHistory.get(chatKey);
            chatMessages.push({
                ...messageData,
                ipfsHash: ipfsResult.hash,
                ipfsUrl: ipfsResult.gatewayUrl
            });
            
            console.log(`💬 Message added to chat history. Total messages in chat:`, chatMessages.length);

            console.log(`✅ Message sent: ${senderId} → ${receiverId}`);
            
            return {
                success: true,
                messageId,
                timestamp,
                ipfsHash: ipfsResult.hash,
                ipfsUrl: ipfsResult.gatewayUrl
            };
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    // Get chat history between two users
    async getChatHistory(user1Id, user2Id) {
        try {
            const chatKey = this.getChatKey(user1Id, user2Id);
            
            // First check cache
            if (this.messageHistory.has(chatKey)) {
                const cachedMessages = this.messageHistory.get(chatKey);
                console.log(`✅ Retrieved ${cachedMessages.length} messages from cache for chat ${chatKey}`);
                return cachedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            }

            // If not in cache, try to load from IPFS (for future implementation)
            console.log(`📋 No cached messages for chat ${chatKey}, returning empty array`);
            return [];
            
        } catch (error) {
            console.error('❌ Failed to get chat history:', error);
            return [];
        }
    }

    // Get all chats for a user (both as sender and receiver)
    async getUserChats(userId) {
        try {
            const userChats = [];
            
            // Get all chat sessions where user is involved
            for (const [chatKey, messages] of this.messageHistory) {
                const [user1, user2] = chatKey.split('|');
                if (user1 === userId || user2 === userId) {
                    // Get the other user's ID
                    const otherUserId = user1 === userId ? user2 : user1;
                    
                    // Get the last message
                    const lastMessage = messages[messages.length - 1];
                    
                    userChats.push({
                        chatKey,
                        otherUserId,
                        lastMessage: lastMessage ? {
                            message: lastMessage.message,
                            timestamp: lastMessage.timestamp,
                            senderId: lastMessage.senderId
                        } : null,
                        messageCount: messages.length
                    });
                }
            }
            
            // Sort by last message timestamp
            userChats.sort((a, b) => {
                if (!a.lastMessage && !b.lastMessage) return 0;
                if (!a.lastMessage) return 1;
                if (!b.lastMessage) return -1;
                return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
            });
            
            console.log(`✅ Retrieved ${userChats.length} chats for user ${userId}`);
            return userChats;
            
        } catch (error) {
            console.error('❌ Failed to get user chats:', error);
            return [];
        }
    }

    // Mark messages as read
    async markMessagesAsRead(userId, senderId) {
        try {
            const chatKey = this.getChatKey(userId, senderId);
            
            if (this.messageHistory.has(chatKey)) {
                const messages = this.messageHistory.get(chatKey);
                let updated = false;
                
                for (const message of messages) {
                    if (message.receiverId === userId && !message.isRead) {
                        message.isRead = true;
                        updated = true;
                    }
                }
                
                if (updated) {
                    console.log(`✅ Marked messages as read for chat ${chatKey}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to mark messages as read:', error);
        }
    }

    // Get unread message count for a user
    async getUnreadCount(userId) {
        try {
            let unreadCount = 0;
            
            for (const [chatKey, messages] of this.messageHistory) {
                for (const message of messages) {
                    if (message.receiverId === userId && !message.isRead) {
                        unreadCount++;
                    }
                }
            }
            
            return unreadCount;
            
        } catch (error) {
            console.error('❌ Failed to get unread count:', error);
            return 0;
        }
    }

    // Helper method to create consistent chat key
    getChatKey(user1Id, user2Id) {
        // Sort IDs to ensure consistent key regardless of sender/receiver order
        const sortedIds = [user1Id, user2Id].sort();
        return `${sortedIds[0]}|${sortedIds[1]}`;
    }

    // Check if two users can chat (patient must have granted access to doctor)
    async canChat(patientId, doctorId, patientRole, doctorRole) {
        try {
            // Only allow chat between patients and doctors
            if (patientRole !== 'patient' || doctorRole !== 'doctor') {
                console.log(`❌ Chat denied: Invalid roles - ${patientRole} ↔ ${doctorRole}`);
                return false;
            }
            
            // For now, we'll assume they can chat if they're both registered
            // In a real implementation, you'd check the permissions from the blockchain service
            console.log(`✅ Chat permission check: ${patientId} (${patientRole}) ↔ ${doctorId} (${doctorRole})`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to check chat permissions:', error);
            return false;
        }
    }
}

module.exports = ChatService;
