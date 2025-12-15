import React, { useState, useEffect, useContext, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaMoneyBillWave, FaHistory, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { getWorkers } from '../../services/workerService';
import { createAdvanceVoucher, getWorkerAdvances, getAdvanceVouchers, updateAdvance, deleteAdvance } from '../../services/advanceService';
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
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState(null);
    const [editFormData, setEditFormData] = useState({
        amount: '',
        description: ''
    });

    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workerAdvances, setWorkerAdvances] = useState([]);
    const [allAdvances, setAllAdvances] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Subdomain
    const { subdomain } = useContext(appContext);

    // Load initial data
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
            throw error; // Re-throw to allow caller to handle if needed
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to refresh data intelligently based on what modal is open
    const refreshContextData = async () => {
        try {
            // 1. Always refresh global list in background to keep calculations (final salary) correct
            const allAdvancesData = await getAdvanceVouchers();
            setAllAdvances(Array.isArray(allAdvancesData) ? allAdvancesData : []);

            // 2. If a specific worker modal is open, refresh their specific list immediately
            if ((isHistoryModalOpen || isWorkerAdvancesModalOpen) && selectedWorker) {
                const advances = await getWorkerAdvances(selectedWorker._id);
                setWorkerAdvances(Array.isArray(advances) ? advances : []);
            } else {
                // Otherwise refresh the main worker list to update UI amounts
                const workersData = await getWorkers({ subdomain });
                setWorkers(Array.isArray(workersData) ? workersData : []);
            }
        } catch (error) {
            console.error("Error refreshing data:", error);
            // Don't show toast here to avoid spamming user
            throw error; // Re-throw to allow caller to handle if needed
        }
    };

    // Refresh data when component is focused
    const refreshOnFocus = useRef(() => {
        if (!isLoading && workers.length > 0) {
            loadData();
        }
    });

    // Function to handle advance deduction completion event
    const handleAdvanceDeductionCompleted = useRef((event) => {
        if (!isLoading) {
            loadData();
            toast.info('Data automatically refreshed due to advance deduction');
        }
    });

    useEffect(() => {
        const handleFocus = () => refreshOnFocus.current();
        const handleDeductionEvent = (event) => handleAdvanceDeductionCompleted.current(event);

        window.addEventListener('focus', handleFocus);
        window.addEventListener('advanceDeductionCompleted', handleDeductionEvent);
        
        // Periodic refresh (every 5 minutes)
        const intervalId = setInterval(() => {
            if (!isLoading) loadData();
        }, 5 * 60 * 1000);
        
        loadData();

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
        if (!Array.isArray(workers) || !Array.isArray(allAdvances)) return [];
        const workerIdsWithAdvances = [...new Set(allAdvances.map(advance => advance.worker?._id || advance.worker))];
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
        setFormData({ amount: '', description: 'Advance Voucher' });
        setIsAdvanceModalOpen(true);
    };

    // Open advance history modal for individual worker
    const openHistoryModal = async (worker) => {
        setSelectedWorker(worker);
        setIsHistoryModalOpen(true);
        try {
            const advances = await getWorkerAdvances(worker._id);
            setWorkerAdvances(Array.isArray(advances) ? advances : []);
            refreshContextData(); // Sync everything else
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

    // --- EDIT FUNCTIONALITY ---

    const openEditModal = (advance) => {
        setEditingAdvance(advance);
        setEditFormData({
            amount: advance.amount ? advance.amount.toString() : '',
            description: advance.description || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setEditFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setEditFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUpdateAdvance = async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(editFormData.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid advance amount greater than 0');
            return;
        }

        setIsSubmitting(true);
        
        try {
            await updateAdvance(editingAdvance._id, {
                amount: amount,
                description: editFormData.description
            });
            
            toast.success('Advance voucher updated successfully');
            setIsEditModalOpen(false);
            setEditFormData({ amount: '', description: '' });
            setEditingAdvance(null);
            
            // Update the worker advances list locally to reflect changes immediately
            setWorkerAdvances(prevAdvances => 
                prevAdvances.map(advance => 
                    advance._id === editingAdvance._id 
                        ? { ...advance, amount: amount, description: editFormData.description }
                        : advance
                )
            );
            
            // Also update the global advances list
            setAllAdvances(prevAdvances => 
                prevAdvances.map(advance => 
                    advance._id === editingAdvance._id 
                        ? { ...advance, amount: amount, description: editFormData.description }
                        : advance
                )
            );
            
            // Refresh data correctly
            await refreshContextData();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to update advance voucher');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- DELETE FUNCTIONALITY ---
    
    const handleDeleteAdvance = async (advanceId) => {
        // Add confirmation dialog with explicit permanent deletion warning
        if (!window.confirm('Are you sure you want to permanently delete this advance voucher? This action cannot be undone and the voucher will be permanently removed from the system.')) {
            return; // User cancelled the deletion
        }
        
        try {
            await deleteAdvance(advanceId);
            
            // Show success message
            toast.success('Advance voucher permanently deleted');
            
            // SUCCESS BLOCK: Trigger data reload to refresh the table
            // Update local state immediately for instant UI feedback
            setWorkerAdvances(prevAdvances => 
                prevAdvances.filter(advance => advance._id !== advanceId)
            );
            
            setAllAdvances(prevAdvances => 
                prevAdvances.filter(advance => advance._id !== advanceId)
            );
            
            // Trigger full data reload from server to ensure consistency
            // Use a small delay to ensure the database operation completes
            setTimeout(async () => {
                await refreshContextData();
                await loadData();
            }, 500);
        } catch (error) {
            // Fix for 404 Error: If item is not found, it's already deleted.
            if (error.response && error.response.status === 404) {
                toast.warn('Advance voucher was already deleted. Refreshing list...');
                // Still remove from local state even if it was already deleted on server
                setWorkerAdvances(prevAdvances => 
                    prevAdvances.filter(advance => advance._id !== advanceId)
                );
                setAllAdvances(prevAdvances => 
                    prevAdvances.filter(advance => advance._id !== advanceId)
                );
                
                // Trigger full data reload from server to ensure consistency
                setTimeout(async () => {
                    await refreshContextData();
                    await loadData();
                }, 500);
            } else {
                console.error(error);
                toast.error(error.message || 'Failed to delete advance voucher');
            }
        }
    };

    // --- CREATE FUNCTIONALITY ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCreateAdvance = async (e) => {
        e.preventDefault();
        
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
            setFormData({ amount: '', description: 'Advance Voucher' });
            
            // Update UI
            if (isWorkerAdvancesModalOpen && selectedWorker) {
                 await refreshContextData();
            } else {
                 loadData();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to create advance voucher');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Table Columns
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
                            alt={record.name}
                            className="w-8 h-8 rounded-full mr-2"
                        />
                    )}
                    {record?.name || 'Unknown'}
                </div>
            )
        },
        { header: 'RF ID', accessor: 'rfid' },
        { header: 'Department', accessor: 'department' },
        {
            header: 'Pending Advance',
            accessor: 'pendingAdvance',
            render: (record) => {
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
        { header: 'RF ID', accessor: 'rfid' },
        { header: 'Department', accessor: 'department' },
        {
            header: 'Pending Advance',
            accessor: 'pendingAdvance',
            render: (record) => `₹${getPendingAdvanceForWorker(record._id).toFixed(2)}`
        }
    ];

    const workerAdvancesColumns = [
        { header: 'Date', accessor: 'createdAt', render: (record) => new Date(record.createdAt).toLocaleDateString() },
        { header: 'Amount', accessor: 'amount', render: (record) => `₹${record.amount.toFixed(2)}` },
        { header: 'Remaining Amount', accessor: 'remainingAmount', render: (record) => `₹${record.remainingAmount.toFixed(2)}` },
        { header: 'Description', accessor: 'description' },
        {
            header: 'Actions',
            accessor: 'actions',
            render: (record) => (
                <div className="flex space-x-2">
                    <button
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit advance"
                        onClick={() => openEditModal(record)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                    <button
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete advance"
                        onClick={() => handleDeleteAdvance(record._id)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )
        }
    ];

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

            {/* Advance Voucher Modal (CREATE) */}
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
                        <Button type="button" variant="outline" onClick={() => setIsAdvanceModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Create Voucher'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Advance History Modal (Split View) */}
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
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desc</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {workerAdvances.map((advance) => (
                                                <tr key={advance._id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm text-gray-900">{new Date(advance.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">₹{advance.amount.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{advance.description}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900">
                                                        <div className="flex space-x-2">
                                                            <button className="p-1 text-blue-600 hover:text-blue-800" title="Edit" onClick={() => openEditModal(advance)}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                                            </button>
                                                            <button 
                                                                className="p-1 text-red-600 hover:text-red-800" 
                                                                title="Delete" 
                                                                onClick={() => handleDeleteAdvance(advance._id)}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">No advance vouchers found.</div>
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
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desc</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {workerAdvances.flatMap(advance => 
                                                (advance.deductions || []).map((deduction, index) => (
                                                    <tr key={`${advance._id}-${index}`} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-sm text-gray-900">{new Date(deduction.date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">₹{deduction.amount.toFixed(2)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{deduction.description}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">
                                                            <div className="flex space-x-2">
                                                                <button className="p-1 text-gray-400 cursor-not-allowed" disabled><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                                                <button className="p-1 text-gray-400 cursor-not-allowed" disabled><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">No advance deductions found.</div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* Global Advance History Modal */}
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
                        <Button variant="outline" onClick={() => setIsGlobalHistoryModalOpen(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* Worker Advances Modal */}
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
                        <Button variant="outline" onClick={() => setIsWorkerAdvancesModalOpen(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Advance Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Advance Voucher"
            >
                <form onSubmit={handleUpdateAdvance}>
                    <div className="form-group">
                        <label htmlFor="edit-amount" className="form-label">Advance Amount (₹)</label>
                        <input
                            type="text"
                            id="edit-amount"
                            name="amount"
                            className="form-input"
                            value={editFormData.amount}
                            onChange={handleEditChange}
                            required
                            pattern="^\d*\.?\d*$"
                            title="Please enter a valid number (e.g., 100 or 50.50)"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-description" className="form-label">Description</label>
                        <input
                            type="text"
                            id="edit-description"
                            name="description"
                            className="form-input"
                            value={editFormData.description}
                            onChange={handleEditChange}
                            required
                        />
                    </div>
                    <div className="flex justify-end mt-6 space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Voucher'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdvanceManagement;