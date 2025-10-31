import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import appContext from '../../context/AppContext';
import FaceAttendance from '../admin/FaceAttendance';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import { getCurrentPosition, isWorkerInAllowedLocation } from '../../services/geolocationService';
import { toast } from 'react-toastify';

const FaceAttendancePage = () => {
  const { subdomain } = useContext(appContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showFaceAttendance, setShowFaceAttendance] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(false);

  // Check location when component mounts
  useEffect(() => {
    const checkLocation = async () => {
      if (!subdomain || subdomain === 'main' || !user) {
        setLocationChecked(true);
        return;
      }
      
      try {
        // Get current position
        const position = await getCurrentPosition();
        const { latitude, longitude } = position;
        
        // Check if worker is in allowed location
        const locationResult = await isWorkerInAllowedLocation(subdomain, latitude, longitude);
        
        setLocationChecked(true);
        setLocationAllowed(locationResult.allowed);
        
        if (locationResult.allowed) {
          // If location is allowed, show the face attendance modal
          setShowFaceAttendance(true);
        } else {
          // If location is not allowed, show an error and navigate back
          toast.error(locationResult.message || 'Attendance not allowed from your current location.');
          setTimeout(() => {
            navigate('/worker');
          }, 3000);
        }
      } catch (err) {
        console.error('Error checking location:', err);
        setLocationChecked(true);
        toast.error(`Location check failed: ${err.message}`);
        // Navigate back after error
        setTimeout(() => {
          navigate('/worker');
        }, 3000);
      }
    };

    checkLocation();
  }, [subdomain, user, navigate]);

  const handleModalClose = () => {
    setShowFaceAttendance(false);
    // Navigate back to the worker dashboard
    navigate('/worker');
  };

  if (!locationChecked) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Face Attendance</h1>
          <Button variant="outline" onClick={() => navigate('/worker')}>
            Back to Dashboard
          </Button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <p className="text-gray-600 font-medium">
              Checking your location...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Face Attendance</h1>
        <Button variant="outline" onClick={() => navigate('/worker')}>
          Back to Dashboard
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600 mb-4">
          Welcome, {user?.name}! Please position your face within the circular frame for attendance recognition.
        </p>
        
        {subdomain && subdomain !== 'main' && user && locationAllowed ? (
          <FaceAttendance 
            subdomain={subdomain} 
            isOpen={showFaceAttendance} 
            onClose={handleModalClose} 
            workerMode={true}
            currentWorker={user}
          />
        ) : !locationAllowed ? (
          <div className="text-center py-8">
            <p className="text-red-600 font-medium">
              Attendance not allowed from your current location. Please move to the designated attendance area.
            </p>
            <p className="text-gray-600 mt-2">
              You will be redirected to the dashboard shortly.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-600 font-medium">
              Unable to load face attendance system. Please check your subdomain settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceAttendancePage;