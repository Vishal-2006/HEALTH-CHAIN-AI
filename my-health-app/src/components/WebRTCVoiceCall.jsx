import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ArrowLeft, Clock } from 'lucide-react';
import Peer from 'simple-peer-light';
import realTimeCallService from '../services/realTimeCallService';

const WebRTCVoiceCall = ({ user, onClose, selectedCallUser = null, isIncoming = false, incomingCallData = null }) => {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'initiating');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callData, setCallData] = useState(null);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const durationIntervalRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callEndTimeoutRef = useRef(null);
  const callSyncTimeoutRef = useRef(null);

  // Initialize call when component mounts
  useEffect(() => {
    const initializeRealTimeCall = async () => {
      try {
        // Connect to real-time service
        await realTimeCallService.connect(user.id);
        console.log('🔌 Connected to real-time call service');
        
        // Check if there's already an active call
        const existingActiveCall = localStorage.getItem('activeCall');
        if (existingActiveCall) {
          try {
            const activeCallData = JSON.parse(existingActiveCall);
            console.log('📞 Found existing active call:', activeCallData);
            
            // Only clear localStorage if it's a different call or if we're starting a new outgoing call
            if (activeCallData.callId && activeCallData.userId === user.id) {
              if (selectedCallUser) {
                // We're starting a new outgoing call, so clear the existing one
                console.log('🔄 Starting new outgoing call, clearing existing call state...');
                localStorage.removeItem('activeCall');
              } else if (isIncoming && incomingCallData) {
                // We're receiving an incoming call, check if it's the same call
                const incomingCallId = incomingCallData.callId || incomingCallData.id;
                if (incomingCallId !== activeCallData.callId) {
                  console.log('🔄 Different incoming call received, clearing existing call state...');
                  localStorage.removeItem('activeCall');
                }
              }
            }
          } catch (error) {
            console.error('Error parsing existing active call:', error);
            localStorage.removeItem('activeCall');
          }
        }
        
        if (isIncoming && incomingCallData) {
          // Ensure we have a valid callId
          const callDataWithId = {
            ...incomingCallData,
            callId: incomingCallData.callId || incomingCallData.id || null
          };
          
          console.log('📞 Incoming call data received:', incomingCallData);
          console.log('📞 Processed call data:', callDataWithId);
          
          if (!callDataWithId.callId) {
            console.error('❌ No valid callId found in incoming call data');
            setError('Invalid call ID - missing call identifier');
            return;
          }
          
          setCallData(callDataWithId);
          setCallStatus('incoming');
          console.log('📞 Incoming call initialized with callId:', callDataWithId.callId);
          
          // Subscribe to real-time updates for this call
          realTimeCallService.subscribeToCall(callDataWithId.callId, user.id, (state, eventType) => {
            console.log(`📞 Real-time state update for call ${callDataWithId.callId}:`, eventType, state);
            handleRealTimeStateUpdate(state, eventType);
          });
          
          // Store call state in localStorage for cross-tab synchronization
          localStorage.setItem('activeCall', JSON.stringify({
            callId: callDataWithId.callId,
            userId: user.id,
            timestamp: new Date().toISOString()
          }));
        } else if (selectedCallUser) {
          console.log('📞 Initiating outgoing call to:', selectedCallUser);
          initiateCall();
        }

        // Get available audio devices
        const getAudioDevices = async () => {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            setAudioDevices(audioInputs);
            if (audioInputs.length > 0) {
              setSelectedAudioDevice(audioInputs[0].deviceId);
            }
          } catch (error) {
            console.error('Failed to get audio devices:', error);
          }
        };
        getAudioDevices();

      } catch (error) {
        console.error('❌ Failed to initialize real-time call service:', error);
        setError('Failed to connect to call service');
      }
    };

    initializeRealTimeCall();

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (callEndTimeoutRef.current) {
        clearTimeout(callEndTimeoutRef.current);
      }
      cleanupWebRTC();
      
      // Unsubscribe from real-time updates
      if (callData?.callId) {
        realTimeCallService.unsubscribeFromCall(callData.callId, user.id);
      }
    };
  }, [isIncoming, incomingCallData, selectedCallUser]);

  // Start duration timer when call connects
  useEffect(() => {
    if (callStatus === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  const cleanupWebRTC = async () => {
    try {
      console.log('🧹 Starting WebRTC cleanup...');
      
      // Clear all timeouts
      if (callEndTimeoutRef.current) {
        clearTimeout(callEndTimeoutRef.current);
        callEndTimeoutRef.current = null;
      }
      
      if (callSyncTimeoutRef.current) {
        clearTimeout(callSyncTimeoutRef.current);
        callSyncTimeoutRef.current = null;
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        console.log('🎤 Local stream stopped');
      }
      if (peer) {
        peer.destroy();
        setPeer(null);
        console.log('🔗 Peer connection destroyed');
      }
      if (socket) {
        socket.disconnect();
        setSocket(null);
        console.log('🔌 Socket disconnected');
      }
      
      console.log('✅ WebRTC cleanup completed');
    } catch (error) {
      console.error('Error cleaning up WebRTC:', error);
    }
  };

  // Handle real-time state updates
  const handleRealTimeStateUpdate = (state, eventType) => {
    console.log(`📞 Real-time state update: ${eventType}`, state);
    
    switch (eventType) {
      case 'call-answered':
        if (state.status === 'connected') {
          setCallStatus('connected');
          setCallData(state);
          console.log('📞 Call answered via real-time update');
        }
        break;
        
      case 'call-ended':
        if (state.status === 'ended') {
          console.log('📞 Call ended via real-time update');
          endCall();
        }
        break;
        
      case 'status-update':
        setCallStatus(state.status);
        setCallData(state);
        console.log(`📞 Status updated via real-time: ${state.status}`);
        break;
        
      case 'state-change':
        setCallData(state);
        console.log('📞 Call state changed via real-time update');
        break;
        
      default:
        console.log(`📞 Unknown real-time event: ${eventType}`);
    }
  };

  const checkAndEndExistingCalls = async () => {
    try {
      // Check if there are any active calls in the backend
      const response = await fetch(`http://localhost:5001/api/call/user/${user.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const activeCall = result.data.find(call => 
            call.status === 'initiating' || call.status === 'ringing' || call.status === 'connected'
          );
          if (activeCall) {
            console.log('🔄 Found existing active call, ending it:', activeCall.callId);
            await realTimeCallService.endCall(activeCall.callId, user.id);
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing calls:', error);
    }
  };

  const initiateCall = async () => {
    try {
      console.log('📞 Starting call initiation process...');
      setCallStatus('initiating');
      setError(null); // Clear any previous errors
      
      // End any existing calls first
      await checkAndEndExistingCalls();
      
      // Use real-time service to create call
      const result = await realTimeCallService.createCall({
        callerId: user.id,
        receiverId: selectedCallUser.id,
        callerRole: user.role,
        receiverRole: user.role === 'doctor' ? 'patient' : 'doctor'
      });

      if (result.success && result.data) {
        console.log('📞 Call creation successful:', result);
        
        if (!result.data.callId) {
          console.error('❌ Backend response missing callId:', result);
          
          // Retry logic for call creation
          if (retryCount < 3) {
            console.log(`🔄 Retrying call creation (attempt ${retryCount + 1}/3)...`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              initiateCall();
            }, 1000);
            return;
          } else {
            setError('Backend error: No call ID received after retries');
            return;
          }
        }
        
        setCallData(result.data);
        setCallStatus('ringing');
        
        // Subscribe to real-time updates for this call
        realTimeCallService.subscribeToCall(result.data.callId, user.id, (state, eventType) => {
          console.log(`📞 Real-time state update for call ${result.data.callId}:`, eventType, state);
          handleRealTimeStateUpdate(state, eventType);
        });
        
        // Store call state in localStorage for cross-tab synchronization
        localStorage.setItem('activeCall', JSON.stringify({
          callId: result.data.callId,
          userId: user.id,
          timestamp: new Date().toISOString()
        }));
        
        // Initialize WebRTC connection
        await initializeWebRTCConnection(result.data.callId, true);
        
        // Wait for the receiver to answer the call instead of auto-answering
        console.log('📞 Waiting for receiver to answer call...');
        
        // Set a timeout to handle cases where the call doesn't get answered
        callSyncTimeoutRef.current = setTimeout(() => {
          if (callStatus === 'ringing') {
            console.log('⏰ Call timeout - no answer received, ending call');
            setError('Call timeout - no answer received');
            endCall();
          }
        }, 30000); // 30 seconds timeout
      } else {
        console.error('❌ Call creation failed:', result);
        setError(result.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setError('Network error: Unable to initiate call');
    }
  };

  const answerCall = async (callId, retryAttempt = 0) => {
    try {
      console.log(`📞 Answering call (attempt ${retryAttempt + 1}):`, callId);
      
      if (!callId) {
        console.error('❌ No callId provided for answer call');
        setError('Invalid call ID - cannot answer call');
        return;
      }
      
      // First, verify the call still exists before trying to answer it
      console.log('📞 Verifying call exists before answering...');
      try {
        const callState = await realTimeCallService.getCallState(callId);
        console.log('📞 Call verification successful:', callState);
      } catch (error) {
        console.error('❌ Call verification failed:', error);
        if (retryAttempt < 2) {
          console.log(`🔄 Call not found, retrying in 1 second (attempt ${retryAttempt + 1})...`);
          setTimeout(() => {
            answerCall(callId, retryAttempt + 1);
          }, 1000);
          return;
        } else {
          setError('Call was ended before you could answer it');
          return;
        }
      }
      
      // Use real-time service to answer call
      const result = await realTimeCallService.answerCall(callId, user.id);

      if (result.success) {
        console.log('✅ Call answered successfully');
        setCallStatus('connected');
        
        // Initialize WebRTC connection for the receiver
        await initializeWebRTCConnection(callId, false);
        
        // Update call data with the answered status
        setCallData(prev => ({
          ...prev,
          status: 'connected',
          answeredAt: new Date().toISOString()
        }));
        
        // Clear any other active calls from localStorage
        localStorage.removeItem('activeCall');
        localStorage.setItem('activeCall', JSON.stringify({
          callId: callId,
          userId: user.id,
          timestamp: new Date().toISOString()
        }));
      } else {
        console.error('❌ Failed to answer call:', result);
        
        // Provide more specific error messages
        if (result.error && result.error.includes('not found')) {
          if (retryAttempt < 2) {
            console.log(`🔄 Call not found, retrying in 1 second (attempt ${retryAttempt + 1})...`);
            setTimeout(() => {
              answerCall(callId, retryAttempt + 1);
            }, 1000);
            return;
          } else {
            setError('Call was ended before you could answer it');
          }
        } else if (result.error && result.error.includes('Unauthorized')) {
          setError('You are not authorized to answer this call');
        } else if (result.error && result.error.includes('already answered')) {
          setError('Call has already been answered');
        } else {
          if (retryAttempt < 2) {
            console.log(`🔄 Answer failed, retrying in 1 second (attempt ${retryAttempt + 1})...`);
            setTimeout(() => {
              answerCall(callId, retryAttempt + 1);
            }, 1000);
            return;
          } else {
            setError(result.error || 'Failed to answer call');
          }
        }
        
        // Log the full error for debugging
        console.log('📞 Full error response:', result);
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
      setError('Network error: Unable to answer call');
    }
  };

  const initializeWebRTCConnection = async (callId, isInitiator) => {
    try {
      console.log('🔊 Initializing WebRTC voice call...');
      console.log('📞 Call ID:', callId);
      console.log('👤 Is Initiator:', isInitiator);
      
      if (!callId) {
        console.error('❌ No callId provided for WebRTC initialization');
        setError('Invalid call ID');
        return;
      }
      
      // Get user media (microphone) with echo cancellation
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      };
      
      // Use selected audio device if available
      if (selectedAudioDevice) {
        audioConstraints.deviceId = { exact: selectedAudioDevice };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints,
        video: false 
      });
      setLocalStream(stream);
      
      // Play local audio (muted to avoid feedback/echo)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
        localAudioRef.current.volume = 0; // Ensure no local audio playback
      }

      // Connect to signaling server using real-time service
      const socketInstance = realTimeCallService.socket;
      setSocket(socketInstance);

      // Join call room
      socketInstance.emit('join-call', { callId, userId: user.id });

      // Create WebRTC peer
      const peerInstance = new Peer({
        initiator: isInitiator,
        trickle: false,
        stream: stream
      });
      setPeer(peerInstance);

      // Handle incoming stream
      peerInstance.on('stream', (remoteStreamData) => {
        console.log('🔊 Received remote audio stream');
        setRemoteStream(remoteStreamData);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamData;
          remoteAudioRef.current.volume = 0.8; // Set reasonable volume
          remoteAudioRef.current.muted = false; // Ensure remote audio plays
        }
      });

      // Handle peer connection events
      peerInstance.on('connect', () => {
        console.log('✅ WebRTC peer connected');
        setCallStatus('connected');
        
        // Set up a fallback timeout to ensure call ends properly
        callEndTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Call timeout reached, forcing call end');
          if (callStatus === 'connected') {
            endCall();
          }
        }, 300000); // 5 minutes timeout
      });

      peerInstance.on('error', (err) => {
        console.error('❌ WebRTC peer error:', err);
        setError('WebRTC connection error: ' + err.message);
      });

      // Handle signaling
      peerInstance.on('signal', (signalData) => {
        console.log('📡 Sending signal data');
        socketInstance.emit('signal', { callId, signalData, userId: user.id });
      });

      socketInstance.on('signal', (data) => {
        console.log('📡 Received signal data');
        if (data.userId !== user.id) {
          peerInstance.signal(data.signalData);
        }
      });

      // Handle user joined
      socketInstance.on('user-joined', (data) => {
        console.log('👤 User joined call:', data.userId);
      });

      // Handle user left
      socketInstance.on('user-left', (data) => {
        console.log('👤 User left call:', data.userId);
        if (callStatus === 'connected') {
          endCall();
        }
      });

      console.log('✅ WebRTC voice call initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize WebRTC call:', error);
      setError('Failed to initialize voice call: ' + error.message);
    }
  };

  const endCall = async () => {
    // Prevent multiple calls to endCall (but allow force ending)
    if (isEndingCall && callStatus !== 'connected') {
      console.log('📞 Call already ending or ended, ignoring endCall request');
      return;
    }
    
    console.log('📞 Ending call:', callData?.callId, 'by user:', user.id, 'status:', callStatus);
    setIsEndingCall(true);
    
    // Clear any existing active call from localStorage immediately
    localStorage.removeItem('activeCall');
    
    try {
      // Always try to send end request to backend using real-time service
      if (callData?.callId) {
        console.log('📞 Sending call end request to backend...');
        const result = await realTimeCallService.endCall(callData.callId, user.id);
        
        if (result.success) {
          console.log('✅ Call end request successful');
          console.log('📞 Backend response:', result);
        } else {
          console.error('❌ Call end request failed:', result);
        }
      } else {
        console.log('⚠️ No callId available, proceeding with local cleanup only');
      }
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      console.log('🧹 Cleaning up WebRTC and closing call');
      await cleanupWebRTC();
      setCallStatus('ended');
      
      // Clear active call from localStorage
      localStorage.removeItem('activeCall');
      console.log('🗑️ Cleared active call from localStorage');
      
      // Force close after a short delay
      setTimeout(() => {
        console.log('🚪 Closing call modal');
        onClose();
      }, 1000);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log(`🎤 Microphone ${audioTrack.enabled ? 'unmuted' : 'muted'}`);
      }
    } else {
      setIsMuted(!isMuted);
      console.log(`🎤 Microphone ${!isMuted ? 'unmuted' : 'muted'}`);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      // Toggle between speaker and earpiece
      if (isSpeakerOn) {
        // Switch to speaker
        remoteAudioRef.current.volume = 1.0;
        console.log('🔊 Switched to speaker');
      } else {
        // Switch to earpiece (lower volume)
        remoteAudioRef.current.volume = 0.6;
        console.log('🔊 Switched to earpiece');
      }
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'initiating':
        return 'Initiating call...';
      case 'ringing':
        return 'Calling...';
      case 'incoming':
        return 'Incoming call...';
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Call ended';
      default:
        return 'Unknown status';
    }
  };

  const validateCallState = () => {
    const issues = [];
    
    if (!callData?.callId && callStatus !== 'initiating') {
      issues.push('No call ID available');
    }
    
    if (isIncoming && !incomingCallData) {
      issues.push('Incoming call data missing');
    }
    
    if (!isIncoming && !selectedCallUser) {
      issues.push('Selected call user missing');
    }
    
    return issues;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Phone size={24} className="text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Voice Call</h2>
          </div>
        </div>

        {/* Call Status */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone size={32} className="text-blue-600 dark:text-blue-300" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {selectedCallUser?.name || incomingCallData?.callerName || incomingCallData?.callerId || 'Unknown'}
          </h3>
          
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {getStatusText()}
          </p>
          
          {callStatus === 'connected' && (
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
              <Clock size={16} />
              <span className="font-mono">{formatDuration(callDuration)}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex justify-center gap-4 mb-6">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full ${
              isMuted 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <PhoneOff size={24} />
          </button>

          {/* Speaker Button */}
          <button
            onClick={toggleSpeaker}
            className={`p-4 rounded-full ${
              isSpeakerOn 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

                           {/* Answer/Reject Buttons for Incoming Calls */}
          {callStatus === 'incoming' && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => answerCall(callData?.callId || incomingCallData?.callId)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <Phone size={20} />
                Answer
              </button>
              <button
                onClick={endCall}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <PhoneOff size={20} />
                Reject
              </button>
            </div>
          )}

                                       {/* Debug Information */}
           <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
             <div className="text-xs text-gray-500 mb-2">
               <div>Call ID: {callData?.callId || 'None'}</div>
               <div>Status: {callStatus}</div>
               <div>User: {user.id}</div>
               <div>Selected User: {selectedCallUser?.id || 'None'}</div>
               <div>Incoming Call: {incomingCallData ? 'Yes' : 'No'}</div>
               <div>Validation Issues: {validateCallState().join(', ') || 'None'}</div>
             </div>
            
            {/* Force End Call Button (for debugging) */}
            {callStatus === 'connected' && (
              <button
                onClick={() => {
                  console.log('🛠️ Force ending call...');
                  setIsEndingCall(false);
                  endCall();
                }}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm mb-2"
              >
                Force End Call (Debug)
              </button>
            )}
            
            {/* Debug Call State Button */}
            <button
              onClick={() => {
                console.log('🔍 Debug Call State:', {
                  callData,
                  callStatus,
                  isEndingCall,
                  user: user.id,
                  incomingCallData,
                  selectedCallUser,
                  retryCount
                });
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm mb-2"
            >
              Debug Call State
            </button>
            
                         {/* Manual Sync Button */}
             <button
               onClick={() => {
                 console.log('🔄 Manual call sync requested...');
                 if (callData?.callId) {
                   // Re-emit call state to ensure synchronization
                   if (socket) {
                     socket.emit('local-call-ended', {
                       callId: callData.callId,
                       userId: user.id,
                       timestamp: new Date().toISOString()
                     });
                   }
                   console.log('✅ Manual sync completed');
                 } else {
                   console.log('❌ No callId available for manual sync');
                 }
               }}
               className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm mb-2"
             >
               Manual Sync
             </button>
             
             {/* Retry Answer Button */}
             {callStatus === 'incoming' && error && (
               <button
                 onClick={() => {
                   console.log('🔄 Manually retrying answer...');
                   setError(null);
                   answerCall(callData?.callId || incomingCallData?.callId, 0);
                 }}
                 className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm mb-2"
               >
                 Retry Answer
               </button>
             )}
             
             {/* Clear All Call States Button */}
             <button
               onClick={() => {
                 console.log('🧹 Clearing all call states...');
                 localStorage.removeItem('activeCall');
                 
                 // End any active calls in the backend
                 fetch('http://localhost:5001/api/call/user/' + user.id)
                   .then(response => response.json())
                   .then(result => {
                     if (result.data && result.data.length > 0) {
                       result.data.forEach(call => {
                         if (call.status !== 'ended') {
                           fetch('http://localhost:5001/api/call/end', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({
                               callId: call.callId,
                               userId: user.id
                             })
                           });
                         }
                       });
                     }
                   })
                   .catch(error => {
                     console.error('Error clearing call states:', error);
                   });
                 
                 console.log('✅ All call states cleared');
               }}
               className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
             >
               Clear All Call States
             </button>
          </div>

        {/* Hidden Audio Elements */}
        <audio ref={localAudioRef} autoPlay muted />
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
};

export default WebRTCVoiceCall;
