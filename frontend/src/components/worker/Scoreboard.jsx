import { useState, useEffect, useContext } from 'react';
import { getWorkers } from '../../services/workerService';
import appContext from '../../context/AppContext';
import Spinner from '../common/Spinner';

const Scoreboard = ({ department }) => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { subdomain } = useContext(appContext);

  useEffect(() => {
    const fetchDepartmentWorkers = async () => {
      if (!department) return;
      
      setIsLoading(true);
      try {
        const allWorkers = await getWorkers({ subdomain });
        // Filter workers by department name
        const departmentWorkers = allWorkers.filter(worker => worker.department === department);
        // Sort by points descending
        const sortedWorkers = departmentWorkers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        setWorkers(sortedWorkers);
      } catch (error) {
        console.error('Error fetching department workers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentWorkers();
  }, [department, subdomain]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workers.length > 0 ? (
              workers.map((worker, index) => (
                <tr 
                  key={worker._id} 
                  className={`hover:bg-gray-50 transition-colors duration-150 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 
                    index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100' : 
                    index === 2 ? 'bg-gradient-to-r from-amber-50 to-orange-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 ? (
                        <div className="bg-yellow-100 text-yellow-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          🥇
                        </div>
                      ) : index === 1 ? (
                        <div className="bg-gray-200 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          🥈
                        </div>
                      ) : index === 2 ? (
                        <div className="bg-amber-100 text-amber-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          🥉
                        </div>
                      ) : (
                        <div className="bg-gray-100 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-xl object-cover border border-gray-200" 
                          src={worker.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}`}
                          alt={worker.name} 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                        <div className="text-sm text-gray-500">{worker.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{worker.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{worker.totalPoints || 0}</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No employees found in this department
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scoreboard;