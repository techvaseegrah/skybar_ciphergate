// backend/services/cronJobs.js
const cron = require('node-cron');
const Settings = require('../models/Settings');
const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const Department = require('../models/Department');

// Function to reset daily flags at midnight
const resetDailyFlags = async () => {
  try {
    await Settings.updateMany(
      { emailSentToday: true },
      { 
        $set: { 
          emailSentToday: false,
          lastEmailSent: null 
        } 
      }
    );
    
    console.log('Daily email flags reset successfully');
  } catch (error) {
    console.error('Error resetting daily flags:', error);
  }
};

// Function to auto-punch out workers at 11 PM who haven't punched out
const autoPunchOutWorkers = async () => {
  try {
    console.log('Starting auto-punch out process...');
    
    // Get current date in India timezone
    const indiaTimezoneDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const currentDateFormatted = indiaTimezoneDate.format(new Date());
    const currentTimeFormatted = '11:00:00 PM'; // Fixed time for auto-punch out
    
    // Find all workers who have punched in today but haven't punched out
    // First, get all attendance records from today
    const todayAttendances = await Attendance.find({
      date: currentDateFormatted
    }).sort({ createdAt: -1 });
    
    // Group by RFID to find last attendance for each worker
    const workerLastAttendance = {};
    for (const attendance of todayAttendances) {
      if (!workerLastAttendance[attendance.rfid]) {
        workerLastAttendance[attendance.rfid] = attendance;
      }
    }
    
    // For each worker who has an "in" punch without an "out" punch, create an auto out punch
    let autoPunchOutCount = 0;
    for (const rfid in workerLastAttendance) {
      const lastAttendance = workerLastAttendance[rfid];
      
      // If the last attendance is an "in" punch (presence = true), create an auto out punch
      if (lastAttendance.presence === true) {
        // Get worker and department details
        const worker = await Worker.findOne({ rfid: lastAttendance.rfid });
        if (!worker) {
          console.log(`Worker not found for RFID: ${lastAttendance.rfid}`);
          continue;
        }
        
        const department = await Department.findById(worker.department);
        if (!department) {
          console.log(`Department not found for worker: ${worker.name}`);
          continue;
        }
        
        // Create auto out punch
        await Attendance.create({
          name: worker.name,
          username: worker.username,
          rfid: worker.rfid,
          subdomain: worker.subdomain,
          department: department._id,
          departmentName: department.name,
          photo: worker.photo,
          date: currentDateFormatted,
          time: currentTimeFormatted,
          presence: false, // Out punch
          worker: worker._id,
          isMissedOutPunch: true
        });
        
        console.log(`Auto-punched out worker: ${worker.name} (RFID: ${worker.rfid})`);
        autoPunchOutCount++;
      }
    }
    
    console.log(`Auto-punch out process completed. ${autoPunchOutCount} workers auto-punched out.`);
  } catch (error) {
    console.error('Error in auto-punch out process:', error);
  }
};

// Start cron jobs
const startCronJobs = () => {
  try {
    console.log('Starting cron jobs...');
    
    // Reset daily flags at midnight
    cron.schedule('0 0 * * *', resetDailyFlags, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
    
    // Auto-punch out workers at 11 PM daily
    cron.schedule('0 23 * * *', autoPunchOutWorkers, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
    
    console.log('Cron jobs started successfully');
  } catch (error) {
    console.error('Error starting cron jobs:', error);
  }
};

module.exports = {
  startCronJobs,
  resetDailyFlags,
  autoPunchOutWorkers
};
