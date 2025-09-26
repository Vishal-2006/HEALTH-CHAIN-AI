import React, { useState, useEffect } from 'react';
import { Users, User, Mail, Calendar, Phone, Award, Hospital, Stethoscope, Trash2, RefreshCw, Edit, MoreVertical } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5001/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearAllUsers = async () => {
        if (!window.confirm('Are you sure you want to delete ALL users? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch('http://localhost:5001/api/clear-all-users', {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to clear users');
            await fetchUsers(); // Refresh the list
            alert('All users cleared successfully');
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteUser = async (userId, username) => {
        if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            setError(''); // Clear any previous errors
            const response = await fetch(`http://localhost:5001/api/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to delete user (Status: ${response.status})`);
            }
            
            await fetchUsers(); // Refresh the list
            alert(`User "${username}" deleted successfully`);
        } catch (err) {
            console.error('Delete user error:', err);
            setError(`Failed to delete user: ${err.message}`);
        }
    };

    const updateUser = async (userId, username) => {
        // For now, just show an alert. You can implement a modal form later
        alert(`Update functionality for user "${username}" will be implemented soon.`);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={40} />
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="text-blue-600" size={32} />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    User Management
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Manage all registered users in the system
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={fetchUsers}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <RefreshCw size={20} />
                                Refresh
                            </button>
                            <button
                                onClick={clearAllUsers}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <Trash2 size={20} />
                                Clear All Users
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {/* Users List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Registered Users ({users.length})
                        </h2>
                    </div>
                    
                    {users.length === 0 ? (
                        <div className="p-8 text-center">
                            <Users className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-gray-500 dark:text-gray-400">No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Details
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Registered
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                            <User className="text-blue-600 dark:text-blue-400" size={20} />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {user.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            @{user.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    user.role === 'doctor' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : user.role === 'patient'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                                }`}>
                                                    {user.role === 'doctor' && <Stethoscope size={12} className="mr-1" />}
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                                    <Mail className="mr-2" size={16} />
                                                    {user.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {user.role === 'doctor' && (
                                                    <div className="space-y-1">
                                                        {user.specialization && (
                                                            <div className="flex items-center">
                                                                <Stethoscope size={14} className="mr-1" />
                                                                {user.specialization}
                                                            </div>
                                                        )}
                                                        {user.hospitalName && (
                                                            <div className="flex items-center">
                                                                <Hospital size={14} className="mr-1" />
                                                                {user.hospitalName}
                                                            </div>
                                                        )}
                                                        {user.medicalLicense && (
                                                            <div className="flex items-center">
                                                                <Award size={14} className="mr-1" />
                                                                {user.medicalLicense}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {user.role === 'patient' && (
                                                    <div className="space-y-1">
                                                        {user.dateOfBirth && (
                                                            <div className="flex items-center">
                                                                <Calendar size={14} className="mr-1" />
                                                                {formatDate(user.dateOfBirth)}
                                                            </div>
                                                        )}
                                                        {user.phoneNumber && (
                                                            <div className="flex items-center">
                                                                <Phone size={14} className="mr-1" />
                                                                {user.phoneNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateUser(user.id, user.username)}
                                                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteUser(user.id, user.username)}
                                                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
