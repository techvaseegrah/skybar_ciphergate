import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserClock, FaQrcode } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import FaceAttendance from '../admin/FaceAttendance';
import RfidAttendance from './RfidAttendance';
import appContext from '../../context/AppContext';
import { getCurrentPosition, isWorkerInAllowedLocation } from '../../services/geolocationService';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth hook

const AttendanceMethods = () => {
  const { subdomain } = useContext(appContext);
  const { user } = useAuth(); // Get current user
  const navigate = useNavigate();
  const [showFaceAttendance, setShowFaceAttendance] = useState(false);
  const [showRfidAttendance, setShowRfidAttendance] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  // Check location when component mounts
  React.useEffect(() => {
    const checkLocation = async () => {
      if (!subdomain) return;
      
      try {
        // Get current position
        const position = await getCurrentPosition();
        const { latitude, longitude } = position;
        
        // Set current location state
        setCurrentLocation({ latitude, longitude, accuracy: position.accuracy });
        
        // Check if worker is in allowed location
        const locationResult = await isWorkerInAllowedLocation(subdomain, latitude, longitude);
        
        setLocationChecked(true);
        setLocationAllowed(locationResult.allowed);
        
        if (!locationResult.allowed) {
          setLocationError(locationResult.message);
        }
      } catch (err) {
        console.error('Error checking location:', err);
        setLocationChecked(true);
        setLocationAllowed(false);
        setLocationError(`Location check failed: ${err.message}`);
      }
    };

    checkLocation();
  }, [subdomain]);

  // Handle Face Attendance button click
  const handleFaceAttendanceClick = async () => {
    if (!locationChecked) {
      toast.error('Still checking your location. Please wait.');
      return;
    }
    
    if (!locationAllowed) {
      toast.error(locationError || 'Attendance not allowed from your current location.');
      return;
    }
    
    // Perform an additional location check just before opening the modal
    setIsCheckingLocation(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position;
      
      // Check if worker is in allowed location
      const locationResult = await isWorkerInAllowedLocation(subdomain, latitude, longitude);
      
      if (!locationResult.allowed) {
        toast.error(locationResult.message || 'Attendance not allowed from your current location.');
        // Update state to reflect new location check
        setLocationAllowed(false);
        setLocationError(locationResult.message);
        return;
      }
      
      // If location is allowed, open the modal
      setShowFaceAttendance(true);
    } catch (err) {
      console.error('Error checking location:', err);
      toast.error(`Location check failed: ${err.message}`);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  // Handle RFID Attendance button click
  const handleRfidAttendanceClick = async () => {
    if (!locationChecked) {
      toast.error('Still checking your location. Please wait.');
      return;
    }
    
    if (!locationAllowed) {
      toast.error(locationError || 'Attendance not allowed from your current location.');
      return;
    }
    
    // Perform an additional location check just before opening the modal
    setIsCheckingLocation(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position;
      
      // Check if worker is in allowed location
      const locationResult = await isWorkerInAllowedLocation(subdomain, latitude, longitude);
      
      if (!locationResult.allowed) {
        toast.error(locationResult.message || 'Attendance not allowed from your current location.');
        // Update state to reflect new location check
        setLocationAllowed(false);
        setLocationError(locationResult.message);
        return;
      }
      
      // If location is allowed, open the modal
      setShowRfidAttendance(true);
    } catch (err) {
      console.error('Error checking location:', err);
      toast.error(`Location check failed: ${err.message}`);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <Button variant="outline" onClick={() => navigate('/worker')}>
          Back to Dashboard
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Attendance Method</h2>
        <p className="text-gray-600 mb-6">
          Choose your preferred method to mark attendance. Both methods require you to be within the designated location set by your administrator.
        </p>
        
        {isCheckingLocation ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Checking your location...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Face Attendance Card */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <FaUserClock className="text-blue-600 text-xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Face Recognition</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Use your device's camera to scan your face for attendance. Face data is securely stored and only used for attendance verification.
              </p>
              <Button
                variant="primary"
                onClick={handleFaceAttendanceClick}
                disabled={!locationChecked || !locationAllowed || isCheckingLocation}
                className="w-full"
              >
                {isCheckingLocation ? 'Checking Location...' : 'Use Face Recognition'}
              </Button>
            </div>
            
            {/* RFID Attendance Card */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-3 rounded-lg mr-4">
                  <FaQrcode className="text-indigo-600 text-xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">RFID Card</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Scan your RFID card or enter your employee ID manually. Make sure your RFID card is ready before proceeding.
              </p>
              <Button
                variant="primary"
                onClick={handleRfidAttendanceClick}
                disabled={!locationChecked || !locationAllowed || isCheckingLocation}
                className="w-full"
              >
                {isCheckingLocation ? 'Checking Location...' : 'Use RFID Card'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Location Status */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <div className="bg-blue-500/10 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Location Status</h4>
              {currentLocation ? (
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <p className="text-sm text-blue-700 mr-2">
                    Lat: {currentLocation.latitude.toFixed(6)}, Lon: {currentLocation.longitude.toFixed(6)}
                  </p>
                  <div className={`mt-1 sm:mt-0 px-2 py-1 rounded-full text-xs font-medium ${
                    locationAllowed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {locationAllowed ? 'Within Attendance Area' : 'Outside Attendance Area'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-blue-700">Detecting location...</p>
              )}
              {!locationAllowed && locationChecked && (
                <p className="mt-2 text-sm text-red-600">
                  {locationError || 'Attendance restricted to designated location'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Face Attendance Modal */}
      <FaceAttendance 
        subdomain={subdomain} 
        isOpen={showFaceAttendance} 
        onClose={() => setShowFaceAttendance(false)} 
        workerMode={true}
        currentWorker={user} // Pass the current user
      />
      
      {/* RFID Attendance Modal */}
      {showRfidAttendance && (
        <RfidAttendance />
      )}
    </div>
  );
};

export default AttendanceMethods;