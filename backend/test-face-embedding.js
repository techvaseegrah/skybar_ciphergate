// Test script to verify face embedding storage and retrieval
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const Worker = require('./models/Worker');

// Test function to check face embeddings
async function testFaceEmbeddings() {
  try {
    // Find a worker with face embeddings
    const worker = await Worker.findOne({ faceEmbeddings: { $exists: true, $ne: [] } });
    
    if (worker) {
      console.log('Worker found with face embeddings:');
      console.log('Name:', worker.name);
      console.log('RFID:', worker.rfid);
      console.log('Number of face embeddings:', worker.faceEmbeddings.length);
      console.log('First embedding length:', worker.faceEmbeddings[0].length);
      console.log('First few values of first embedding:', worker.faceEmbeddings[0].slice(0, 5));
    } else {
      console.log('No worker with face embeddings found');
    }
    
    // Create a test worker with face embeddings
    const testWorker = await Worker.create({
      name: 'Test Face Worker',
      username: 'testface',
      rfid: 'TF0001',
      subdomain: 'testcompany',
      password: 'password123',
      department: mongoose.Types.ObjectId(), // This would need to be a valid department ID
      faceEmbeddings: [
        [0.1, 0.2, 0.3, 0.4, 0.5], // Test embedding
        [0.2, 0.3, 0.4, 0.5, 0.6]
      ]
    });
    
    console.log('Test worker created with face embeddings:');
    console.log('ID:', testWorker._id);
    console.log('Face embeddings stored:', testWorker.faceEmbeddings.length);
    
    // Clean up test worker
    await Worker.findByIdAndDelete(testWorker._id);
    console.log('Test worker cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testFaceEmbeddings();