import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, User, Lock, Stethoscope, AlertCircle, Award, Hospital, Mail, Phone, Calendar } from 'lucide-react';

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div className={`bg-white/80 dark:bg-gray-800/80 shadow-2xl rounded-2xl p-8 backdrop-blur-lg border border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, className = '', icon: Icon, disabled = false, type = "button" }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        type={type}
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon size={20} />}
      {children}
    </button>
);

const Input = ({ placeholder, type = 'text', icon: Icon, value, onChange, required = true }) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {Icon && <Icon className="text-gray-400" size={20} />}
        </div>
        <input 
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all"
        />
    </div>
);

const ErrorMessage = ({ message }) => (
    <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
        <AlertCircle size={18} />
        <span>{message}</span>
    </div>
);

// --- LOGIN SCREEN COMPONENT ---
const LoginScreen = ({ onLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Login form state
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Registration form state
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regRole, setRegRole] = useState('patient');
    
    // Doctor-specific fields
    const [medicalLicense, setMedicalLicense] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [specialization, setSpecialization] = useState('General Medicine');
    
    // Patient-specific fields
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [adminExists, setAdminExists] = useState(false);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5001/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Login failed.');
            onLogin(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validate required fields
        if (!regUsername || !regPassword || !regName || !regEmail) {
            setError('Please fill in all required fields.');
            setIsLoading(false);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(regEmail)) {
            setError('Please enter a valid email address.');
            setIsLoading(false);
            return;
        }

        const registrationData = {
            username: regUsername,
            password: regPassword,
            name: regName,
            email: regEmail,
            role: regRole,
            // Include doctor details if the role is 'doctor'
            ...(regRole === 'doctor' && { 
                medicalLicense, 
                hospitalName, 
                specialization 
            }),
            // Include patient details if the role is 'patient'
            ...(regRole === 'patient' && { 
                dateOfBirth, 
                phoneNumber 
            })
        };

        try {
            const response = await fetch('http://localhost:5001/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Registration failed.');

            // Show different message based on role
            if (regRole === 'doctor') {
                alert('Registration successful! Your account is pending verification. You will be notified once it is approved.');
            } else {
                alert('Registration successful! Please sign in.');
            }
            setIsLoginView(true); // Switch to login view
            // Clear registration form
            setRegUsername('');
            setRegPassword('');
            setRegName('');
            setRegEmail('');
            setMedicalLicense('');
            setHospitalName('');
            setSpecialization('General Medicine');
            setDateOfBirth('');
            setPhoneNumber('');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const clearRegistrationForm = () => {
        setRegUsername('');
        setRegPassword('');
        setRegName('');
        setRegEmail('');
        setMedicalLicense('');
        setHospitalName('');
        setSpecialization('General Medicine');
        setDateOfBirth('');
        setPhoneNumber('');
        setError('');
    };

    const checkAdminExists = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/users');
            if (response.ok) {
                const users = await response.json();
                const adminUser = users.find(user => user.role === 'admin');
                setAdminExists(!!adminUser);
            }
        } catch (error) {
            console.error('Failed to check admin existence:', error);
        }
    };

    useEffect(() => {
        if (!isLoginView) {
            checkAdminExists();
        }
    }, [isLoginView]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-gray-100 dark:from-blue-900/50 dark:via-gray-900 dark:to-black opacity-50"></div>
            <Card className="w-full max-w-md text-center animate-fade-in z-10">
                <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">HealthChain AI</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    {isLoginView ? 'Welcome back! Please sign in.' : 'Create your secure account.'}
                </p>

                {error && <ErrorMessage message={error} />}

                {isLoginView ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-6 text-left mt-6">
                        <Input placeholder="Username" icon={User} value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
                        <Input placeholder="Password" type="password" icon={Lock} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                        <Button type="submit" icon={LogIn} disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleRegisterSubmit} className="space-y-6 text-left mt-6">
                        <Input placeholder="Full Name" icon={User} value={regName} onChange={(e) => setRegName(e.target.value)} />
                        <Input placeholder="Email Address" type="email" icon={Mail} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                        <Input placeholder="Username" icon={User} value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
                        <Input placeholder="Password" type="password" icon={Lock} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                        
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Stethoscope className="text-gray-400" size={20} />
                            </div>
                            <select value={regRole} onChange={(e) => setRegRole(e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all">
                                <option value="patient">I am a Patient</option>
                                <option value="doctor">I am a Doctor</option>
                                {!adminExists && <option value="admin">I am an Administrator</option>}
                            </select>
                            {adminExists && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Admin user already exists. Only one admin is allowed.
                                </p>
                            )}
                        </div>
                        
                        {/* Conditional fields for Doctor registration */}
                        {regRole === 'doctor' && (
                            <>
                                <Input placeholder="Medical License #" icon={Award} value={medicalLicense} onChange={(e) => setMedicalLicense(e.target.value)} />
                                <Input placeholder="Hospital Name" icon={Hospital} value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Stethoscope className="text-gray-400" size={20} />
                                    </div>
                                    <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 transition-all">
                                        <option value="General Medicine">General Medicine</option>
                                        <option value="Cardiology">Cardiology</option>
                                        <option value="Neurology">Neurology</option>
                                        <option value="Orthopedics">Orthopedics</option>
                                        <option value="Pediatrics">Pediatrics</option>
                                        <option value="Dermatology">Dermatology</option>
                                        <option value="Psychiatry">Psychiatry</option>
                                        <option value="Oncology">Oncology</option>
                                        <option value="Emergency Medicine">Emergency Medicine</option>
                                        <option value="Surgery">Surgery</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Conditional fields for Patient registration */}
                        {regRole === 'patient' && (
                            <>
                                <Input placeholder="Date of Birth" type="date" icon={Calendar} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                                <Input placeholder="Phone Number" type="tel" icon={Phone} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                            </>
                        )}

                        <Button type="submit" icon={UserPlus} disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </form>
                )}

                <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => { 
                        setIsLoginView(!isLoginView); 
                        if (!isLoginView) {
                            clearRegistrationForm();
                        }
                    }} className="font-semibold text-blue-600 hover:underline ml-2">
                        {isLoginView ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </Card>
        </div>
    );
};

export default LoginScreen;