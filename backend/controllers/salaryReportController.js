const asyncHandler = require('express-async-handler');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const Advance = require('../models/Advance');

// Helper function to calculate working hours from attendance records
const calculateWorkingHours = (attendanceRecords) => {
  // Sort attendance records by date and time
  const sortedRecords = [...attendanceRecords].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });

  let totalHours = 0;
  let inTime = null;

  for (const record of sortedRecords) {
    if (record.presence === true) {
      // Punch In
      inTime = new Date(`${record.date} ${record.time}`);
    } else if (record.presence === false && inTime) {
      // Punch Out
      const outTime = new Date(`${record.date} ${record.time}`);
      const hours = (outTime - inTime) / (1000 * 60 * 60); // Convert milliseconds to hours
      totalHours += hours;
      inTime = null;
    }
  }

  return totalHours;
};

// Helper function to get advances for a worker in a specific month
const getWorkerAdvancesForMonth = async (workerId, year, month, subdomain) => {
  // Format month as MM (01-12)
  const monthString = month.toString().padStart(2, '0');
  const startDate = new Date(`${year}-${monthString}-01T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  
  const advances = await Advance.find({
    worker: workerId,
    subdomain,
    createdAt: {
      $gte: startDate,
      $lt: endDate
    }
  });
  
  // Calculate total deductions made in this month from these advances
  let totalDeductions = 0;
  for (const advance of advances) {
    // Sum up all deductions for this advance
    totalDeductions += advance.deductions.reduce((sum, deduction) => {
      // Check if deduction was made in the same month
      const deductionDate = new Date(deduction.date);
      if (deductionDate.getFullYear() === year && deductionDate.getMonth() + 1 === month) {
        return sum + deduction.amount;
      }
      return sum;
    }, 0);
  }
  
  return totalDeductions;
};

// Helper function to get previous advances balance
const getPreviousAdvancesBalance = async (workerId, year, month, subdomain) => {
  // Get all advances for this worker
  const advances = await Advance.find({
    worker: workerId,
    subdomain
  });
  
  // Calculate total remaining amount that should be deducted from previous advances
  let totalRemainingToDeduct = 0;
  for (const advance of advances) {
    // Sum up all deductions made before the current month
    let deductionsBeforeMonth = 0;
    for (const deduction of advance.deductions) {
      const deductionDate = new Date(deduction.date);
      // Check if deduction was made before the current month
      if (deductionDate.getFullYear() < year || 
          (deductionDate.getFullYear() === year && deductionDate.getMonth() + 1 < month)) {
        deductionsBeforeMonth += deduction.amount;
      }
    }
    
    // Calculate remaining amount that should be deducted (original amount - deductions before this month)
    const remainingToDeduct = Math.max(0, advance.amount - deductionsBeforeMonth);
    totalRemainingToDeduct += remainingToDeduct;
  }
  
  return totalRemainingToDeduct;
};

// @desc    Generate salary report for a specific month
// @route   GET /api/salary-report/:subdomain/:year/:month
// @access  Private/Admin
const generateSalaryReport = asyncHandler(async (req, res) => {
  const { subdomain, year, month } = req.params;
  
  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Invalid subdomain');
  }
  
  if (!year || !month) {
    res.status(400);
    throw new Error('Year and month are required');
  }
  
  // Validate month (1-12)
  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    res.status(400);
    throw new Error('Invalid month. Must be between 1 and 12');
  }
  
  // Validate year
  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
    res.status(400);
    throw new Error('Invalid year');
  }
  
  try {
    // Get settings for the subdomain
    const settings = await Settings.findOne({ subdomain });
    if (!settings) {
      res.status(404);
      throw new Error('Settings not found for this subdomain');
    }
    
    // Get all workers for the subdomain with populated department names
    const workers = await Worker.find({ subdomain }).populate('department', 'name');
    if (!workers || workers.length === 0) {
      res.status(404);
      throw new Error('No workers found for this subdomain');
    }
    
    // Get working days for the month from settings
    const workingDays = settings.getWorkingDaysForMonth(yearNum, monthNum);
    
    // Format month for database queries (YYYY-MM)
    const monthString = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    
    // Generate salary report for each worker
    const salaryReport = [];
    
    for (const worker of workers) {
      // Get attendance records for the worker in the specified month
      const startDate = new Date(`${monthString}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      const attendanceRecords = await Attendance.find({
        worker: worker._id,
        subdomain,
        date: {
          $gte: startDate.toISOString().split('T')[0],
          $lt: endDate.toISOString().split('T')[0]
        }
      });
      
      // Calculate working hours
      const workingHours = calculateWorkingHours(attendanceRecords);
      
      // Get required working hours from settings
      const requiredHours = settings.getAttendanceTimerForWorker(worker._id);
      
      // Determine if worker is present (worked required hours)
      const isPresent = workingHours >= requiredHours;
      
      // Calculate number of working days based on presence
      const numberOfWorkingDays = isPresent ? workingDays : 0;
      
      // Calculate per day salary
      const perDaySalary = worker.salary > 0 && workingDays > 0 ? worker.salary / workingDays : 0;
      
      // Calculate total salary
      const totalSalary = perDaySalary * numberOfWorkingDays;
      
      // Get advances for the current month
      const currentMonthAdvances = await getWorkerAdvancesForMonth(worker._id, yearNum, monthNum, subdomain);
      
      // Get previous advances balance
      const previousAdvances = await getPreviousAdvancesBalance(worker._id, yearNum, monthNum, subdomain);
      
      // Calculate pending salary
      const pendingSalary = totalSalary - currentMonthAdvances - previousAdvances;
      
      // Count leaves (days when worker was absent)
      const leaves = isPresent ? 0 : workingDays;
      
      salaryReport.push({
        serialNumber: salaryReport.length + 1,
        employeeId: worker._id,
        employeeName: worker.name,
        designation: worker.department ? worker.department.name : 'N/A',
        monthlySalary: worker.salary,
        totalDays: workingDays,
        leaves: leaves,
        workingDays: numberOfWorkingDays,
        perDaySalary: parseFloat(perDaySalary.toFixed(2)),
        totalSalary: parseFloat(totalSalary.toFixed(2)),
        currentMonthAdvance: parseFloat(currentMonthAdvances.toFixed(2)),
        previousAdvance: parseFloat(previousAdvances.toFixed(2)),
        pendingSalary: parseFloat(pendingSalary.toFixed(2)),
        workingHours: parseFloat(workingHours.toFixed(2)),
        requiredHours: requiredHours,
        isPresent: isPresent
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Salary report generated successfully',
      data: {
        month: monthString,
        year: yearNum,
        workingDays: workingDays,
        report: salaryReport
      }
    });
  } catch (error) {
    console.error('Error generating salary report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating salary report',
      error: error.message 
    });
  }
});

// @desc    Get worker attendance summary for a specific month
// @route   GET /api/salary-report/:subdomain/:year/:month/worker/:workerId
// @access  Private/Admin
const getWorkerAttendanceSummary = asyncHandler(async (req, res) => {
  const { subdomain, year, month, workerId } = req.params;
  
  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Invalid subdomain');
  }
  
  if (!year || !month || !workerId) {
    res.status(400);
    throw new Error('Year, month, and worker ID are required');
  }
  
  // Validate month (1-12)
  const monthNum = parseInt(month);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    res.status(400);
    throw new Error('Invalid month. Must be between 1 and 12');
  }
  
  // Validate year
  const yearNum = parseInt(year);
  if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2100) {
    res.status(400);
    throw new Error('Invalid year');
  }
  
  try {
    // Get worker with populated department
    const worker = await Worker.findOne({ _id: workerId, subdomain }).populate('department', 'name');
    if (!worker) {
      res.status(404);
      throw new Error('Worker not found');
    }
    
    // Get settings
    const settings = await Settings.findOne({ subdomain });
    if (!settings) {
      res.status(404);
      throw new Error('Settings not found for this subdomain');
    }
    
    // Get working days for the month from settings
    const workingDays = settings.getWorkingDaysForMonth(yearNum, monthNum);
    
    // Format month for database queries (YYYY-MM)
    const monthString = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    
    // Get attendance records for the worker in the specified month
    const startDate = new Date(`${monthString}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const attendanceRecords = await Attendance.find({
      worker: worker._id,
      subdomain,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lt: endDate.toISOString().split('T')[0]
      }
    });
    
    // Calculate working hours
    const workingHours = calculateWorkingHours(attendanceRecords);
    
    // Get required working hours from settings
    const requiredHours = settings.getAttendanceTimerForWorker(worker._id);
    
    // Determine if worker is present (worked required hours)
    const isPresent = workingHours >= requiredHours;
    
    // Calculate number of working days based on presence
    const numberOfWorkingDays = isPresent ? workingDays : 0;
    
    // Calculate per day salary
    const perDaySalary = worker.salary > 0 && workingDays > 0 ? worker.salary / workingDays : 0;
    
    // Calculate total salary
    const totalSalary = perDaySalary * numberOfWorkingDays;
    
    // Get advances for the current month
    const currentMonthAdvances = await getWorkerAdvancesForMonth(worker._id, yearNum, monthNum, subdomain);
    
    // Get previous advances balance
    const previousAdvances = await getPreviousAdvancesBalance(worker._id, yearNum, monthNum, subdomain);
    
    // Calculate pending salary
    const pendingSalary = totalSalary - currentMonthAdvances - previousAdvances;
    
    // Count leaves (days when worker was absent)
    const leaves = isPresent ? 0 : workingDays;
    
    res.status(200).json({
      success: true,
      message: 'Worker attendance summary retrieved successfully',
      data: {
        worker: {
          id: worker._id,
          name: worker.name,
          username: worker.username,
          rfid: worker.rfid,
          salary: worker.salary,
          department: worker.department ? worker.department.name : 'N/A'
        },
        month: monthString,
        year: yearNum,
        workingDays: workingDays,
        attendance: {
          totalRecords: attendanceRecords.length,
          workingHours: parseFloat(workingHours.toFixed(2)),
          requiredHours: requiredHours,
          isPresent: isPresent,
          leaves: leaves,
          workingDays: numberOfWorkingDays,
          perDaySalary: parseFloat(perDaySalary.toFixed(2)),
          totalSalary: parseFloat(totalSalary.toFixed(2)),
          currentMonthAdvance: parseFloat(currentMonthAdvances.toFixed(2)),
          previousAdvance: parseFloat(previousAdvances.toFixed(2)),
          pendingSalary: parseFloat(pendingSalary.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Error getting worker attendance summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error getting worker attendance summary',
      error: error.message 
    });
  }
});

module.exports = {
  generateSalaryReport,
  getWorkerAttendanceSummary
};