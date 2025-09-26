const API_BASE_URL = 'http://localhost:5001/api';

class AppointmentService {
    // Set doctor availability
    async setAvailability(doctorId, date, timeSlots) {
        try {
            console.log('📅 Setting availability:', { doctorId, date, timeSlotsCount: timeSlots.length });
            
            const response = await fetch(`${API_BASE_URL}/appointments/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctorId,
                    date,
                    timeSlots
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Server error response:', errorData);
                throw new Error(errorData.error || 'Failed to set availability');
            }

            const result = await response.json();
            console.log('✅ Availability set successfully:', result);
            return result;
        } catch (error) {
            console.error('❌ Error setting availability:', error);
            throw error;
        }
    }

    // Get doctor availability
    async getDoctorAvailability(doctorId, date = null) {
        try {
            let url = `${API_BASE_URL}/appointments/availability/${doctorId}`;
            if (date) {
                url += `?date=${date}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to get doctor availability');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting doctor availability:', error);
            throw error;
        }
    }

    // Book appointment
    async bookAppointment(appointmentId, patientId, reason, type = 'voice') {
        try {
            console.log('📅 Sending booking request:', { appointmentId, patientId, reason, type });
            
            const response = await fetch(`${API_BASE_URL}/appointments/book/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId,
                    reason,
                    type
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Server error response:', errorData);
                
                // Handle specific error cases
                if (response.status === 409) {
                    throw new Error('This appointment was modified by another request. Please try again.');
                } else if (response.status === 400) {
                    throw new Error(errorData.error || 'Appointment is not available for booking');
                } else {
                    throw new Error(errorData.error || 'Failed to book appointment');
                }
            }

            const result = await response.json();
            console.log('✅ Appointment booking successful:', result);
            return result;
        } catch (error) {
            console.error('❌ Error booking appointment:', error);
            throw error;
        }
    }

    // Get user appointments
    async getUserAppointments(userId, status = null, type = null) {
        try {
            let url = `${API_BASE_URL}/appointments/${userId}`;
            const params = new URLSearchParams();
            
            if (status) params.append('status', status);
            if (type) params.append('type', type);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to get user appointments');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting user appointments:', error);
            throw error;
        }
    }

    // Cancel appointment
    async cancelAppointment(appointmentId, userId, reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/cancel/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    reason
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Server error response:', errorData);
                throw new Error(errorData.error || 'Failed to cancel appointment');
            }

            return await response.json();
        } catch (error) {
            console.error('Error canceling appointment:', error);
            throw error;
        }
    }

    // Complete appointment
    async completeAppointment(appointmentId, doctorId, notes) {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/complete/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctorId,
                    notes
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Server error response:', errorData);
                throw new Error(errorData.error || 'Failed to complete appointment');
            }

            return await response.json();
        } catch (error) {
            console.error('Error completing appointment:', error);
            throw error;
        }
    }

    // Get available doctors
    async getAvailableDoctors() {
        try {
            const response = await fetch(`${API_BASE_URL}/doctors/available`);
            if (!response.ok) {
                throw new Error('Failed to get available doctors');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting available doctors:', error);
            throw error;
        }
    }

    // Check for duplicate appointments
    async checkForDuplicates(userId) {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/${userId}`);
            if (!response.ok) {
                throw new Error('Failed to get user appointments');
            }

            const appointments = await response.json();
            const data = appointments.data || [];
            
            // Group appointments by time slot
            const timeSlotGroups = new Map();
            const duplicates = [];
            
            data.forEach(appointment => {
                const key = `${appointment.doctorId}-${appointment.startTime}-${appointment.endTime}`;
                if (!timeSlotGroups.has(key)) {
                    timeSlotGroups.set(key, []);
                }
                timeSlotGroups.get(key).push(appointment);
            });
            
            // Find groups with more than one appointment
            for (const [key, group] of timeSlotGroups) {
                if (group.length > 1) {
                    duplicates.push({
                        timeSlot: key,
                        appointments: group,
                        count: group.length
                    });
                }
            }
            
            return {
                hasDuplicates: duplicates.length > 0,
                duplicates: duplicates,
                totalAppointments: data.length
            };
        } catch (error) {
            console.error('Error checking for duplicates:', error);
            throw error;
        }
    }

    // Cleanup duplicate appointments
    async cleanupDuplicates() {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/cleanup-duplicates-public`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to cleanup duplicates');
            }

            return await response.json();
        } catch (error) {
            console.error('Error cleaning up duplicates:', error);
            throw error;
        }
    }
}

export default new AppointmentService();
