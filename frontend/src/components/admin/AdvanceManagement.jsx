import React, { useState, useEffect, useContext, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaMoneyBillWave, FaHistory, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { getWorkers } from '../../services/workerService';
import { createAdvanceVoucher, getWorkerAdvances, getAdvanceVouchers } from '../../services/advanceService';
import Card from '../common/Card';
import Button from '../common/Button';
import Table from '../common/Table';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import appContext from '../../context/AppContext';

const AdvanceManagement = () => {
    const [workers, setWorkers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        amount: '',
        description: 'Advance Voucher'
    });

    // Modal states
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isGlobalHistoryModalOpen, setIsGlobalHistoryModalOpen] = useState(false);
    const [isWorkerAdvancesModalOpen, setIsWorkerAdvancesModalOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workerAdvances, setWorkerAdvances] = useState([]);
    const [allAdvances, setAllAdvances] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Subdomain
    const { subdomain } = useContext(appContext);

    // Load workers
    const loadData = async () => {
        setIsLoading(true);

        try {
            const workersData = await getWorkers({ subdomain });
            const advancesData = await getAdvanceVouchers();

            // Ensure data is an array
            const safeWorkersData = Array.isArray(workersData) ? workersData : [];
            const safeAdvancesData = Array.isArray(advancesData) ? advancesData : [];

            setWorkers(safeWorkersData);
            setAllAdvances(safeAdvancesData);
        } catch (error) {
            toast.error('Failed to load employees');
            console.error(error);
            setWorkers([]);
            setAllAdvances([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh data when component is focused
    const refreshOnFocus = useRef(() => {
        // Only refresh if data is already loaded
        if (!isLoading && workers.length > 0) {
            loadData();
        }
    });

    // Function to handle advance deduction completion event
    const handleAdvanceDeductionCompleted = useRef((event) => {
        // Refresh data when an advance deduction is completed
        if (!isLoading) {
            loadData();
            toast.info('Data automatically refreshed due to advance deduction');
        }
    });

    useEffect(() => {
        // Set up focus event listener
        const handleFocus = () => {
            refreshOnFocus.current();
        };

        // Set up advance deduction completion event listener
        const handleDeductionEvent = (event) => {
            handleAdvanceDeductionCompleted.current(event);
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('advanceDeductionCompleted', handleDeductionEvent);
        
        // Set up periodic refresh (every 5 minutes)
        const intervalId = setInterval(() => {
            if (!isLoading) {
                loadData();
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        // Initial load
        loadData();

        // Cleanup
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('advanceDeductionCompleted', handleDeductionEvent);
            clearInterval(intervalId);
        };
    }, []);

    // Filter workers
    const filteredWorkers = Array.isArray(workers)
        ? workers.filter(
            worker =>
                worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (worker.rfid && worker.rfid.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (worker.department && worker.department.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : [];

    // Get workers who have taken advances
    const getWorkersWithAdvances = () => {
        if (!Array.isArray(workers) || !Array.isArray(allAdvances)) {
            return [];
        }

        // Get unique worker IDs who have advances
        const workerIdsWithAdvances = [...new Set(allAdvances.map(advance => advance.worker?._id || advance.worker))];
        
        // Filter workers who have advances
        return workers.filter(worker => workerIdsWithAdvances.includes(worker._id));
    };

    // Get pending advance amount for a worker
    const getPendingAdvanceForWorker = (workerId) => {
        const workerAdvances = allAdvances.filter(advance => advance.worker?._id === workerId);
        return workerAdvances.reduce((total, advance) => total + advance.remainingAmount, 0);
    };

    // Filter workers with advances based on search term
    const filteredWorkersWithAdvances = getWorkersWithAdvances().filter(
        worker =>
            worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (worker.rfid && worker.rfid.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (worker.department && worker.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Open advance voucher modal
    const openAdvanceModal = (worker) => {
        setSelectedWorker(worker);
        setFormData({
            amount: '',
            description: 'Advance Voucher'
        });
        setIsAdvanceModalOpen(true);
    };

    // Open advance history modal for individual worker
    const openHistoryModal = async (worker) => {
        setSelectedWorker(worker);
        setIsHistoryModalOpen(true);
        
        try {
            const advances = await getWorkerAdvances(worker._id);
            setWorkerAdvances(Array.isArray(advances) ? advances : []);
            // Also refresh all advances to ensure pending advance calculation is up to date
            const allAdvancesData = await getAdvanceVouchers();
            setAllAdvances(Array.isArray(allAdvancesData) ? allAdvancesData : []);
        } catch (error) {
            toast.error('Failed to load advance history');
            setWorkerAdvances([]);
        }
    };

    // Open global advance history modal
    const openGlobalHistoryModal = async () => {
        setIsGlobalHistoryModalOpen(true);
        
        try {
            const advances = await getAdvanceVouchers();
            setAllAdvances(Array.isArray(advances) ? advances : []);
        } catch (error) {
            toast.error('Failed to load advance history');
            setAllAdvances([]);
        }
    };

    // Open worker advances modal
    const openWorkerAdvancesModal = async (worker) => {
        setSelectedWorker(worker);
        setIsWorkerAdvancesModalOpen(true);
        
        try {
            const advances = await getWorkerAdvances(worker._id);
            setWorkerAdvances(Array.isArray(advances) ? advances : []);
        } catch (error) {
            toast.error('Failed to load worker advances');
            setWorkerAdvances([]);
        }
    };

    // Toggle row expansion
    const toggleRowExpansion = (workerId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workerId)) {
                newSet.delete(workerId);
            } else {
                newSet.add(workerId);
            }
            return newSet;
        });
    };

    // Process advances data to group by employee
    const processAdvancesData = () => {
        if (!Array.isArray(allAdvances) || allAdvances.length === 0) {
            return [];
        }

        // Group advances by worker
        const groupedAdvances = allAdvances.reduce((acc, advance) => {
            const workerId = advance.worker?._id || advance.worker;
            if (!acc[workerId]) {
                acc[workerId] = {
                    workerId,
                    workerName: advance.worker?.name || 'Unknown',
                    workerRfid: advance.worker?.rfid || 'N/A',
                    advances: [],
                    totalAmount: 0,
                    lastDeductionDate: null
                };
            }
            
            acc[workerId].advances.push(advance);
            acc[workerId].totalAmount += advance.amount;
            
            // Update last deduction date
            const advanceDate = new Date(advance.createdAt);
            if (!acc[workerId].lastDeductionDate || advanceDate > acc[workerId].lastDeductionDate) {
                acc[workerId].lastDeductionDate = advanceDate;
            }
            
            return acc;
        }, {});

        // Convert to array
        return Object.values(groupedAdvances);
    };

    // Handle form input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Allow empty string or numbers to be typed for amount
        if (name === 'amount') {
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Handle advance voucher submission
    const handleCreateAdvance = async (e) => {
        e.preventDefault();
        
        // Validate amount
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid advance amount');
            return;
        }

        setIsSubmitting(true);
        
        try {
            await createAdvanceVoucher({
                workerId: selectedWorker._id,
                amount: amount,
                description: formData.description
            });
            
            toast.success('Advance voucher created successfully');
            setIsAdvanceModalOpen(false);
            setFormData({
                amount: '',
                description: 'Advance Voucher'
            });
            loadData(); // Refresh worker data and advances data to show updated salary and pending advances
        } catch (error) {
            toast.error(error.message || 'Failed to create advance voucher');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Table columns configuration
    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            render: (record) => (
                <div className="flex items-center">
                    {record?.photo && (
                        <img
                            src={record.photo
                                ? record.photo
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(record.name)}`}
                            alt="Employee"
                            className="w-8 h-8 rounded-full mr-2"
                        />
                    )}
                    {record?.name || 'Unknown'}
                </div>
            )
        },
        {
            header: 'Employee ID',
            accessor: 'rfid'
        },
        {
            header: 'Department',
            accessor: 'department'
        },
        {
            header: 'Base Salary',
            accessor: 'salary',
            render: (record) => record?.salary?.toFixed(2)
        },
        {
            header: 'Final Salary',
            accessor: 'finalSalary',
            render: (record) => {
                // Calculate final salary dynamically: base salary - pending advance
                const workerAdvances = allAdvances.filter(advance => advance.worker?._id === record._id);
                const pendingAdvance = workerAdvances.reduce((total, advance) => total + advance.remainingAmount, 0);
                const finalSalary = record?.salary - pendingAdvance;
                return `₹${finalSalary.toFixed(2)}`;
            }
        },
        {
            header: 'Pending Advance',
            accessor: 'pendingAdvance',
            render: (record) => {
                // Calculate total pending advance for this worker
                const workerAdvances = allAdvances.filter(advance => advance.worker?._id === record._id);
                const pendingAdvance = workerAdvances.reduce((total, advance) => total + advance.remainingAmount, 0);
                return `₹${pendingAdvance.toFixed(2)}`;
            }
        },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (worker) => (
                <div className="flex space-x-2">
                    <button
                        onClick={() => openAdvanceModal(worker)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Create Advance Voucher"
                    >
                        <FaMoneyBillWave className='text-xl' />
                    </button>
                    <button
                        onClick={() => openHistoryModal(worker)}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="View Advance History"
                    >
                        <FaHistory className='text-xl' />
                    </button>
                </div>
            )
        }
    ];

    // History table columns
    const historyColumns = [
        {
            header: 'Date',
            accessor: 'createdAt',
            render: (record) => new Date(record.createdAt).toLocaleDateString()
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (record) => `₹${record.amount.toFixed(2)}`
        },
        {
            header: 'Description',
            accessor: 'description'
        },
        {
            header: 'Approved By',
            accessor: 'approvedBy',
            render: (record) => record.approvedBy?.name || 'Unknown'
        }
    ];

    // History table columns for workers with advances
    const historyWorkerColumns = [
        {
            header: 'Name',
            accessor: 'name',
            render: (record) => (
                <button 
                    onClick={() => openWorkerAdvancesModal(record)}
                    className="text-blue-600 hover:text-blue-800 underline"
                >
                    {record?.name || 'Unknown'}
                </button>
            )
        },
        {
            header: 'RF ID',
            accessor: 'rfid'
        },
        {
            header: 'Department',
            accessor: 'department'
        },
        {
            header: 'Pending Advance',
            accessor: 'pendingAdvance',
            render: (record) => {
                const pendingAdvance = getPendingAdvanceForWorker(record._id);
                return `₹${pendingAdvance.toFixed(2)}`;
            }
        }
    ];

    // Worker advances table columns
    const workerAdvancesColumns = [
        {
            header: 'Date',
            accessor: 'createdAt',
            render: (record) => new Date(record.createdAt).toLocaleDateString()
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (record) => `₹${record.amount.toFixed(2)}`
        },
        {
            header: 'Remaining Amount',
            accessor: 'remainingAmount',
            render: (record) => `₹${record.remainingAmount.toFixed(2)}`
        },
        {
            header: 'Description',
            accessor: 'description'
        }
    ];

    // Processed data for summary view
    const processedAdvancesData = processAdvancesData();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Advance Voucher Management</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={loadData}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        title="Refresh Data"
                    >
                        <FaHistory className="mr-2" />
                        Refresh
                    </button>
                    <button
                        onClick={openGlobalHistoryModal}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        title="View All Advance History"
                    >
                        <FaHistory className="mr-2" />
                        Advance History
                    </button>
                </div>
            </div>

            <Card>
                <div className="mb-4">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name, employee ID or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={filteredWorkers}
                        noDataMessage="No employees found."
                    />
                )}
            </Card>

            {/* Advance Voucher Modal */}
            <Modal
                isOpen={isAdvanceModalOpen}
                onClose={() => setIsAdvanceModalOpen(false)}
                title={`Create Advance Voucher - ${selectedWorker?.name}`}
            >
                <form onSubmit={handleCreateAdvance}>
                    <div className="form-group">
                        <label htmlFor="amount" className="form-label">Advance Amount (₹)</label>
                        <input
                            type="text"
                            id="amount"
                            name="amount"
                            className="form-input"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            pattern="^\d*\.?\d*$"
                            title="Please enter a valid number (e.g., 100 or 50.50)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="form-label">Description</label>
                        <input
                            type="text"
                            id="description"
                            name="description"
                            className="form-input"
                            value={formData.description}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="flex justify-end mt-6 space-x-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAdvanceModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : 'Create Voucher'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Advance History Modal - Shows both Advance Voucher History and Advance Deduction History side by side */}
            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                title={`Advance History - ${selectedWorker?.name}`}
                size="xl"
            >
                <div className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Advance Voucher History */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Advance Voucher History</h3>
                            {workerAdvances.length > 0 ? (
                                <div className="overflow-x-auto max-h-96">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {workerAdvances.map((advance) => (
                                                <tr key={advance._id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                        {new Date(advance.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                        ₹{advance.amount.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                        {advance.description}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No advance vouchers found for this employee.
                                </div>
                            )}
                        </div>

                        {/* Advance Deduction History */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Advance Deduction History</h3>
                            {workerAdvances.some(advance => advance.deductions && advance.deductions.length > 0) ? (
                                <div className="overflow-x-auto max-h-96">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {workerAdvances.flatMap(advance => 
                                                (advance.deductions || []).map((deduction, index) => (
                                                    <tr key={`${advance._id}-${index}`} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                            {new Date(deduction.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                            ₹{deduction.amount.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                            {deduction.description}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No advance deductions found for this employee.
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsHistoryModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Global Advance History Modal - Shows workers with advances */}
            <Modal
                isOpen={isGlobalHistoryModalOpen}
                onClose={() => setIsGlobalHistoryModalOpen(false)}
                title="Advance History"
                size="lg"
            >
                <div className="mt-4">
                    <div className="mb-4">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by name, RF ID or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="overflow-x-auto">
                        <Table
                            columns={historyWorkerColumns}
                            data={filteredWorkersWithAdvances}
                            noDataMessage="No employees with advances found."
                        />
                    </div>
                    
                    <div className="flex justify-end mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsGlobalHistoryModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Worker Advances Modal - Shows all advances for a specific worker */}
            <Modal
                isOpen={isWorkerAdvancesModalOpen}
                onClose={() => setIsWorkerAdvancesModalOpen(false)}
                title={`Advances Taken by - ${selectedWorker?.name}`}
                size="lg"
            >
                <div className="mt-4">
                    <div className="overflow-x-auto">
                        <Table
                            columns={workerAdvancesColumns}
                            data={workerAdvances}
                            noDataMessage="No advances found for this employee."
                        />
                    </div>
                    
                    <div className="flex justify-end mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsWorkerAdvancesModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdvanceManagement;