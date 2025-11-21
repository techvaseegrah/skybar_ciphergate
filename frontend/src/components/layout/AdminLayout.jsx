import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { FiHome, FiUsers, FiDollarSign, FiCalendar, FiSettings, FiFileText, FiAward, FiBriefcase, FiFile } from 'react-icons/fi';

const AdminLayout = () => {
  const [sidebarLinks] = useState([
    {
      to: '/admin',
      icon: <FiHome />,
      label: 'Dashboard'
    },
    {
      isHeader: true,
      label: 'Management'
    },
    {
      isDropdown: true,
      icon: <FiUsers />,
      label: 'Workers',
      children: [
        {
          to: '/admin/workers',
          label: 'All Workers'
        }
      ]
    },
    {
      to: '/admin/attendance',
      icon: <FiFile />,
      label: 'Attendance'
    },
    {
      isDropdown: true,
      icon: <FiDollarSign />,
      label: 'Finance',
      children: [
        {
          to: '/admin/salary',
          label: 'Salary Management'
        },
        {
          to: '/admin/advances',
          label: 'Advance Management'
        },
        {
          to: '/admin/salary-report',
          label: 'Salary Reports'
        }
      ]
    },
    {
      isDropdown: true,
      icon: <FiCalendar />,
      label: 'Leave Management',
      children: [
        {
          to: '/admin/leaves',
          label: 'Leave Requests'
        }
      ]
    },
    {
      isDropdown: true,
      icon: <FiBriefcase />,
      label: 'Organization',
      children: [
        {
          to: '/admin/departments',
          label: 'Departments'
        },
        {
          to: '/admin/holidays',
          label: 'Holidays'
        }
      ]
    },
    {
      isHeader: true,
      label: 'Settings'
    },
    {
      to: '/admin/settings',
      icon: <FiSettings />,
      label: 'App Settings'
    }
  ]);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  // Set page title based on current route
  useEffect(() => {
    const updateTitle = () => {
      const path = window.location.pathname;
      let title = 'Admin Dashboard';
      
      if (path.includes('/admin/workers')) title = 'Worker Management';
      else if (path.includes('/admin/salary')) title = 'Salary Management';
      else if (path.includes('/admin/advances')) title = 'Advance Management';
      else if (path.includes('/admin/leaves')) title = 'Leave Management';
      else if (path.includes('/admin/departments')) title = 'Department Management';
      else if (path.includes('/admin/holidays')) title = 'Holiday Management';
      else if (path.includes('/admin/settings')) title = 'App Settings';
      else if (path.includes('/admin/salary-report')) title = 'Salary Reports';
      else if (path.includes('/admin/attendance')) title = 'Attendance Management';
      
      document.title = `${title} | Admin Panel`;
    };

    updateTitle();
  }, []);

  // Adjust main content margin based on sidebar state
  useEffect(() => {
    const updateMainMargin = () => {
      const mainElement = document.querySelector('.admin-main-content');
      if (!mainElement) return;
      
      // Check if body has sidebar classes
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      const isExpanded = document.body.classList.contains('sidebar-expanded');
      
      if (isCollapsed) {
        mainElement.style.marginLeft = '4rem'; // 64px for collapsed sidebar
      } else if (isExpanded) {
        mainElement.style.marginLeft = '16rem'; // 256px for expanded sidebar
      } else {
        mainElement.style.marginLeft = '0';
      }
    };

    // Initial update
    updateMainMargin();

    // Set up a MutationObserver to watch for class changes on the body
    const observer = new MutationObserver(updateMainMargin);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also update on window resize
    window.addEventListener('resize', updateMainMargin);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMainMargin);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar links={sidebarLinks} user={user} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden admin-main-content">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;