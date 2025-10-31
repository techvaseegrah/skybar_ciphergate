const fs = require('fs');
const path = require('path');
const https = require('https');

// Models directory
const modelsDir = path.join(__dirname, 'public', 'models');

// Remove existing models directory
if (fs.existsSync(modelsDir)) {
  console.log('Removing existing models directory...');
  fs.rmSync(modelsDir, { recursive: true, force: true });
}

// Create models directory
console.log('Creating new models directory...');
fs.mkdirSync(modelsDir, { recursive: true });

// Model files from CDN with correct names and sizes
const modelFiles = [
  {
    name: 'tiny_face_detector_model-weights_manifest.json',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/ssd_mobilenetv1_model-weights_manifest.json',
    size: 2953
  },
  {
    name: 'tiny_face_detector_model-shard1',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/ssd_mobilenetv1_model-shard1.bin',
    size: 193321
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_landmark_68_model-weights_manifest.json',
    size: 7889
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_landmark_68_model-shard1.bin',
    size: 356840
  },
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_recognition_model-weights_manifest.json',
    size: 18303
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_recognition_model-shard1.bin',
    size: 4194304
  }
];

async function downloadFile(fileInfo) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, fileInfo.name);
    const file = fs.createWriteStream(filePath);
    
    console.log(`Downloading ${fileInfo.name}...`);
    
    https.get(fileInfo.url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileInfo.name}: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close(() => {
          // Verify file size
          const stats = fs.statSync(filePath);
          const expectedSize = fileInfo.size;
          
          if (expectedSize && stats.size !== expectedSize) {
            console.warn(`Warning: ${fileInfo.name} has size ${stats.size} but expected ${expectedSize}`);
          } else {
            console.log(`Downloaded ${fileInfo.name} successfully! (${stats.size} bytes)`);
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

async function resetModels() {
  console.log('Starting complete model reset process...');
  console.log('This may take a few minutes as the files are relatively large.');
  
  try {
    for (const fileInfo of modelFiles) {
      await downloadFile(fileInfo);
    }
    console.log('All models downloaded successfully!');
    console.log('');
    console.log('IMPORTANT: Please follow these steps to ensure the new models are used:');
    console.log('');
    console.log('1. COMPLETELY CLEAR YOUR BROWSER CACHE:');
    console.log('   Chrome: Settings → Privacy and security → Clear browsing data → Select "Cached images and files" → Clear data');
    console.log('   Firefox: Settings → Privacy & Security → Cookies and Site Data → Clear Data → Check "Cached Web Content" → Clear');
    console.log('   Edge: Settings → Privacy, search, and services → Clear browsing data → Select "Cached data and files" → Clear now');
    console.log('');
    console.log('2. REFRESH THE PAGE (Ctrl+F5 or Cmd+Shift+R)');
    console.log('');
    console.log('3. If you still experience issues:');
    console.log('   - Restart your browser');
    console.log('   - Check browser developer tools Console and Network tabs for errors');
    console.log('   - Verify models with: npm run verify-models');
    console.log('');
    console.log('You can now run your application.');
  } catch (error) {
    console.error('Error downloading models:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  resetModels();
}