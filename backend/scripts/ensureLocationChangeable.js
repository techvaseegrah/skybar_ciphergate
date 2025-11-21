// Script to ensure location settings can be changed anytime
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

// MongoDB connection - using direct connection string
const connectDB = async () => {
  try {
    // Try to get MongoDB URI from environment variable or use default
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Ensure location settings can be changed anytime for a specific subdomain
const ensureLocationChangeable = async (subdomain) => {
  try {
    // Find settings for the specified subdomain
    const settings = await Settings.findOne({ subdomain });

    if (!settings) {
      console.log(`No settings found for subdomain: ${subdomain}`);
      return;
    }

    console.log(`Current location settings for ${subdomain}:`);
    console.log(`  Enabled: ${settings.attendanceLocation.enabled}`);
    console.log(`  Latitude: ${settings.attendanceLocation.latitude}`);
    console.log(`  Longitude: ${settings.attendanceLocation.longitude}`);
    console.log(`  Radius: ${settings.attendanceLocation.radius}`);
    console.log(`  Locked: ${settings.attendanceLocation.locked}`);

    // Ensure the location settings are not locked
    if (settings.attendanceLocation.locked) {
      settings.attendanceLocation.locked = false;
      
      // Save the updated document
      await settings.save();
      
      console.log(`\nSuccessfully unlocked location settings for subdomain: ${subdomain}`);
      console.log(`New locked status: ${settings.attendanceLocation.locked}`);
    } else {
      console.log(`\nLocation settings for ${subdomain} are already unlocked and can be changed anytime.`);
    }
    
  } catch (error) {
    console.error('Error ensuring location settings can be changed:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Get subdomain from command line arguments
const subdomain = process.argv[2];

if (!subdomain) {
  console.log('Usage: node ensureLocationChangeable.js <subdomain>');
  console.log('Example: node ensureLocationChangeable.js santhosh');
  process.exit(1);
}

// Run the script
const run = async () => {
  await connectDB();
  await ensureLocationChangeable(subdomain);
};

run();