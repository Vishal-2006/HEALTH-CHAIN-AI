import React, { useState } from 'react';
import { Phone, Video, X, User } from 'lucide-react';

const CallSelection = ({ user, selectedUser, onClose, onStartCall }) => {
  const [selectedCallType, setSelectedCallType] = useState(null);

  const handleCallTypeSelect = (callType) => {
    setSelectedCallType(callType);
    onStartCall(callType);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Start a Call
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="text-blue-600 dark:text-blue-300" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedUser?.name || 'Unknown User'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 capitalize">
            {selectedUser?.role || 'User'}
          </p>
          {selectedUser?.specialization && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {selectedUser.specialization}
            </p>
          )}
        </div>

        {/* Call Type Options */}
        <div className="space-y-3">
          {/* Voice Call Option */}
          <button
            onClick={() => handleCallTypeSelect('voice')}
            className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                <Phone className="text-blue-600 dark:text-blue-300" size={24} />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Voice Call
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Audio-only conversation
                </p>
              </div>
            </div>
          </button>

          {/* Video Call Option */}
          <button
            onClick={() => handleCallTypeSelect('video')}
            className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                <Video className="text-green-600 dark:text-green-300" size={24} />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Video Call
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Face-to-face conversation
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Call Features */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
            Call Features:
          </h5>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• Secure end-to-end encryption</li>
            <li>• High-quality audio/video</li>
            <li>• Screen sharing (video calls)</li>
            <li>• Call recording (if permitted)</li>
            <li>• Background noise reduction</li>
          </ul>
        </div>

        {/* Cancel Button */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallSelection;
