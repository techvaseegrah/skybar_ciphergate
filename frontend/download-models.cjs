const fs = require('fs');
const path = require('path');
const https = require('https');

// Create models directory if it doesn't exist
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Expected file sizes (in bytes) - used to verify downloads
const expectedFileSizes = {
  'tiny_face_detector_model-weights_manifest.json': 2953,
  'tiny_face_detector_model-shard1': 193321,
  'face_landmark_68_model-weights_manifest.json': 7889,
  'face_landmark_68_model-shard1': 356840,
  'face_recognition_model-weights_manifest.json': 18303,
  'face_recognition_model-shard1': 4194304
};

const modelFiles = Object.keys(expectedFileSizes);

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

async function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, filename);
    const file = fs.createWriteStream(filePath);
    
    console.log(`Downloading ${filename}...`);
    
    https.get(baseUrl + filename, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close(() => {
          // Verify file size
          const stats = fs.statSync(filePath);
          const expectedSize = expectedFileSizes[filename];
          
          if (expectedSize && stats.size !== expectedSize) {
            console.warn(`Warning: ${filename} has size ${stats.size} but expected ${expectedSize}`);
          } else {
            console.log(`Downloaded ${filename} successfully! (${stats.size} bytes)`);
          }
          
          resolve();
        });
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadAllModels() {
  console.log('Starting model download process...');
  console.log('This may take a few minutes as the files are relatively large.');
  
  try {
    // Clear existing models to prevent conflicts
    console.log('Clearing existing models...');
    const files = fs.readdirSync(modelsDir);
    for (const file of files) {
      fs.unlinkSync(path.join(modelsDir, file));
    }
    
    for (const file of modelFiles) {
      await downloadFile(file);
    }
    console.log('All models downloaded successfully!');
    console.log('You can now run your application.');
  } catch (error) {
    console.error('Error downloading models:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  downloadAllModels();
}