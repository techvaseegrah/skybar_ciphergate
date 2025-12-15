const asyncHandler = require('express-async-handler');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const Advance = require('../models/Advance');

// Helper function to convert time string to minutes since midnight
const timeToMinutes = (timeString) => {
  if (!timeString) return 0;
  
  console.log('Parsing time string:', timeString);
  
  // Handle different time formats
  let time = timeString.trim();
  
  // Special case for default time format '00:00:00 AM'
  if (time === '00:00:00 AM') {
    console.log('Default time format detected, returning 0 minutes');
    return 0;
  }
  
  // Handle 12-hour format with AM/PM
  let isPM = time.toLowerCase().includes('pm');
  let isAM = time.toLowerCase().includes('am');
  
  // Remove AM/PM suffix
  time = time.replace(/(am|pm)/gi, '').trim();
  
  // Split hours and minutes (and possibly seconds)
  const parts = time.split(':');
  let hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0; // Handle seconds if present
  
  console.log('Parsed time components:', hours, minutes, seconds, 'AM:', isAM, 'PM:', isPM);
  
  // Convert to 24-hour format
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  
  console.log('Final hours in 24-hour format:', hours);
  
  return hours * 60 + minutes;
};

// Helper function to check if attendance is within global time
const isWithinGlobalTime = (attendanceTime, globalStartTime, globalEndTime) => {
  try {
    console.log('Checking time:', attendanceTime, 'against range:', globalStartTime, '-', globalEndTime);
    
    // Special case for default time format
    if (attendanceTime === '00:00:00 AM') {
      console.log('Default time format detected, returning false');
      return false;
    }
    
    const attendanceMinutes = timeToMinutes(attendanceTime);
    const startMinutes = timeToMinutes(globalStartTime);
    const endMinutes = timeToMinutes(globalEndTime);
    
    console.log('Minutes:', attendanceMinutes, startMinutes, endMinutes);
    
    // Handle invalid time values
    if (isNaN(attendanceMinutes) || isNaN(startMinutes) || isNaN(endMinutes)) {
      console.log('Invalid time values detected, returning false');
      return false;
    }
    
    // Handle case where work day crosses midnight (e.g., 22:00 to 06:00)
    if (endMinutes < startMinutes) {
      const result = attendanceMinutes >= startMinutes || attendanceMinutes <= endMinutes;
      console.log('Crosses midnight, result:', result);
      return result;
    }
    
    const result = attendanceMinutes >= startMinutes && attendanceMinutes <= endMinutes;
    console.log('Same day, result:', result);
    return result;
  } catch (error) {
    console.error('Error in isWithinGlobalTime:', error);
    return false; // If there's an error, assume the time is not within working hours
  }
};

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

// Helper function to calculate actual working days based on daily attendance
const calculateActualWorkingDays = (attendanceRecords, settings, year, month) => {
  console.log('Calculating actual working days for', attendanceRecords.length, 'records');
  
  // If no attendance records, return 0
  if (attendanceRecords.length === 0) {
    console.log('No attendance records found, returning 0 working days');
    return 0;
  }
  
  // Create a Set to store dates with valid attendance
  const validAttendanceDates = new Set();
  
  // Group attendance records by date
  const attendanceByDate = {};
  for (const record of attendanceRecords) {
    if (!attendanceByDate[record.date]) {
      attendanceByDate[record.date] = [];
    }
    attendanceByDate[record.date].push(record);
  }
  
  console.log('Grouped attendance by date:', Object.keys(attendanceByDate));
  
  // For each date with attendance records, check if the worker was present
  for (const date in attendanceByDate) {
    const records = attendanceByDate[date];
    console.log('Processing date:', date, 'with', records.length, 'records');
    
    // Check if worker has both IN and OUT punches
    const inRecords = records.filter(record => record.presence === true);
    const outRecords = records.filter(record => record.presence === false);
    
    console.log('IN records:', inRecords.length, 'OUT records:', outRecords.length);
    
    // If worker has both IN and OUT punches, count as a working day
    if (inRecords.length > 0 && outRecords.length > 0) {
      // Add to valid attendance dates
      console.log('Valid attendance date (has both IN and OUT):', date);
      validAttendanceDates.add(date);
    } else if (inRecords.length > 0) {
      // If worker only has IN punches, still count as a working day (might have forgotten to punch out)
      console.log('Valid attendance date (has IN only):', date);
      validAttendanceDates.add(date);
    } else {
      console.log('Incomplete attendance records for date:', date);
    }
  }
  
  console.log('Total valid attendance days:', validAttendanceDates.size);
  return validAttendanceDates.size;
};

// Helper function to get expected working days for a month up to current date
const getExpectedWorkingDaysToDate = (year, month) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
  const today = now.getDate();
  
  // If requesting report for current month, only count days up to today
  if (year === currentYear && month === currentMonth) {
    console.log(`Calculating expected working days for current month up to today (${today})`);
    return today;
  }
  
  // For past months, return all days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  console.log(`Calculating expected working days for past month: ${daysInMonth} days`);
  return daysInMonth;
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
    console.log('Working days for month:', workingDays, 'Year:', yearNum, 'Month:', monthNum);
    
    // Log the monthly working days settings
    console.log('Monthly working days settings:', settings.monthlyWorkingDays);
    
    // Format month for database queries (YYYY-MM)
    const monthString = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    
    // For current month, adjust working days to reflect days passed so far
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const today = now.getDate();
    
    let adjustedWorkingDays = workingDays;
    if (yearNum === currentYear && monthNum === currentMonth) {
      // For current month, calculate proportionally based on days passed
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const expectedWorkingDaysRatio = today / daysInMonth;
      adjustedWorkingDays = Math.max(1, Math.floor(workingDays * expectedWorkingDaysRatio));
      console.log(`Adjusted working days for current month: ${adjustedWorkingDays} (originally ${workingDays})`);
    }
    
    // Generate salary report for each worker
    const salaryReport = [];
    
    for (const worker of workers) {
      console.log('Processing worker:', worker.name, 'ID:', worker._id);
      
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
      
      console.log('Found', attendanceRecords.length, 'attendance records for worker', worker.name);
      
      // Log some sample attendance records for debugging
      if (attendanceRecords.length > 0) {
        console.log('Sample attendance records for', worker.name, ':', attendanceRecords.slice(0, 3));
      }
      
      // Calculate working hours
      const workingHours = calculateWorkingHours(attendanceRecords);
      
      // Get required working hours from settings
      const requiredHours = settings.getAttendanceTimerForWorker(worker._id);
      
      // Calculate actual working days based on daily attendance
      const actualWorkingDays = calculateActualWorkingDays(attendanceRecords, settings, yearNum, monthNum);
      
      // Determine if worker is present based on actual working days
      const isPresent = actualWorkingDays > 0;
      
      // Calculate number of working days based on actual attendance
      const numberOfWorkingDays = actualWorkingDays;
      
      console.log('Worker:', worker.name, 'Working days (from settings):', workingDays, 'Adjusted working days:', adjustedWorkingDays, 'Actual working days:', actualWorkingDays);
      
      // Calculate per day salary - FIXED: Use total working days, not adjusted days
      const perDaySalary = worker.salary > 0 && workingDays > 0 ? worker.salary / workingDays : 0;
      
      // Calculate total salary based on actual working days
      const totalSalary = perDaySalary * numberOfWorkingDays;
      
      // Get advances for the current month
      const currentMonthAdvances = await getWorkerAdvancesForMonth(worker._id, yearNum, monthNum, subdomain);
      
      // Get previous advances balance
      const previousAdvances = await getPreviousAdvancesBalance(worker._id, yearNum, monthNum, subdomain);
      
      // Calculate pending salary
      const pendingSalary = totalSalary - currentMonthAdvances - previousAdvances;
      
      // Count leaves (days when worker was absent)
      // This should be the difference between total working days and actual working days
      const leaves = Math.max(0, workingDays - numberOfWorkingDays);
      
      console.log('Worker:', worker.name, 'Leaves:', leaves, 'Total working days:', workingDays, 'Working days:', numberOfWorkingDays);
      
      salaryReport.push({
        serialNumber: salaryReport.length + 1,
        employeeId: worker._id,
        employeeName: worker.name,
        designation: worker.department ? worker.department.name : 'N/A',
        monthlySalary: worker.salary,
        totalDays: workingDays, // Use total working days, not adjusted days
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
    
    console.log('Generated salary report with', salaryReport.length, 'workers');
    
    res.status(200).json({
      success: true,
      message: 'Salary report generated successfully',
      data: {
        month: monthString,
        year: yearNum,
        workingDays: workingDays, // Use total working days, not adjusted days
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
    
    // Calculate actual working days based on daily attendance
    const actualWorkingDays = calculateActualWorkingDays(attendanceRecords, settings, yearNum, monthNum);
    
    // Determine if worker is present based on actual working days
    const isPresent = actualWorkingDays > 0;
    
    // Calculate number of working days based on actual attendance
    const numberOfWorkingDays = actualWorkingDays;
    
    // Calculate per day salary
    const perDaySalary = worker.salary > 0 && workingDays > 0 ? worker.salary / workingDays : 0;
    
    // Calculate total salary based on actual working days
    const totalSalary = perDaySalary * numberOfWorkingDays;
    
    // Get advances for the current month
    const currentMonthAdvances = await getWorkerAdvancesForMonth(worker._id, yearNum, monthNum, subdomain);
    
    // Get previous advances balance
    const previousAdvances = await getPreviousAdvancesBalance(worker._id, yearNum, monthNum, subdomain);
    
    // Calculate pending salary
    const pendingSalary = totalSalary - currentMonthAdvances - previousAdvances;
    
    // Count leaves (days when worker was absent)
    // This should be the difference between total working days and actual working days
    const leaves = Math.max(0, workingDays - numberOfWorkingDays);
    
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
