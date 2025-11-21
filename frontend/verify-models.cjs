const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create models directory if it doesn't exist
const modelsDir = path.join(__dirname, 'public', 'models');

// Expected file sizes and checksums (used to verify downloads)
const expectedFileDetails = {
  'tiny_face_detector_model-weights_manifest.json': {
    size: 2953,
    // We'll add checksums if needed in the future
  },
  'tiny_face_detector_model-shard1': {
    size: 193321,
  },
  'face_landmark_68_model-weights_manifest.json': {
    size: 7889,
  },
  'face_landmark_68_model-shard1': {
    size: 356840,
  },
  'face_recognition_model-weights_manifest.json': {
    size: 18303,
  },
  'face_recognition_model-shard1': {
    size: 4194304,
  }
};

const modelFiles = Object.keys(expectedFileDetails);

function verifyModels() {
  console.log('Verifying face recognition models...');
  
  if (!fs.existsSync(modelsDir)) {
    console.error('Models directory does not exist:', modelsDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(modelsDir);
  
  if (files.length === 0) {
    console.error('Models directory is empty');
    process.exit(1);
  }
  
  let hasErrors = false;
  
  for (const file of modelFiles) {
    const filePath = path.join(modelsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Missing file: ${file}`);
      hasErrors = true;
      continue;
    }
    
    const stats = fs.statSync(filePath);
    const expected = expectedFileDetails[file];
    
    if (expected.size && stats.size !== expected.size) {
      console.error(`File ${file} has incorrect size. Expected: ${expected.size}, Actual: ${stats.size}`);
      hasErrors = true;
    } else {
      console.log(`✓ ${file} (${stats.size} bytes)`);
    }
  }
  
  // Check for unexpected files
  for (const file of files) {
    if (!modelFiles.includes(file)) {
      console.warn(`Unexpected file in models directory: ${file}`);
    }
  }
  
  if (hasErrors) {
    console.error('\nModel verification failed. Please run "npm run download-models" to fix issues.');
    process.exit(1);
  } else {
    console.log('\nAll models verified successfully!');
  }
}

// Run if called directly
if (require.main === module) {
  verifyModels();
}