import { useState, useEffect, useContext } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import {
  FaHome,
  FaUsers,
  FaBuilding,
  FaCalendarAlt,
  FaRegCalendarCheck,
  FaRegBell,
  FaDollarSign,
  FaAsterisk,
  FaMoneyBillWave
} from 'react-icons/fa';

import { useAuth } from '../../hooks/useAuth';
import { getAllLeaves } from '../../services/leaveService';
import Sidebar from './Sidebar';
import QuestionGenerationTracker from '../admin/QuestionGenerationTracker';
import appContext from '../../context/AppContext';
import { IoMdSettings } from 'react-icons/io';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const [pendingLeaves, setPendingLeaves] = useState(0);
  
  // Global question generation tracker state (for future use)
  const [showGlobalTracker] = useState(false);
  
  const navigate = useNavigate();
  const { subdomain } = useContext(appContext);

  // Check for new comments and leave updates
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        // Fetch leaves
        const leaves = await getAllLeaves({ subdomain }) || [];
        const unviewedLeaves = Array.isArray(leaves) ? leaves.filter(leave =>
          !leave.workerViewed &&
          (leave.status === 'Pending' || leave.status === 'Approved')
        ).length : 0;
        setPendingLeaves(unviewedLeaves);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotificationCounts();

    const intervalId = setInterval(fetchNotificationCounts, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const sidebarLinks = [
    {
      to: '/admin',
      icon: <FaHome className="text-blue-500" />,
      label: 'Dashboard'
    },
    {
      to: '/admin/workers',
      icon: <FaUsers className="text-green-500" />,
      label: 'Employees'
    },
    {
      to: '/admin/salary',
      icon: <FaDollarSign className="text-yellow-500" />,
      label: 'Salary'
    },
    {
      to: '/admin/advances',
      icon: <FaMoneyBillWave className="text-green-500" />,
      label: 'Advance Vouchers'
    },
    {
      to: '/admin/attendance',
      icon: <FaRegCalendarCheck className="text-red-500" />,
      label: 'Attendance'
    },
    {
      to: '/admin/departments',
      icon: <FaBuilding className="text-blue-500" />,
      label: 'Departments'
    },
    {
      to: '/admin/leaves',
      icon: <FaCalendarAlt className="text-red-500" />,
      label: 'Leave Requests',
      badge: pendingLeaves > 0 ? pendingLeaves : null
    },
    {
      to: '/admin/holidays',
      icon: <FaAsterisk className="text-green-500" />,
      label: 'Holidays'
    },
    {
      to: '/admin/notifications',
      icon: <FaRegBell className="text-purple-500" />,
      label: 'Notifications'
    },
    {
      to: '/admin/settings',
      icon: <IoMdSettings className="text-gray-500" />,
      label: 'Settings',
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        links={sidebarLinks}
        user={user}
        onLogout={handleLogout}
      />

      <div className="content-area flex-1 transition-all duration-300 ease-in-out overflow-auto">
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Global Question Generation Tracker - Available for future enhancements */}
      <QuestionGenerationTracker
        isVisible={showGlobalTracker}
        onClose={() => {}}
        generationData={null}
        isGenerating={false}
      />
    </div>
  );
};

export default AdminLayout;