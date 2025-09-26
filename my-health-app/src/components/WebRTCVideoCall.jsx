import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, ArrowLeft, Clock, Maximize2, Minimize2 } from 'lucide-react';
import Peer from 'simple-peer-light';
import realTimeCallService from '../services/realTimeCallService';

const WebRTCVideoCall = ({ user, onClose, selectedCallUser = null, isIncoming = false, incomingCallData = null }) => {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'initiating');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callData, setCallData] = useState(null);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const durationIntervalRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);

  // Check device availability before initializing call
  const checkDeviceAvailability = async () => {
    try {
      console.log('🔍 Checking device availability...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }
      
      // List available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log(`📹 Found ${videoDevices.length} video device(s):`, videoDevices.map(d => d.label || 'Unknown'));
      console.log(`🎤 Found ${audioDevices.length} audio device(s):`, audioDevices.map(d => d.label || 'Unknown'));
      
      if (videoDevices.length === 0 && audioDevices.length === 0) {
        throw new Error('No camera or microphone devices found');
      }
      
      return { videoDevices, audioDevices };
    } catch (error) {
      console.error('❌ Device availability check failed:', error);
      throw error;
    }
  };

  // Request device permissions with better error handling
  const requestDevicePermissions = async () => {
    try {
      console.log('🔐 Requesting device permissions...');
      
      // Try to get a minimal stream to trigger permission request
      const testStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // Immediately stop the test stream
      testStream.getTracks().forEach(track => track.stop());
      
      console.log('✅ Device permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Device permission request failed:', error);
      
      if (error.name === 'NotAllowedError') {
        const errorMessage = 'Camera/microphone access was denied. ' +
          'Please allow access in your browser settings and refresh the page. ' +
          'You can also try clicking the camera/microphone icon in your browser\'s address bar.';
        setError(errorMessage);
      } else {
        setError('Failed to access camera/microphone: ' + error.message);
      }
      
      return false;
    }
  };

  // Initialize call when component mounts
  useEffect(() => {
    const initializeRealTimeCall = async () => {
      try {
        // Connect to real-time service
        await realTimeCallService.connect(user.id);
        console.log('🔌 Connected to real-time call service');
        
        // Check device availability before proceeding
        try {
          await checkDeviceAvailability();
          
          // Request permissions early to avoid issues during call
          const permissionsGranted = await requestDevicePermissions();
          if (!permissionsGranted) {
            console.warn('⚠️ Device permissions not granted, but continuing...');
          }
        } catch (deviceError) {
          console.warn('⚠️ Device availability warning:', deviceError.message);
          // Continue anyway, as the user might want to try audio-only
        }
        
        if (isIncoming && incomingCallData) {
          // Ensure we have a valid callId
          const callDataWithId = {
            ...incomingCallData,
            callId: incomingCallData.callId || incomingCallData.id || null
          };
          
          console.log('📞 Incoming video call data received:', incomingCallData);
          console.log('📞 Processed call data:', callDataWithId);
          
          if (!callDataWithId.callId) {
            console.error('❌ No valid callId found in incoming call data');
            setError('Invalid call ID - missing call identifier');
            return;
          }
          
          setCallData(callDataWithId);
          setCallStatus('incoming');
          console.log('📞 Incoming video call initialized with callId:', callDataWithId.callId);
          
          // Subscribe to real-time updates for this call
          realTimeCallService.subscribeToCall(callDataWithId.callId, user.id, (state, eventType) => {
            console.log(`📞 Real-time state update for video call ${callDataWithId.callId}:`, eventType, state);
            handleRealTimeStateUpdate(state, eventType);
          });
          
          // Store call state in localStorage for cross-tab synchronization
          localStorage.setItem('activeCall', JSON.stringify({
            callId: callDataWithId.callId,
            userId: user.id,
            timestamp: new Date().toISOString()
          }));
        } else if (selectedCallUser) {
          console.log('📞 Initiating outgoing video call to:', selectedCallUser);
          initiateCall();
        }

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

  // Sync track states periodically when call is connected
  useEffect(() => {
    let syncInterval;
    if (callStatus === 'connected' && localStream) {
      syncInterval = setInterval(syncTrackStates, 2000); // Sync every 2 seconds
    }

    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [callStatus, localStream, isMuted, isVideoEnabled]);

  // Handle real-time state updates
  const handleRealTimeStateUpdate = (state, eventType) => {
    console.log(`📞 Real-time state update: ${eventType}`, state);
    
    switch (eventType) {
      case 'call-answered':
        if (state.status === 'connected') {
          setCallStatus('connected');
          setCallData(state);
          setError(null); // Clear any errors when call connects
          console.log('📞 Video call answered via real-time update');
        }
        break;
        
      case 'call-ended':
        if (state.status === 'ended') {
          console.log('📞 Video call ended via real-time update');
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
        
      case 'connection-lost':
        console.log('📞 Connection lost, attempting recovery...');
        setError('Connection lost. Attempting to reconnect...');
        // Try to reconnect after a delay
        setTimeout(() => {
          if (callData?.callId && callStatus === 'connected') {
            console.log('🔄 Attempting to reconnect...');
            // Reinitialize the connection
            initializeWebRTCConnection(callData.callId, false).catch(err => {
              console.error('❌ Reconnection failed:', err);
              setError('Reconnection failed. Please try again.');
            });
          }
        }, 2000);
        break;
        
      default:
        console.log(`📞 Unknown real-time event: ${eventType}`);
    }
  };

  const cleanupWebRTC = async () => {
    try {
      console.log('🧹 Starting WebRTC cleanup...');
      
      // Clean up local stream and release device access
      if (localStream) {
        console.log('📹 Stopping local stream tracks...');
        localStream.getTracks().forEach(track => {
          console.log(`🛑 Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        });
        setLocalStream(null);
        console.log('✅ Local stream cleaned up');
      }
      
      // Clean up remote stream
      if (remoteStream) {
        console.log('📹 Cleaning up remote stream...');
        remoteStream.getTracks().forEach(track => {
          track.stop();
        });
        setRemoteStream(null);
        console.log('✅ Remote stream cleaned up');
      }
      
      // Clean up peer connection
      if (peer) {
        console.log('🔗 Destroying peer connection...');
        peer.destroy();
        setPeer(null);
        console.log('✅ Peer connection destroyed');
      }
      
      // Clean up socket connection
      if (socket) {
        console.log('🔌 Disconnecting socket...');
        socket.disconnect();
        setSocket(null);
        console.log('✅ Socket disconnected');
      }
      
      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Force garbage collection hint (optional)
      if (window.gc) {
        window.gc();
      }
      
      console.log('✅ WebRTC cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Error during WebRTC cleanup:', error);
    }
  };

  // Sync track states with UI state
  const syncTrackStates = () => {
    try {
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        const videoTracks = localStream.getVideoTracks();
        
        if (audioTracks.length > 0) {
          const actualMutedState = !audioTracks[0].enabled;
          if (actualMutedState !== isMuted) {
            console.log('🎤 Syncing mute state:', actualMutedState);
            setIsMuted(actualMutedState);
          }
        }
        
        if (videoTracks.length > 0) {
          const actualVideoState = videoTracks[0].enabled;
          if (actualVideoState !== isVideoEnabled) {
            console.log('📹 Syncing video state:', actualVideoState);
            setIsVideoEnabled(actualVideoState);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error syncing track states:', error);
    }
  };

  // Audio-only fallback method
  const initializeAudioOnlyCall = async (callId) => {
    try {
      console.log('🎤 Initializing audio-only call as fallback...');
      
      // Clean up any existing streams first
      await cleanupWebRTC();
      
      // Get audio-only stream
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      setLocalStream(audioStream);
      console.log('✅ Audio-only stream obtained');
      
      // Connect to signaling server
      const socketInstance = realTimeCallService.socket;
      setSocket(socketInstance);
      
      // Join call room
      socketInstance.emit('join-call', { callId, userId: user.id });
      
      // Create WebRTC peer for audio-only
      const peerInstance = new Peer({
        initiator: false,
        trickle: false,
        stream: audioStream
      });
      setPeer(peerInstance);
      
      // Handle incoming audio stream
      peerInstance.on('stream', (remoteAudioStream) => {
        console.log('🎤 Received remote audio stream');
        setRemoteStream(remoteAudioStream);
      });
      
      // Handle peer connection events
      peerInstance.on('connect', () => {
        console.log('✅ Audio-only WebRTC peer connected');
        setCallStatus('connected');
      });
      
      peerInstance.on('error', (err) => {
        console.error('❌ Audio-only WebRTC peer error:', err);
        setError('Audio connection error: ' + err.message);
      });
      
      // Handle signaling
      peerInstance.on('signal', (signalData) => {
        console.log('📡 Sending audio signal data');
        socketInstance.emit('signal', { callId, signalData, userId: user.id });
      });
      
      socketInstance.on('signal', (data) => {
        console.log('📡 Received audio signal data');
        if (data.userId !== user.id) {
          peerInstance.signal(data.signalData);
        }
      });
      
      console.log('✅ Audio-only call initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize audio-only call:', error);
      setError('Failed to initialize audio call: ' + error.message);
    }
  };

  const initiateCall = async () => {
    try {
      console.log('📞 Starting video call initiation process...');
      setCallStatus('initiating');
      setError(null); // Clear any previous errors
      
      // Use real-time service to create call
      const result = await realTimeCallService.createCall({
        callerId: user.id,
        receiverId: selectedCallUser.id,
        callerRole: user.role,
        receiverRole: user.role === 'doctor' ? 'patient' : 'doctor',
        callType: 'video' // Specify this is a video call
      });

      if (result.success && result.data) {
        console.log('📞 Video call creation successful:', result);
        
        if (!result.data.callId) {
          console.error('❌ Backend response missing callId:', result);
          setError('Backend error: No call ID received');
          return;
        }
        
        setCallData(result.data);
        setCallStatus('ringing');
        
        // Subscribe to real-time updates for this call
        realTimeCallService.subscribeToCall(result.data.callId, user.id, (state, eventType) => {
          console.log(`📞 Real-time state update for video call ${result.data.callId}:`, eventType, state);
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
        console.log('📞 Waiting for receiver to answer video call...');
        
        // Set a timeout to handle cases where the call doesn't get answered
        setTimeout(() => {
          if (callStatus === 'ringing') {
            console.log('⏰ Video call timeout - no answer received, ending call');
            setError('Call timeout - no answer received');
            endCall();
          }
        }, 30000); // 30 seconds timeout
      } else {
        console.error('❌ Video call creation failed:', result);
        setError(result.error || 'Failed to initiate video call');
      }
    } catch (error) {
      console.error('Failed to initiate video call:', error);
      setError('Network error: Unable to initiate video call');
    }
  };

  const answerCall = async (callId, retryAttempt = 0) => {
    try {
      console.log(`📞 Answering video call (attempt ${retryAttempt + 1}):`, callId);
      
      if (!callId) {
        console.error('❌ No callId provided for answer call');
        setError('Invalid call ID - cannot answer call');
        return;
      }
      
      // First, verify the call still exists before trying to answer it
      console.log('📞 Verifying video call exists before answering...');
      try {
        const callState = await realTimeCallService.getCallState(callId);
        console.log('📞 Video call verification successful:', callState);
      } catch (error) {
        console.error('❌ Video call verification failed:', error);
        if (retryAttempt < 2) {
          console.log(`🔄 Video call not found, retrying in 1 second (attempt ${retryAttempt + 1})...`);
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
        console.log('✅ Video call answered successfully');
        setCallStatus('connected');
        
        // Initialize WebRTC connection for the receiver with retry logic
        try {
          await initializeWebRTCConnection(callId, false);
        } catch (webrtcError) {
          console.error('❌ WebRTC initialization failed during answer:', webrtcError);
          
          // If device is in use, provide helpful guidance
          if (webrtcError.message.includes('Device in use')) {
            setError('Camera/microphone is in use. Please close other video applications and try again. You can also try answering as audio-only.');
            
            // Offer audio-only fallback
            setTimeout(() => {
              if (confirm('Would you like to try answering as audio-only call?')) {
                // Try audio-only initialization
                initializeAudioOnlyCall(callId);
              }
            }, 2000);
            return;
          } else {
            setError('Failed to initialize video call: ' + webrtcError.message);
            return;
          }
        }
        
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
        console.error('❌ Failed to answer video call:', result);
        
        // Provide more specific error messages
        if (result.error && result.error.includes('not found')) {
          if (retryAttempt < 2) {
            console.log(`🔄 Video call not found, retrying in 1 second (attempt ${retryAttempt + 1})...`);
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
            setError(result.error || 'Failed to answer video call');
          }
        }
        
        // Log the full error for debugging
        console.log('📞 Full error response:', result);
      }
    } catch (error) {
      console.error('Failed to answer video call:', error);
      setError('Network error: Unable to answer video call');
    }
  };

  const initializeWebRTCConnection = async (callId, isInitiator) => {
    try {
      console.log('📹 Initializing WebRTC video call...');
      console.log('📞 Call ID:', callId);
      console.log('👤 Is Initiator:', isInitiator);
      
      // First, ensure any existing streams are properly cleaned up
      if (localStream) {
        console.log('🧹 Cleaning up existing local stream...');
        localStream.getTracks().forEach(track => {
          track.stop();
        });
        setLocalStream(null);
      }
      
      // Get user media (camera and microphone) with enhanced error handling and retry logic
      let stream;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`📹 Attempting to get user media (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          
          // Try video + audio first
          if (retryCount === 0) {
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true, 
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
              }
            });
            console.log('✅ Video + audio stream obtained successfully');
          } 
          // Try audio-only as fallback
          else if (retryCount === 1) {
            console.log('📹 Video failed, trying audio-only fallback...');
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: true, 
              video: false 
            });
            console.log('✅ Audio-only stream obtained successfully');
          }
          // Final fallback - try with minimal constraints
          else {
            console.log('📹 Trying with minimal media constraints...');
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { echoCancellation: true, noiseSuppression: true },
              video: { 
                width: { min: 320, ideal: 640, max: 1280 },
                height: { min: 240, ideal: 480, max: 720 },
                frameRate: { min: 15, ideal: 24, max: 30 }
              }
            });
            console.log('✅ Stream obtained with minimal constraints');
          }
          
          break; // Success, exit retry loop
          
        } catch (mediaError) {
          console.error(`❌ Media access error (attempt ${retryCount + 1}):`, mediaError);
          
          // If this is the last attempt, throw a detailed error
          if (retryCount === maxRetries) {
            let errorMessage = 'Unable to access camera/microphone. ';
            
            if (mediaError.name === 'NotAllowedError') {
              errorMessage += 'Access denied. Please allow camera/microphone permissions in your browser settings and try again.';
            } else if (mediaError.name === 'NotFoundError') {
              errorMessage += 'No camera or microphone found. Please check your device connections.';
            } else if (mediaError.name === 'NotReadableError' || mediaError.message.includes('Device in use')) {
              errorMessage += 'Device is in use by another application. Please close other video/audio applications (Zoom, Teams, etc.) and try again.';
            } else if (mediaError.name === 'OverconstrainedError') {
              errorMessage += 'Device does not meet requirements. Please check your camera/microphone settings.';
            } else if (mediaError.name === 'AbortError') {
              errorMessage += 'Media access was aborted. Please try again.';
            } else if (mediaError.name === 'SecurityError') {
              errorMessage += 'Media access blocked for security reasons. Please check your browser security settings.';
            } else {
              errorMessage += `Technical error: ${mediaError.message}`;
            }
            
            throw new Error(errorMessage);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
      }
      
      // Verify we have a valid stream
      if (!stream || !stream.getTracks().length) {
        throw new Error('Failed to obtain valid media stream. Please check your device permissions.');
      }
      
      setLocalStream(stream);
      
      // Play local video in the small window
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
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
        console.log('📹 Received remote video stream');
        setRemoteStream(remoteStreamData);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamData;
        }
      });

      // Handle peer connection events
      peerInstance.on('connect', () => {
        console.log('✅ WebRTC peer connected');
        setCallStatus('connected');
        setError(null); // Clear any previous errors
      });

      peerInstance.on('error', (err) => {
        console.error('❌ WebRTC peer error:', err);
        setError('WebRTC connection error: ' + err.message);
      });

      peerInstance.on('close', () => {
        console.log('🔌 WebRTC peer connection closed');
        setCallStatus('ended');
      });

      peerInstance.on('iceStateChange', (state) => {
        console.log('🧊 ICE connection state changed:', state);
        if (state === 'failed' || state === 'disconnected') {
          setError('Connection lost. Trying to reconnect...');
        }
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

      console.log('✅ WebRTC video call initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize WebRTC video call:', error);
      
      // Provide specific guidance for device in use error
      if (error.message.includes('Device in use')) {
        const errorMessage = 'Camera/microphone is currently in use by another application. ' +
          'Please close other video/audio applications (Zoom, Teams, Skype, etc.) and try again. ' +
          'You can also try refreshing the page or restarting your browser.';
        setError(errorMessage);
        
        // Show additional help after a delay
        setTimeout(() => {
          if (confirm('Would you like to try audio-only mode instead?')) {
            // Try to initialize audio-only call
            if (callId) {
              initializeAudioOnlyCall(callId);
            }
          }
        }, 3000);
      } else {
        setError('Failed to initialize video call: ' + error.message);
      }
    }
  };

  const endCall = async () => {
    console.log('📞 Ending video call:', callData?.callId, 'by user:', user.id, 'status:', callStatus);
    
    // Clear any existing active call from localStorage immediately
    localStorage.removeItem('activeCall');
    
    try {
      // Always try to send end request to backend using real-time service
      if (callData?.callId) {
        console.log('📞 Sending video call end request to backend...');
        const result = await realTimeCallService.endCall(callData.callId, user.id);
        
        if (result.success) {
          console.log('✅ Video call end request successful');
          console.log('📞 Backend response:', result);
        } else {
          console.error('❌ Video call end request failed:', result);
        }
      } else {
        console.log('⚠️ No callId available, proceeding with local cleanup only');
      }
    } catch (error) {
      console.error('Failed to end video call:', error);
    } finally {
      console.log('🧹 Cleaning up WebRTC and closing video call');
      await cleanupWebRTC();
      setCallStatus('ended');
      
      // Clear active call from localStorage
      localStorage.removeItem('activeCall');
      console.log('🗑️ Cleared active call from localStorage');
      
      // Force close after a short delay
      setTimeout(() => {
        console.log('🚪 Closing video call modal');
        onClose();
      }, 1000);
    }
  };

  const toggleMute = () => {
    try {
      console.log('🎤 Toggling mute, current state:', isMuted);
      
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioTrack = audioTracks[0];
          const newEnabledState = !audioTrack.enabled;
          
          console.log('🎤 Audio track found, setting enabled to:', newEnabledState);
          audioTrack.enabled = newEnabledState;
          setIsMuted(!newEnabledState);
          
          // Log the actual state for debugging
          console.log('🎤 Audio track enabled after toggle:', audioTrack.enabled);
        } else {
          console.warn('🎤 No audio tracks found in local stream');
          setIsMuted(!isMuted);
        }
      } else {
        console.warn('🎤 No local stream available for mute toggle');
        setIsMuted(!isMuted);
      }
    } catch (error) {
      console.error('❌ Error toggling mute:', error);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    try {
      console.log('📹 Toggling video, current state:', isVideoEnabled);
      
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          const videoTrack = videoTracks[0];
          const newEnabledState = !videoTrack.enabled;
          
          console.log('📹 Video track found, setting enabled to:', newEnabledState);
          videoTrack.enabled = newEnabledState;
          setIsVideoEnabled(newEnabledState);
          
          // Log the actual state for debugging
          console.log('📹 Video track enabled after toggle:', videoTrack.enabled);
          
          // Update video element visibility
          if (localVideoRef.current) {
            localVideoRef.current.style.display = newEnabledState ? 'block' : 'none';
          }
        } else {
          console.warn('📹 No video tracks found in local stream');
          setIsVideoEnabled(!isVideoEnabled);
        }
      } else {
        console.warn('📹 No local stream available for video toggle');
        setIsVideoEnabled(!isVideoEnabled);
      }
    } catch (error) {
      console.error('❌ Error toggling video:', error);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleSpeaker = () => {
    try {
      console.log('🔊 Toggling speaker, current state:', isSpeakerOn);
      
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = newSpeakerState;
        console.log('🔊 Remote video muted state set to:', newSpeakerState);
      }
      
      // Also try to control audio output if possible
      if (remoteStream) {
        const audioTracks = remoteStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = newSpeakerState;
        });
        console.log('🔊 Remote audio tracks enabled:', newSpeakerState);
      }
    } catch (error) {
      console.error('❌ Error toggling speaker:', error);
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
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
        return 'Initiating video call...';
      case 'ringing':
        return 'Calling...';
      case 'incoming':
        return 'Incoming video call...';
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Call ended';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-black flex flex-col z-50 ${isFullscreen ? '' : 'bg-opacity-90'}`}
    >
      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0 bg-gray-900">
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">{selectedCallUser?.name?.charAt(0) || 'U'}</span>
                </div>
                <p className="text-xl font-semibold">{selectedCallUser?.name || 'Unknown'}</p>
                <p className="text-gray-300">{getStatusText()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ display: isVideoEnabled ? 'block' : 'none' }}
          />
          {(!localVideoRef.current?.srcObject || !isVideoEnabled) && (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <span className="text-white text-lg">{user.name?.charAt(0) || 'U'}</span>
            </div>
          )}
        </div>

                 {/* Call Duration */}
         {callStatus === 'connected' && (
           <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full flex items-center gap-2">
             <Clock size={16} />
             <span className="font-mono">{formatDuration(callDuration)}</span>
           </div>
         )}

         {/* Debug Info (only in development) */}
         {process.env.NODE_ENV === 'development' && (
           <div className="absolute bottom-20 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-xs">
             <div>Status: {callStatus}</div>
             <div>Muted: {isMuted ? 'Yes' : 'No'}</div>
             <div>Video: {isVideoEnabled ? 'On' : 'Off'}</div>
             <div>Local Stream: {localStream ? 'Yes' : 'No'}</div>
             <div>Remote Stream: {remoteStream ? 'Yes' : 'No'}</div>
           </div>
         )}

                 {/* Error Message */}
         {error && (
           <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg max-w-md text-center">
             <div className="flex items-center justify-center gap-2 mb-2">
               <span className="text-sm font-semibold">⚠️ {error}</span>
             </div>
             {error.includes('Device in use') && (
               <button 
                 onClick={() => {
                   setError(null);
                   if (callData?.callId) {
                     initializeWebRTCConnection(callData.callId, false);
                   }
                 }}
                 className="text-xs bg-white text-red-500 px-2 py-1 rounded hover:bg-gray-100"
               >
                 Retry
               </button>
             )}
           </div>
         )}
      </div>

      {/* Call Controls */}
      <div className="bg-black bg-opacity-50 p-6">
        <div className="flex justify-center items-center gap-4">
                     {/* Mute Button */}
           <button
             onClick={toggleMute}
             className={`p-4 rounded-full transition-colors duration-200 ${
               isMuted 
                 ? 'bg-red-500 text-white hover:bg-red-600' 
                 : 'bg-gray-700 text-white hover:bg-gray-600'
             }`}
             title={isMuted ? 'Unmute' : 'Mute'}
           >
             {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
           </button>

           {/* Video Toggle Button */}
           <button
             onClick={toggleVideo}
             className={`p-4 rounded-full transition-colors duration-200 ${
               !isVideoEnabled 
                 ? 'bg-red-500 text-white hover:bg-red-600' 
                 : 'bg-gray-700 text-white hover:bg-gray-600'
             }`}
             title={!isVideoEnabled ? 'Turn on video' : 'Turn off video'}
           >
             {!isVideoEnabled ? <VideoOff size={24} /> : <Video size={24} />}
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
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-4 bg-gray-700 text-white rounded-full hover:bg-gray-600"
          >
            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
          </button>
        </div>

        {/* Answer/Reject Buttons for Incoming Calls */}
        {callStatus === 'incoming' && (
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => answerCall(incomingCallData.callId)}
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
      </div>

      {/* Close Button (only when not fullscreen) */}
      {!isFullscreen && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
        >
          <ArrowLeft size={20} />
        </button>
      )}
    </div>
  );
};

export default WebRTCVideoCall;
