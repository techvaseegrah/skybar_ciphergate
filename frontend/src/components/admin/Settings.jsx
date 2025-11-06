// Settings.jsx
import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import {
    FiMail,
    FiSettings,
    FiSave,
    FiRefreshCw,
    FiAlertTriangle,
    FiDollarSign,
    FiUser,
    FiToggleLeft,
    FiToggleRight,
    FiPlus,
    FiTrash2,
    FiClock,
    FiMapPin,
    FiCrosshair,
    FiLock,
    FiUsers,
    FiCheckSquare,
    FiSquare
} from 'react-icons/fi';
import Button from '../common/Button';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import appContext from '../../context/AppContext';
import api from '../../services/api';
import { getAuthToken } from '../../utils/authUtils';
import { getWorkers } from '../../services/workerService';

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null); // State for current location
    const [workers, setWorkers] = useState([]); // State for all workers
    const [searchTerm, setSearchTerm] = useState(''); // State for worker search
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false); // State for employee dropdown visibility

    const { subdomain } = useContext(appContext);

    // Original settings (for comparison)
    const [originalSettings, setOriginalSettings] = useState({});

    // Helper function to format coordinate values for display
    const formatCoordinate = (value) => {
        if (value === undefined || value === null) return '0.000000';
        // Convert to number if it's a string
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        // Check if it's a valid number
        if (isNaN(numValue)) return '0.000000';
        // For coordinate values, use 6 decimal places
        return parseFloat(numValue.toFixed(6)).toString();
    };

    // Current form data
    const [settings, setSettings] = useState({
        // Email settings
        emailReportsEnabled: false,

        // Attendance and productivity settings
        considerOvertime: false,
        deductSalary: true,
        permissionTimeMinutes: 15,
        salaryDeductionPerBreak: 10,

        // Auto punch-out settings
        autoPunchOut: {
            isEnabled: false,
            outTime: '23:00', // 11:00 PM
            selectedWorkers: []
        },

        // Location settings
        attendanceLocation: {
            enabled: false,
            latitude: 0,
            longitude: 0,
            radius: 100,
            locked: false // Add locked status
        },

        // Batches and intervals
        batches: [
            {
                batchName: 'Full Time',
                from: '09:00',
                to: '19:00',
                lunchFrom: '12:00',
                lunchTo: '13:00',
                isLunchConsider: false
            }
        ],
        intervals: [
            {
                intervalName: 'interval1',
                from: '10:15',
                to: '10:30',
                isBreakConsider: false
            },
            {
                intervalName: 'interval2',
                from: '14:15',
                to: '14:30',
                isBreakConsider: false
            }
        ]
    });

    // Validation functions
    const validateBatchNames = (batches) => {
        const names = batches.map(batch => batch.batchName.trim().toLowerCase());
        const uniqueNames = new Set(names);
        return names.length === uniqueNames.size;
    };

    const validateIntervalNames = (intervals) => {
        const names = intervals.map(interval => interval.intervalName.trim().toLowerCase());
        const uniqueNames = new Set(names);
        return names.length === uniqueNames.size;
    };

    // Check if settings have changed
    const checkForChanges = (currentSettings) => {
        const changed = JSON.stringify(currentSettings) !== JSON.stringify(originalSettings);
        setHasChanges(changed);
    };

    // Fetch workers from API
    const fetchWorkers = async () => {
        try {
            const workersData = await getWorkers({ subdomain });
            setWorkers(Array.isArray(workersData) ? workersData : []);
        } catch (error) {
            console.error('Error fetching workers:', error);
            toast.error('Failed to fetch workers. Please try again.');
            setWorkers([]);
        }
    };

    // Fetch settings from API
    const fetchSettings = async () => {
        if (!subdomain || subdomain === 'main') {
            toast.error('Invalid subdomain. Please check the URL.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Let the api interceptor handle the token automatically
            const response = await api.get(`/settings/${subdomain}`);
            const fetchedSettings = response.data;
            // Update state with fetched settings
            setSettings((prevSettings) => ({
                ...prevSettings,
                // Email settings
                emailReportsEnabled: fetchedSettings.emailReportsEnabled || false,

                // Attendance and productivity settings
                considerOvertime: fetchedSettings.considerOvertime || false,
                deductSalary: fetchedSettings.deductSalary !== undefined ? fetchedSettings.deductSalary : true,
                permissionTimeMinutes: fetchedSettings.permissionTimeMinutes || 15,
                salaryDeductionPerBreak: fetchedSettings.salaryDeductionPerBreak || 10,

                // Auto punch-out settings
                autoPunchOut: fetchedSettings.autoPunchOut || {
                    isEnabled: false,
                    outTime: '23:00',
                    selectedWorkers: []
                },

                // Location settings
                attendanceLocation: fetchedSettings.attendanceLocation || {
                    enabled: false,
                    latitude: 0,
                    longitude: 0,
                    radius: 100,
                    locked: false
                },

                // Batches and intervals
                batches: fetchedSettings.batches || [{
                    batchName: 'Full Time',
                    from: '09:00',
                    to: '19:00',
                    lunchFrom: '12:00',
                    lunchTo: '13:00',
                    isLunchConsider: false
                }],
                intervals: fetchedSettings.intervals || [
                    { intervalName: 'interval1', from: '10:15', to: '10:30', isBreakConsider: false },
                    { intervalName: 'interval2', from: '14:15', to: '14:30', isBreakConsider: false }
                ]
            }));

            setOriginalSettings({
                ...fetchedSettings,
                emailReportsEnabled: fetchedSettings.emailReportsEnabled || false,
                considerOvertime: fetchedSettings.considerOvertime || false,
                deductSalary: fetchedSettings.deductSalary !== undefined ? fetchedSettings.deductSalary : true,
                permissionTimeMinutes: fetchedSettings.permissionTimeMinutes || 15,
                salaryDeductionPerBreak: fetchedSettings.salaryDeductionPerBreak || 10,
                autoPunchOut: fetchedSettings.autoPunchOut || {
                    isEnabled: false,
                    outTime: '23:00',
                    selectedWorkers: []
                },
                attendanceLocation: fetchedSettings.attendanceLocation || {
                    enabled: false,
                    latitude: 0,
                    longitude: 0,
                    radius: 100,
                    locked: false
                },
                batches: fetchedSettings.batches || [{
                    batchName: 'Full Time',
                    from: '09:00',
                    to: '19:00',
                    lunchFrom: '12:00',
                    lunchTo: '13:00',
                    isLunchConsider: false
                }],
                intervals: fetchedSettings.intervals || [
                    { intervalName: 'interval1', from: '10:15', to: '10:30', isBreakConsider: false },
                    { intervalName: 'interval2', from: '14:15', to: '14:30', isBreakConsider: false }
                ]
            });
            setHasChanges(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to fetch settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes (for non-batch/interval fields)
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value);

        const updatedSettings = {
            ...settings,
            [name]: newValue
        };

        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle auto punch-out settings changes
    const handleAutoPunchOutChange = (field, value) => {
        setSettings(prevSettings => {
            const updatedSettings = {
                ...prevSettings,
                autoPunchOut: {
                    ...prevSettings.autoPunchOut,
                    [field]: value
                }
            };
            
            checkForChanges(updatedSettings);
            return updatedSettings;
        });
    };

    // Handle worker selection for auto punch-out
    const handleWorkerSelection = (workerId) => {
        setSettings(prevSettings => {
            const isSelected = prevSettings.autoPunchOut.selectedWorkers.includes(workerId);
            const updatedSelectedWorkers = isSelected
                ? prevSettings.autoPunchOut.selectedWorkers.filter(id => id !== workerId)
                : [...prevSettings.autoPunchOut.selectedWorkers, workerId];
            
            const updatedSettings = {
                ...prevSettings,
                autoPunchOut: {
                    ...prevSettings.autoPunchOut,
                    selectedWorkers: updatedSelectedWorkers
                }
            };
            
            checkForChanges(updatedSettings);
            return updatedSettings;
        });
    };

    // Handle select all workers for auto punch-out
    const handleSelectAllWorkers = () => {
        setSettings(prevSettings => {
            const allWorkerIds = workers.map(worker => worker._id);
            const isSelectedAll = prevSettings.autoPunchOut.selectedWorkers.length === workers.length;
            
            const updatedSettings = {
                ...prevSettings,
                autoPunchOut: {
                    ...prevSettings.autoPunchOut,
                    selectedWorkers: isSelectedAll ? [] : allWorkerIds
                }
            };
            
            checkForChanges(updatedSettings);
            return updatedSettings;
        });
    };

    // Handle location settings changes
    const handleLocationChange = (field, value) => {
        // Remove the locking check to allow changes anytime
        // if (settings.attendanceLocation.locked && 
        //     (field === 'latitude' || field === 'longitude' || field === 'radius')) {
        //     toast.warn('Location is locked and cannot be changed. Contact support if you need to modify it.');
        //     return;
        // }
        
        setSettings(prevSettings => {
            const updatedSettings = {
                ...prevSettings,
                attendanceLocation: {
                    ...prevSettings.attendanceLocation,
                    [field]: value
                }
            };
            
            checkForChanges(updatedSettings);
            return updatedSettings;
        });
    };

    // Handle batch changes
    const handleBatchChange = (index, field, value) => {
        const updatedBatches = [...settings.batches];
        updatedBatches[index] = {
            ...updatedBatches[index],
            [field]: value
        };
        const updatedSettings = {
            ...settings,
            batches: updatedBatches
        };
        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle interval changes
    const handleIntervalChange = (index, field, value) => {
        const updatedIntervals = [...settings.intervals];
        updatedIntervals[index] = {
            ...updatedIntervals[index],
            [field]: value
        };
        const updatedSettings = {
            ...settings,
            intervals: updatedIntervals
        };
        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle adding new batch
    const handleAddBatch = () => {
        const newBatch = {
            batchName: '',
            from: '09:00',
            to: '19:00',
            lunchFrom: '12:00',
            lunchTo: '13:00',
            isLunchConsider: false
        };
        const updatedSettings = {
            ...settings,
            batches: [...settings.batches, newBatch]
        };
        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle removing batch
    const handleRemoveBatch = (index) => {
        const updatedBatches = settings.batches.filter((_, i) => i !== index);
        const updatedSettings = {
            ...settings,
            batches: updatedBatches
        };
        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle adding new interval
    const handleAddInterval = () => {
        const newInterval = {
            intervalName: `interval${settings.intervals.length + 1}`,
            from: '10:15',
            to: '10:30',
            isBreakConsider: false
        };
        const updatedSettings = {
            ...settings,
            intervals: [...settings.intervals, newInterval]
        };
        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle removing interval
    const handleRemoveInterval = (index) => {
        const updatedIntervals = settings.intervals.filter((_, i) => i !== index);
        const updatedSettings = {
            ...settings,
            intervals: updatedIntervals
        };
        setSettings(updatedSettings);
        checkForChanges(updatedSettings);
    };

    // Handle settings save
    const handleSaveSettings = async () => {
        if (!validateBatchNames(settings.batches)) {
            toast.error('Batch names must be unique. Please check for duplicate batch names.');
            return;
        }
        if (!validateIntervalNames(settings.intervals)) {
            toast.error('Interval names must be unique. Please check for duplicate interval names.');
            return;
        }
        setSaving(true);
        try {
            // Let the api interceptor handle the token automatically
            await api.put(`/settings/${subdomain}`, settings);
            setOriginalSettings(settings);
            setHasChanges(false);
            toast.success('Settings updated successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Reset to original settings
    const handleReset = () => {
        setSettings({ ...originalSettings });
        setHasChanges(false);
    };

    // Get current location
    const getCurrentLocation = () => {
        // Remove the locking check to allow changes anytime
        // if (settings.attendanceLocation.locked) {
        //     toast.warn('Location is already locked. You cannot change it.');
        //     return;
        // }
        
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                // Update both the form fields and the current location display
                handleLocationChange('latitude', latitude);
                handleLocationChange('longitude', longitude);
                setCurrentLocation({ latitude, longitude, accuracy });
                toast.success('Current location updated successfully!');
            },
            (error) => {
                console.error('Error getting location:', error);
                setCurrentLocation(null);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        toast.error('Location access denied. Please enable location permissions in your browser settings.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        toast.error('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        toast.error('The request to get user location timed out.');
                        break;
                    default:
                        toast.error('An unknown error occurred while getting your location.');
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    };

    // Custom toggle component
    const CustomToggle = ({ checked, onChange, disabled = false }) => (
        <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );

    // Filter workers based on search term
    const filteredWorkers = workers.filter(worker =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.rfid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (worker.department && worker.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        if (subdomain && subdomain !== 'main') {
            fetchSettings();
            fetchWorkers();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line
    }, [subdomain]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="mb-4 sm:mb-0">
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                <FiSettings className="mr-3 text-blue-600" />
                                Application Settings
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Configure your application preferences
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <Button
                                onClick={handleReset}
                                variant="secondary"
                                disabled={!hasChanges || saving}
                                className="flex items-center"
                            >
                                <FiRefreshCw className="mr-2 h-4 w-4" />
                                Reset Changes
                            </Button>
                            <Button
                                onClick={handleSaveSettings}
                                variant="primary"
                                disabled={!hasChanges || saving}
                                className="flex items-center"
                            >
                                {saving ? (
                                    <Spinner size="sm" className="mr-2" />
                                ) : (
                                    <FiSave className="mr-2 h-4 w-4" />
                                )}
                                Update Settings
                            </Button>
                        </div>
                    </div>

                    {/* Unsaved changes alert */}
                    {hasChanges && (
                        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <FiAlertTriangle className="h-5 w-5 text-amber-400" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-amber-800">
                                        Unsaved Changes Detected
                                    </h3>
                                    <div className="mt-2 text-sm text-amber-700">
                                        <p>You have unsaved changes. Click "Update Settings" to save them or "Reset Changes" to discard them.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Auto Punch-Out Settings */}
                <Card className="mb-8 hover:shadow-lg transition-shadow duration-200">
                    <div className="h-2 bg-gradient-to-r from-red-400 to-pink-400" />
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
                            <div className="p-2 bg-red-100 rounded-lg mr-3">
                                <FiUsers className="h-5 w-5 text-red-600" />
                            </div>
                            Auto Punch-Out Settings
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Enable Auto Punch-Out</label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Automatically punch out selected employees at a specified time
                                    </p>
                                </div>
                                <CustomToggle
                                    checked={settings.autoPunchOut.isEnabled}
                                    onChange={() => handleAutoPunchOutChange('isEnabled', !settings.autoPunchOut.isEnabled)}
                                />
                            </div>

                            {settings.autoPunchOut.isEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Auto Punch-Out Time
                                        </label>
                                        <input
                                            type="time"
                                            value={settings.autoPunchOut.outTime}
                                            onChange={(e) => handleAutoPunchOutChange('outTime', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Time when selected employees will be automatically punched out
                                        </p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Employees for Auto Punch-Out
                                        </label>
                                        
                                        {/* Dropdown toggle button */}
                                        <div className="mb-4">
                                            <button
                                                onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                                                className="w-full flex justify-between items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <span>
                                                    {settings.autoPunchOut.selectedWorkers.length > 0 
                                                        ? `${settings.autoPunchOut.selectedWorkers.length} employee(s) selected` 
                                                        : 'Select employees...'}
                                                </span>
                                                <svg className={`ml-2 h-5 w-5 transform ${showEmployeeDropdown ? 'rotate-180' : ''}`} 
                                                     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Employee selection dropdown - only shown when toggled */}
                                        {showEmployeeDropdown && (
                                            <div className="border border-gray-200 rounded-lg shadow-lg bg-white">
                                                {/* Search and Select All */}
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border-b border-gray-200">
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Search employees..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={handleSelectAllWorkers}
                                                        variant="secondary"
                                                        className="flex items-center whitespace-nowrap"
                                                    >
                                                        {settings.autoPunchOut.selectedWorkers.length === workers.length ? (
                                                            <>
                                                                <FiSquare className="mr-2" />
                                                                Deselect All
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FiCheckSquare className="mr-2" />
                                                                Select All
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>

                                                {/* Workers List - Limited height with vertical scroll */}
                                                <div className="max-h-60 overflow-y-auto">
                                                    {filteredWorkers.length > 0 ? (
                                                        <ul className="divide-y divide-gray-200">
                                                            {filteredWorkers.map((worker) => (
                                                                <li key={worker._id} className="p-3 hover:bg-gray-50">
                                                                    <div className="flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`worker-${worker._id}`}
                                                                            checked={settings.autoPunchOut.selectedWorkers.includes(worker._id)}
                                                                            onChange={() => handleWorkerSelection(worker._id)}
                                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                        />
                                                                        <label 
                                                                            htmlFor={`worker-${worker._id}`} 
                                                                            className="ml-3 flex items-center cursor-pointer"
                                                                        >
                                                                            {worker.photo ? (
                                                                                <img 
                                                                                    src={worker.photo} 
                                                                                    alt={worker.name} 
                                                                                    className="h-8 w-8 rounded-full object-cover mr-3"
                                                                                />
                                                                            ) : (
                                                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                                                    <span className="text-xs font-medium text-gray-600">
                                                                                        {worker.name.charAt(0)}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div>
                                                                                <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                                                                                <p className="text-xs text-gray-500">
                                                                                    {worker.rfid} • {worker.department || 'No Department'}
                                                                                </p>
                                                                            </div>
                                                                        </label>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <div className="p-6 text-center">
                                                            <p className="text-gray-500">
                                                                {workers.length === 0 
                                                                    ? 'No employees found. Please add employees first.' 
                                                                    : 'No employees match your search.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="p-3 bg-gray-50 border-t border-gray-200">
                                                    <p className="text-xs text-gray-500 text-center">
                                                        {settings.autoPunchOut.selectedWorkers.length} of {workers.length} employees selected
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Additional Settings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Email Settings */}
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                        <div className="h-2 bg-gradient-to-r from-green-400 to-blue-400" />
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
                                <div className="p-2 bg-green-100 rounded-lg mr-3">
                                    <FiMail className="h-5 w-5 text-green-600" />
                                </div>
                                Email Settings
                            </h3>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Email Reports</label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Send automatic email reports
                                    </p>
                                </div>
                                <CustomToggle
                                    checked={settings.emailReportsEnabled}
                                    onChange={() => handleInputChange({
                                        target: {
                                            name: 'emailReportsEnabled',
                                            type: 'checkbox',
                                            checked: !settings.emailReportsEnabled
                                        }
                                    })}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Attendance Settings */}
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                        <div className="h-2 bg-gradient-to-r from-indigo-400 to-purple-400" />
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
                                <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                                    <FiUser className="h-5 w-5 text-indigo-600" />
                                </div>
                                Attendance Settings
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Consider Overtime</label>
                                        <p className="text-xs text-gray-500">Include overtime in calculations</p>
                                    </div>
                                    <CustomToggle
                                        checked={settings.considerOvertime}
                                        onChange={() => handleInputChange({
                                            target: {
                                                name: 'considerOvertime',
                                                type: 'checkbox',
                                                checked: !settings.considerOvertime
                                            }
                                        })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Salary Deduction</label>
                                        <p className="text-xs text-gray-500">Enable salary deductions for breaks</p>
                                    </div>
                                    <CustomToggle
                                        checked={settings.deductSalary}
                                        onChange={() => handleInputChange({
                                            target: {
                                                name: 'deductSalary',
                                                type: 'checkbox',
                                                checked: !settings.deductSalary
                                            }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Location Settings */}
                <Card className="mb-8 hover:shadow-lg transition-shadow duration-200">
                    <div className="h-2 bg-gradient-to-r from-yellow-400 to-orange-400" />
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
                            <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                                <FiMapPin className="h-5 w-5 text-yellow-600" />
                            </div>
                            Location Settings
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Enable Location Restriction</label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Restrict attendance to a specific location
                                    </p>
                                </div>
                                <CustomToggle
                                    checked={settings.attendanceLocation.enabled}
                                    onChange={() => handleLocationChange('enabled', !settings.attendanceLocation.enabled)}
                                />
                            </div>

                            {settings.attendanceLocation.enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Latitude
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formatCoordinate(settings.attendanceLocation.latitude)}
                                            onChange={(e) => handleLocationChange('latitude', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Geographic latitude coordinate
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Longitude
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formatCoordinate(settings.attendanceLocation.longitude)}
                                            onChange={(e) => handleLocationChange('longitude', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Geographic longitude coordinate
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Radius (meters)
                                        </label>
                                        <input
                                            type="number"
                                            min="10"
                                            max="10000"
                                            value={settings.attendanceLocation.radius}
                                            onChange={(e) => handleLocationChange('radius', parseInt(e.target.value) || 100)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500">
                                            Attendance allowed within this radius
                                        </p>
                                    </div>
                                    
                                    <div className="md:col-span-3">
                                        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                                            <Button
                                                onClick={getCurrentLocation}
                                                variant="primary"
                                                className="flex items-center"
                                            >
                                                <FiCrosshair className="mr-2" />
                                                Use Current Location
                                            </Button>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Click to automatically set your current location
                                        </p>
                                        
                                        {/* Display current location information */}
                                        {currentLocation && (
                                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                <p className="text-sm font-medium text-blue-800">Current Location Detected</p>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Latitude: {formatCoordinate(currentLocation.latitude)}
                                                </p>
                                                <p className="text-sm text-blue-700">
                                                    Longitude: {formatCoordinate(currentLocation.longitude)}
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Accuracy: ±{Math.round(currentLocation.accuracy)} meters
                                                </p>
                                            </div>
                                        )}
                                        
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Financial Settings */}
                <Card className="mb-8 hover:shadow-lg transition-shadow duration-200">
                    <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
                            <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                                <FiDollarSign className="h-5 w-5 text-emerald-600" />
                            </div>
                            Financial Configuration
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Permission Time (Minutes)
                                </label>
                                <input
                                    type="number"
                                    name="permissionTimeMinutes"
                                    value={settings.permissionTimeMinutes}
                                    onChange={handleInputChange}
                                    min="0"
                                    max="60"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500">
                                    Default break permission time allowed per employee
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Salary Deduction per Break (₹)
                                </label>
                                <input
                                    type="number"
                                    name="salaryDeductionPerBreak"
                                    value={settings.salaryDeductionPerBreak}
                                    onChange={handleInputChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500">
                                    Amount deducted for each unauthorized break
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Work Schedule Configuration */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                        <FiClock className="mr-2 text-gray-600" />
                        Work Schedule Configuration
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Batches Configuration */}
                        <Card className="hover:shadow-lg transition-shadow duration-200">
                            <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-400" />
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                            <FiUser className="h-5 w-5 text-blue-600" />
                                        </div>
                                        Work Batches
                                    </h3>
                                </div>
                                {/* Batches List */}
                                {settings.batches && settings.batches.map((batch, index) => (
                                    <div key={index} className="batch-item border p-4 mb-4 rounded">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold">Batch {index + 1}</h4>
                                            <button
                                                onClick={() => handleRemoveBatch(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {/* Batch Name */}
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Batch Name</label>
                                            <input
                                                type="text"
                                                value={batch.batchName}
                                                onChange={(e) => handleBatchChange(index, 'batchName', e.target.value)}
                                                className="w-full p-2 border rounded"
                                                placeholder="Enter batch name"
                                            />
                                        </div>
                                        {/* Working Hours */}
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">From</label>
                                                <input
                                                    type="time"
                                                    value={batch.from}
                                                    onChange={(e) => handleBatchChange(index, 'from', e.target.value)}
                                                    className="w-full p-2 border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">To</label>
                                                <input
                                                    type="time"
                                                    value={batch.to}
                                                    onChange={(e) => handleBatchChange(index, 'to', e.target.value)}
                                                    className="w-full p-2 border rounded"
                                                />
                                            </div>
                                        </div>
                                        {/* Lunch Hours */}
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Lunch From</label>
                                                <input
                                                    type="time"
                                                    value={batch.lunchFrom}
                                                    onChange={(e) => handleBatchChange(index, 'lunchFrom', e.target.value)}
                                                    className="w-full p-2 border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Lunch To</label>
                                                <input
                                                    type="time"
                                                    value={batch.lunchTo}
                                                    onChange={(e) => handleBatchChange(index, 'lunchTo', e.target.value)}
                                                    className="w-full p-2 border rounded"
                                                />
                                            </div>
                                        </div>
                                        {/* Consider Work at Lunch Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="block text-sm font-medium">Consider Work at Lunch</label>
                                                <p className="text-xs text-gray-500">Allow employees to work during lunch hours</p>
                                            </div>
                                            <CustomToggle
                                                checked={batch.isLunchConsider}
                                                onChange={() => handleBatchChange(index, 'isLunchConsider', !batch.isLunchConsider)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    onClick={handleAddBatch}
                                    variant="secondary"
                                    className="flex items-center w-full justify-center"
                                >
                                    <FiPlus className="mr-2" />
                                    Add New Batch
                                </Button>
                            </div>
                        </Card>

                        {/* Intervals Configuration */}
                        <Card className="hover:shadow-lg transition-shadow duration-200">
                            <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-400" />
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <div className="p-2 bg-purple-100 rounded-lg mr-3">
                                            <FiClock className="h-5 w-5 text-purple-600" />
                                        </div>
                                        Break Intervals
                                    </h3>
                                </div>
                                {/* Intervals List */}
                                {settings.intervals && settings.intervals.map((interval, index) => (
                                    <div key={index} className="interval-item border p-4 mb-4 rounded">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold">Interval {index + 1}</h4>
                                            <button
                                                onClick={() => handleRemoveInterval(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {/* Interval Name */}
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1">Interval Name</label>
                                            <input
                                                type="text"
                                                value={interval.intervalName}
                                                onChange={(e) => handleIntervalChange(index, 'intervalName', e.target.value)}
                                                className="w-full p-2 border rounded"
                                                placeholder="Enter interval name"
                                            />
                                        </div>
                                        {/* Interval Hours */}
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">From</label>
                                                <input
                                                    type="time"
                                                    value={interval.from}
                                                    onChange={(e) => handleIntervalChange(index, 'from', e.target.value)}
                                                    className="w-full p-2 border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">To</label>
                                                <input
                                                    type="time"
                                                    value={interval.to}
                                                    onChange={(e) => handleIntervalChange(index, 'to', e.target.value)}
                                                    className="w-full p-2 border rounded"
                                                />
                                            </div>
                                        </div>
                                        {/* Consider as Break Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="block text-sm font-medium">Consider as Break</label>
                                                <p className="text-xs text-gray-500">Deduct salary for this interval</p>
                                            </div>
                                            <CustomToggle
                                                checked={interval.isBreakConsider}
                                                onChange={() => handleIntervalChange(index, 'isBreakConsider', !interval.isBreakConsider)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    onClick={handleAddInterval}
                                    variant="secondary"
                                    className="flex items-center w-full justify-center"
                                >
                                    <FiPlus className="mr-2" />
                                    Add New Interval
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;