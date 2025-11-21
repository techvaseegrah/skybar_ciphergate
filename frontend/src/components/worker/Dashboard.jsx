import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { readNotification } from '../../services/notificationService';
import appContext from '../../context/AppContext';
import { FaMoneyBillAlt, FaUserClock, FaMapMarkerAlt } from 'react-icons/fa';
import CountUp from 'react-countup';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Scoreboard from './Scoreboard';
import { getCurrentPosition, isWorkerInAllowedLocation } from '../../services/geolocationService';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Dashboard = () => {
  const { subdomain } = useContext(appContext);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [locationChecked, setLocationChecked] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const navigate = useNavigate(); // Hook for navigation

  // prepare breakdown for tooltip
  const baseSalary = typeof user?.salary === 'number' ? user.salary : 0;
  const finalSalary = typeof user?.finalSalary === 'number' ? user.finalSalary : 0;
  const diff = finalSalary - baseSalary;
  const allowances = diff > 0 ? diff : 0;
  const deductions = diff < 0 ? -diff : 0;

  // Check location when component mounts
  useEffect(() => {
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
        setLocationError(`Location check failed: ${err.message}`);
      }
    };

    checkLocation();
  }, [subdomain]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await readNotification(subdomain);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      toast.error('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle Attendance button click
  const handleAttendanceClick = () => {
    if (!locationChecked) {
      toast.error('Still checking your location. Please wait.');
      return;
    }
    
    if (!locationAllowed) {
      toast.error(locationError || 'Attendance not allowed from your current location.');
      return;
    }
    
    // Navigate to the combined attendance methods page
    navigate('/worker/attendance-methods');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-8 rounded-2xl p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user?.username}!
            </h2>
            <p className="text-gray-600">
              Your workspace at{' '}
              <span className="font-semibold text-gray-900">
                {user?.subdomain}
              </span>
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Today is</p>
              <p className="font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Information Card */}
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-sm">
          <div className="flex items-center">
            <div className="bg-blue-500/10 p-3 rounded-xl mr-4">
              <FaMapMarkerAlt className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium mb-1">Current Location</p>
              {currentLocation ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">
                      Lat: {currentLocation.latitude.toFixed(6)}, Lon: {currentLocation.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-blue-700">
                      Accuracy: {Math.round(currentLocation.accuracy)} meters
                    </p>
                  </div>
                  <div className={`mt-2 sm:mt-0 px-3 py-1 rounded-full text-xs font-medium ${
                    locationAllowed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {locationAllowed ? 'Within Attendance Area' : 'Outside Attendance Area'}
                  </div>
                </div>
              ) : (
                <p className="text-blue-900">Detecting location...</p>
              )}
              {!locationAllowed && locationChecked && (
                <p className="mt-2 text-sm text-red-600">
                  {locationError || 'Attendance restricted to designated location'}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Button */}
      <div className="mb-8">
        <button
          onClick={handleAttendanceClick}
          disabled={!locationChecked || !locationAllowed}
          className={`w-full md:w-auto flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 ${
            !locationChecked || !locationAllowed
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <FaUserClock className="text-xl" />
          <span>Mark Attendance</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Base Salary with Icon */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center">
            <div className="bg-blue-500/10 p-3 rounded-xl mr-4">
              <FaMoneyBillAlt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-800 font-medium">Base Monthly Salary</p>
              {baseSalary > 0 ? (
                <CountUp
                  start={0}
                  end={baseSalary}
                  duration={1}
                  prefix="₹"
                  decimals={2}
                  className="text-2xl font-bold text-blue-900"
                />
              ) : (
                <p className="text-2xl font-bold text-blue-900">N/A</p>
              )}
            </div>
          </div>
        </Card>

        {/* Final Monthly Salary with Icon */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center">
            <div className="bg-green-500/10 p-3 rounded-xl mr-4">
              <FaMoneyBillAlt className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-800 font-medium">Final Monthly Salary</p>
              {finalSalary > 0 ? (
                <div
                  title={
                    `Base: ₹${baseSalary.toFixed(2)} | ` +
                    `Allowances: ₹${allowances.toFixed(2)} | ` +
                    `Deductions: ₹${deductions.toFixed(2)}`
                  }
                >
                  <CountUp
                    start={0}
                    end={finalSalary}
                    duration={1}
                    prefix="₹"
                    decimals={2}
                    className="text-2xl font-bold text-green-900"
                  />
                </div>
              ) : (
                <p className="text-2xl font-bold text-green-900">N/A</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {
        Array.isArray(notifications) && notifications.length > 0 && (
          <Card
            title={
              <div className="flex items-center">
                <div className="bg-blue-500/10 p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                Latest Notification
              </div>
            }
            className="mb-8 rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-gray-700">
                {notifications[0]?.messageData || "No notifications found."}
              </p>
            </div>
          </Card>
        )
      }

      <div className="mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="bg-green-500/10 p-2 rounded-lg mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          Department Scoreboard
        </h2>
        <Scoreboard department={user.department} />
      </div>
    </div>
  );
};

export default Dashboard;