import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaCalendarAlt, FaFileInvoice, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { getWorkers } from '../../services/workerService';
import { getAllLeaves } from '../../services/leaveService';
import { getAttendance } from '../../services/attendanceService';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import appContext from '../../context/AppContext';

const Dashboard = () => {
  const [stats, setStats] = useState({
    workers: 0,
    leaves: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
    attendance: {
      present: 0,
      absent: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [topWorkers, setTopWorkers] = useState([]);
  const { subdomain } = useContext(appContext);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        workersDataRaw,
        leavesDataRaw,
        attendanceDataRaw,
      ] = await Promise.all([
        getWorkers({ subdomain }),
        getAllLeaves({ subdomain }),
        getAttendance({ subdomain }),
      ]);

      // Defensive check: ensure leavesData is an array
      const workersData = Array.isArray(workersDataRaw) ? workersDataRaw : [];
      const leavesData = Array.isArray(leavesDataRaw) ? leavesDataRaw : [];
      const attendanceData = Array.isArray(attendanceDataRaw?.attendance) ? attendanceDataRaw.attendance : [];

      // Calculate stats for leaves and comments
      const pendingLeaves = leavesData.filter(leave => leave.status === 'Pending');
      const approvedLeaves = leavesData.filter(leave => leave.status === 'Approved');
      const rejectedLeaves = leavesData.filter(leave => leave.status === 'Rejected');

      // Calculate present/absent stats
      // Get unique workers who have attendance records today with at least one IN punch
      const today = new Date().toISOString().split('T')[0];
      
      // Create a set to store workers who have punched IN today (should remain present all day)
      const workersPresentToday = new Set();
      
      // Go through all attendance records for today
      attendanceData
        .filter(record => record.date === today)
        .forEach(record => {
          const workerId = record.worker?._id || record.worker;
          // If the worker has an IN punch today, they should be counted as present for the whole day
          if (workerId && record.presence === true) {
            workersPresentToday.add(workerId);
          }
        });
      
      // Count present workers (those who have punched IN today, regardless of later OUT punches)
      const presentCount = workersPresentToday.size;
      const absentCount = workersData.length - presentCount;

      // Get top 5 workers by points
      const sortedWorkers = [...workersData]
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 5);

      setStats({
        workers: workersData.length,
        leaves: {
          total: leavesData.length,
          pending: pendingLeaves.length,
          approved: approvedLeaves.length,
          rejected: rejectedLeaves.length,
        },
        attendance: {
          present: presentCount,
          absent: absentCount,
        },
      });

      setTopWorkers(sortedWorkers);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [subdomain])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Stats cards with triangle-inspired design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Employees Card - Triangle Style */}
        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 rounded-bl-full opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-700 rounded-tr-full opacity-20"></div>
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-blue-100 mb-1">Employees</h3>
                <p className="text-3xl font-bold text-white">{stats.workers}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FaUsers className="text-white text-2xl" />
              </div>
            </div>
            <Link to="/admin/workers" className="text-blue-100 text-sm hover:underline block mt-4 font-medium inline-flex items-center">
              Manage Employees 
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
          {/* Triangle accent */}
          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[60px] border-l-transparent border-b-[60px] border-b-blue-700 opacity-30"></div>
        </div>

        {/* Present Card - Triangle Style */}
        <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-400 rounded-bl-full opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-700 rounded-tr-full opacity-20"></div>
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-green-100 mb-1">Present</h3>
                <p className="text-3xl font-bold text-white">{stats.attendance.present}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FaCheckCircle className="text-white text-2xl" />
              </div>
            </div>
            <Link to="/admin/attendance" className="text-green-100 text-sm hover:underline block mt-4 font-medium inline-flex items-center">
              View Attendance 
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
          {/* Triangle accent */}
          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[60px] border-l-transparent border-b-[60px] border-b-green-700 opacity-30"></div>
        </div>

        {/* Absent Card - Triangle Style */}
        <div className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-400 rounded-bl-full opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-700 rounded-tr-full opacity-20"></div>
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-red-100 mb-1">Absent</h3>
                <p className="text-3xl font-bold text-white">{stats.attendance.absent}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FaTimesCircle className="text-white text-2xl" />
              </div>
            </div>
            <Link to="/admin/attendance" className="text-red-100 text-sm hover:underline block mt-4 font-medium inline-flex items-center">
              View Attendance 
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
          {/* Triangle accent */}
          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[60px] border-l-transparent border-b-[60px] border-b-red-700 opacity-30"></div>
        </div>

        {/* Salary Reports Card - Triangle Style */}
        <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400 rounded-bl-full opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-700 rounded-tr-full opacity-20"></div>
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-indigo-100 mb-1">Salary Reports</h3>
                <p className="text-3xl font-bold text-white">View</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FaFileInvoice className="text-white text-2xl" />
              </div>
            </div>
            <Link to="/admin/salary-report" className="text-indigo-100 text-sm hover:underline block mt-4 font-medium inline-flex items-center">
              Generate Reports 
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </Link>
          </div>
          {/* Triangle accent */}
          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[60px] border-l-transparent border-b-[60px] border-b-indigo-700 opacity-30"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave stats */}
        <Card title="Leave Requests" className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-yellow-800">Pending</h4>
                  <p className="text-2xl font-bold text-yellow-800">{stats.leaves.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-5 rounded-xl border border-green-200">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-800">Approved</h4>
                  <p className="text-2xl font-bold text-green-800">{stats.leaves.approved}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-5 rounded-xl border border-red-200">
              <div className="flex items-center">
                <div className="bg-red-100 p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-red-800">Rejected</h4>
                  <p className="text-2xl font-bold text-red-800">{stats.leaves.rejected}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-blue-800">Total</h4>
                  <p className="text-2xl font-bold text-blue-800">{stats.leaves.total}</p>
                </div>
              </div>
            </div>
          </div>
          <Link to="/admin/leaves" className="text-blue-600 text-sm hover:underline block mt-6 font-medium">
            View All Leave Requests →
          </Link>
        </Card>

        {/* Top workers */}
        <Card title="Top Employees" className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="space-y-4">
            {topWorkers.length > 0 ? (
              topWorkers.map((worker, index) => (
                <div key={worker._id} className="flex items-center p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-blue-800 font-bold mr-4">
                    {index + 1}
                  </div>
                  <img
                    src={worker.photo 
                      ? worker.photo 
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}`}
                    
                    alt={worker.name}
                    className="w-12 h-12 rounded-xl mr-4 object-cover border border-gray-200"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{worker.name}</p>
                    <p className="text-sm text-gray-500">{worker.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{worker.totalPoints || 0}</p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No employee data available.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;