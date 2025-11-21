import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  FaHome,
  FaCalendarPlus,
  FaCalendarCheck,
  FaRegCalendarCheck,
  FaRegBell,
  FaUserClock
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { getMyLeaves } from '../../services/leaveService';
import Sidebar from './Sidebar';
import appContext from '../../context/AppContext';
import { getCurrentPosition, isWorkerInAllowedLocation } from '../../services/geolocationService';
import { toast } from 'react-toastify';

const WorkerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [leaveUpdates, setLeaveUpdates] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { subdomain } = useContext(appContext);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  // Check for leave updates
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        if (!subdomain || subdomain == 'main') {
          return;
        }

        // Fetch leaves
        const leaves = await getMyLeaves({ subdomain });
        const unviewedLeaves = leaves.filter(leave =>
          !leave.workerViewed &&
          (leave.status === 'Pending' || leave.status === 'Approved')
        ).length;
        setLeaveUpdates(unviewedLeaves);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    // Fetch immediately on mount
    fetchNotificationCounts();

    // Set up periodic refresh (every 5 minutes)
    const intervalId = setInterval(fetchNotificationCounts, 5 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Check location before navigating to attendance pages
  useEffect(() => {
    const checkLocationForAttendance = async () => {
      // Only check for attendance-related routes
      // Exclude the attendance report page since it doesn't require location checking
      if (!location.pathname.includes('attendance') || 
          location.pathname === '/worker/attendance' || 
          isCheckingLocation) {
        return;
      }

      // Don't check if we're already on the attendance methods page (it has its own check)
      if (location.pathname === '/worker/attendance-methods') {
        return;
      }

      setIsCheckingLocation(true);
      
      try {
        if (!subdomain || subdomain === 'main') {
          setIsCheckingLocation(false);
          return;
        }

        // Get current position
        const position = await getCurrentPosition();
        const { latitude, longitude } = position;
        
        // Check if worker is in allowed location
        const locationResult = await isWorkerInAllowedLocation(subdomain, latitude, longitude);
        
        if (!locationResult.allowed) {
          // Prevent navigation to attendance pages if location is not allowed
          toast.error(locationResult.message || 'Attendance not allowed from your current location.');
          // Redirect to attendance methods page which will handle the location check properly
          navigate('/worker/attendance-methods');
        }
      } catch (err) {
        console.error('Error checking location:', err);
        toast.error(`Location check failed: ${err.message}`);
      } finally {
        setIsCheckingLocation(false);
      }
    };

    checkLocationForAttendance();
  }, [location.pathname, subdomain, navigate, isCheckingLocation]);

  const handleLogout = () => {
    logout();
    navigate('/worker/login');
  };

  const sidebarLinks = [
    {
      to: '/worker',
      icon: <FaHome className="text-blue-500" />,
      label: 'Dashboard'
    },
    {
      to: '/worker/attendance',
      icon: <FaRegCalendarCheck className="text-green-500" />,
      label: 'Attendance Report'
    },
    {
      to: '/worker/attendance-methods',
      icon: <FaUserClock className="text-purple-500" />,
      label: 'Attendance'
    },
    {
      to: '/worker/leave-apply',
      icon: <FaCalendarPlus className="text-purple-500" />,
      label: 'Apply for Leave'
    },
    {
      to: '/worker/leave-requests',
      icon: <FaCalendarCheck className="text-red-500" />,
      label: 'Leave Requests',
      badge: leaveUpdates > 0 ? leaveUpdates : null
    },
    {
      to: '/worker/notifications',
      icon: <FaRegBell className="text-blue-300" />,
      label: 'Notifications'
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        links={sidebarLinks}
        user={{
          ...user,
          displayName: `${user.name} (${user.department})` // Show name and department
        }}
        onLogout={handleLogout}
      />

      <div className="content-area flex-1 transition-all duration-300 ease-in-out overflow-auto">
        <main className="p-4 md:p-6">
          {isCheckingLocation && 
           location.pathname !== '/worker/attendance' &&
           !location.pathname.includes('attendance') ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Checking your location...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

export default WorkerLayout;