// Test file for attendance location validation functionality
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
const { calculateDistance } = require('../utils/locationUtils');

// Mock data for testing
const testSubdomain = 'test-company';
const testWorkerRfid = 'AB1234';
const allowedLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
  radius: 100 // 100 meters
};

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/attendance-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Test the attendance location validation functionality
const testAttendanceLocationValidation = async () => {
  try {
    await connectDB();
    
    // Create a test settings document with location restrictions enabled
    let settings = await Settings.findOne({ subdomain: testSubdomain });
    
    if (!settings) {
      settings = await Settings.create({
        subdomain: testSubdomain,
        attendanceLocation: {
          enabled: true,
          latitude: allowedLocation.latitude,
          longitude: allowedLocation.longitude,
          radius: allowedLocation.radius,
          locked: false
        }
      });
      console.log('Created test settings document with location restrictions');
    } else {
      // Update existing settings to enable location restrictions
      settings.attendanceLocation.enabled = true;
      settings.attendanceLocation.latitude = allowedLocation.latitude;
      settings.attendanceLocation.longitude = allowedLocation.longitude;
      settings.attendanceLocation.radius = allowedLocation.radius;
      await settings.save();
      console.log('Updated test settings document with location restrictions');
    }
    
    // Create a test worker
    let worker = await Worker.findOne({ rfid: testWorkerRfid });
    
    if (!worker) {
      worker = await Worker.create({
        name: 'Test Worker',
        username: 'testworker',
        rfid: testWorkerRfid,
        salary: 30000,
        finalSalary: 30000,
        perDaySalary: 1000,
        subdomain: testSubdomain,
        password: 'testpassword',
        department: mongoose.Types.ObjectId(), // Create a dummy department ID
        photo: '',
        faceEmbeddings: []
      });
      console.log('Created test worker');
    }
    
    // Test 1: Calculate distance function
    console.log('\n--- Test 1: Distance calculation ---');
    const distance = calculateDistance(
      allowedLocation.latitude, 
      allowedLocation.longitude, 
      allowedLocation.latitude, 
      allowedLocation.longitude
    );
    
    console.log('Distance between same points:', distance, 'meters');
    
    if (distance === 0) {
      console.log('✓ PASS: Distance calculation works correctly');
    } else {
      console.log('✗ FAIL: Distance calculation failed');
    }
    
    // Test 2: Distance within radius
    console.log('\n--- Test 2: Distance within allowed radius ---');
    // Point within 50 meters of allowed location
    const nearbyLat = allowedLocation.latitude + 0.00045; // Approximately 50 meters
    const nearbyLon = allowedLocation.longitude;
    
    const distanceWithin = calculateDistance(
      allowedLocation.latitude, 
      allowedLocation.longitude, 
      nearbyLat, 
      nearbyLon
    );
    
    console.log('Distance to nearby point:', distanceWithin, 'meters');
    
    if (distanceWithin <= allowedLocation.radius) {
      console.log('✓ PASS: Nearby point is within allowed radius');
    } else {
      console.log('✗ FAIL: Nearby point should be within allowed radius');
    }
    
    // Test 3: Distance outside radius
    console.log('\n--- Test 3: Distance outside allowed radius ---');
    // Point approximately 200 meters from allowed location
    const farLat = allowedLocation.latitude + 0.0018; // Approximately 200 meters
    const farLon = allowedLocation.longitude;
    
    const distanceOutside = calculateDistance(
      allowedLocation.latitude, 
      allowedLocation.longitude, 
      farLat, 
      farLon
    );
    
    console.log('Distance to far point:', distanceOutside, 'meters');
    
    if (distanceOutside > allowedLocation.radius) {
      console.log('✓ PASS: Far point is outside allowed radius');
    } else {
      console.log('✗ FAIL: Far point should be outside allowed radius');
    }
    
    console.log('\n--- Attendance location validation tests completed ---');
    
    // Clean up test data
    await Settings.deleteOne({ subdomain: testSubdomain });
    await Worker.deleteOne({ rfid: testWorkerRfid });
    console.log('\n--- Cleaned up test data ---');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the tests
testAttendanceLocationValidation();