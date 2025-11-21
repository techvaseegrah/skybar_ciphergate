const fs = require('fs');
const path = require('path');

// Models directory
const modelsDir = path.join(__dirname, 'public', 'models');

// Expected file sizes
const expectedFileDetails = {
  'tiny_face_detector_model-weights_manifest.json': {
    size: 2953,
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

function validateModels() {
  console.log('Validating face recognition models...');
  
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
      
      // For JSON manifest files, try to parse them to check for corruption
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
          console.log(`  ✓ ${file} is valid JSON`);
        } catch (err) {
          console.error(`  ✗ ${file} is not valid JSON: ${err.message}`);
          hasErrors = true;
        }
      }
    }
  }
  
  // Check for unexpected files
  for (const file of files) {
    if (!modelFiles.includes(file)) {
      console.warn(`Unexpected file in models directory: ${file}`);
    }
  }
  
  if (hasErrors) {
    console.error('\nModel validation failed. Please run "npm run reset-models" to fix issues.');
    console.log('\nThis will:');
    console.log('1. Remove all existing model files');
    console.log('2. Download fresh copies of all models');
    console.log('3. Clear your browser cache after running the command');
    console.log('4. Refresh the page');
    process.exit(1);
  } else {
    console.log('\nAll models validated successfully!');
    console.log('\nIf you are still experiencing issues:');
    console.log('1. Clear your browser cache completely');
    console.log('2. Refresh the page');
    console.log('3. Check browser developer tools for any additional errors');
  }
}

// Run if called directly
if (require.main === module) {
  validateModels();
}