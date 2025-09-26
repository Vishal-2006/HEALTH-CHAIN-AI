import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';

import { LogOut, CheckCircle, Moon, Sun, Users } from 'lucide-react';

// This mock data is only used if localStorage is empty
const MOCK_RECORDS = [
  {
    recordId: 'rec001', patientId: 'patient1', timestamp: new Date('2023-10-26T10:00:00Z').toISOString(),
    documentName: 'blood_test_results.pdf',
    data: { bloodSugar: 110, bloodPressure: { systolic: 125, diastolic: 82 }, cholesterol: 190, heartRate: 75 },
    prediction: null,
  },
  {
    recordId: 'rec002', patientId: 'patient1', timestamp: new Date('2024-01-15T14:30:00Z').toISOString(),
    documentName: 'annual_checkup.pdf',
    data: { bloodSugar: 130, bloodPressure: { systolic: 135, diastolic: 88 }, cholesterol: 215, heartRate: 80 },
    prediction: null,
  }
];

function App() {
  // Load user from localStorage on initial load
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('healthchain-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Load records from localStorage on initial load
  const [records, setRecords] = useState(() => {
    const savedRecords = localStorage.getItem('healthchain-records');
    return savedRecords ? JSON.parse(savedRecords) : MOCK_RECORDS;
  });

  // --- THIS IS THE FIX FOR PERMISSIONS ---
  // Load permissions from localStorage on initial load
  const [permissions, setPermissions] = useState(() => {
    const savedPermissions = localStorage.getItem('healthchain-permissions');
    // We don't set a default here, it will be handled by the backend/registration logic
    return savedPermissions ? JSON.parse(savedPermissions) : {}; 
  });

  // Save records to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('healthchain-records', JSON.stringify(records));
  }, [records]);

  // Save permissions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('healthchain-permissions', JSON.stringify(permissions));
  }, [permissions]);
  // ------------------------------------

  const [theme, setTheme] = useState(() => {
      const savedTheme = localStorage.getItem('healthchain-theme');
      return savedTheme ? savedTheme : 'light';
  });

  const [currentView, setCurrentView] = useState(() => {
    const savedView = localStorage.getItem('healthchain-currentView');
    return savedView === 'users' ? 'users' : 'dashboard';
  });

  // Ensure non-admin users can only access dashboard
  useEffect(() => {
    if (user && user.role !== 'admin' && currentView === 'users') {
      setCurrentView('dashboard');
    }
  }, [user, currentView]);

  // Save currentView to localStorage
  useEffect(() => {
    localStorage.setItem('healthchain-currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('healthchain-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('healthchain-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogin = (loggedInUser) => {
    localStorage.setItem('healthchain-user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    // Ensure new users start on dashboard
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('healthchain-user');
    // We keep records and permissions in localStorage even on logout
    setUser(null);
  };

  // Debug logging
  console.log('App render - user:', user);
  console.log('App render - records:', records);
  console.log('App render - permissions:', permissions);

  if (!user) {
    console.log('No user found, showing LoginScreen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-gray-800/80 shadow-sm backdrop-blur-lg sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-blue-500" size={32} />
            <h1 className="text-xl font-bold">HealthChain AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{user.role}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-6">
        {/* Navigation Tabs - Only show User Management for admin */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              currentView === 'dashboard'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setCurrentView('users')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                currentView === 'users'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users size={16} />
                User Management
              </div>
            </button>
          )}
        </div>

        {currentView === 'dashboard' && (
          <>
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user.name.split(' ')[0]}</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  {user.role === 'admin' ? 'Admin Dashboard' : 'Here\'s your health dashboard.'}
                </p>
            </div>
            {user.role === 'patient' ? (
              <PatientDashboard
                user={user}
                records={records}
                setRecords={setRecords}
                permissions={permissions}
                setPermissions={setPermissions}
              />
            ) : user.role === 'doctor' ? (
              <DoctorDashboard
                user={user}
                records={records}
                setRecords={setRecords}
                permissions={permissions}
                setPermissions={setPermissions}
              />
            ) : user.role === 'admin' ? (
              <AdminDashboard user={user} />
            ) : (
              <div>
                <p>Unknown user role: {user.role}</p>
              </div>
            )}
          </>
        )}

        {currentView === 'users' && user.role === 'admin' && (
          <UserManagement />
        )}
      </main>
      
      
    </div>
  );
}

export default App;
