import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaCalendarAlt, FaFileInvoice } from 'react-icons/fa';
import { getWorkers } from '../../services/workerService';
import { getAllLeaves } from '../../services/leaveService';
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
      ] = await Promise.all([
        getWorkers({ subdomain }),
        getAllLeaves({ subdomain }),
      ]);

      // Defensive check: ensure leavesData is an array
      const workersData = Array.isArray(workersDataRaw) ? workersDataRaw : [];
      const leavesData = Array.isArray(leavesDataRaw) ? leavesDataRaw : [];

      // Calculate stats for leaves and comments
      const pendingLeaves = leavesData.filter(leave => leave.status === 'Pending');
      const approvedLeaves = leavesData.filter(leave => leave.status === 'Approved');
      const rejectedLeaves = leavesData.filter(leave => leave.status === 'Rejected');

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

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-1">Employees</h3>
              <p className="text-3xl font-bold text-blue-900">{stats.workers}</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-xl">
              <FaUsers className="text-blue-600 text-2xl" />
            </div>
          </div>
          <Link to="/admin/workers" className="text-blue-600 text-sm hover:underline block mt-4 font-medium">
            Manage Employees →
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-1">Pending Leaves</h3>
              <p className="text-3xl font-bold text-yellow-900">{stats.leaves.pending}</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-xl">
              <FaCalendarAlt className="text-yellow-600 text-2xl" />
            </div>
          </div>
          <Link to="/admin/leaves" className="text-yellow-600 text-sm hover:underline block mt-4 font-medium">
            View Requests →
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-1">Approved Leaves</h3>
              <p className="text-3xl font-bold text-green-900">{stats.leaves.approved}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <Link to="/admin/leaves" className="text-green-600 text-sm hover:underline block mt-4 font-medium">
            View Requests →
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-1">Total Leaves</h3>
              <p className="text-3xl font-bold text-purple-900">{stats.leaves.total}</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <Link to="/admin/leaves" className="text-purple-600 text-sm hover:underline block mt-4 font-medium">
            View All →
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-indigo-800 mb-1">Salary Reports</h3>
              <p className="text-3xl font-bold text-indigo-900">View</p>
            </div>
            <div className="bg-indigo-500/10 p-3 rounded-xl">
              <FaFileInvoice className="text-indigo-600 text-2xl" />
            </div>
          </div>
          <Link to="/admin/salary-report" className="text-indigo-600 text-sm hover:underline block mt-4 font-medium">
            Generate Reports →
          </Link>
        </Card>
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