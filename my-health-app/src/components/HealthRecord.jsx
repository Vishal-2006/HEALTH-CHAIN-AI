import React from 'react';
import { FileText, BarChart2, HeartPulse, Droplet, Activity, Gauge, Stethoscope } from 'lucide-react';

const HealthRecord = ({ record, userRole = 'patient' }) => {
    const getRiskLevel = (risk) => {
        if (risk > 70) return 'High Risk';
        if (risk > 40) return 'Moderate Risk';
        return 'Low Risk';
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'moderate': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getUrgencyIcon = (urgency) => {
        switch (urgency?.toLowerCase()) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'moderate': return '⚡';
            case 'low': return '✅';
            default: return 'ℹ️';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Helper to display value or N/A
    const displayValue = (value) => {
        return value !== null && value !== undefined ? value : 'N/A';
    };

    // Helper function to get appropriate icon for different metric types
    const getMetricIcon = (metricName) => {
        const name = metricName.toLowerCase();
        if (name.includes('blood') && name.includes('sugar') || name.includes('glucose')) {
            return <Droplet size={14}/>;
        } else if (name.includes('blood') && name.includes('pressure') || name.includes('systolic') || name.includes('diastolic')) {
            return <Gauge size={14}/>;
        } else if (name.includes('cholesterol') || name.includes('lipid')) {
            return <Activity size={14}/>;
        } else if (name.includes('heart') && name.includes('rate') || name.includes('pulse')) {
            return <HeartPulse size={14}/>;
        } else if (name.includes('hemoglobin') || name.includes('hgb')) {
            return <Droplet size={14}/>;
        } else if (name.includes('temperature') || name.includes('temp')) {
            return <Activity size={14}/>;
        } else if (name.includes('weight')) {
            return <Activity size={14}/>;
        } else if (name.includes('height')) {
            return <Activity size={14}/>;
        } else if (name.includes('bmi')) {
            return <Activity size={14}/>;
        } else {
            return <Activity size={14}/>; // Default icon
        }
    };

    // Helper function to format metric labels
    const formatMetricLabel = (metricName) => {
        // Convert camelCase to Title Case
        return metricName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    // Helper function to get default units for common metrics
    const getDefaultUnit = (metricName) => {
        const name = metricName.toLowerCase();
        if (name.includes('blood') && name.includes('sugar') || name.includes('glucose')) {
            return 'mg/dL';
        } else if (name.includes('blood') && name.includes('pressure') || name.includes('systolic') || name.includes('diastolic')) {
            return 'mmHg';
        } else if (name.includes('cholesterol') || name.includes('lipid')) {
            return 'mg/dL';
        } else if (name.includes('heart') && name.includes('rate') || name.includes('pulse')) {
            return 'bpm';
        } else if (name.includes('hemoglobin') || name.includes('hgb')) {
            return 'g/dL';
        } else if (name.includes('temperature') || name.includes('temp')) {
            return '°F';
        } else if (name.includes('weight')) {
            return 'lbs';
        } else if (name.includes('height')) {
            return 'in';
        } else if (name.includes('bmi')) {
            return '';
        } else {
            return '';
        }
    };

    const MetricCard = ({ icon, label, value, unit }) => (
        <div className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {icon}
                <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151' }}>
                    {formatMetricLabel(label)}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                    {displayValue(value)}
                </span>
                {unit && (
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {unit}
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="health-record">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText style={{ color: '#6b7280' }} size={16} />
                    <span style={{ fontWeight: '500', color: '#111827' }}>
                        Health Report
                    </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {formatDate(record.timestamp)}
                </span>
            </div>

            {/* Health Metrics Grid */}
            <div className="health-metrics-grid">
                {(() => {
                    const metrics = [];
                    
                    // Process the data object to extract all metrics
                    Object.entries(record.data).forEach(([key, value]) => {
                        // Handle different data formats
                        if (value && typeof value === 'object' && value.value !== undefined) {
                            // Format: { "Blood Sugar": { "value": "95", "unit": "mg/dL" } }
                            metrics.push({
                                label: key,
                                value: value.value,
                                unit: value.unit || getDefaultUnit(key),
                                icon: getMetricIcon(key)
                            });
                        } else if (value && typeof value === 'string' && value.includes('/')) {
                            // Special handling for Blood Pressure format: "118/78"
                            metrics.push({
                                label: key,
                                value: value,
                                unit: getDefaultUnit(key),
                                icon: getMetricIcon(key)
                            });
                        } else if (value && typeof value === 'object' && value.value && value.value.includes('/')) {
                            // Handle Blood Pressure in object format with string value
                            metrics.push({
                                label: key,
                                value: value.value,
                                unit: value.unit || "mmHg",
                                icon: getMetricIcon(key)
                            });
                        } else if (value && typeof value === 'object' && value.systolic && value.diastolic) {
                            // Format: { "Blood Pressure": { "systolic": 118, "diastolic": 78 } }
                            metrics.push({
                                label: key,
                                value: `${value.systolic}/${value.diastolic}`,
                                unit: value.unit || getDefaultUnit(key),
                                icon: getMetricIcon(key)
                            });
                        } else if (value !== null && value !== undefined) {
                            // Format: { "Blood Sugar": 95 } or simple string/number values
                            metrics.push({
                                label: key,
                                value: value,
                                unit: getDefaultUnit(key),
                                icon: getMetricIcon(key)
                            });
                        }
                    });
                    
                    // If no metrics found, show a message
                    if (metrics.length === 0) {
                        return (
                            <div className="col-span-4 text-center py-4 text-gray-500">
                                <p>No medical metrics extracted from this document</p>
                                <p className="text-sm">Try uploading a different medical report</p>
                            </div>
                        );
                    }
                    
                    // Render all extracted metrics
                    return metrics.map((metric, index) => (
                        <MetricCard 
                            key={index}
                            icon={metric.icon}
                            label={metric.label}
                            value={metric.value}
                            unit={metric.unit}
                        />
                    ));
                })()}
            </div>
            
            {/* AI Analysis - Only show to doctors */}
            {userRole === 'doctor' && record.prediction && (
                <div className="health-record-prediction">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ padding: '0.375rem', backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6' }}>
                            <BarChart2 style={{ color: '#2563eb' }} size={18} />
                        </div>
                        <div style={{ flex: '1' }}>
                            {/* Primary Risk */}
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <h4 style={{ fontWeight: '600', color: '#111827' }}>
                                    AI Analysis: {record.prediction.primaryRisk?.disease || 'Health Assessment'}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ 
                                        fontSize: '1.125rem', 
                                        fontWeight: '700',
                                        color: record.prediction.primaryRisk?.riskPercentage > 70 ? '#dc2626' : 
                                               record.prediction.primaryRisk?.riskPercentage > 40 ? '#d97706' : '#16a34a'
                                    }}>
                                        {record.prediction.primaryRisk?.riskPercentage || 0}% Risk
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                        ({record.prediction.primaryRisk?.confidence || 0}% confidence)
                                    </span>
                                </div>
                            </div>

                            {/* Medical Notes */}
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.75rem' }}>
                                {record.prediction.medicalNotes || 'AI analysis completed.'}
                            </p>

                            {/* Secondary Risks */}
                            {record.prediction.secondaryRisks && record.prediction.secondaryRisks.length > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                        Additional Concerns:
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {record.prediction.secondaryRisks.map((risk, index) => (
                                            <span key={index} style={{ 
                                                fontSize: '0.75rem', 
                                                padding: '0.25rem 0.5rem', 
                                                borderRadius: '0.375rem',
                                                backgroundColor: getSeverityColor(risk.severity).split(' ')[0],
                                                color: getSeverityColor(risk.severity).split(' ')[1]
                                            }}>
                                                {risk.disease} ({risk.riskPercentage}%)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {record.prediction.recommendations && record.prediction.recommendations.length > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                        AI Recommendations:
                                    </p>
                                    <ul style={{ fontSize: '0.75rem', color: '#4b5563', paddingLeft: '1rem' }}>
                                        {record.prediction.recommendations.map((rec, index) => (
                                            <li key={index} style={{ marginBottom: '0.125rem' }}>• {rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Next Steps */}
                            {record.prediction.nextSteps && (
                                <div style={{ 
                                    padding: '0.5rem', 
                                    backgroundColor: record.prediction.urgency === 'critical' ? '#fef2f2' : 
                                                   record.prediction.urgency === 'high' ? '#fffbeb' : '#f0fdf4',
                                    border: '1px solid',
                                    borderColor: record.prediction.urgency === 'critical' ? '#fecaca' : 
                                                record.prediction.urgency === 'high' ? '#fed7aa' : '#bbf7d0',
                                    borderRadius: '0.375rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '1rem' }}>{getUrgencyIcon(record.prediction.urgency)}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151' }}>
                                            AI Suggested Next Steps:
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                                        {record.prediction.nextSteps}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Patient Message - Show when AI analysis exists but user is patient */}
            {userRole === 'patient' && record.prediction && (
                <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#eff6ff', 
                    border: '1px solid #bfdbfe', 
                    borderRadius: '0.5rem',
                    marginTop: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <BarChart2 style={{ color: '#2563eb' }} size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e40af' }}>
                            AI Analysis Available
                        </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem' }}>
                        Your doctor has access to AI-powered health analysis for this report.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                        Please consult with your healthcare provider for medical recommendations and interpretation of your results.
                    </p>
                </div>
            )}
            
            {/* Doctor's Prescription - Show to patients */}
            {userRole === 'patient' && record.prescription && (
                <div style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #7dd3fc', 
                    borderRadius: '0.5rem',
                    marginTop: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Stethoscope style={{ color: '#0284c7' }} size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e' }}>
                            Doctor's Prescription
                        </span>
                    </div>
                    <div style={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #bae6fd', 
                        borderRadius: '0.375rem', 
                        padding: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        <p style={{ 
                            fontSize: '0.875rem', 
                            color: '#0f172a', 
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {record.prescription}
                        </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                            Prescribed by: {record.prescribedBy || 'Your Doctor'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                            {new Date(record.prescriptionDate || record.timestamp).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthRecord;