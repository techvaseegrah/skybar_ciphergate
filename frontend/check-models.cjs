const fs = require('fs');
const path = require('path');

// Expected file sizes (in bytes)
const expectedFileSizes = {
  'tiny_face_detector_model-weights_manifest.json': 2953,
  'tiny_face_detector_model-shard1': 193321,
  'face_landmark_68_model-weights_manifest.json': 7889,
  'face_landmark_68_model-shard1': 356840,
  'face_recognition_model-weights_manifest.json': 18303,
  'face_recognition_model-shard1': 4194304
};

const modelsDir = path.join(__dirname, 'public', 'models');

console.log('Checking model files...\n');

Object.entries(expectedFileSizes).forEach(([filename, expectedSize]) => {
  const filePath = path.join(modelsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ MISSING: ${filename}`);
    return;
  }
  
  const stats = fs.statSync(filePath);
  if (stats.size === expectedSize) {
    console.log(`✅ OK: ${filename} (${stats.size} bytes)`);
  } else {
    console.log(`❌ SIZE MISMATCH: ${filename} (Expected: ${expectedSize}, Actual: ${stats.size})`);
  }
});