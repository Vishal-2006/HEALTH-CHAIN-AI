import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { Clock, Save, X, Check } from 'lucide-react';
import appointmentService from '../services/appointmentService';

const DoctorAvailability = ({ doctorId, onAvailabilitySet }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [existingAppointments, setExistingAppointments] = useState([]);

    // Generate time slots from 9 AM to 5 PM with 30-minute intervals
    const generateTimeSlots = (date) => {
        const slots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute of [0, 30]) {
                const slotTime = setMinutes(setHours(date, hour), minute);
                if (slotTime > new Date()) { // Only future slots
                    slots.push(slotTime);
                }
            }
        }
        
        return slots;
    };

    const timeSlots = generateTimeSlots(selectedDate);

    // Load existing appointments for the selected date
    useEffect(() => {
        const loadExistingAppointments = async () => {
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const response = await appointmentService.getDoctorAvailability(doctorId, dateStr);
                setExistingAppointments(response.data || []);
            } catch (error) {
                console.error('Error loading existing appointments:', error);
            }
        };

        if (doctorId) {
            loadExistingAppointments();
        }
    }, [doctorId, selectedDate]);

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setSelectedTimeSlots([]);
        setMessage('');
    };

    const toggleTimeSlot = (timeSlot) => {
        setSelectedTimeSlots(prev => {
            const isSelected = prev.some(slot => slot.getTime() === timeSlot.getTime());
            if (isSelected) {
                return prev.filter(slot => slot.getTime() !== timeSlot.getTime());
            } else {
                return [...prev, timeSlot];
            }
        });
    };

    const isTimeSlotSelected = (timeSlot) => {
        return selectedTimeSlots.some(slot => slot.getTime() === timeSlot.getTime());
    };

    const isTimeSlotBooked = (timeSlot) => {
        return existingAppointments.some(appointment => {
            const appointmentStart = new Date(appointment.startTime);
            return appointmentStart.getTime() === timeSlot.getTime() && appointment.status === 'booked';
        });
    };

    const isTimeSlotAvailable = (timeSlot) => {
        return existingAppointments.some(appointment => {
            const appointmentStart = new Date(appointment.startTime);
            return appointmentStart.getTime() === timeSlot.getTime() && appointment.status === 'available';
        });
    };

    const handleSaveAvailability = async () => {
        if (selectedTimeSlots.length === 0) {
            setMessage('Please select at least one time slot');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const timeSlotsData = selectedTimeSlots.map(timeSlot => ({
                startTime: timeSlot.toISOString(),
                endTime: new Date(timeSlot.getTime() + 30 * 60 * 1000).toISOString() // 30 minutes duration
            }));

            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            await appointmentService.setAvailability(doctorId, dateStr, timeSlotsData);
            
            setMessage('Availability set successfully!');
            setSelectedTimeSlots([]);
            
            // Refresh existing appointments
            const response = await appointmentService.getDoctorAvailability(doctorId, dateStr);
            setExistingAppointments(response.data || []);
            
            if (onAvailabilitySet) {
                onAvailabilitySet();
            }
        } catch (error) {
            const errorMessage = error.message || 'Failed to set availability. Please try again.';
            setMessage(errorMessage);
            console.error('❌ Error setting availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTileClassName = ({ date }) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        
        if (dateStr === selectedDateStr) {
            return 'bg-blue-100 border-2 border-blue-500';
        }
        return '';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Clock className="mr-2" />
                Manage My Availability
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Date</h3>
                    <Calendar
                        onChange={handleDateChange}
                        value={selectedDate}
                        minDate={new Date()}
                        tileClassName={getTileClassName}
                        className="w-full border rounded-lg p-4"
                    />
                </div>

                {/* Time Slots */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Available Time Slots for {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {timeSlots.map((timeSlot) => (
                            <button
                                key={timeSlot.getTime()}
                                onClick={() => toggleTimeSlot(timeSlot)}
                                disabled={isTimeSlotBooked(timeSlot)}
                                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                                    isTimeSlotSelected(timeSlot)
                                        ? 'bg-green-100 border-green-500 text-green-800'
                                        : isTimeSlotBooked(timeSlot)
                                        ? 'bg-red-100 border-red-300 text-red-600 cursor-not-allowed'
                                        : isTimeSlotAvailable(timeSlot)
                                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        {format(timeSlot, 'h:mm a')}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        {isTimeSlotSelected(timeSlot) && (
                                            <Check className="w-4 h-4 text-green-600" />
                                        )}
                                        {isTimeSlotBooked(timeSlot) && (
                                            <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded">
                                                Booked
                                            </span>
                                        )}
                                        {isTimeSlotAvailable(timeSlot) && !isTimeSlotSelected(timeSlot) && (
                                            <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded">
                                                Available
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {timeSlots.length === 0 && (
                        <p className="text-gray-500 text-center py-4">
                            No available time slots for this date
                        </p>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">Selected</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                        <span className="text-sm text-gray-600">Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                        <span className="text-sm text-gray-600">Booked</span>
                    </div>
                </div>

                <button
                    onClick={handleSaveAvailability}
                    disabled={loading || selectedTimeSlots.length === 0}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Availability
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`mt-4 p-3 rounded-lg ${
                    message.includes('successfully') 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default DoctorAvailability;
