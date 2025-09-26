import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, Key, CheckCircle, XCircle, Clock, Database } from 'lucide-react';
import blockchainService from '../services/blockchainService';

const BlockchainDashboard = ({ user }) => {
    const [blockchainStatus, setBlockchainStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [accessLevel, setAccessLevel] = useState('read');
    const [duration, setDuration] = useState(30);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadBlockchainStatus();
        if (user.role === 'doctor') {
            loadPermissions();
        }
    }, [user]);

    const loadBlockchainStatus = async () => {
        try {
            setLoading(true);
            const status = await blockchainService.getBlockchainStatus();
            setBlockchainStatus(status);
        } catch (error) {
            console.error('Failed to load blockchain status:', error);
            setMessage('Failed to connect to blockchain');
        } finally {
            setLoading(false);
        }
    };

    const loadPermissions = async () => {
        // This would load the doctor's permissions
        // For demo purposes, we'll use mock data
        setPermissions([
            {
                patientId: 'patient1',
                patientName: 'John Doe',
                accessLevel: 'read',
                grantedAt: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                isActive: true
            }
        ]);
    };

    const handleGrantPermission = async () => {
        if (!selectedPatient) {
            setMessage('Please select a patient');
            return;
        }

        try {
            setLoading(true);
            const result = await blockchainService.grantPermission(
                user.id,
                selectedPatient,
                accessLevel,
                duration
            );

            setMessage(`Permission granted successfully! Transaction: ${blockchainService.formatTransactionHash(result.transactionHash)}`);
            loadPermissions();
        } catch (error) {
            setMessage('Failed to grant permission');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToBlockchain = async (healthData) => {
        try {
            setLoading(true);
            const result = await blockchainService.addHealthRecord(
                user.id,
                user.id, // doctorId
                healthData,
                { timestamp: new Date().toISOString() }
            );

            setMessage(`Health record added to blockchain! Transaction: ${blockchainService.formatTransactionHash(result.transactionHash)}`);
        } catch (error) {
            setMessage('Failed to add health record to blockchain');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading blockchain status...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Blockchain Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="text-blue-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">Blockchain Status</h2>
                </div>
                
                {blockchainStatus ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="text-green-600" size={20} />
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <p className="font-semibold text-green-700">Connected</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <Shield className="text-blue-600" size={20} />
                            <div>
                                <p className="text-sm text-gray-600">Network</p>
                                <p className="font-semibold text-blue-700">
                                    {blockchainStatus.network?.name || 'Local'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                            <Clock className="text-purple-600" size={20} />
                            <div>
                                <p className="text-sm text-gray-600">Block</p>
                                <p className="font-semibold text-purple-700">
                                    #{blockchainStatus.blockNumber || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                        <XCircle className="text-red-600" size={20} />
                        <span className="text-red-700">Blockchain not connected</span>
                    </div>
                )}
            </div>

            {/* Doctor-specific features */}
            {user.role === 'doctor' && (
                <>
                    {/* Grant Permission */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Key className="text-green-600" size={24} />
                            <h2 className="text-xl font-semibold text-gray-800">Grant Access Permission</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Patient ID
                                </label>
                                <input
                                    type="text"
                                    value={selectedPatient}
                                    onChange={(e) => setSelectedPatient(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter patient ID"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Access Level
                                </label>
                                <select
                                    value={accessLevel}
                                    onChange={(e) => setAccessLevel(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="read">Read Only</option>
                                    <option value="write">Read & Write</option>
                                    <option value="full">Full Access</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Duration (days)
                                </label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min="1"
                                    max="365"
                                />
                            </div>
                            
                            <div className="flex items-end">
                                <button
                                    onClick={handleGrantPermission}
                                    disabled={loading || !selectedPatient}
                                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Granting...' : 'Grant Permission'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active Permissions */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="text-blue-600" size={24} />
                            <h2 className="text-xl font-semibold text-gray-800">Active Permissions</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Patient
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Access Level
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Granted
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Expires
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {permissions.map((permission, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {permission.patientName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    permission.accessLevel === 'full' ? 'bg-red-100 text-red-800' :
                                                    permission.accessLevel === 'write' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                    {permission.accessLevel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {blockchainService.formatTimestamp(permission.grantedAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {blockchainService.formatTimestamp(permission.expiryDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    permission.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {permission.isActive ? 'Active' : 'Expired'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Message Display */}
            {message && (
                <div className={`p-4 rounded-md ${
                    message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default BlockchainDashboard;
