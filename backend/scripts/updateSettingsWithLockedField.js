// Script to update existing settings documents with the 'locked' field for attendanceLocation
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

// Update all settings documents to include the locked field
const updateSettings = async () => {
  try {
    // Find all settings documents that don't have the locked field
    const settingsToUpdate = await Settings.find({
      $or: [
        { 'attendanceLocation.locked': { $exists: false } },
        { 'attendanceLocation': { $exists: false } }
      ]
    });

    console.log(`Found ${settingsToUpdate.length} settings documents to update`);

    for (const setting of settingsToUpdate) {
      // Update the attendanceLocation object to include the locked field
      setting.attendanceLocation = {
        enabled: setting.attendanceLocation?.enabled || false,
        latitude: setting.attendanceLocation?.latitude || 0,
        longitude: setting.attendanceLocation?.longitude || 0,
        radius: setting.attendanceLocation?.radius || 100,
        locked: false // Set to false to allow changes anytime
      };

      // Save the updated document
      await setting.save();
      console.log(`Updated settings for subdomain: ${setting.subdomain}`);
    }

    // Also update existing settings to unlock them
    const lockedSettings = await Settings.find({
      'attendanceLocation.locked': true
    });

    console.log(`Found ${lockedSettings.length} locked settings documents to unlock`);

    for (const setting of lockedSettings) {
      // Unlock the attendanceLocation
      setting.attendanceLocation.locked = false;

      // Save the updated document
      await setting.save();
      console.log(`Unlocked settings for subdomain: ${setting.subdomain}`);
    }

    console.log('All settings documents updated successfully');
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await updateSettings();
};

run();