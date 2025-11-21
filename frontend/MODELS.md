# Face Recognition Models Setup and Troubleshooting

## Model Files

The face recognition feature requires pre-trained model files to be downloaded and placed in the `public/models` directory:

1. **Face Detection Model** (`tiny_face_detector_model`)
2. **Face Landmark Model** (`face_landmark_68_model`)
3. **Face Recognition Model** (`face_recognition_model`)

Each model consists of two files:
- A weights manifest JSON file (contains model architecture information)
- A shard file (contains the actual model weights)

## Setup Instructions

### Initial Setup

1. Navigate to the client directory:
   ```bash
   cd task-tracker-client
   ```

2. Run the model download script:
   ```bash
   npm run download-models
   ```

### Verifying Models

To check if all model files are present and have the correct sizes:
```bash
npm run verify-models
```

### Validating Models

To perform a more thorough check including JSON validation:
```bash
npm run validate-models
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Tensor Shape Mismatch Error
```
Error: Based on the provided shape, [3,3,256,256], the tensor should have 589824 values but has 146190
```

**Solution:**
1. Run the reset script to completely re-download models:
   ```bash
   npm run reset-models
   ```
2. Clear your browser cache completely:
   - **Chrome**: Settings → Privacy and security → Clear browsing data → Select "Cached images and files" → Clear data
   - **Firefox**: Settings → Privacy & Security → Cookies and Site Data → Clear Data → Check "Cached Web Content" → Clear
   - **Edge**: Settings → Privacy, search, and services → Clear browsing data → Select "Cached data and files" → Clear now
3. Refresh the page

#### 2. JSON Parse Error
```
SyntaxError: Unexpected end of JSON input
```

**Solution:**
1. Run the reset script:
   ```bash
   npm run reset-models
   ```
2. Refresh the page

#### 3. Models Not Loading

**Solution:**
1. Verify models exist:
   ```bash
   npm run verify-models
   ```
2. If verification fails, download models:
   ```bash
   npm run download-models
   ```
3. Check browser developer tools Network tab to ensure model files are being loaded correctly

## Manual Model Download (Alternative Method)

If the automated scripts fail, you can manually download the models:

1. Visit the [face-api.js models repository](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)
2. Download all six model files:
   - `tiny_face_detector_model-shard1`
   - `tiny_face_detector_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-weights_manifest.json`
3. Place them in the `public/models` directory

## Browser Cache Clearing Instructions

Cached model files can cause issues even when new ones are downloaded. Always clear your browser cache after model updates:

### Chrome
1. Click the three dots menu → Settings
2. Privacy and security → Clear browsing data
3. Select "Cached images and files"
4. Click Clear data

### Firefox
1. Click the hamburger menu → Settings
2. Privacy & Security → Cookies and Site Data
3. Clear Data
4. Check "Cached Web Content"
5. Click Clear

### Edge
1. Click the three dots menu → Settings
2. Privacy, search, and services
3. Clear browsing data
4. Select "Cached data and files"
5. Click Clear now

## Expected File Sizes

All model files should have these exact sizes:
- `tiny_face_detector_model-weights_manifest.json`: 2,953 bytes
- `tiny_face_detector_model-shard1`: 193,321 bytes
- `face_landmark_68_model-weights_manifest.json`: 7,889 bytes
- `face_landmark_68_model-shard1`: 356,840 bytes
- `face_recognition_model-weights_manifest.json`: 18,303 bytes
- `face_recognition_model-shard1`: 4,194,304 bytes

## Development Notes

- Model files are loaded from `/models` endpoint (maps to `public/models` directory)
- The face-api.js library expects specific file names and structures
- Do not rename or modify model files
- Ensure all six files are present for proper functionality