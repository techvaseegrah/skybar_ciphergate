import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { 
  FiDownload, 
  FiRefreshCw, 
  FiCalendar, 
  FiUser, 
  FiChevronLeft, 
  FiChevronRight,
  FiDollarSign,
  FiEdit,
  FiChevronDown,
  FiChevronUp,
  FiToggleLeft,
  FiToggleRight
} from 'react-icons/fi';
import Button from '../common/Button';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';
import appContext from '../../context/AppContext';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getWorkerAdvances, deductAdvance, getAdvanceVouchers } from '../../services/advanceService';

const SalaryReport = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [workers, setWorkers] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // New states for advance management
  const [showAdvanceManagement, setShowAdvanceManagement] = useState(false);
  const [workerAdvances, setWorkerAdvances] = useState({});
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionDescription, setDeductionDescription] = useState('');
  const [isDeducting, setIsDeducting] = useState(false);
  const [allAdvances, setAllAdvances] = useState([]);
  
  const { subdomain } = useContext(appContext);

  // Month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Fetch salary report
  const fetchSalaryReport = async () => {
    if (!subdomain || subdomain === 'main') {
      toast.error('Invalid subdomain');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/salary-report/${subdomain}/${selectedYear}/${selectedMonth}`);
      setReportData(response.data.data);
      toast.success('Salary report generated successfully');
    } catch (error) {
      console.error('Error fetching salary report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate salary report');
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!reportData) return;

    const headers = [
      'S No',
      'Employee Name',
      'Designation',
      'Monthly Salary',
      'Total Days',
      'No.of Days Leave',
      'No.of Days Working',
      'Per Day Salary',
      'Total Salary',
      'Advance',
      'Previous Advance',
      'Pending Salary'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.report.map(item => [
        item.serialNumber,
        `"${item.employeeName}"`,
        `"${item.designation}"`,
        item.monthlySalary,
        item.totalDays,
        item.leaves,
        item.workingDays,
        item.perDaySalary,
        item.totalSalary,
        item.currentMonthAdvance,
        item.previousAdvance,
        item.pendingSalary
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `salary_report_${reportData.month}_${reportData.year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!reportData) return;

    // Create worksheet data
    const worksheetData = [
      ['S No', 'Employee Name', 'Designation', 'Monthly Salary', 'Total Days', 'No.of Days Leave', 'No.of Days Working', 'Per Day Salary', 'Total Salary', 'Advance', 'Previous Advance', 'Pending Salary'],
      ...reportData.report.map(item => [
        item.serialNumber,
        item.employeeName,
        item.designation,
        item.monthlySalary,
        item.totalDays,
        item.leaves,
        item.workingDays,
        item.perDaySalary,
        item.totalSalary,
        item.currentMonthAdvance,
        item.previousAdvance,
        item.pendingSalary
      ])
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Salary Report');
    
    // Export to Excel file
    XLSX.writeFile(workbook, `salary_report_${reportData.month}_${reportData.year}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`Salary Report - ${getMonthName(selectedMonth)} ${selectedYear}`, 14, 20);
    
    // Add company info
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    // Prepare table data with custom formatting for PDF
    const tableColumn = ['S No', 'Employee Name', 'Designation', 'Monthly Salary (RS)', 'Total Days', 'Leaves', 'Working Days', 'Per Day (RS)', 'Total Salary (RS)', 'Advance (RS)', 'Previous Advance (RS)', 'Pending Salary (RS)'];
    const tableRows = [];

    reportData.report.forEach(item => {
      const rowData = [
        item.serialNumber,
        item.employeeName,
        item.designation,
        formatCurrencyForPDF(item.monthlySalary),
        item.totalDays,
        item.leaves,
        item.workingDays,
        formatCurrencyForPDF(item.perDaySalary),
        formatCurrencyForPDF(item.totalSalary),
        formatCurrencyForPDF(item.currentMonthAdvance),
        formatCurrencyForPDF(item.previousAdvance),
        formatCurrencyForPDF(item.pendingSalary)
      ];
      tableRows.push(rowData);
    });

    // Add table with improved styling using the autoTable plugin correctly
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: [255, 255, 255], // white text
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245] // light gray for alternating rows
      },
      theme: 'grid'
    });

    // Add summary section
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary:', 14, finalY);
    
    doc.setFontSize(10);
    const totalWorkers = reportData.report.length;
    const totalSalary = reportData.report.reduce((sum, item) => sum + item.totalSalary, 0);
    const totalAdvances = reportData.report.reduce((sum, item) => sum + item.currentMonthAdvance + item.previousAdvance, 0);
    
    doc.text(`Total Workers: ${totalWorkers}`, 14, finalY + 8);
    doc.text(`Total Salary: ${formatCurrencyForPDF(totalSalary)}`, 14, finalY + 14);
    doc.text(`Total Advances: ${formatCurrencyForPDF(totalAdvances)}`, 14, finalY + 20);

    // Save the PDF
    doc.save(`salary_report_${selectedMonth}_${selectedYear}.pdf`);
  };

  // Format currency
  const formatCurrency = (amount) => {
    // Changed from ₹ symbol to RS for better PDF compatibility
    return `RS ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  };

  // Format currency specifically for PDF (without HTML entities)
  const formatCurrencyForPDF = (amount) => {
    return `RS ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  };

  // Load all advances for the subdomain
  const loadAllAdvances = async () => {
    try {
      const advances = await getAdvanceVouchers();
      setAllAdvances(Array.isArray(advances) ? advances : []);
    } catch (error) {
      console.error('Error loading advances:', error);
      setAllAdvances([]);
    }
  };

  // Get advances for a specific worker
  const loadWorkerAdvances = async (workerId) => {
    try {
      const advances = await getWorkerAdvances(workerId);
      setWorkerAdvances(prev => ({
        ...prev,
        [workerId]: Array.isArray(advances) ? advances : []
      }));
    } catch (error) {
      console.error('Error loading worker advances:', error);
      setWorkerAdvances(prev => ({
        ...prev,
        [workerId]: []
      }));
    }
  };

  // Get pending advance amount for a worker
  const getPendingAdvanceForWorker = (workerId) => {
    const workerAdvances = allAdvances.filter(advance => 
      advance.worker?._id === workerId && advance.remainingAmount > 0
    );
    return workerAdvances.reduce((total, advance) => total + advance.remainingAmount, 0);
  };

  // Get workers who have taken advances
  const getWorkersWithAdvances = () => {
    if (!reportData || !Array.isArray(allAdvances)) {
      return [];
    }

    // Get unique worker IDs who have advances with remaining amount
    const workerIdsWithAdvances = [...new Set(
      allAdvances
        .filter(advance => advance.remainingAmount > 0)
        .map(advance => advance.worker?._id || advance.worker)
    )];
    
    // Filter workers who have advances
    return reportData.report.filter(item => 
      workerIdsWithAdvances.includes(item.employeeId)
    );
  };

  // Open advance deduction modal
  const openDeductionModal = async (worker) => {
    try {
      // Load worker advances when opening the modal
      const advances = await getWorkerAdvances(worker.employeeId);
      if (Array.isArray(advances) && advances.length > 0) {
        // Filter advances with remaining amount for this worker
        const advancesWithBalance = advances.filter(advance => advance.remainingAmount > 0);
        if (advancesWithBalance.length > 0) {
          // If there's only one advance with balance, use it
          // If there are multiple, use the one with the highest remaining amount
          const advanceToUse = advancesWithBalance.reduce((prev, current) => 
            (prev.remainingAmount > current.remainingAmount) ? prev : current
          );
          
          setEditingAdvance(advanceToUse);
          setDeductionAmount(advanceToUse.remainingAmount.toString());
          setDeductionDescription(`Partial deduction for ${new Date().toLocaleDateString('en-IN')}`);
        } else {
          toast.error('No advances with remaining balance found for this worker');
        }
      } else {
        toast.error('No advances found for this worker');
      }
    } catch (error) {
      console.error('Error loading worker advances:', error);
      toast.error('Failed to load worker advances');
    }
  };

  // Close advance deduction modal
  const closeDeductionModal = () => {
    setEditingAdvance(null);
    setDeductionAmount('');
    setDeductionDescription('');
  };

  // Deduct advance amount
  const handleDeductAdvance = async () => {
    if (!editingAdvance || !deductionAmount || isNaN(deductionAmount) || parseFloat(deductionAmount) <= 0) {
      toast.error('Please enter a valid deduction amount');
      return;
    }

    const deductionAmountFloat = parseFloat(deductionAmount);
    const remainingAmount = editingAdvance.remainingAmount || 0;
    
    if (deductionAmountFloat > remainingAmount) {
      toast.error(`Deduction amount cannot exceed remaining advance amount (₹${remainingAmount})`);
      return;
    }

    setIsDeducting(true);
    try {
      await deductAdvance(editingAdvance._id, {
        amount: deductionAmountFloat,
        description: deductionDescription
      });
      
      toast.success(`₹${deductionAmountFloat} deducted successfully from advance`);
      closeDeductionModal();
      
      // Reload advances to reflect changes
      await loadAllAdvances();
      
      // Refresh salary report
      await fetchSalaryReport();
    } catch (error) {
      console.error('Error deducting advance:', error);
      toast.error(error.message || 'Failed to deduct advance amount');
    } finally {
      setIsDeducting(false);
    }
  };

  // Format number
  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-IN').format(number);
  };

  // Calendar functions
  const getMonthName = (month) => {
    return monthOptions.find(m => m.value === month)?.label || '';
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setShowCalendar(false);
  };

  const handleYearChange = (direction) => {
    setSelectedYear(prev => prev + direction);
  };

  useEffect(() => {
    // Fetch report when component mounts or when year/month changes
    if (subdomain && subdomain !== 'main') {
      fetchSalaryReport();
      loadAllAdvances(); // Load advances when report is fetched
    }
  }, [subdomain, selectedYear, selectedMonth]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FiUser className="mr-3 text-blue-600" />
                Salary Report
              </h1>
              <p className="mt-2 text-gray-600">
                Generate and view salary reports for your workers
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={fetchSalaryReport}
                variant="secondary"
                disabled={loading}
                className="flex items-center"
              >
                <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                variant="primary"
                disabled={loading || !reportData}
                className="flex items-center"
              >
                <FiDownload className="mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={exportToExcel}
                variant="primary"
                disabled={loading || !reportData}
                className="flex items-center"
              >
                <FiDownload className="mr-2" />
                Export Excel
              </Button>
              <Button
                onClick={exportToPDF}
                variant="primary"
                disabled={loading || !reportData}
                className="flex items-center"
              >
                <FiDownload className="mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar-style Filters */}
        <Card className="mb-8 hover:shadow-lg transition-shadow duration-200">
          <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-400" />
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center text-gray-900">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FiCalendar className="h-5 w-5 text-blue-600" />
              </div>
              Report Period
            </h3>

            <div className="flex flex-col items-center">
              {/* Month and Year Selector */}
              <div className="flex items-center justify-between w-full mb-6">
                <Button
                  onClick={() => handleYearChange(-1)}
                  variant="secondary"
                  className="flex items-center"
                >
                  <FiChevronLeft className="mr-1" />
                  Previous Year
                </Button>
                
                <div className="text-xl font-semibold">
                  {selectedYear}
                </div>
                
                <Button
                  onClick={() => handleYearChange(1)}
                  variant="secondary"
                  className="flex items-center"
                >
                  Next Year
                  <FiChevronRight className="ml-1" />
                </Button>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 w-full">
                {monthOptions.map((month) => (
                  <Button
                    key={month.value}
                    onClick={() => handleMonthSelect(month.value)}
                    variant={selectedMonth === month.value ? "primary" : "secondary"}
                    className={`py-3 px-2 text-center rounded-lg ${
                      selectedMonth === month.value 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium'
                    }`}
                  >
                    <div className="font-medium">{month.label.substring(0, 3)}</div>
                    <div className="text-xs mt-1">
                      {selectedYear}
                    </div>
                  </Button>
                ))}
              </div>

              {/* Selected Period Display */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg w-full text-center">
                <p className="text-lg font-semibold text-blue-800">
                  Selected Period: {getMonthName(selectedMonth)} {selectedYear}
                </p>
                <Button
                  onClick={fetchSalaryReport}
                  variant="primary"
                  disabled={loading}
                  className="mt-3 w-full flex items-center justify-center"
                >
                  {loading ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <FiRefreshCw className="mr-2" />
                  )}
                  Generate Report for {getMonthName(selectedMonth)} {selectedYear}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Advance Management Toggle */}
        {reportData && (
          <div className="mb-6">
            <Button
              onClick={() => setShowAdvanceManagement(!showAdvanceManagement)}
              variant="secondary"
              className="flex items-center w-full justify-between py-3 px-4"
            >
              <div className="flex items-center">
                <FiDollarSign className="mr-2 text-blue-600" />
                <span className="font-medium">Advance Management</span>
              </div>
              {showAdvanceManagement ? (
                <FiChevronUp className="text-gray-500" />
              ) : (
                <FiChevronDown className="text-gray-500" />
              )}
            </Button>

            {/* Advance Management Panel */}
            {showAdvanceManagement && (
              <Card className="mt-4 border border-blue-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Workers with Pending Advances</h3>
                  
                  {getWorkersWithAdvances().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FiDollarSign className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2">No workers with pending advances found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Employee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Designation
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pending Advance
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getWorkersWithAdvances().map((worker) => {
                            const workerPendingAdvance = getPendingAdvanceForWorker(worker.employeeId);
                            return (
                              <tr key={worker.employeeId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{worker.employeeName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {worker.designation}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(workerPendingAdvance)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <Button
                                    onClick={() => openDeductionModal(worker)}
                                    variant="primary"
                                    size="sm"
                                    className="flex items-center"
                                  >
                                    <FiEdit className="mr-1" />
                                    Adjust Advance
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Report Summary */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Working Days</h3>
                <p className="text-3xl font-bold">{reportData.workingDays}</p>
                <p className="text-blue-100 mt-1">Days in {new Date(reportData.year, reportData.month - 1).toLocaleDateString('en-US', { month: 'long' })}</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Total Workers</h3>
                <p className="text-3xl font-bold">{reportData.report.length}</p>
                <p className="text-green-100 mt-1">In this report</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Total Salary</h3>
                <p className="text-3xl font-bold">
                  {formatCurrency(reportData.report.reduce((sum, item) => sum + item.totalSalary, 0))}
                </p>
                <p className="text-amber-100 mt-1">For all workers</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">Total Advances</h3>
                <p className="text-3xl font-bold">
                  {formatCurrency(reportData.report.reduce((sum, item) => sum + item.currentMonthAdvance + item.previousAdvance, 0))}
                </p>
                <p className="text-purple-100 mt-1">Deductions</p>
              </div>
            </Card>
          </div>
        )}

        {/* Salary Report Table */}
        {loading ? (
          <div className="flex justify-center items-center min-h-64">
            <Spinner size="lg" />
          </div>
        ) : reportData ? (
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <div className="h-2 bg-gradient-to-r from-indigo-400 to-purple-400" />
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Salary Report for {new Date(reportData.year, reportData.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-500 mt-2 sm:mt-0">
                  {reportData.report.length} workers
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S No
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Designation
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Salary
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Days
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leaves
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Working Days
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Per Day
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Salary
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Advance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Previous Advance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pending Salary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.report.map((item) => (
                      <tr key={item.serialNumber} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.serialNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.employeeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.monthlySalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.totalDays)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.leaves)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.workingDays)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.perDaySalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.totalSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.currentMonthAdvance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.previousAdvance)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${item.pendingSalary < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(item.pendingSalary)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>Total</strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatCurrency(reportData.report.reduce((sum, item) => sum + item.monthlySalary, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatNumber(reportData.report.reduce((sum, item) => sum + item.totalDays, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatNumber(reportData.report.reduce((sum, item) => sum + item.leaves, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatNumber(reportData.report.reduce((sum, item) => sum + item.workingDays, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatCurrency(reportData.report.reduce((sum, item) => sum + item.perDaySalary, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatCurrency(reportData.report.reduce((sum, item) => sum + item.totalSalary, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatCurrency(reportData.report.reduce((sum, item) => sum + item.currentMonthAdvance, 0))}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <strong>
                          {formatCurrency(reportData.report.reduce((sum, item) => sum + item.previousAdvance, 0))}
                        </strong>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${reportData.report.reduce((sum, item) => sum + item.pendingSalary, 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        <strong>
                          {formatCurrency(reportData.report.reduce((sum, item) => sum + item.pendingSalary, 0))}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FiUser className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No salary report available</h3>
            <p className="text-gray-500">
              Select a year and month to generate a salary report
            </p>
          </Card>
        )}

        {/* Advance Deduction Modal */}
        <Modal
          isOpen={!!editingAdvance}
          onClose={closeDeductionModal}
          title="Adjust Advance Deduction"
        >
          {editingAdvance && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800">Advance Details</h4>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Original Amount</p>
                    <p className="font-medium">{formatCurrency(editingAdvance.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining Amount</p>
                    <p className="font-medium">{formatCurrency(editingAdvance.remainingAmount || 0)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  min="0"
                  max={editingAdvance.remainingAmount || 0}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter deduction amount"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Maximum: ₹{editingAdvance.remainingAmount || 0}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={deductionDescription}
                  onChange={(e) => setDeductionDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter description for this deduction"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={closeDeductionModal}
                  variant="secondary"
                  disabled={isDeducting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeductAdvance}
                  variant="primary"
                  disabled={isDeducting}
                >
                  {isDeducting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Deduct Advance'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default SalaryReport;