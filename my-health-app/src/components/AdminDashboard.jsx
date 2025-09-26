import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, Settings, Database, Server } from 'lucide-react';

const AdminDashboard = ({ user }) => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        patients: 0,
        doctors: 0,
        admins: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/users');
            if (response.ok) {
                const users = await response.json();
                const stats = {
                    totalUsers: users.length,
                    patients: users.filter(u => u.role === 'patient').length,
                    doctors: users.filter(u => u.role === 'doctor').length,
                    admins: users.filter(u => u.role === 'admin').length
                };
                setStats(stats);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="text-white" size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="text-center">
                    <Activity className="animate-spin mx-auto mb-4" size={40} />
                    <p>Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <Shield size={32} />
                    <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                </div>
                <p className="text-blue-100">
                    Welcome, {user.name}! You have full administrative access to the HealthChain AI system.
                </p>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Patients"
                    value={stats.patients}
                    icon={Users}
                    color="bg-green-500"
                />
                <StatCard
                    title="Doctors"
                    value={stats.doctors}
                    icon={Users}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Admins"
                    value={stats.admins}
                    icon={Shield}
                    color="bg-red-500"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        System Management
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Database className="text-blue-500" size={20} />
                                <span className="text-gray-700 dark:text-gray-300">Database Status</span>
                            </div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Server className="text-green-500" size={20} />
                                <span className="text-gray-700 dark:text-gray-300">Server Status</span>
                            </div>
                            <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                            <Users size={20} />
                            <span>View All Users</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                            <Settings size={20} />
                            <span>System Settings</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Recent System Activity
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                            System running normally - All services operational
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">Just now</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                            User registration system active
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">2 min ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-700 dark:text-gray-300">
                            Database connection established
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">5 min ago</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
