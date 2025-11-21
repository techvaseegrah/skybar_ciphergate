const Attendance = require('../models/Attendance');
const Worker = require('../models/Worker');
const Department = require('../models/Department');
const Settings = require('../models/Settings');

// @desc    Update or create attendance record for a worker
// @route   PUT /api/attendance
// @access  Private
const putAttendance = async (req, res) => {
    try {
        const { rfid, subdomain, presence: providedPresence } = req.body;
        
        console.log('putAttendance called with:', { rfid, subdomain, providedPresence, providedPresenceType: typeof providedPresence });

        if (!subdomain || subdomain === 'main') {
            res.status(401);
            throw new Error('Company name is missing, login again');
        }

        if (!rfid || rfid === '') {
            res.status(401);
            throw new Error('RFID is required');
        }

        const worker = await Worker.findOne({ subdomain, rfid });
        if (!worker) {
            res.status(404);
            throw new Error('Worker not found');
        }

        const department = await Department.findById(worker.department);
        if (!department) {
            res.status(404);
            throw new Error('Department not found');
        }

        const indiaTimezoneDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const indiaTimezoneTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const currentDateFormatted = indiaTimezoneDate.format(new Date());
        const currentTimeFormatted = indiaTimezoneTime.format(new Date());

        let newPresence;
        if (typeof providedPresence === 'boolean') {
            // Use the presence state provided by the frontend
            newPresence = providedPresence;
            console.log('Using provided presence:', newPresence);
        } else {
            // Determine presence state based on last attendance (existing logic)
            console.log('No provided presence, calculating based on last attendance');
            const lastAttendance = await Attendance.findOne({ rfid, subdomain }).sort({ createdAt: -1 });

            if (!lastAttendance) {
                newPresence = true;
            } else {
                newPresence = !lastAttendance.presence;

                // Safely format the last attendance date
                let lastPunchDateFormatted;
                try {
                    // Handle different date formats
                    if (lastAttendance.date instanceof Date) {
                        lastPunchDateFormatted = indiaTimezoneDate.format(lastAttendance.date);
                    } else if (typeof lastAttendance.date === 'string') {
                        // Try to parse the string as a date
                        const parsedDate = new Date(lastAttendance.date);
                        if (!isNaN(parsedDate.getTime())) {
                            lastPunchDateFormatted = indiaTimezoneDate.format(parsedDate);
                        } else {
                            // If parsing fails, use the string as is
                            lastPunchDateFormatted = lastAttendance.date;
                        }
                    } else {
                        // For any other type, convert to string
                        lastPunchDateFormatted = String(lastAttendance.date);
                    }
                } catch (dateError) {
                    console.error('Error formatting last attendance date:', dateError);
                    // Fallback to current date if formatting fails
                    lastPunchDateFormatted = currentDateFormatted;
                }

                if (newPresence === true && lastAttendance.presence === true && lastPunchDateFormatted !== currentDateFormatted) {
                    // Use proper time format for auto-generated attendance
                    const defaultEndOfDayTime = '07:00:00 PM';

                    await Attendance.create({
                        name: worker.name,
                        username: worker.username,
                        rfid,
                        subdomain,
                        department: department._id,
                        departmentName: department.name,
                        photo: worker.photo,
                        date: lastPunchDateFormatted,
                        time: defaultEndOfDayTime, // Use proper time format
                        presence: false,
                        worker: worker._id,
                        isMissedOutPunch: true
                    });
                    console.log(`Auto-generated OUT for ${worker.name} on ${lastPunchDateFormatted} at ${defaultEndOfDayTime} due to missed punch.`);
                }
            }
        }
        
        console.log('Final presence value to be recorded:', newPresence);

        const newAttendance = await Attendance.create({
            name: worker.name,
            username: worker.username,
            rfid,
            subdomain,
            department: department._id,
            departmentName: department.name,
            photo: worker.photo,
            date: currentDateFormatted,
            time: currentTimeFormatted,
            presence: newPresence,
            worker: worker._id
        });

        res.status(201).json({
            message: newPresence ? 'Attendance marked as in' : 'Attendance marked as out',
            attendance: newAttendance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


const putRfidAttendance = async (req, res) => {
    try {
        const { rfid, presence: providedPresence, latitude, longitude } = req.body;

        if (!rfid || rfid === '') {
            res.status(401);
            throw new Error('RFID is required');
        }

        const worker = await Worker.findOne({ rfid });
        if (!worker) {
            res.status(404);
            throw new Error('Worker not found');
        }

        const { subdomain } = worker;

        // Check location settings if subdomain exists
        if (subdomain && subdomain !== 'main') {
            // Get location settings
            const settings = await Settings.findOne({ subdomain });
            
            // If location restriction is enabled, validate location
            if (settings && settings.attendanceLocation && settings.attendanceLocation.enabled) {
                // If location data is not provided with RFID scan, deny attendance
                if (!latitude || !longitude) {
                    return res.status(403).json({ 
                        message: 'Location validation required for attendance but not provided with RFID scan' 
                    });
                }
                
                // Calculate distance between worker's location and allowed location
                const { calculateDistance } = require('../utils/locationUtils');
                const allowedLat = settings.attendanceLocation.latitude;
                const allowedLon = settings.attendanceLocation.longitude;
                const radius = settings.attendanceLocation.radius;
                
                const distance = calculateDistance(allowedLat, allowedLon, latitude, longitude);
                
                // Check if worker is within the allowed radius
                if (distance > radius) {
                    return res.status(403).json({ 
                        message: `Worker is ${Math.round(distance)} meters away from allowed location (max: ${radius} meters)` 
                    });
                }
            }
        }

        const department = await Department.findById(worker.department);
        if (!department) {
            res.status(404);
            throw new Error('Department not found');
        }

        const indiaTimezoneDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const indiaTimezoneTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const currentDateFormatted = indiaTimezoneDate.format(new Date());
        const currentTimeFormatted = indiaTimezoneTime.format(new Date());

        let presence;
        if (typeof providedPresence === 'boolean') {
            // Use the presence state provided by the frontend
            presence = providedPresence;
        } else {
            // Determine presence state based on last attendance (existing logic)
            const allAttendances = await Attendance.find({ rfid, subdomain }).sort({ createdAt: -1 });
            
            if (allAttendances.length > 0) {
                const lastAttendance = allAttendances[0];
                presence = !lastAttendance.presence;
            } else {
                presence = true;
            }
        }

        const newAttendance = await Attendance.create({
            name: worker.name,
            username: worker.username,
            rfid,
            subdomain: subdomain, // Fixed: explicitly use subdomain variable
            department: department._id,
            departmentName: department.name,
            photo: worker.photo,
            date: currentDateFormatted, // Use formatted date string for consistency
            time: currentTimeFormatted,
            presence,
            worker: worker._id
        });

        res.status(201).json({
            message: presence ? 'Attendance marked as in' : 'Attendance marked as out',
            attendance: newAttendance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAttendance = async (req, res) => {
    try {
        const { subdomain } = req.body;

        if (!subdomain || subdomain == 'main') {
            res.status(401);
            throw new Error('Company name is missing, login again');
        }

        const attendanceData = await Attendance.find({ subdomain }).populate('worker').populate('department');

        res.status(200).json({ message: 'Attendance data retrieved successfully', attendance: attendanceData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getWorkerAttendance = async (req, res) => {
    try {
        const { rfid, subdomain } = req.body;

        if (!subdomain || subdomain == 'main') {
            res.status(401);
            throw new Error('Company name is missing, login again');
        }

        if (!rfid || rfid == '') {
            res.status(401);
            throw new Error('RFID is required');
        }

        const workerAttendance = await Attendance.find({ rfid, subdomain });

        res.status(200).json({ message: 'Worker attendance data retrieved successfully', attendance: workerAttendance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getWorkerLastAttendance = async (req, res) => {
    try {
        const { rfid, subdomain } = req.body;
        
        console.log('getWorkerLastAttendance called with:', { rfid, subdomain });

        if (!subdomain || subdomain === 'main') {
            res.status(401);
            throw new Error('Company name is missing, login again');
        }

        if (!rfid || rfid === '') {
            res.status(401);
            throw new Error('RFID is required');
        }

        // Find the last attendance record for this worker
        const lastAttendance = await Attendance.findOne({ rfid, subdomain }).sort({ createdAt: -1 });
        
        console.log('Last attendance record found:', lastAttendance);

        if (!lastAttendance) {
            // No previous attendance record, so this will be a Punch In
            console.log('No previous attendance record, next action will be Punch In');
            res.status(200).json({
                presence: true,
                message: 'No previous attendance record found. Next action will be Punch In.'
            });
        } else {
            // Determine next action based on last attendance
            const nextPresence = !lastAttendance.presence;
            console.log('Last presence was:', lastAttendance.presence, 'So next presence should be:', nextPresence);
            res.status(200).json({
                presence: nextPresence,
                lastAttendance: lastAttendance,
                message: nextPresence ? 'Next action will be Punch In' : 'Next action will be Punch Out'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    putAttendance,
    putRfidAttendance,
    getAttendance,
    getWorkerAttendance,
    getWorkerLastAttendance
};