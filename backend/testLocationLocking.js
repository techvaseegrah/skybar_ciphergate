// Simple test script to verify location locking functionality
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/attendance');
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
    const testSubdomain = 'test-locking';
    
    // Delete any existing test document
    await Settings.deleteOne({ subdomain: testSubdomain });
    
    // Create new test settings
    let settings = await Settings.create({
      subdomain: testSubdomain,
      attendanceLocation: {
        enabled: false,
        latitude: 0,
        longitude: 0,
        radius: 100,
        locked: false
      }
    });
    console.log('✓ Created test settings document');
    
    // Test 1: Update with actual coordinates (should lock automatically)
    console.log('\n--- Test 1: Setting actual coordinates ---');
    settings.attendanceLocation.latitude = 12.9716;
    settings.attendanceLocation.longitude = 77.5946;
    settings.attendanceLocation.radius = 200;
    
    await settings.save();
    
    // Fetch updated document
    settings = await Settings.findOne({ subdomain: testSubdomain });
    
    console.log('Latitude:', settings.attendanceLocation.latitude);
    console.log('Longitude:', settings.attendanceLocation.longitude);
    console.log('Radius:', settings.attendanceLocation.radius);
    console.log('Locked:', settings.attendanceLocation.locked);
    
    if (settings.attendanceLocation.locked) {
      console.log('✓ PASS: Location automatically locked when coordinates were set');
    } else {
      console.log('✗ FAIL: Location should have been locked when coordinates were set');
    }
    
    // Test 2: Try to update coordinates when locked (should be prevented)
    console.log('\n--- Test 2: Attempting to change coordinates when locked ---');
    const originalLat = settings.attendanceLocation.latitude;
    const originalLon = settings.attendanceLocation.longitude;
    const originalRadius = settings.attendanceLocation.radius;
    
    settings.attendanceLocation.latitude = 13.0827;
    settings.attendanceLocation.longitude = 80.2707;
    settings.attendanceLocation.radius = 300;
    
    await settings.save();
    
    // Fetch updated document
    settings = await Settings.findOne({ subdomain: testSubdomain });
    
    console.log('Latitude:', settings.attendanceLocation.latitude);
    console.log('Longitude:', settings.attendanceLocation.longitude);
    console.log('Radius:', settings.attendanceLocation.radius);
    
    if (settings.attendanceLocation.latitude === originalLat && 
        settings.attendanceLocation.longitude === originalLon &&
        settings.attendanceLocation.radius === originalRadius) {
      console.log('✓ PASS: Location coordinates were protected when locked');
    } else {
      console.log('✗ FAIL: Location coordinates should not have changed when locked');
    }
    
    // Test 3: Update enabled status when locked (should be allowed)
    console.log('\n--- Test 3: Updating enabled status when locked ---');
    settings.attendanceLocation.enabled = true;
    
    await settings.save();
    
    // Fetch updated document
    settings = await Settings.findOne({ subdomain: testSubdomain });
    
    console.log('Enabled:', settings.attendanceLocation.enabled);
    console.log('Locked:', settings.attendanceLocation.locked);
    
    if (settings.attendanceLocation.enabled === true) {
      console.log('✓ PASS: Enabled status can be updated even when location is locked');
    } else {
      console.log('✗ FAIL: Enabled status should be updateable even when location is locked');
    }
    
    // Clean up test data
    await Settings.deleteOne({ subdomain: testSubdomain });
    console.log('\n✓ Cleaned up test data');
    
    console.log('\n=== All tests completed ===');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the tests
testLocationLocking();