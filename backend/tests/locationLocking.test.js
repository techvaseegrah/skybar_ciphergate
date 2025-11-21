// Test file for location locking functionality
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

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

// Test the location locking functionality
const testLocationLocking = async () => {
  try {
    await connectDB();
    
    // Create a test settings document
    const testSubdomain = 'test-company';
    let settings = await Settings.findOne({ subdomain: testSubdomain });
    
    if (!settings) {
      settings = await Settings.create({
        subdomain: testSubdomain,
        attendanceLocation: {
          enabled: false,
          latitude: 0,
          longitude: 0,
          radius: 100,
          locked: false
        }
      });
      console.log('Created test settings document');
    }
    
    // Test 1: Update location coordinates when not locked
    console.log('\n--- Test 1: Updating location when not locked ---');
    settings.attendanceLocation.latitude = 12.9716;
    settings.attendanceLocation.longitude = 77.5946;
    settings.attendanceLocation.radius = 200;
    
    // Save and check if it gets locked
    await settings.save();
    const updatedSettings1 = await Settings.findOne({ subdomain: testSubdomain });
    
    console.log('Latitude:', updatedSettings1.attendanceLocation.latitude);
    console.log('Longitude:', updatedSettings1.attendanceLocation.longitude);
    console.log('Radius:', updatedSettings1.attendanceLocation.radius);
    console.log('Locked:', updatedSettings1.attendanceLocation.locked);
    
    if (updatedSettings1.attendanceLocation.locked) {
      console.log('✓ PASS: Location automatically locked when coordinates were set');
    } else {
      console.log('✗ FAIL: Location should have been locked when coordinates were set');
    }
    
    // Test 2: Try to update location coordinates when locked
    console.log('\n--- Test 2: Attempting to update location when locked ---');
    settings.attendanceLocation.latitude = 13.0827;
    settings.attendanceLocation.longitude = 80.2707;
    settings.attendanceLocation.radius = 300;
    
    // Save and check if changes were prevented
    await settings.save();
    const updatedSettings2 = await Settings.findOne({ subdomain: testSubdomain });
    
    console.log('Latitude:', updatedSettings2.attendanceLocation.latitude);
    console.log('Longitude:', updatedSettings2.attendanceLocation.longitude);
    console.log('Radius:', updatedSettings2.attendanceLocation.radius);
    console.log('Locked:', updatedSettings2.attendanceLocation.locked);
    
    if (updatedSettings2.attendanceLocation.latitude === 12.9716 && 
        updatedSettings2.attendanceLocation.longitude === 77.5946 &&
        updatedSettings2.attendanceLocation.radius === 200) {
      console.log('✓ PASS: Location coordinates were protected when locked');
    } else {
      console.log('✗ FAIL: Location coordinates should not have changed when locked');
    }
    
    // Test 3: Update enabled status when locked (should be allowed)
    console.log('\n--- Test 3: Updating enabled status when locked ---');
    settings.attendanceLocation.enabled = true;
    
    // Save and check if enabled status was updated
    await settings.save();
    const updatedSettings3 = await Settings.findOne({ subdomain: testSubdomain });
    
    console.log('Enabled:', updatedSettings3.attendanceLocation.enabled);
    console.log('Locked:', updatedSettings3.attendanceLocation.locked);
    
    if (updatedSettings3.attendanceLocation.enabled === true) {
      console.log('✓ PASS: Enabled status can be updated even when location is locked');
    } else {
      console.log('✗ FAIL: Enabled status should be updateable even when location is locked');
    }
    
    // Clean up test data
    await Settings.deleteOne({ subdomain: testSubdomain });
    console.log('\n--- Cleaned up test data ---');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the tests
testLocationLocking();