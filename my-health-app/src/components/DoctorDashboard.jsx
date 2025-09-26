import React, { useEffect, useState, useMemo } from 'react';
import { UserPlus, Activity, AlertTriangle, BarChart2, Stethoscope, ClipboardList, User, ChevronDown, MessageCircle, Phone, Calendar, Clock, X } from 'lucide-react';
import HealthRecord from './HealthRecord';
import ChatComponent from './ChatComponent';
import CallIntegration from './CallIntegration';
import WebRTCVoiceCall from './WebRTCVoiceCall';
import WebRTCVideoCall from './WebRTCVideoCall';
import DoctorAvailability from './DoctorAvailability';
import AppointmentList from './AppointmentList';
import realTimeCallService from '../services/realTimeCallService';

// --- REAL AI PREDICTION SERVICE ---
const getAIPrediction = async (healthData) => {
    console.log('Requesting AI Disease Prediction with data:', healthData);
    
    try {
        const response = await fetch('http://localhost:5001/api/ai-prediction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ healthData }),
        });

        if (!response.ok) {
            throw new Error('AI service responded with an error');
        }

        const result = await response.json();
        console.log('AI Prediction Response:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }

        return result.prediction;
    } catch (error) {
        console.error('AI Prediction failed:', error);
        // Return fallback prediction if AI service fails
        return {
            primaryRisk: {
                disease: "Health Assessment",
                riskPercentage: 25,
                confidence: 60,
                severity: "low"
            },
            recommendations: ["Please consult with a healthcare provider for a complete assessment"],
            medicalNotes: "Unable to complete AI analysis. Manual review recommended.",
            urgency: "low",
            nextSteps: "Schedule appointment with healthcare provider"
        };
    }
};
// -------------------------

const Card = ({ children, title, icon, className = '' }) => (
  <div className={`dashboard-section ${className}`}>
    {title && (
      <h3 className="dashboard-section-title">
        {icon && React.cloneElement(icon, { className: "text-blue-500", size: 22 })}
        {title}
      </h3>
    )}
    {children}
  </div>
);

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false, icon }) => {
  const baseClasses = 'button';
  const variants = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    outline: 'button-secondary',
    danger: 'button-danger',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {icon && React.cloneElement(icon, { size: 18 })}
      {children}
    </button>
  );
};

// --- DOCTOR DASHBOARD COMPONENT ---
const DoctorDashboard = ({ user, records, setRecords, permissions }) => {
  console.log('DoctorDashboard render - user:', user);
  console.log('DoctorDashboard render - records:', records);
  console.log('DoctorDashboard render - permissions:', permissions);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isPredicting, setIsPredicting] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // State to hold all users
  const [showChat, setShowChat] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  
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
        console.log('🔌 Connected to real-time call service in DoctorDashboard');

        // Listen for incoming calls
        realTimeCallService.socket.on('incoming-call', (callData) => {
          console.log('📞 Incoming call received on DoctorDashboard:', callData);
          console.log('📞 Current user ID:', user.id);
          
          // Determine call type from call data
          const callType = callData.callType || 'voice'; // Default to voice if not specified
          console.log('📞 Incoming call type:', callType);
          
          setIncomingCall(callData);
          setIncomingCallType(callType);
        });

        // Listen for call ended
        realTimeCallService.socket.on('call-ended', (callData) => {
          console.log('📞 Call ended event received on DoctorDashboard:', callData);
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

        // Listen for local call ended (immediate synchronization)
        realTimeCallService.socket.on('local-call-ended', (callData) => {
          console.log('📞 Local call ended event received on DoctorDashboard:', callData);
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
        console.error('❌ Failed to initialize real-time service in DoctorDashboard:', error);
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

  // --- DYNAMICALLY FIND PATIENTS & ACCESSIBLE PATIENTS ---
  const patients = useMemo(() => {
    const fetchedPatients = allUsers.filter(u => u.role === 'patient');
    console.log('Fetched patients from backend:', fetchedPatients);
    return fetchedPatients;
  }, [allUsers]);

  // --- FETCH ALL USERS FROM BACKEND ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        setAllUsers(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  // --- LOAD ACCESSIBLE PATIENTS FOR DOCTOR ---
  const [accessiblePatients, setAccessiblePatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    const loadAccessiblePatients = async () => {
      if (user.role !== 'doctor') return;
      
      setLoadingPatients(true);
      try {
        console.log('🔄 Loading accessible patients for doctor:', user.id);
        const response = await fetch(`http://localhost:5001/api/doctor-accessible-patients/${user.id}`);
        
        console.log('🔄 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Accessible patients data:', data);
          setAccessiblePatients(data.accessiblePatients || []);
        } else {
          console.error('❌ Failed to load accessible patients, status:', response.status);
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
          setAccessiblePatients([]);
        }
      } catch (error) {
        console.error('❌ Failed to load accessible patients:', error);
        setAccessiblePatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };
    
    loadAccessiblePatients();
  }, [user.id, user.role]);
  // ------------------------------------ 
  // ----------------------------------------------------

  // State for patient records fetched from backend
  const [patientRecordsFromBackend, setPatientRecordsFromBackend] = useState([]);
  const [loadingPatientRecords, setLoadingPatientRecords] = useState(false);

  // Fetch patient records from backend when patient is selected
  useEffect(() => {
    const fetchPatientRecords = async () => {
      if (!selectedPatientId) {
        setPatientRecordsFromBackend([]);
        return;
      }

      setLoadingPatientRecords(true);
      try {
        console.log('🔄 Fetching records for patient:', selectedPatientId);
        const response = await fetch(`http://localhost:5001/api/blockchain/patient-records/${selectedPatientId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Patient records from backend:', data);
          setPatientRecordsFromBackend(data.records || []);
        } else {
          console.error('❌ Failed to fetch patient records, status:', response.status);
          setPatientRecordsFromBackend([]);
        }
      } catch (error) {
        console.error('❌ Failed to fetch patient records:', error);
        setPatientRecordsFromBackend([]);
      } finally {
        setLoadingPatientRecords(false);
      }
    };

    fetchPatientRecords();
  }, [selectedPatientId]);

  const selectedPatientRecords = useMemo(() => {
    if (!selectedPatientId) return [];
    
    // Combine records from localStorage and backend
    const localRecords = records.filter(r => r.patientId === selectedPatientId);
    const backendRecords = patientRecordsFromBackend || [];
    
    // Convert backend records to frontend format if needed
    const formattedBackendRecords = backendRecords.map(record => ({
      recordId: record.reportId || record.id || `backend_${record.timestamp}`,
      patientId: selectedPatientId,
      timestamp: new Date(record.timestamp * 1000).toISOString(), // Convert from Unix timestamp
      documentName: record.reportType || 'Medical Report',
      data: record.extractedData || {},
      prediction: record.prediction || null,
      ipfsHash: record.ipfsHash,
      blockchainTx: record.transactionHash
    }));
    
    // Combine and sort all records
    const allRecords = [...localRecords, ...formattedBackendRecords];
    return allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [records, selectedPatientId, patientRecordsFromBackend]);

  // --- REAL AI PREDICTION HANDLER ---
  const handlePrediction = async (recordToPredict) => {
    setIsPredicting(recordToPredict.recordId);
    
    try {
      console.log('=== AI PREDICTION DEBUG ===');
      console.log('Raw record data:', recordToPredict.data);
      
      // Convert the record data to the format expected by the AI service
      const healthData = {
        // Blood Sugar - handle both "Blood Sugar (Fasting)" and "Blood Sugar"
        bloodSugar: recordToPredict.data["Blood Sugar (Fasting)"]?.value || 
                   recordToPredict.data["Blood Sugar"]?.value || 
                   recordToPredict.data.bloodSugar,
        
        // Blood Pressure - handle "118/78" format
        bloodPressure: (() => {
          const bpValue = recordToPredict.data["Blood Pressure"]?.value;
          if (bpValue && typeof bpValue === 'string' && bpValue.includes('/')) {
            const [systolic, diastolic] = bpValue.split('/').map(v => Number(v.trim()));
            if (!isNaN(systolic) && !isNaN(diastolic)) {
              return { systolic, diastolic };
            }
          }
          // Fallback to old format
          return {
            systolic: recordToPredict.data.bloodPressure?.systolic || recordToPredict.data["Systolic Pressure"]?.value,
            diastolic: recordToPredict.data.bloodPressure?.diastolic || recordToPredict.data["Diastolic Pressure"]?.value
          };
        })(),
        
        // Cholesterol
        cholesterol: recordToPredict.data["Total Cholesterol"]?.value || 
                   recordToPredict.data.cholesterol,
        
        // Heart Rate
        heartRate: recordToPredict.data["Heart Rate"]?.value || 
                  recordToPredict.data.heartRate,
        
        // Additional metrics for better AI analysis
        hdlCholesterol: recordToPredict.data["HDL Cholesterol"]?.value,
        ldlCholesterol: recordToPredict.data["LDL Cholesterol"]?.value,
        triglycerides: recordToPredict.data["Triglycerides"]?.value,
        
        timestamp: recordToPredict.timestamp,
        documentName: recordToPredict.documentName
      };
      
      console.log('Processed health data for AI:', healthData);
      console.log('=== END AI PREDICTION DEBUG ===');

      const predictionResult = await getAIPrediction(healthData);
      
      setRecords(prevRecords => 
        prevRecords.map(r => 
          r.recordId === recordToPredict.recordId 
            ? { ...r, prediction: predictionResult } 
            : r
        )
      );
    } catch (error) {
      console.error('Prediction failed:', error);
      // You could show an error message to the user here
    } finally {
      setIsPredicting(null);
    }
  };

  // --- PRESCRIPTION HANDLERS ---
  const handlePrescriptionChange = (recordId, prescription) => {
    setRecords(prevRecords => 
      prevRecords.map(r => 
        r.recordId === recordId 
          ? { ...r, tempPrescription: prescription } 
          : r
      )
    );
  };

  const handleSavePrescription = (recordId) => {
    const record = records.find(r => r.recordId === recordId);
    if (!record?.tempPrescription?.trim()) return;

    setRecords(prevRecords => 
      prevRecords.map(r => 
        r.recordId === recordId 
          ? { 
              ...r, 
              prescription: r.tempPrescription,
              prescriptionDate: new Date().toISOString(),
              prescribedBy: user.name,
              tempPrescription: undefined // Clear temp
            } 
          : r
      )
    );
  };

  const handleUpdatePrescription = (recordId, newPrescription) => {
    setRecords(prevRecords => 
      prevRecords.map(r => 
        r.recordId === recordId 
          ? { 
              ...r, 
              prescription: undefined,
              prescriptionDate: undefined,
              prescribedBy: undefined,
              tempPrescription: newPrescription
            } 
          : r
      )
    );
  };

  // Try to find the selected patient from multiple sources
  const selectedPatient = allUsers.find(p => p.id === selectedPatientId) || 
                         accessiblePatients.find(p => p.id === selectedPatientId);
  
  // Debug logging
  console.log('🔍 Doctor Dashboard Debug:', {
    selectedPatientId,
    selectedPatient,
    allUsers: allUsers.map(u => ({ id: u.id, name: u.name, role: u.role })),
    accessiblePatients: accessiblePatients.map(p => ({ id: p.id, name: p.name }))
  });

  // Enhanced debugging for patient lookup
  console.log('🔍 Patient Lookup Debug:', {
    selectedPatientId,
    foundInAllUsers: allUsers.find(p => p.id === selectedPatientId),
    foundInAccessiblePatients: accessiblePatients.find(p => p.id === selectedPatientId),
    allUsersIds: allUsers.map(u => u.id),
    accessiblePatientsIds: accessiblePatients.map(p => p.id)
  });

  // Add debugging for patient selection
  const handlePatientSelection = (patientId) => {
    console.log('🎯 Patient selection changed:', patientId);
    console.log('🎯 Previous selection:', selectedPatientId);
    setSelectedPatientId(patientId);
  };
  // Simple fallback if something goes wrong
  if (!user) {
    return <div>Error: No user data available</div>;
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection Card */}
        <Card 
          title="Select Patient" 
          icon={<UserPlus />}
          className="lg:col-span-1"
        >
          {loadingPatients ? (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading patients...</p>
            </div>
          ) : accessiblePatients.length > 0 ? (
            <div className="space-y-4">
              <div className="relative">
                                                 <select 
                  value={selectedPatientId}
                  onChange={(e) => handlePatientSelection(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="">Select a patient</option>
                  {accessiblePatients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDown className="text-gray-400" size={20} />
                </div>
              </div>
              
                             {(selectedPatient || selectedPatientId) && (
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <User className="text-blue-600" size={18} />
                      </div>
                      <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                        {selectedPatient ? selectedPatient.name : selectedPatientId}
                      </h4>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const patientId = selectedPatient ? selectedPatient.id : selectedPatientId;
                          const patientName = selectedPatient ? selectedPatient.name : selectedPatientId;
                          setSelectedChatUser({ id: patientId, name: patientName });
                          setShowChat(true);
                        }}
                        icon={<MessageCircle size={16} />}
                        className="text-sm"
                      >
                        Chat
                      </Button>
                      <CallIntegration 
                        user={user} 
                        selectedUser={{ 
                          id: selectedPatient ? selectedPatient.id : selectedPatientId, 
                          name: selectedPatient ? selectedPatient.name : selectedPatientId 
                        }}
                        className="ml-2"
                      />
                    </div>
                    
                    {/* Appointment Management Buttons */}
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => setShowAvailability(true)}
                        icon={<Clock size={16} />}
                        className="text-sm"
                      >
                        Manage Availability
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowAppointments(true)}
                        icon={<Calendar size={16} />}
                        className="text-sm"
                      >
                        View Appointments
                      </Button>
                    </div>
                  </div>
               )}
            </div>
          ) : (
                         <div className="text-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
               <AlertTriangle className="mx-auto text-yellow-500 mb-3" size={24} />
               <p className="text-yellow-800 font-medium mb-1">No patient access</p>
               <p className="text-yellow-700 text-sm">
                 Patients need to grant you access to their records
               </p>
             </div>
          )}
        </Card>

        {/* Patient Records Section */}
        {selectedPatientId && (
          <div className="lg:col-span-2 space-y-6">
            <Card title="Patient Records" icon={<ClipboardList />}>
              <div className="space-y-6">
                {selectedPatientRecords.length > 0 ? (
                  selectedPatientRecords.map(rec => (
                    <div key={rec.recordId} className="space-y-4">
                                             <HealthRecord record={rec} userRole="doctor" />
                       
                       {/* AI Analysis Section */}
                       <div className="text-right mb-4">
                         {!rec.prediction ? (
                           <Button 
                             onClick={() => handlePrediction(rec)} 
                             disabled={isPredicting === rec.recordId}
                             icon={<BarChart2 size={18} />}
                           >
                             {isPredicting === rec.recordId ? 'Analyzing...' : 'Run AI Analysis'}
                           </Button>
                         ) : (
                           <div className="flex items-center gap-2 text-sm text-gray-500">
                             <BarChart2 size={16} />
                             <span>AI Analysis Complete</span>
                             <Button 
                               onClick={() => handlePrediction(rec)} 
                               disabled={isPredicting === rec.recordId}
                               variant="outline"
                               className="text-xs px-2 py-1"
                             >
                               {isPredicting === rec.recordId ? 'Re-analyzing...' : 'Re-analyze'}
                             </Button>
                           </div>
                         )}
                       </div>
                       
                                               {/* Doctor Prescription Section */}
                        <div className="prescription-section">
                          <div className="flex items-center gap-2 mb-3">
                            <Stethoscope size={16} className="text-blue-600" />
                            <h4 className="font-semibold text-blue-800">Doctor's Prescription</h4>
                          </div>
                          
                          {rec.prescription ? (
                            <div className="mb-3">
                              <div className="prescription-content">
                                <p className="text-sm text-gray-700">{rec.prescription}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Prescribed by: Dr. {user.name} on {new Date(rec.prescriptionDate || rec.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                              <Button 
                                onClick={() => handleUpdatePrescription(rec.recordId, '')}
                                variant="outline"
                                className="text-xs px-2 py-1"
                              >
                                Edit Prescription
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <textarea
                                placeholder="Write your prescription here... Include medications, dosage, instructions, and follow-up recommendations."
                                className="prescription-textarea"
                                rows={4}
                                value={rec.tempPrescription || ''}
                                onChange={(e) => handlePrescriptionChange(rec.recordId, e.target.value)}
                              />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  onClick={() => handleSavePrescription(rec.recordId)}
                                  disabled={!rec.tempPrescription?.trim()}
                                  icon={<Stethoscope size={16} />}
                                  className="text-sm"
                                >
                                  Save Prescription
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    {loadingPatientRecords ? (
                      <div className="space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500">Loading patient records...</p>
                        <p className="text-sm text-gray-400">
                          Fetching medical reports from blockchain
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ClipboardList className="mx-auto text-gray-400" size={48} />
                        <p className="text-gray-500">No records found for this patient</p>
                        <p className="text-sm text-gray-400">
                          The patient hasn't uploaded any medical reports yet, or records are being processed
                        </p>
                        <div className="text-xs text-gray-300 mt-4">
                          <p>Records are stored securely on blockchain and IPFS</p>
                          <p>Patient ID: {selectedPatientId}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Stats Card */}
            {selectedPatientRecords.length > 0 && (
              <Card title="Health Overview" icon={<Activity />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                     <div className="bg-blue-50 p-3 rounded-lg text-center">
                     <p className="text-sm text-blue-600 font-medium">Avg. Heart Rate</p>
                     <p className="text-xl font-bold text-gray-800">
                      {(() => {
                        const hrData = selectedPatientRecords.reduce((acc, rec) => {
                          const hrValue = rec.data["Heart Rate"]?.value;
                          if (hrValue && !isNaN(Number(hrValue))) {
                            acc.sum += Number(hrValue);
                            acc.count++;
                          }
                          return acc;
                        }, { sum: 0, count: 0 });
                        
                        if (hrData.count > 0) {
                          return Math.round(hrData.sum / hrData.count);
                        }
                        return 0;
                      })()}
                      <span className="text-sm font-normal text-gray-500 ml-1">bpm</span>
                    </p>
                  </div>
                                     <div className="bg-red-50 p-3 rounded-lg text-center">
                     <p className="text-sm text-red-600 font-medium">Avg. Blood Pressure</p>
                     <p className="text-xl font-bold text-gray-800">
                      {(() => {
                        const bpData = selectedPatientRecords.reduce((acc, rec) => {
                          const bpValue = rec.data["Blood Pressure"]?.value;
                          if (bpValue && typeof bpValue === 'string' && bpValue.includes('/')) {
                            const [systolic, diastolic] = bpValue.split('/').map(v => Number(v.trim()));
                            if (!isNaN(systolic) && !isNaN(diastolic)) {
                              acc.systolicSum += systolic;
                              acc.diastolicSum += diastolic;
                              acc.count++;
                            }
                          }
                          return acc;
                        }, { systolicSum: 0, diastolicSum: 0, count: 0 });
                        
                        if (bpData.count > 0) {
                          const avgSystolic = Math.round(bpData.systolicSum / bpData.count);
                          const avgDiastolic = Math.round(bpData.diastolicSum / bpData.count);
                          return `${avgSystolic}/${avgDiastolic}`;
                        }
                        return '0/0';
                      })()}
                      <span className="text-sm font-normal text-gray-500 ml-1">mmHg</span>
                    </p>
                  </div>
                                     <div className="bg-green-50 p-3 rounded-lg text-center">
                     <p className="text-sm text-green-600 font-medium">Avg. Blood Sugar</p>
                     <p className="text-xl font-bold text-gray-800">
                      {(() => {
                        const bsData = selectedPatientRecords.reduce((acc, rec) => {
                          const bsValue = rec.data["Blood Sugar (Fasting)"]?.value || rec.data["Blood Sugar"]?.value;
                          if (bsValue && !isNaN(Number(bsValue))) {
                            acc.sum += Number(bsValue);
                            acc.count++;
                          }
                          return acc;
                        }, { sum: 0, count: 0 });
                        
                        if (bsData.count > 0) {
                          return Math.round(bsData.sum / bsData.count);
                        }
                        return 0;
                      })()}
                      <span className="text-sm font-normal text-gray-500 ml-1">mg/dL</span>
                    </p>
                  </div>
                                     <div className="bg-purple-50 p-3 rounded-lg text-center">
                     <p className="text-sm text-purple-600 font-medium">Avg. Cholesterol</p>
                     <p className="text-xl font-bold text-gray-800">
                      {(() => {
                        const cholData = selectedPatientRecords.reduce((acc, rec) => {
                          const cholValue = rec.data["Total Cholesterol"]?.value;
                          if (cholValue && !isNaN(Number(cholValue))) {
                            acc.sum += Number(cholValue);
                            acc.count++;
                          }
                          return acc;
                        }, { sum: 0, count: 0 });
                        
                        if (cholData.count > 0) {
                          return Math.round(cholData.sum / cholData.count);
                        }
                        return 0;
                      })()}
                      <span className="text-sm font-normal text-gray-500 ml-1">mg/dL</span>
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
                 )}
       </div>
       
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

        {/* Appointment Management Modals */}
        {showAvailability && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Manage Availability</h2>
                  <button
                    onClick={() => setShowAvailability(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                <DoctorAvailability 
                  doctorId={user.id} 
                  onAvailabilitySet={() => {
                    setShowAvailability(false);
                    // Refresh appointments if needed
                  }}
                />
              </div>
            </div>
          </div>
        )}

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
                  userRole="doctor"
                  onAppointmentUpdate={() => {
                    // Refresh data if needed
                  }}
                />
              </div>
            </div>
          </div>
        )}

     </div>
   );
 };

export default DoctorDashboard;
