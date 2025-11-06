// backend/services/cronJobs.js
const cron = require('node-cron');
const Settings = require('../models/Settings');
const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');

// Store active cron jobs to manage them
const activeCronJobs = new Map();

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

// Function to auto punch out workers
const autoPunchOutWorkers = async (subdomain) => {
  try {
    console.log(`Running auto punch-out for subdomain: ${subdomain}`);
    
    // Get settings for this subdomain
    const settings = await Settings.findOne({ subdomain });
    
    // Check if auto punch-out is enabled
    if (!settings || !settings.autoPunchOut || !settings.autoPunchOut.isEnabled) {
      console.log(`Auto punch-out is disabled for subdomain: ${subdomain}`);
      return;
    }
    
    const { outTime, selectedWorkers } = settings.autoPunchOut;
    
    // If no workers selected, nothing to do
    if (!selectedWorkers || selectedWorkers.length === 0) {
      console.log(`No workers selected for auto punch-out in subdomain: ${subdomain}`);
      return;
    }
    
    // Get current date in India timezone
    const indiaTimezone = Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const currentDate = indiaTimezone.format(new Date());
    
    // Process each selected worker
    let autoPunchedOutCount = 0;
    
    for (const workerId of selectedWorkers) {
      try {
        // Find the worker
        const worker = await Worker.findById(workerId);
        if (!worker) {
          console.log(`Worker not found: ${workerId}`);
          continue;
        }
        
        // Check if worker already has a punch-out for today
        const existingPunchOut = await Attendance.findOne({
          worker: workerId,
          subdomain: subdomain,
          date: currentDate,
          presence: false // punch-out records have presence: false
        });
        
        if (existingPunchOut) {
          console.log(`Worker ${worker.name} already punched out today, skipping auto punch-out`);
          continue;
        }
        
        // Check if worker has a punch-in for today
        const punchInRecord = await Attendance.findOne({
          worker: workerId,
          subdomain: subdomain,
          date: currentDate,
          presence: true // punch-in records have presence: true
        });
        
        if (!punchInRecord) {
          console.log(`Worker ${worker.name} has no punch-in record for today, skipping auto punch-out`);
          continue;
        }
        
        // Get current time in India timezone
        const indiaTime = Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        const currentTime = indiaTime.format(new Date());
        
        // Create auto punch-out record
        await Attendance.create({
          name: worker.name,
          username: worker.username,
          rfid: worker.rfid,
          subdomain: subdomain,
          department: worker.department,
          departmentName: worker.departmentName || 'Unknown',
          photo: worker.photo,
          date: currentDate,
          time: currentTime,
          presence: false, // punch-out
          worker: workerId,
          isMissedOutPunch: false, // Set to false so it appears as a normal out punch
          status: 'Auto-Out'
        });
        
        console.log(`Auto punched out worker: ${worker.name}`);
        autoPunchedOutCount++;
      } catch (workerError) {
        console.error(`Error processing worker ${workerId} for auto punch-out:`, workerError);
      }
    }
    
    console.log(`Auto punch-out completed for subdomain ${subdomain}. ${autoPunchedOutCount} workers auto punched out.`);
  } catch (error) {
    console.error(`Error in auto punch-out for subdomain ${subdomain}:`, error);
  }
};

// Function to schedule auto punch-out for a subdomain
const scheduleAutoPunchOut = async (subdomain) => {
  try {
    // Cancel existing cron job for this subdomain if it exists
    if (activeCronJobs.has(subdomain)) {
      const existingJob = activeCronJobs.get(subdomain);
      existingJob.destroy();
      activeCronJobs.delete(subdomain);
      console.log(`Cancelled existing auto punch-out job for subdomain: ${subdomain}`);
    }
    
    // Get settings for this subdomain
    const settings = await Settings.findOne({ subdomain });
    
    // Check if auto punch-out is enabled
    if (!settings || !settings.autoPunchOut || !settings.autoPunchOut.isEnabled) {
      console.log(`Auto punch-out is disabled for subdomain: ${subdomain}`);
      return;
    }
    
    const { outTime } = settings.autoPunchOut;
    
    // Convert time to cron format (HH:MM -> MM HH)
    const [hours, minutes] = outTime.split(':');
    const cronTime = `${minutes} ${hours} * * *`;
    
    // Schedule the cron job
    const job = cron.schedule(cronTime, () => autoPunchOutWorkers(subdomain), {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
    
    // Store the job reference
    activeCronJobs.set(subdomain, job);
    
    console.log(`Scheduled auto punch-out for subdomain ${subdomain} at ${outTime} (${cronTime})`);
  } catch (error) {
    console.error(`Error scheduling auto punch-out for subdomain ${subdomain}:`, error);
  }
};

// Function to initialize auto punch-out jobs for all subdomains
const initializeAutoPunchOutJobs = async () => {
  try {
    console.log('Initializing auto punch-out jobs for all subdomains...');
    
    // Get all settings with auto punch-out enabled
    const allSettings = await Settings.find({
      'autoPunchOut.isEnabled': true
    });
    
    console.log(`Found ${allSettings.length} subdomains with auto punch-out enabled`);
    
    // Schedule jobs for each subdomain
    for (const settings of allSettings) {
      await scheduleAutoPunchOut(settings.subdomain);
    }
    
    console.log('Auto punch-out jobs initialization completed');
  } catch (error) {
    console.error('Error initializing auto punch-out jobs:', error);
  }
};

// Start cron jobs
const startCronJobs = () => {
  console.log('Starting cron jobs for food request reports...');

  // Reset daily flags at midnight
  cron.schedule('0 0 * * *', resetDailyFlags, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // Initialize auto punch-out jobs
  initializeAutoPunchOutJobs();

  console.log('Cron jobs started successfully');
};

module.exports = {
  startCronJobs,
  resetDailyFlags,
  scheduleAutoPunchOut,
  autoPunchOutWorkers
};