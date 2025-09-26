import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import { format, parseISO } from 'date-fns';
import { User, Clock, BookOpen, X, Phone, Video, MapPin, ArrowLeft, CheckCircle } from 'lucide-react';
import appointmentService from '../services/appointmentService';

const AppointmentBooking = ({ patientId, patientPermissions = [], onAppointmentBooked }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [reason, setReason] = useState('');
    const [appointmentType, setAppointmentType] = useState('voice');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [step, setStep] = useState(1);
    
    const isBookingInProgress = useRef(false);
    const bookedSlots = useRef(new Set());

    // Load available doctors
    useEffect(() => {
        const loadDoctors = async () => {
            try {
                const response = await appointmentService.getAvailableDoctors();
                const allDoctors = response.data || [];
                const accessibleDoctors = allDoctors.filter(doctor => 
                    patientPermissions.includes(doctor.id)
                );
                setDoctors(accessibleDoctors);
            } catch (error) {
                console.error('Error loading doctors:', error);
                setMessage('Failed to load doctors. Please try again.');
            }
        };
        loadDoctors();
    }, [patientPermissions]);

    // Load available slots
    useEffect(() => {
        const loadAvailableSlots = async () => {
            if (!selectedDoctor) return;
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const response = await appointmentService.getDoctorAvailability(selectedDoctor.id, dateStr);
                const slots = response.data || [];
                const availableSlots = slots.filter(slot => !bookedSlots.current.has(slot.id));
                setAvailableSlots(availableSlots);
            } catch (error) {
                console.error('Error loading available slots:', error);
                setAvailableSlots([]);
            }
        };
        if (selectedDoctor) {
            loadAvailableSlots();
        }
    }, [selectedDoctor, selectedDate]);

    const handleDoctorSelect = (doctor) => {
        setSelectedDoctor(doctor);
        setSelectedSlot(null);
        setStep(2);
        setMessage('');
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        setMessage('');
    };

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        setStep(3);
    };

    const handleBookAppointment = async () => {
        if (!selectedSlot || !reason.trim()) {
            setMessage('Please provide a reason for the appointment');
            return;
        }

        if (loading || isBookingInProgress.current) {
            return;
        }

        if (bookedSlots.current.has(selectedSlot.id)) {
            setMessage('This slot has already been booked. Please select another time.');
            return;
        }

        setLoading(true);
        isBookingInProgress.current = true;
        setMessage('');

        try {
            await appointmentService.bookAppointment(selectedSlot.id, patientId, reason, appointmentType);
            setMessage('Appointment booked successfully!');
            bookedSlots.current.add(selectedSlot.id);
            
            // Reset form
            setSelectedDoctor(null);
            setSelectedDate(new Date());
            setSelectedSlot(null);
            setReason('');
            setAppointmentType('voice');
            setStep(1);
            
            if (onAppointmentBooked) {
                onAppointmentBooked();
            }
        } catch (error) {
            const errorMessage = error.message || 'Failed to book appointment. Please try again.';
            setMessage(errorMessage);
        } finally {
            setLoading(false);
            isBookingInProgress.current = false;
        }
    };

    const goBack = () => {
        if (step === 3) {
            setStep(2);
            setSelectedSlot(null);
        } else if (step === 2) {
            setStep(1);
            setSelectedDoctor(null);
            setSelectedDate(new Date());
            setAppointmentType('voice');
        }
        setMessage('');
    };

    const getTileClassName = ({ date }) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        return dateStr === selectedDateStr ? 'bg-blue-100 border-2 border-blue-500' : '';
    };

    const getAppointmentTypeLabel = (type) => {
        switch (type) {
            case 'voice': return 'Voice Call';
            case 'video': return 'Video Call';
            case 'visit': return 'On Visit';
            default: return 'Voice Call';
        }
    };

    const getAppointmentTypeIcon = (type) => {
        switch (type) {
            case 'voice': return <Phone className="w-5 h-5" />;
            case 'video': return <Video className="w-5 h-5" />;
            case 'visit': return <MapPin className="w-5 h-5" />;
            default: return <Phone className="w-5 h-5" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Book an Appointment</h1>
                            <p className="text-blue-100 text-sm">Schedule your consultation</p>
                    </div>
                        </div>
                    <div className="flex items-center space-x-2">
                        <div className="bg-white/20 px-3 py-1 rounded-full">
                            <span className="text-white text-sm font-medium">Step {step} of 3</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="flex items-center justify-center space-x-8">
                    {[
                        { step: 1, label: 'Select Doctor', icon: User },
                        { step: 2, label: 'Choose Time', icon: Clock },
                        { step: 3, label: 'Confirm', icon: CheckCircle }
                    ].map(({ step: stepNum, label, icon: Icon }) => (
                        <div key={stepNum} className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                                step >= stepNum 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-400'
                            }`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${
                                step >= stepNum ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
            {/* Step 1: Select Doctor */}
            {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Doctor</h2>
                            <p className="text-gray-600">Select a doctor from your approved list</p>
                        </div>
                        
                        {doctors.length === 0 ? (
                            <div className="text-center py-12">
                                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Doctors Available</h3>
                                <p className="text-gray-500 mb-4">
                                    You need to grant access to doctors first before booking appointments.
                                </p>
                            </div>
                        ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                onClick={() => handleDoctorSelect(doctor)}
                                        className="group cursor-pointer bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200"
                                    >
                                        <div className="flex items-center mb-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                                                <User className="w-6 h-6 text-blue-600" />
                                            </div>
                                    <div>
                                                <h3 className="font-semibold text-gray-900 text-lg">Dr. {doctor.name}</h3>
                                                <p className="text-blue-600 font-medium">{doctor.specialization}</p>
                                    </div>
                                </div>
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <p className="flex items-center">
                                                <span className="font-medium">Hospital:</span>
                                                <span className="ml-2">{doctor.hospitalName}</span>
                                            </p>
                                            <p className="flex items-center text-green-600 font-medium">
                                                <Clock className="w-4 h-4 mr-2" />
                                        {doctor.availableSlots} slots available
                                    </p>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: Select Date and Time */}
            {step === 2 && selectedDoctor && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
                                <p className="text-gray-600">Choose when you'd like to meet with Dr. {selectedDoctor.name}</p>
                            </div>
                        <button
                            onClick={goBack}
                                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                        </button>
                    </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-blue-900">Dr. {selectedDoctor.name}</p>
                                    <p className="text-blue-700 text-sm">{selectedDoctor.specialization}</p>
                                </div>
                            </div>
                    </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Calendar */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Select Date</h3>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <Calendar
                                onChange={handleDateChange}
                                value={selectedDate}
                                minDate={new Date()}
                                tileClassName={getTileClassName}
                                        className="w-full"
                            />
                                </div>
                        </div>

                        {/* Time Slots */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                Available Times for {format(selectedDate, 'MMMM d, yyyy')}
                                </h3>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {availableSlots.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p>No available slots for this date</p>
                                        </div>
                                    ) : (
                                        availableSlots.map((slot) => (
                                    <button
                                        key={slot.id}
                                        onClick={() => handleSlotSelect(slot)}
                                                className="w-full p-4 text-left bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                                    >
                                        <div className="flex items-center justify-between">
                                                    <span className="font-medium text-gray-900">
                                                {format(parseISO(slot.startTime), 'h:mm a')} - {format(parseISO(slot.endTime), 'h:mm a')}
                                            </span>
                                                    <Clock className="w-5 h-5 text-blue-600" />
                                        </div>
                                    </button>
                                        ))
                                    )}
                                </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Confirm Booking */}
            {step === 3 && selectedSlot && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Appointment</h2>
                                <p className="text-gray-600">Review and confirm your appointment details</p>
                            </div>
                        <button
                            onClick={goBack}
                                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                        </button>
                    </div>

                        {/* Appointment Details */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <User className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-gray-600">Doctor</p>
                                            <p className="font-medium text-gray-900">Dr. {selectedDoctor.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm text-gray-600">Date & Time</p>
                                            <p className="font-medium text-gray-900">
                                                {format(parseISO(selectedSlot.startTime), 'MMMM d, yyyy')}
                                            </p>
                                            <p className="font-medium text-gray-900">
                                                {format(parseISO(selectedSlot.startTime), 'h:mm a')} - {format(parseISO(selectedSlot.endTime), 'h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        {getAppointmentTypeIcon(appointmentType)}
                                        <div>
                                            <p className="text-sm text-gray-600">Type</p>
                                            <p className="font-medium text-gray-900">{getAppointmentTypeLabel(appointmentType)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 text-xs font-bold">H</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Hospital</p>
                                            <p className="font-medium text-gray-900">{selectedDoctor.hospitalName}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Appointment Type Selection */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Appointment Type</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { value: 'voice', label: 'Voice Call', icon: Phone, description: 'Phone consultation' },
                                    { value: 'video', label: 'Video Call', icon: Video, description: 'Video consultation' },
                                    { value: 'visit', label: 'On Visit', icon: MapPin, description: 'In-person visit' }
                                ].map(({ value, label, icon: Icon, description }) => (
                                    <label
                                        key={value}
                                        className={`relative cursor-pointer border-2 rounded-xl p-4 transition-all duration-200 ${
                                            appointmentType === value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="appointmentType"
                                            value={value}
                                            checked={appointmentType === value}
                                            onChange={(e) => setAppointmentType(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="text-center">
                                            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors ${
                                                appointmentType === value ? 'bg-blue-100' : 'bg-gray-100'
                                            }`}>
                                                <Icon className={`w-6 h-6 ${
                                                    appointmentType === value ? 'text-blue-600' : 'text-gray-600'
                                                }`} />
                                            </div>
                                            <h4 className={`font-medium mb-1 ${
                                                appointmentType === value ? 'text-blue-900' : 'text-gray-900'
                                            }`}>
                                                {label}
                                            </h4>
                                            <p className={`text-sm ${
                                                appointmentType === value ? 'text-blue-700' : 'text-gray-500'
                                            }`}>
                                                {description}
                                            </p>
                                        </div>
                                        {appointmentType === value && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </label>
                                ))}
                        </div>
                    </div>

                        {/* Reason for Visit */}
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-lg font-semibold text-gray-900">Reason for Visit</span>
                                <span className="text-red-500 ml-1">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please describe the reason for your appointment..."
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors resize-none"
                                rows="4"
                            required
                        />
                    </div>

                        {/* Confirm Button */}
                    <button
                        onClick={handleBookAppointment}
                        disabled={loading || !reason.trim()}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    <span>Booking Appointment...</span>
                                </>
                        ) : (
                                <>
                                    <BookOpen className="w-6 h-6" />
                                    <span>Confirm Booking</span>
                                </>
                        )}
                    </button>
                </div>
            )}

            {/* Message */}
            {message && (
                    <div className={`mt-6 p-4 rounded-xl border ${
                    message.includes('successfully') 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-center space-x-2">
                            {message.includes('successfully') ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <X className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium">{message}</span>
                        </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default AppointmentBooking;
