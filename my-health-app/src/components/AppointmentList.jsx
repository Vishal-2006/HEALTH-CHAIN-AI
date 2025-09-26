import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, User, Video, CheckCircle, XCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import appointmentService from '../services/appointmentService';

const AppointmentList = ({ userId, userRole, onAppointmentUpdate }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled
    const [message, setMessage] = useState('');

    // Load appointments
    useEffect(() => {
        loadAppointments();
    }, [userId, filter]);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            let status = null;
            
            if (filter === 'upcoming') {
                status = 'booked';
            } else if (filter === 'completed') {
                status = 'completed';
            } else if (filter === 'cancelled') {
                status = 'cancelled';
            }

            const response = await appointmentService.getUserAppointments(userId, status);
            setAppointments(response.data || []);
        } catch (error) {
            console.error('Error loading appointments:', error);
            setMessage('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAppointment = async (appointmentId, reason = 'Cancelled by user') => {
        try {
            await appointmentService.cancelAppointment(appointmentId, userId, reason);
            setMessage('Appointment cancelled successfully');
            loadAppointments();
            if (onAppointmentUpdate) {
                onAppointmentUpdate();
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            setMessage('Failed to cancel appointment');
        }
    };

    const handleCompleteAppointment = async (appointmentId, notes = '') => {
        try {
            await appointmentService.completeAppointment(appointmentId, userId, notes);
            setMessage('Appointment completed successfully');
            loadAppointments();
            if (onAppointmentUpdate) {
                onAppointmentUpdate();
            }
        } catch (error) {
            console.error('Error completing appointment:', error);
            setMessage('Failed to complete appointment');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'booked':
                return <Clock className="w-4 h-4 text-blue-600" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'available':
                return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'booked':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'available':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatAppointmentTime = (startTime, endTime) => {
        const start = parseISO(startTime);
        const end = parseISO(endTime);
        return {
            date: format(start, 'MMM d, yyyy'),
            time: `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
            isPast: start < new Date()
        };
    };

    const upcomingAppointments = appointments.filter(appointment => {
        const startTime = parseISO(appointment.startTime);
        return startTime > new Date() && appointment.status === 'booked';
    });

    const pastAppointments = appointments.filter(appointment => {
        const startTime = parseISO(appointment.startTime);
        return startTime <= new Date() || appointment.status !== 'booked';
    });

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading appointments...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Calendar className="mr-2" />
                    My Appointments
                </h2>
                
                {/* Filter Tabs */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'upcoming', label: 'Upcoming' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'cancelled', label: 'Cancelled' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                filter === tab.key
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg ${
                    message.includes('successfully') 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                    {message}
                </div>
            )}

            {/* Section Header */}
            {filter === 'all' && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        {upcomingAppointments.length > 0 ? 'All Appointments' : 'No Appointments'}
                    </h3>
                </div>
            )}

            {/* Appointments List */}
            <div>
                {filter !== 'all' && <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} Appointments
                </h3>}
                
                {appointments.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No {filter === 'all' ? '' : filter} appointments found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {appointments.map((appointment) => {
                            const timeInfo = formatAppointmentTime(appointment.startTime, appointment.endTime);
                            const isUpcoming = appointment.status === 'booked' && !timeInfo.isPast;
                            
                            return (
                                <div key={appointment.id} className={`border rounded-lg p-4 ${
                                    isUpcoming
                                        ? 'bg-blue-50 border-blue-200'
                                        : appointment.status === 'completed'
                                        ? 'bg-green-50 border-green-200'
                                        : appointment.status === 'cancelled'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                                {getStatusIcon(appointment.status)}
                                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">
                                                        <User className="w-4 h-4 inline mr-1" />
                                                        {userRole === 'doctor' ? 'Patient' : 'Doctor'}: {userRole === 'doctor' ? appointment.patientName || 'Unknown' : appointment.doctorName || 'Unknown'}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4 inline mr-1" />
                                                        {timeInfo.date}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <Clock className="w-4 h-4 inline mr-1" />
                                                        {timeInfo.time}
                                                    </p>
                                                </div>
                                                
                                                <div>
                                                    <p className="text-sm text-gray-600">
                                                        <Video className="w-4 h-4 inline mr-1" />
                                                        {appointment.type === 'voice' ? 'Voice Call' : 
                                                         appointment.type === 'video' ? 'Video Call' : 
                                                         appointment.type === 'visit' ? 'On Visit' : 'Video Call'}
                                                    </p>
                                                    {appointment.reason && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            <strong>Reason:</strong> {appointment.reason}
                                                        </p>
                                                    )}
                                                    {appointment.notes && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            <strong>Notes:</strong> {appointment.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex space-x-2 ml-4">
                                            {isUpcoming && (
                                                <>
                                                    {userRole === 'doctor' && (
                                                        <button
                                                            onClick={() => handleCompleteAppointment(appointment.id)}
                                                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                            title="Complete Appointment"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCancelAppointment(appointment.id)}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                        title="Cancel Appointment"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentList;
