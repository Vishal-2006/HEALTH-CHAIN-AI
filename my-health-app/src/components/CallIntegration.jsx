import React, { useState } from 'react';
import { Phone, Video, MoreHorizontal } from 'lucide-react';
import CallSelection from './CallSelection';
import WebRTCVoiceCall from './WebRTCVoiceCall';
import WebRTCVideoCall from './WebRTCVideoCall';

const CallIntegration = ({ user, selectedUser, className = "" }) => {
  const [showCallSelection, setShowCallSelection] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [activeCallType, setActiveCallType] = useState(null);

  const handleStartCall = (callType) => {
    setActiveCallType(callType);
    setShowCallSelection(false);
    
    if (callType === 'voice') {
      setShowVoiceCall(true);
    } else if (callType === 'video') {
      setShowVideoCall(true);
    }
  };

  const handleCloseCall = () => {
    setShowVoiceCall(false);
    setShowVideoCall(false);
    setActiveCallType(null);
  };

  const handleQuickCall = (callType) => {
    setActiveCallType(callType);
    if (callType === 'voice') {
      setShowVoiceCall(true);
    } else if (callType === 'video') {
      setShowVideoCall(true);
    }
  };

  if (!selectedUser) {
    return null;
  }

  return (
    <>
      {/* Call Buttons */}
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Quick Voice Call Button */}
        <button
          onClick={() => handleQuickCall('voice')}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
          title="Voice Call"
        >
          <Phone size={16} />
        </button>

        {/* Quick Video Call Button */}
        <button
          onClick={() => handleQuickCall('video')}
          className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          title="Video Call"
        >
          <Video size={16} />
        </button>

        {/* More Options Button */}
        <button
          onClick={() => setShowCallSelection(true)}
          className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
          title="More Options"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Call Selection Modal */}
      {showCallSelection && (
        <CallSelection
          user={user}
          selectedUser={selectedUser}
          onClose={() => setShowCallSelection(false)}
          onStartCall={handleStartCall}
        />
      )}

      {/* Voice Call Modal */}
      {showVoiceCall && (
        <WebRTCVoiceCall
          user={user}
          selectedCallUser={selectedUser}
          onClose={handleCloseCall}
        />
      )}

      {/* Video Call Modal */}
      {showVideoCall && (
        <WebRTCVideoCall
          user={user}
          selectedCallUser={selectedUser}
          onClose={handleCloseCall}
        />
      )}
    </>
  );
};

export default CallIntegration;
