# Agora Calling System Setup Guide

This guide will help you set up the Agora calling system for both voice and video calls in your HealthChain AI application.

## ✅ Implementation Status

**COMPLETE IMPLEMENTATION** - The Agora calling system is now fully implemented with:

- ✅ **Backend**: Real AgoraCallService with token generation and call management
- ✅ **Frontend**: AgoraVoiceCall and AgoraVideoCall components with real Agora SDK
- ✅ **Integration**: CallIntegration component for easy dashboard integration
- ✅ **API Endpoints**: Complete call management and history APIs

## Prerequisites

1. **Agora Account**: Sign up at [Agora.io](https://www.agora.io/)
2. **Node.js**: Version 16 or higher
3. **React**: Version 18 or higher

## Step 1: Get Agora Credentials

1. Go to [Agora Console](https://console.agora.io/)
2. Create a new project or select an existing one
3. Navigate to **Project Management** > **Project List**
4. Copy your **App ID** and **App Certificate**

## Step 2: Configure Environment Variables

Create or update your `.env` file in the `health-backend` directory:

```env
# Existing variables
MONGODB_URI=mongodb://localhost:27017
DB_NAME=healthchain

# Agora credentials (REQUIRED for real calls)
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
```

## Step 3: Install Dependencies

### Backend Dependencies
The backend dependencies are already included in `package.json`:
- `agora-access-token`: For generating secure tokens
- `uuid`: For generating unique call IDs

### Frontend Dependencies
Install the Agora SDK in your React app:

```bash
cd my-health-app
npm install agora-rtc-sdk-ng
```

## Step 4: Integration

### Option 1: Use CallIntegration Component (Recommended)

Add the `CallIntegration` component to your existing dashboards:

```jsx
import CallIntegration from './components/CallIntegration';

// In your dashboard component
<CallIntegration 
  user={currentUser} 
  selectedUser={selectedDoctor} 
  className="mt-2"
/>
```

### Option 2: Direct Component Usage

Use the call components directly:

```jsx
import AgoraVoiceCall from './components/AgoraVoiceCall';
import AgoraVideoCall from './components/AgoraVideoCall';

// For voice calls
<AgoraVoiceCall 
  user={currentUser} 
  selectedCallUser={selectedUser} 
  onClose={() => setShowCall(false)} 
/>

// For video calls
<AgoraVideoCall 
  user={currentUser} 
  selectedCallUser={selectedUser} 
  onClose={() => setShowCall(false)} 
/>
```

## Step 5: Testing

### Test Voice Calls
1. Start the backend server: `cd health-backend && npm start`
2. Start the frontend application: `cd my-health-app && npm start`
3. Log in as a doctor and patient
4. Try initiating a voice call using the CallIntegration component
5. Check browser console for Agora logs

### Test Video Calls
1. Ensure camera and microphone permissions are granted
2. Try initiating a video call
3. Verify both local and remote video streams

## Step 6: Production Deployment

### Security Considerations
1. **Never expose App Certificate** in frontend code
2. **Use HTTPS** in production
3. **Implement proper authentication** before generating tokens
4. **Set appropriate token expiration times**

### Environment Variables
For production, set these environment variables:
```env
AGORA_APP_ID=your_production_app_id
AGORA_APP_CERTIFICATE=your_production_certificate
NODE_ENV=production
```

## API Endpoints

### Call Management
- `POST /api/call/create` - Create voice call
- `POST /api/call/create-video` - Create video call
- `POST /api/call/answer` - Answer call
- `POST /api/call/end` - End call
- `POST /api/call/tokens` - Get call tokens

### Call History
- `GET /api/call/history/:user1Id/:user2Id` - Get call history between users
- `GET /api/call/user/:userId` - Get user's call history
- `GET /api/call/active/:userId` - Get active call for user
- `GET /api/call/stats` - Get call statistics

## Features Implemented

### ✅ Backend Features
- **Real Agora Token Generation**: Secure tokens for each call session
- **Call Session Management**: Track active calls and call history
- **Call Statistics**: Monitor call usage and performance
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Proper authentication and authorization

### ✅ Frontend Features
- **Real-time Voice Calls**: High-quality audio using Agora SDK
- **Real-time Video Calls**: HD video with picture-in-picture
- **Call Controls**: Mute, speaker toggle, video toggle
- **Call Duration**: Real-time call duration display
- **Fullscreen Support**: Video calls support fullscreen mode
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on desktop and mobile

### ✅ Integration Features
- **Easy Integration**: Simple CallIntegration component
- **Quick Call Buttons**: One-click voice and video calls
- **Call Selection**: Modal for choosing call type
- **User Information**: Display user details before calling

## Troubleshooting

### Common Issues

1. **"Agora credentials not configured"**
   - Check your `.env` file
   - Ensure AGORA_APP_ID and AGORA_APP_CERTIFICATE are set

2. **"Failed to get call tokens"**
   - Verify your Agora credentials
   - Check network connectivity
   - Ensure the call exists in the system

3. **"Failed to initialize Agora call"**
   - Check browser console for detailed errors
   - Ensure camera/microphone permissions are granted
   - Verify Agora SDK is properly installed

4. **"No audio/video"**
   - Check device permissions
   - Verify device selection
   - Check browser compatibility

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Device Requirements
- **Voice Calls**: Microphone
- **Video Calls**: Camera and microphone
- **Network**: Stable internet connection (minimum 100kbps for voice, 500kbps for video)

## Advanced Features

### Screen Sharing
To add screen sharing to video calls:

```javascript
// Create screen share track
const screenTrack = await AgoraRTC.createScreenVideoTrack();

// Publish screen track
await client.publish(screenTrack);
```

### Recording
To enable call recording:

```javascript
// Start recording
await client.startRecording({
  recordingConfig: {
    streamTypes: 2, // Audio and video
    channelType: 1, // Live broadcast
    maxIdleTime: 30,
    subscribeAudioUids: ["*"],
    subscribeVideoUids: ["*"]
  }
});
```

### Quality Optimization
For better call quality:

```javascript
// Set video encoder configuration
await localVideoTrack.setEncoderConfiguration({
  width: 640,
  height: 480,
  bitrateMin: 400,
  bitrateMax: 1000,
  frameRate: 15
});
```

## Support

For additional help:
- [Agora Documentation](https://docs.agora.io/)
- [Agora Community](https://www.agora.io/en/community)
- [HealthChain AI Issues](https://github.com/your-repo/issues)

---

**🎉 Congratulations!** Your Agora calling system is now fully implemented and ready for production use. The system provides secure, high-quality voice and video calls with comprehensive call management features.
