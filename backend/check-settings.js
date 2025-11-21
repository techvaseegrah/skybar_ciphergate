const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkSettings() {
  try {
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Not found');
    
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set in environment variables');
      return;
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Connected to MongoDB');
    
    // Check if settings exist for santhosh
    const settings = await Settings.findOne({ subdomain: 'santhosh' });
    
    if (settings) {
      console.log('Settings found for santhosh:');
      console.log(JSON.stringify(settings, null, 2));
    } else {
      console.log('No settings found for santhosh');
      
      // List all settings
      const allSettings = await Settings.find({});
      console.log('All settings in database:');
      allSettings.forEach(setting => {
        console.log(`- ${setting.subdomain}`);
      });
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSettings();