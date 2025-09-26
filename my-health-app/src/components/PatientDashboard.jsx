import React, { useEffect, useState, useMemo } from 'react';
import { FileText, Shield, Upload, Plus, User, Activity, HeartPulse, Droplet, Gauge, CheckCircle, MessageCircle, Phone, Calendar, Clock, BookOpen, X } from 'lucide-react';
import HealthRecord from './HealthRecord';
import ChatComponent from './ChatComponent';
import CallIntegration from './CallIntegration';
import WebRTCVoiceCall from './WebRTCVoiceCall';
import WebRTCVideoCall from './WebRTCVideoCall';
import AppointmentBooking from './AppointmentBooking';
import AppointmentList from './AppointmentList';
import realTimeCallService from '../services/realTimeCallService';
import appointmentService from '../services/appointmentService';
import BlockchainStatus from './BlockchainStatus';

// Helper function to get appropriate icon for different metric types
const getMetricIcon = (metricName) => {
    const name = metricName.toLowerCase();
    if (name.includes('blood') && name.includes('sugar') || name.includes('glucose')) {
        return <Droplet size={20}/>;
    } else if (name.includes('blood') && name.includes('pressure') || name.includes('systolic') || name.includes('diastolic')) {
        return <Gauge size={20}/>;
    } else if (name.includes('cholesterol') || name.includes('lipid')) {
        return <Activity size={20}/>;
    } else if (name.includes('heart') && name.includes('rate') || name.includes('pulse')) {
        return <HeartPulse size={20}/>;
    } else if (name.includes('hemoglobin') || name.includes('hgb')) {
        return <Droplet size={20}/>;
    } else if (name.includes('temperature') || name.includes('temp')) {
        return <Activity size={20}/>;
    } else if (name.includes('weight')) {
        return <Activity size={20}/>;
    } else if (name.includes('height')) {
        return <Activity size={20}/>;
    } else if (name.includes('bmi')) {
        return <Activity size={20}/>;
    } else {
        return <Activity size={20}/>; // Default icon
    }
};

// Helper function to format metric labels
const formatMetricLabel = (metricName) => {
    // Convert camelCase to Title Case
    return metricName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

const Card = ({ children, title, icon, className = '' }) => (
  <div className={`dashboard-section ${className}`}>
    {title && 
        <h3 className="dashboard-section-title">
            {icon && React.cloneElement(icon, { className: "text-blue-500", size: 22 })}
            {title}
        </h3>
    }
    {children}
  </div>
);

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false, icon }) => {
  const variantClasses = {
    primary: 'button button-primary',
    danger: 'button button-danger',
    secondary: 'button button-secondary',
    outline: 'button button-secondary',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} ${className}`}
    >
      {icon && React.cloneElement(icon, { size: 18 })}
      {children}
    </button>
  );
};


// --- PATIENT DASHBOARD COMPONENT ---
const PatientDashboard = ({ user, records, setRecords, permissions, setPermissions }) => {
  console.log('PatientDashboard render - user:', user);
  console.log('PatientDashboard render - records:', records);
  console.log('PatientDashboard render - permissions:', permissions);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [allUsers, setAllUsers] = useState([]); // State to hold all users from backend
  const [allDoctors, setAllDoctors] = useState([]); // State to hold all doctors from backend
  const [showChat, setShowChat] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  
  // --- INCOMING CALL STATE ---
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallType, setIncomingCallType] = useState(null); // 'voice' or 'video'
  const [socket, setSocket] = useState(null);
  // ---------------------------

  // --- SETUP REAL-TIME CALL SERVICE FOR INCOMING CALLS ---
  useEffect(() => {
    const initializeRealTimeService = async () => {
      try {
        // Connect to real-time service
        await realTimeCallService.connect(user.id);
        console.log('🔌 Connected to real-time call service in PatientDashboard');

                  // Listen for incoming calls
          realTimeCallService.socket.on('incoming-call', (callData) => {
            console.log('📞 Incoming call received on PatientDashboard:', callData);
            console.log('📞 Current user ID:', user.id);
            
            // Determine call type from call data
            const callType = callData.callType || 'voice'; // Default to voice if not specified
            console.log('📞 Incoming call type:', callType);
            
            // Ensure we have a valid callId
            const validCallData = {
              ...callData,
              callId: callData.callId || callData.id || null
            };
            
            if (!validCallData.callId) {
              console.error('❌ Incoming call missing callId:', callData);
              return;
            }
            
            // Check if there's already an incoming call - but be more careful
            if (incomingCall) {
              // Check if it's the same call (which might be a duplicate event)
              if (incomingCall.callId === validCallData.callId) {
                console.log('📞 Same incoming call received again, ignoring duplicate event');
                return;
              } else {
                console.log('📞 Different incoming call received, rejecting new one');
                // Reject the new call automatically using real-time service
                realTimeCallService.endCall(validCallData.callId, user.id).catch(error => {
                  console.error('Error rejecting duplicate call:', error);
                });
                return;
              }
            }
            
            console.log('📞 Setting incoming call with valid callId:', validCallData.callId);
            setIncomingCall(validCallData);
            setIncomingCallType(callType);
            
            // Store call state in localStorage for cross-tab synchronization
            localStorage.setItem('activeCall', JSON.stringify({
              callId: validCallData.callId,
              userId: user.id,
              timestamp: new Date().toISOString()
            }));
          });

        // Listen for call ended
        realTimeCallService.socket.on('call-ended', (callData) => {
          console.log('📞 Call ended event received on PatientDashboard:', callData);
          console.log('📞 Current incoming call:', incomingCall);
          
          // Check if this call-ended event matches our current incoming call
          if (incomingCall && (callData.callId === incomingCall.callId || callData.callId === incomingCall.id)) {
            console.log('📞 Matching call ended, clearing incoming call state');
            setIncomingCall(null);
            setIncomingCallType(null);
          } else {
            console.log('📞 Call ended event received but no matching incoming call found');
          }
        });

        // Listen for call answered events to clear incoming call state
        realTimeCallService.socket.on('call-answered', (callData) => {
          console.log('📞 Call answered event received on PatientDashboard:', callData);
          
          // If any call was answered, clear the incoming call state
          if (incomingCall) {
            console.log('📞 Call was answered, clearing incoming call state');
            setIncomingCall(null);
            setIncomingCallType(null);
          }
        });

        // Listen for local call ended (immediate synchronization)
        realTimeCallService.socket.on('local-call-ended', (callData) => {
          console.log('📞 Local call ended event received on PatientDashboard:', callData);
          console.log('📞 Current incoming call:', incomingCall);
          
          // Check if this local call-ended event matches our current incoming call
          if (incomingCall && (callData.callId === incomingCall.callId || callData.callId === incomingCall.id)) {
            console.log('📞 Matching local call ended, clearing incoming call state');
            setIncomingCall(null);
            setIncomingCallType(null);
          } else {
            console.log('📞 Local call ended event received but no matching incoming call found');
          }
        });

        setSocket(realTimeCallService.socket);

      } catch (error) {
        console.error('❌ Failed to initialize real-time service in PatientDashboard:', error);
      }
    };

    initializeRealTimeService();

    // Cleanup on unmount
    return () => {
      // Note: We don't disconnect here as the real-time service is shared
      // The service will handle cleanup when the app is closed
    };
  }, [user.id]);
  
  // --- CROSS-TAB CALL SYNCHRONIZATION ---
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeCall') {
        try {
          const activeCall = e.newValue ? JSON.parse(e.newValue) : null;
          console.log('📞 Storage change detected - active call:', activeCall);
          
                     if (!activeCall) {
             // Call was cleared, clear incoming call state
             console.log('📞 Active call cleared from storage, clearing incoming call state');
             setIncomingCall(null);
             setIncomingCallType(null);
           }
        } catch (error) {
          console.error('Error parsing active call from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  // -----------------------------------------

  // --- FETCH ALL USERS FROM BACKEND ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const users = await response.json();
        setAllUsers(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);
  // ------------------------------------

  // --- FETCH ALL DOCTORS FROM BACKEND ---
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        console.log('🔍 Fetching doctors from backend...');
        const response = await fetch('http://localhost:5001/api/doctors');
        console.log('🔍 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Response error:', errorText);
          throw new Error(`Failed to fetch doctors: ${response.status} ${errorText}`);
        }
        
        const doctors = await response.json();
        setAllDoctors(doctors);
        console.log('✅ Fetched doctors:', doctors);
        console.log('📊 Total doctors found:', doctors.length);
      } catch (error) {
        console.error("❌ Failed to fetch doctors:", error);
        setAllDoctors([]);
      }
    };
    fetchDoctors();
  }, []);
  // ------------------------------------

  const patientRecords = useMemo(() => 
    records.filter(r => r.patientId === user.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), 
    [records, user.id]
  );

  // --- DYNAMICALLY FILTER FOR DOCTORS FROM THE FETCHED LIST ---
  const doctors = useMemo(() => {
    // Use the specifically fetched doctors list
    const fetchedDoctors = allDoctors.filter(d => d.id !== user.id);
    
    console.log('🔍 Filtering doctors for patient:', user.id);
    console.log('📋 All doctors from backend:', allDoctors);
    console.log('✅ Available doctors for patient:', fetchedDoctors);
    console.log('📊 Total available doctors:', fetchedDoctors.length);
    
    return fetchedDoctors;
  }, [allDoctors, user.id]);
  // -----------------------------------------------------------

  const patientPermissions = permissions[user.id] || [];

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus('1/3: Uploading and processing file with OCR...');

    const formData = new FormData();
    formData.append('report', file);
    formData.append('patientId', user.id); // Send the actual patient ID

    try {
      const response = await fetch('http://localhost:5001/api/ocr-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server responded with an error');
      }

      const result = await response.json();
      console.log('Backend Response:', result);

      // --- STORE RAW EXTRACTED DATA FOR DYNAMIC DISPLAY ---
      // Store the raw extracted data as-is, so the HealthRecord component can handle it dynamically
      const extractedData = result.extractedData;
      
      // Enhanced debug logging to see what data we're getting
      console.log('=== AI EXTRACTION DEBUG ===');
      console.log('Raw extracted data:', result.extractedData);
      console.log('Data keys found:', Object.keys(result.extractedData));
      console.log('Total metrics extracted:', Object.keys(result.extractedData).length);
      
      // Log each metric for debugging
      Object.keys(result.extractedData).forEach(key => {
        const metric = result.extractedData[key];
        console.log(`✅ Metric "${key}":`, {
          value: metric.value,
          unit: metric.unit,
          type: typeof metric.value
        });
      });
      
      // Check for missing expected metrics
      const expectedMetrics = ['Blood Sugar', 'Blood Pressure', 'Total Cholesterol', 'Heart Rate'];
      const foundMetrics = Object.keys(result.extractedData);
      
      expectedMetrics.forEach(expected => {
        if (!foundMetrics.includes(expected)) {
          console.log(`❌ Missing expected metric: "${expected}"`);
        } else {
          console.log(`✅ Found expected metric: "${expected}"`);
        }
      });
      console.log('=== END DEBUG ===');
      // -----------------------

      setUploadStatus('2/3: Storing record on the blockchain...');
      await new Promise(res => setTimeout(res, 1000));
      
      const newRecord = {
        recordId: `rec${Date.now()}`,
        patientId: user.id,
        timestamp: new Date().toISOString(),
        documentName: file.name,
        data: extractedData,
        prediction: null,
      };

      setRecords(prev => [...prev, newRecord]);
      setUploadStatus('3/3: Record successfully added!');

    } catch (error) {
        console.error('Upload failed:', error);
        setUploadStatus('Error: Could not process file. Please try again.');
    } finally {
        setTimeout(() => {
            setUploadStatus('');
            setFile(null);
            setIsUploading(false);
        }, 3000);
    }
  };

  const togglePermission = async (doctorId) => {
    console.log('=== TOGGLE PERMISSION DEBUG ===');
    console.log('Toggling permission for doctor:', doctorId);
    console.log('Current user ID:', user.id);
    console.log('Current permissions before:', permissions);
    
    try {
      const currentPermissions = permissions[user.id] || [];
      const hasPermission = currentPermissions.includes(doctorId);
      
      if (hasPermission) {
        // Revoke access
        const response = await fetch('http://localhost:5001/api/revoke-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId: user.id,
            doctorId: doctorId
          })
        });
        
        if (response.ok) {
          console.log('✅ Access revoked successfully');
        }
      } else {
        // Grant access
        const response = await fetch('http://localhost:5001/api/grant-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId: user.id,
            doctorId: doctorId
          })
        });
        
        if (response.ok) {
          console.log('✅ Access granted successfully');
        }
      }
      
      // Update local state
      setPermissions(prev => {
        const currentPermissions = prev[user.id] || [];
        const newPermissions = hasPermission
          ? currentPermissions.filter(id => id !== doctorId)
          : [...currentPermissions, doctorId];
        
        const newPermissionsState = { ...prev, [user.id]: newPermissions };
        console.log('New permissions state:', newPermissionsState);
        console.log('=== END TOGGLE PERMISSION DEBUG ===');
        
        return newPermissionsState;
      });
      
    } catch (error) {
      console.error('❌ Failed to toggle permission:', error);
    }
  };

  const healthMetrics = useMemo(() => {
    if (patientRecords.length === 0) return null;
    
    console.log('=== AVERAGE CALCULATION DEBUG ===');
    console.log('Total records to process:', patientRecords.length);
    
    // Dynamic metrics calculation based on available data
    const allMetrics = {};
    let recordCount = 0;
    
    patientRecords.forEach(record => {
      recordCount++;
      const data = record.data;
      console.log(`Processing record ${recordCount}:`, data);
      
      // Process each metric in the record
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Handle object format: { "Blood Sugar": { "value": "120", "unit": "mg/dL" } }
        if (value && typeof value === 'object' && value.value !== undefined) {
          // Special handling for Blood Pressure (format: "118/78")
          if (key.toLowerCase().includes('blood') && key.toLowerCase().includes('pressure') || key === 'Blood Pressure') {
            const bpValue = value.value;
            console.log(`Processing Blood Pressure: "${bpValue}"`);
            if (bpValue && typeof bpValue === 'string' && bpValue.includes('/')) {
              const [systolic, diastolic] = bpValue.split('/').map(v => Number(v.trim()));
              console.log(`Split BP values - Systolic: ${systolic}, Diastolic: ${diastolic}`);
              if (!isNaN(systolic) && !isNaN(diastolic)) {
                if (!allMetrics[key]) {
                  allMetrics[key] = { systolicSum: 0, diastolicSum: 0, count: 0, unit: value.unit || 'mmHg' };
                }
                allMetrics[key].systolicSum += systolic;
                allMetrics[key].diastolicSum += diastolic;
                allMetrics[key].count++;
                console.log(`Updated BP averages - Systolic Sum: ${allMetrics[key].systolicSum}, Diastolic Sum: ${allMetrics[key].diastolicSum}, Count: ${allMetrics[key].count}`);
              } else {
                console.log(`Invalid BP values - Systolic: ${systolic}, Diastolic: ${diastolic}`);
              }
            } else {
              console.log(`Invalid BP format: "${bpValue}"`);
            }
          } else {
            // Handle regular numeric values
            // Special handling for Blood Sugar variations
            let normalizedKey = key;
            if (key.toLowerCase().includes('blood') && key.toLowerCase().includes('sugar') || 
                key.toLowerCase().includes('glucose') || key === 'Blood Sugar (Fasting)') {
              normalizedKey = 'Blood Sugar';
            }
            
            if (!allMetrics[normalizedKey]) {
              allMetrics[normalizedKey] = { sum: 0, count: 0, unit: value.unit };
            }
            allMetrics[normalizedKey].sum += Number(value.value);
            allMetrics[normalizedKey].count++;
            console.log(`Processing ${key} as ${normalizedKey}: ${value.value} ${value.unit}`);
          }
        }
        // Handle direct value format: { "bloodSugar": 120 }
        else if (value !== null && value !== undefined && typeof value !== 'object') {
          if (!allMetrics[key]) {
            allMetrics[key] = { sum: 0, count: 0, unit: '' };
          }
          allMetrics[key].sum += Number(value);
          allMetrics[key].count++;
        }
        // Handle nested object format: { "bloodPressure": { "systolic": 120, "diastolic": 80 } }
        else if (value && typeof value === 'object' && value.systolic !== undefined) {
          const systolicKey = `${key}_systolic`;
          const diastolicKey = `${key}_diastolic`;
          
          if (value.systolic) {
            if (!allMetrics[systolicKey]) {
              allMetrics[systolicKey] = { sum: 0, count: 0, unit: 'mmHg' };
            }
            allMetrics[systolicKey].sum += Number(value.systolic);
            allMetrics[systolicKey].count++;
          }
          
          if (value.diastolic) {
            if (!allMetrics[diastolicKey]) {
              allMetrics[diastolicKey] = { sum: 0, count: 0, unit: 'mmHg' };
            }
            allMetrics[diastolicKey].sum += Number(value.diastolic);
            allMetrics[diastolicKey].count++;
          }
        }
      });
    });
    
    // Calculate averages
    const averages = {};
    Object.keys(allMetrics).forEach(key => {
      const metric = allMetrics[key];
      if (metric.count > 0) {
        // Special handling for Blood Pressure
        if (((key.toLowerCase().includes('blood') && key.toLowerCase().includes('pressure')) || key === 'Blood Pressure') && metric.systolicSum !== undefined) {
          const avgSystolic = Math.round(metric.systolicSum / metric.count);
          const avgDiastolic = Math.round(metric.diastolicSum / metric.count);
          averages[key] = {
            value: `${avgSystolic}/${avgDiastolic}`,
            unit: metric.unit
          };
        } else {
          // Regular numeric averages
          averages[key] = {
            value: (metric.sum / metric.count).toFixed(1),
            unit: metric.unit
          };
        }
      }
    });
    
    console.log('All metrics being processed:', Object.keys(allMetrics));
    console.log('Final averages calculated:', averages);
    console.log('=== END AVERAGE CALCULATION DEBUG ===');
    
    return averages;
  }, [patientRecords]);

  // Simple fallback if something goes wrong
  if (!user) {
    return <div>Error: No user data available</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {healthMetrics && Object.keys(healthMetrics).length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem' 
        }}>
          {Object.keys(healthMetrics).map((metricKey, index) => {
            const metric = healthMetrics[metricKey];
            const icon = getMetricIcon(metricKey);
            const label = formatMetricLabel(metricKey);
            
            return (
              <div key={index} className="dashboard-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {React.cloneElement(icon, { style: { color: '#3b82f6' }, size: 20 })}
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg {label}</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                      {metric.value} {metric.unit}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem' 
      }}>
        <Card title="Upload New Report" icon={<Upload />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Select Health Report (PDF/Image)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ 
                    position: 'absolute', 
                    opacity: 0, 
                    width: '100%', 
                    height: '100%', 
                    cursor: 'pointer' 
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: '80px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}>
                      <Upload style={{ color: '#6b7280' }} size={20} />
                    </div>
                    <div>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '500', 
                        color: '#374151',
                        marginBottom: '0.25rem'
                      }}>
                        {file ? file.name : 'Select file to upload'}
                      </p>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: '#9ca3af'
                      }}>
                        {file ? 'Ready to upload' : 'PDF, JPG, PNG'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {uploadStatus && (
              <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>{uploadStatus}</p>
              </div>
            )}
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              icon={<Upload size={16} />}
            >
              {isUploading ? 'Processing...' : 'Upload Report'}
            </Button>
          </div>
        </Card>
        <Card title="Manage Doctor Access" icon={<Shield />}>
          <div className="space-y-8">
            {/* Header Section */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Doctor Permissions</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Control which doctors can access your health records and manage communication preferences
              </p>
            </div>
            
            {/* Statistics Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{doctors.length}</div>
                    <div className="text-sm text-blue-700">Total Doctors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {doctors.filter(d => patientPermissions.includes(d.id)).length}
                    </div>
                    <div className="text-sm text-green-700">Access Granted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {doctors.filter(d => !patientPermissions.includes(d.id)).length}
                    </div>
                    <div className="text-sm text-gray-700">Pending Access</div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-right">
                    <div className="text-sm text-blue-600 font-medium">Security Status</div>
                    <div className="text-xs text-blue-500">All permissions managed</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Doctors List */}
            {doctors.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">Doctor List</h4>
                  <div className="text-sm text-gray-500">
                    {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found
                  </div>
                </div>
                
                {doctors.map((doctor, index) => (
                  <div key={doctor.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between">
                      {/* Doctor Info */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Dr. {doctor.name || 'Smith'}</h4>
                          <p className="text-sm text-gray-600">{doctor.specialization || 'General Medicine'}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${
                              patientPermissions.includes(doctor.id) ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              patientPermissions.includes(doctor.id) ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {patientPermissions.includes(doctor.id) ? 'Access Granted' : 'Access Required'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {!patientPermissions.includes(doctor.id) ? (
                          <>
                            <button
                              onClick={() => togglePermission(doctor.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
                            >
                              Grant Access
                            </button>
                            <button
                              onClick={() => {
                                setSelectedChatUser({ id: doctor.id, name: doctor.name });
                                setShowChat(true);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                            >
                              Chat
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => togglePermission(doctor.id)}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors"
                            >
                              Remove Access
                            </button>
                            <button
                              onClick={() => {
                                setSelectedChatUser({ id: doctor.id, name: doctor.name });
                                setShowChat(true);
                              }}
                              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                              title="Start Chat"
                            >
                              <MessageCircle size={16} />
                            </button>
                            <CallIntegration 
                              user={user} 
                              selectedUser={{ id: doctor.id, name: doctor.name }}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Doctors Available</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  No doctors have registered yet. Please ask doctors to register first before you can manage permissions.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-lg mx-auto">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-bold">💡</span>
                    </div>
                    <h4 className="font-semibold text-blue-900">Getting Started</h4>
                  </div>
                  <p className="text-sm text-blue-800 text-left">
                    <strong>Tip:</strong> Doctors need to register and request access to your health records before you can manage permissions. 
                    You can also ask your healthcare provider to add you to their system.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Blockchain Status Section */}
        <BlockchainStatus />
        
        {/* Appointment Management Section */}
        <Card title="Appointment Management" icon={<Calendar />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              Book appointments with your doctors and manage your schedule
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button
                onClick={() => setShowAppointmentBooking(true)}
                icon={<BookOpen size={16} />}
              >
                Book New Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAppointments(true)}
                icon={<Calendar size={16} />}
              >
                View My Appointments
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Your Health Records" icon={<FileText />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {patientRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <FileText style={{ margin: '0 auto', color: '#9ca3af' }} size={48} />
              <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>No health records found</p>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Upload your first health report to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {patientRecords.map(record => (
                <HealthRecord key={record.recordId} record={record} userRole="patient" />
              ))}
            </div>
          )}
        </div>
      </Card>
      
      {/* Chat Component */}
      {showChat && (
        <ChatComponent
          user={user}
          onClose={() => {
            setShowChat(false);
            setSelectedChatUser(null);
          }}
          selectedChatUser={selectedChatUser}
        />
      )}
      
              {/* Incoming Call Modal */}
        {incomingCall && incomingCallType === 'voice' && (
          <WebRTCVoiceCall
            user={user}
            onClose={() => {
              setIncomingCall(null);
              setIncomingCallType(null);
            }}
            isIncoming={true}
            incomingCallData={incomingCall}
          />
        )}

        {incomingCall && incomingCallType === 'video' && (
          <WebRTCVideoCall
            user={user}
            onClose={() => {
              setIncomingCall(null);
              setIncomingCallType(null);
            }}
            isIncoming={true}
            incomingCallData={incomingCall}
          />
        )}

        {/* Appointment Booking Modal */}
        {showAppointmentBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Book an Appointment</h2>
                  <button
                    onClick={() => setShowAppointmentBooking(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                                 <AppointmentBooking 
                   patientId={user.id}
                   patientPermissions={permissions[user.id] || []}
                   onAppointmentBooked={() => {
                     setShowAppointmentBooking(false);
                     // Refresh appointments if needed
                   }}
                 />
              </div>
            </div>
          </div>
        )}

        {/* Appointment List Modal */}
        {showAppointments && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">My Appointments</h2>
                  <button
                    onClick={() => setShowAppointments(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                <AppointmentList 
                  userId={user.id}
                  userRole="patient"
                  onAppointmentUpdate={() => {
                    // Refresh data if needed
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Detection and Cleanup */}
        <Card title="Appointment Health Check" icon={<Shield />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              Check for and clean up duplicate appointments
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button
                onClick={async () => {
                  try {
                    const result = await appointmentService.checkForDuplicates(user.id);
                    if (result.hasDuplicates) {
                      alert(`Found ${result.duplicates.length} duplicate appointment groups. Total duplicates: ${result.duplicates.reduce((sum, d) => sum + d.count, 0)}`);
                    } else {
                      alert('No duplicate appointments found!');
                    }
                  } catch (error) {
                    console.error('Error checking for duplicates:', error);
                    alert('Failed to check for duplicates');
                  }
                }}
                icon={<Shield size={16} />}
              >
                Check for Duplicates
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const result = await appointmentService.cleanupDuplicates();
                    alert(`Cleanup completed! Removed ${result.cleanedCount} duplicate appointments.`);
                  } catch (error) {
                    console.error('Error cleaning up duplicates:', error);
                    alert('Failed to cleanup duplicates');
                  }
                }}
                icon={<Shield size={16} />}
              >
                Clean Up Duplicates
              </Button>
            </div>
          </div>
        </Card>

    </div>
  );
};

export default PatientDashboard;
