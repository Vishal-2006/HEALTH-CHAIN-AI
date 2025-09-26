import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, ArrowLeft, Phone, Video } from 'lucide-react';
import CallIntegration from './CallIntegration';

const ChatComponent = ({ user, onClose, selectedChatUser = null }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(selectedChatUser);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user's chats
  useEffect(() => {
    loadUserChats();
    loadUnreadCount();
  }, [user.id]);

  // Load chat history when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      loadChatHistory();
      markMessagesAsRead();
    }
  }, [selectedChat]);

  const loadUserChats = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/chat/user/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!selectedChat) return;
    
    setLoading(true);
    try {
      console.log('💬 Loading chat history for:', user.id, selectedChat.id);
      const response = await fetch(`http://localhost:5001/api/chat/history/${user.id}/${selectedChat.id}`);
      console.log('💬 Chat history response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('💬 Chat history data:', data);
        setMessages(data.messages || []);
      } else {
        console.error('💬 Failed to load chat history, status:', response.status);
      }
    } catch (error) {
      console.error('💬 Error loading chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/chat/unread/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedChat) return;
    
    try {
      await fetch('http://localhost:5001/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          senderId: selectedChat.id
        })
      });
      
      // Reload unread count
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat) return;

    const messageToSend = message.trim();
    setMessage('');

    console.log('💬 Sending message:', {
      senderId: user.id,
      receiverId: selectedChat.id,
      message: messageToSend,
      senderRole: user.role
    });

    try {
      const response = await fetch('http://localhost:5001/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: selectedChat.id,
          message: messageToSend,
          senderRole: user.role
        })
      });

      console.log('💬 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('💬 Message sent successfully:', result);
        
        // Add message to local state immediately for real-time feel
        const newMessage = {
          messageId: `temp-${Date.now()}`,
          senderId: user.id,
          receiverId: selectedChat.id,
          senderRole: user.role,
          message: messageToSend,
          timestamp: new Date().toISOString(),
          isRead: false
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // Reload chat history to get the actual message from server
        setTimeout(() => {
          loadChatHistory();
        }, 100);
      } else {
        const errorData = await response.json();
        console.error('💬 Failed to send message:', errorData);
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('💬 Network error sending message:', error);
      alert('Network error: Unable to send message. Please check your connection.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <MessageCircle size={24} className="text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chat</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {selectedChat && (
              <CallIntegration 
                user={user} 
                selectedUser={selectedChat}
                className="ml-2"
              />
            )}
          </div>

        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Conversations</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start chatting with your healthcare providers</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.chatKey}
                    onClick={() => setSelectedChat({ id: chat.otherUserId, name: chat.otherUserId })}
                    className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedChat?.id === chat.otherUserId ? 'bg-blue-50 dark:bg-blue-900' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {chat.otherUserId}
                        </p>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {chat.lastMessage.message}
                          </p>
                        )}
                      </div>
                      {chat.messageCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {chat.messageCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-600 dark:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {selectedChat.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.role === 'doctor' ? 'Patient' : 'Doctor'}
                        </p>
                      </div>
                    </div>
                    <CallIntegration 
                      user={user} 
                      selectedUser={selectedChat}
                    />
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-sm">Start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isOwnMessage = msg.senderId === user.id;
                      const showDate = index === 0 || 
                        formatDate(msg.timestamp) !== formatDate(messages[index - 1].timestamp);

                      return (
                        <div key={msg.messageId}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full">
                                {formatDate(msg.timestamp)}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isOwnMessage
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      

    </div>
  );
};

export default ChatComponent;
