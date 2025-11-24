import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { getWorkers, getWorkerById } from '../../services/workerService';
import { putAttendance, getWorkerLastAttendance } from '../../services/attendanceService';
import { getCurrentPosition, isWorkerInAllowedLocation } from '../../services/geolocationService';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth hook

const FaceAttendance = ({ subdomain, isOpen, onClose, workerMode = false, currentWorker = null }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [matchedWorker, setMatchedWorker] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attendanceType, setAttendanceType] = useState(''); // 'Punch In' or 'Punch Out'
  const [locationChecked, setLocationChecked] = useState(false);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null); // State for current location
  const [cooldownWorkers, setCooldownWorkers] = useState({}); // Track cooldown for workers
  const { user } = useAuth(); // Get current user
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      if (!isOpen || isModelLoaded) return;
      
      try {
        // Load models with better error handling and optimization
        // Using SsdMobilenetv1 for better accuracy and MtcnnOptions for face detection
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setIsModelLoaded(true);
        setError('');
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face detection models. Please ensure model files are correctly downloaded and browser cache is cleared.');
      }
    };

    loadModels();
  }, [isOpen, isModelLoaded]);

  // Check location when modal opens
  useEffect(() => {
    const checkLocation = async () => {
      if (!isOpen || !subdomain || locationChecked) return;
      
      try {
        // Get current position
        const position = await getCurrentPosition();
        const { latitude, longitude } = position;
        
        // Set current location state
        setCurrentLocation({ latitude, longitude, accuracy: position.accuracy });
        
        // Check if worker is in allowed location
        const locationResult = await isWorkerInAllowedLocation(subdomain, latitude, longitude);
        
        setLocationChecked(true);
        setLocationAllowed(locationResult.allowed);
        
        if (!locationResult.allowed) {
          setError(locationResult.message);
          // In worker mode, close the modal immediately if location is not allowed
          if (workerMode) {
            setTimeout(() => {
              onClose();
            }, 3000); // Close after 3 seconds to allow user to read the error message
          }
        }
      } catch (err) {
        console.error('Error checking location:', err);
        setError(`Location check failed: ${err.message}. Attendance may be restricted based on location settings.`);
        // In worker mode, close the modal after error
        if (workerMode) {
          setTimeout(() => {
            onClose();
          }, 3000); // Close after 3 seconds to allow user to read the error message
        }
      }
    };

    checkLocation();
  }, [isOpen, subdomain, locationChecked, workerMode, onClose]);

  // Load workers with face embeddings
  useEffect(() => {
    const loadWorkers = async () => {
      if (!isOpen || !subdomain) return;
      
      // In worker mode, ensure currentWorker is provided
      if (workerMode && !currentWorker) {
        setError('Worker data not available. Please try again.');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      try {
        let workersData;
        if (workerMode && currentWorker) {
          // In worker mode, fetch the current worker's data with face embeddings
          const workerData = await getWorkerById(currentWorker._id);
          workersData = [workerData];
        } else {
          // In admin mode, load all workers
          workersData = await getWorkers({ subdomain });
        }
        
        // Filter workers who have face embeddings (at least one)
        const workersWithFaces = workersData.filter(worker => 
          worker.faceEmbeddings && worker.faceEmbeddings.length > 0
        );
        setWorkers(workersWithFaces);
      } catch (err) {
        console.error('Error loading workers:', err);
        setError('Failed to load employee data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkers();
  }, [isOpen, subdomain, workerMode, currentWorker]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setMatchedWorker(null);
      setShowConfirmation(false);
      setError('');
      setIsProcessing(false);
      setAttendanceType('');
      setLocationChecked(false);
      setLocationAllowed(true);
      setCurrentLocation(null); // Reset current location
    }
  }, [isOpen]);

  // Check if face is within the circular frame
  const isFaceInFrame = (detection, canvas) => {
    if (!detection || !canvas) return false;
    
    const box = detection.box;
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    const frameRadius = Math.min(canvas.width, canvas.height) * 0.3; // 30% of smaller dimension
    
    // Calculate face center
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    
    // Calculate distance from face center to canvas center
    const distance = Math.sqrt(
      Math.pow(faceCenterX - canvasCenterX, 2) + 
      Math.pow(faceCenterY - canvasCenterY, 2)
    );
    
    // Check if face is within the circular frame with improved accuracy
    // Added stricter size requirements for better face positioning
    return distance <= frameRadius && 
           box.width >= canvas.width * 0.25 && // Increased from 20% to 25% for better face size
           box.height >= canvas.height * 0.25 && // Increased from 20% to 25% for better face size
           box.width <= canvas.width * 0.7 && // Added max size constraint to prevent too close faces
           box.height <= canvas.height * 0.7; // Added max size constraint to prevent too close faces
  };

  // Draw circular frame on canvas
  const drawFrame = (canvas) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    // Ensure canvas has valid dimensions
    if (canvas.width <= 0 || canvas.height <= 0) {
      console.warn('Canvas has invalid dimensions:', canvas.width, canvas.height);
      return;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    
    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw circular frame
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw inner guidance circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Toggle between front and back camera
  const toggleCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };

  // Process face recognition
  const processFaceRecognition = async () => {
    if (isProcessing) return;
    
    // Validate required conditions
    if (!isOpen) {
      setError('Attendance modal is not open.');
      return;
    }
    
    // In worker mode, ensure we only have the current worker's data
    if (workerMode && workers.length !== 1) {
      setError('Invalid worker data. Please try again.');
      return;
    }
    
    // In worker mode, ensure the worker in the array matches the currentWorker
    if (workerMode && workers[0].rfid !== currentWorker.rfid) {
      setError('Worker data mismatch. Please try again.');
      return;
    }
    
    if (!webcamRef.current || !isModelLoaded || !workers.length) {
      setError('Models not loaded or no registered employees with face data.');
      return;
    }

    const video = webcamRef.current.video;
    // Validate video element
    if (!video) {
      setError('Camera not accessible. Please ensure you have granted camera permissions.');
      return;
    }
    
    // Wait for video to be ready
    if (video.readyState !== 4) {
      // Video not ready, wait a bit and try again
      if (video.networkState === video.NETWORK_LOADING || video.networkState === video.NETWORK_IDLE) {
        // Video is still loading, wait a moment
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced wait time
        if (video.readyState !== 4) {
          setError('Camera not ready. Please wait a moment and try again.');
          return;
        }
      } else {
        setError('Camera not ready. Please wait a moment and try again.');
        return;
      }
    }
    
    // Validate video dimensions
    const videoWidth = video.videoWidth || video.width;
    const videoHeight = video.videoHeight || video.height;
    
    if (!videoWidth || !videoHeight || videoWidth <= 0 || videoHeight <= 0) {
      setError('Camera not providing valid video feed. Please check your camera connection.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setMatchedWorker(null);

    try {
      // Detect face and get descriptor (embedding) with optimized options for speed and accuracy
      // Using SsdMobilenetv1 with optimized parameters for faster detection
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.7,
          maxResults: 1 // Only return the best result
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Draw circular frame even when no face is detected
      const canvas = canvasRef.current;
      if (canvas) {
        // Ensure canvas dimensions match video
        const displaySize = { 
          width: video.videoWidth || video.width || 640, 
          height: video.videoHeight || video.height || 480 
        };
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        drawFrame(canvas);
      }

      if (detections) {
        // Comprehensive validation of detection results
        if (!detections.detection || !detections.detection.box) {
          setError('Face detection failed. Please ensure your face is clearly visible.');
          setIsProcessing(false);
          return;
        }
        
        const box = detections.detection.box;
        if (box.width <= 0 || box.height <= 0 || 
            !isFinite(box.width) || !isFinite(box.height)) {
          setError('Invalid face detection dimensions. Please ensure your face is clearly visible.');
          setIsProcessing(false);
          return;
        }

        // Draw detection on canvas for visual feedback
        const displaySize = { 
          width: video.videoWidth || video.width || 640, 
          height: video.videoHeight || video.height || 480 
        };
        
        // Validate display size
        if (displaySize.width <= 0 || displaySize.height <= 0) {
          setError('Invalid display dimensions. Please refresh the page.');
          setIsProcessing(false);
          return;
        }
        
        // Ensure canvas is properly initialized
        const canvas = canvasRef.current;
        if (!canvas) {
          setError('Canvas not available. Please refresh the page.');
          setIsProcessing(false);
          return;
        }
        
        // Set canvas dimensions explicitly
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
        
        faceapi.matchDimensions(canvas, displaySize);
        
        // Draw circular frame
        drawFrame(canvas);
        
        // Validate that resize operation will work
        try {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          
          // Additional validation after resizing
          if (!resizedDetections.detection || !resizedDetections.detection.box ||
              resizedDetections.detection.box.width <= 0 || resizedDetections.detection.box.height <= 0 ||
              !isFinite(resizedDetections.detection.box.width) || !isFinite(resizedDetections.detection.box.height)) {
            setError('Face detection processing failed. Please try again.');
            setIsProcessing(false);
            return;
          }
          
          // Check if face is within the circular frame
          if (!isFaceInFrame(resizedDetections.detection, canvas)) {
            setError('Please position your face within the circular frame.');
            setIsProcessing(false);
            return;
          }
          
          // Safely draw face detection
          try {
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          } catch (drawError) {
            console.warn('Error drawing face detection:', drawError);
            // Continue with recognition even if drawing fails
          }

          // Create labeled face descriptors from stored embeddings
          const labeledFaceDescriptors = workers.map(worker => {
            // Convert stored embeddings to Float32Array as required by face-api.js
            // Each worker has multiple embeddings (5), so we create multiple descriptors per worker
            const descriptors = worker.faceEmbeddings.map(embedding => new Float32Array(embedding));
            return new faceapi.LabeledFaceDescriptors(worker.rfid, descriptors);
          });

          // Create face matcher with optimized threshold for better accuracy and speed
          // Lower threshold means higher accuracy but might miss some matches
          const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.35); // Slightly higher threshold for faster matching
          
          // Find best match for the detected face
          const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

          console.log('Best match result:', bestMatch);

          // Improved matching criteria for better accuracy
          if (bestMatch && bestMatch.label !== 'unknown' && bestMatch.distance < 0.4) { // Slightly higher threshold for faster matching
            // Find the matching worker
            const worker = workers.find(w => w.rfid === bestMatch.label);
            if (worker) {
              // Worker-specific validation: In worker mode, ensure the detected face belongs to the current worker
              if (workerMode) {
                if (worker.rfid !== currentWorker.rfid) {
                  setError('Face recognition failed. Please use your own face for attendance.');
                  setIsProcessing(false);
                  return;
                }
              }
              
              // Check if worker is in cooldown period
              if (isWorkerInCooldown(worker.rfid)) {
                setError('You can punch again after 2 minutes.');
                setIsProcessing(false);
                return;
              }
              
              // Set the matched worker
              setMatchedWorker(worker);
              
              // Determine if it's Punch In or Punch Out based on last attendance
              try {
                const lastAttendanceResponse = await getWorkerLastAttendance(worker.rfid, subdomain);
                console.log('Last attendance data:', lastAttendanceResponse);
                // The backend returns the next action in presence field
                // If presence = true, next action is Punch In
                // If presence = false, next action is Punch Out
                // Ensuring consistency with RFID attendance logic:
                const nextAction = lastAttendanceResponse.presence ? 'Punch In' : 'Punch Out';
                
                setAttendanceType(nextAction);
                setShowConfirmation(true);
              } catch (lastAttendanceError) {
                console.error('Error getting last attendance:', lastAttendanceError);
                setError('Failed to determine next attendance action. Please try again.');
                setIsProcessing(false);
              }
            } else {
              setError('Employee not found. Please ensure your face is registered.');
              setIsProcessing(false);
            }
          } else {
            setError('Face not recognized. Please ensure good lighting and clear visibility of your face.');
            setIsProcessing(false);
          }
        } catch (resizeError) {
          console.error('Error resizing face detection:', resizeError);
          setError('Face detection processing failed. Please try again.');
          setIsProcessing(false);
        }
      } else {
        setError('No face detected. Please position your face clearly within the circular frame.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error in face recognition:', err);
      setError(`Face recognition failed: ${err.message}. Please try again.`);
      setIsProcessing(false);
    }
  };

  // Set worker cooldown (2 minutes)
  const setWorkerCooldown = (rfid) => {
    const cooldownExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes from now
    setCooldownWorkers(prev => ({
      ...prev,
      [rfid]: cooldownExpiry
    }));
    
    // Clean up expired cooldowns periodically
    setTimeout(() => {
      setCooldownWorkers(prev => {
        const updated = { ...prev };
        const now = Date.now();
        Object.keys(updated).forEach(key => {
          if (updated[key] < now) {
            delete updated[key];
          }
        });
        return updated;
      });
    }, 2 * 60 * 1000); // Check again in 2 minutes
  };

  // Check if worker is in cooldown period
  const isWorkerInCooldown = (rfid) => {
    const cooldownExpiry = cooldownWorkers[rfid];
    return cooldownExpiry && cooldownExpiry > Date.now();
  };

  // Handle direct attendance submission
  const handleDirectAttendance = async (worker, nextAction, subdomain) => {
    if (!worker || !subdomain) return;

    try {
      // Pass the attendanceType (Punch In/Punch Out) to determine the presence state
      // Ensuring consistency with RFID attendance logic:
      // When attendanceType is 'Punch In', presence should be true
      // When attendanceType is 'Punch Out', presence should be false
      const presence = nextAction === 'Punch In';
      console.log('Direct attendance - attendanceType:', nextAction, 'presence:', presence);
      
      // Set worker cooldown before making the API call
      setWorkerCooldown(worker.rfid);
      
      // Send the presence value to backend, which will use it directly
      await putAttendance({ rfid: worker.rfid, subdomain, presence });
      
      // Show success message with current punch status
      toast.success(`Attendance marked: ${nextAction}`);
      
      // Close the modal after successful attendance
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (attendanceError) {
      console.error('Attendance marking error:', attendanceError);
      setError('Failed to mark attendance. Please try again.');
      
      // Remove cooldown on error so user can try again
      setCooldownWorkers(prev => {
        const newCooldown = { ...prev };
        delete newCooldown[worker.rfid];
        return newCooldown;
      });
    }
  };

  // Handle manual attendance submission
  const handleManualAttendance = async () => {
    if (!matchedWorker || !attendanceType || !subdomain) return;
    
    try {
      setIsProcessing(true);
      
      // Pass the attendanceType (Punch In/Punch Out) to determine the presence state
      // Ensuring consistency with RFID attendance logic:
      // When attendanceType is 'Punch In', presence should be true
      // When attendanceType is 'Punch Out', presence should be false
      const presence = attendanceType === 'Punch In';
      
      // Set worker cooldown before making the API call
      setWorkerCooldown(matchedWorker.rfid);
      
      // Send the presence value to backend, which will use it directly
      await putAttendance({ rfid: matchedWorker.rfid, subdomain, presence });
      
      // Show success message
      toast.success(`Attendance marked successfully as ${attendanceType}!`);
      
      // Reset state and close modal
      setMatchedWorker(null);
      setShowConfirmation(false);
      setIsProcessing(false);
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Attendance error:', error);
      setError('Failed to mark attendance. Please try again.');
      setIsProcessing(false);
      
      // Remove cooldown on error so user can try again
      setCooldownWorkers(prev => {
        const newCooldown = { ...prev };
        delete newCooldown[matchedWorker.rfid];
        return newCooldown;
      });
    }
  };

  // Handle cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setMatchedWorker(null);
    setAttendanceType('');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Face Attendance" size="lg">
      <div className="face-attendance-container">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="lg" />
            <p className="mt-4 text-blue-600">Loading employee data...</p>
          </div>
        ) : (
          <>
            {/* Location status indicator */}
            {locationChecked && (
              <div className={`mb-4 p-3 rounded-md text-center ${
                locationAllowed 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <p className="font-medium">
                  {locationAllowed 
                    ? '✓ You are within the allowed attendance area' 
                    : '✗ You are outside the allowed attendance area'}
                </p>
                {currentLocation && (
                  <p className="text-sm mt-1">
                    Current location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)} 
                    (±{Math.round(currentLocation.accuracy)}m)
                  </p>
                )}
              </div>
            )}

            <div className="webcam-container relative mb-4">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ 
                  facingMode: facingMode,
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                  frameRate: { ideal: 30, min: 15 }
                }}
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button
                onClick={processFaceRecognition}
                disabled={isProcessing || !isModelLoaded || isLoading || !workers.length}
                variant="primary"
                className="flex items-center justify-center flex-1"
              >
                {isProcessing ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Scan Face'
                )}
              </Button>
              
              {/* Camera toggle button */}
              <Button onClick={toggleCamera} variant="outline" className="flex-1">
                Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            {showConfirmation && matchedWorker && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Confirm Attendance</h3>
                <div className="flex items-center mb-3">
                  {matchedWorker.photo ? (
                    <img 
                      src={matchedWorker.photo} 
                      alt={matchedWorker.name} 
                      className="w-12 h-12 rounded-full object-cover mr-3"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      <span className="text-gray-500 font-bold">
                        {matchedWorker.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{matchedWorker.name}</p>
                    <p className="text-sm text-gray-600">RFID: {matchedWorker.rfid}</p>
                  </div>
                </div>
                <p className="mb-4">
                  Next action: <span className="font-semibold">{attendanceType}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleManualAttendance}
                    disabled={isProcessing}
                    variant="primary"
                    className="flex-1"
                  >
                    {isProcessing ? <Spinner size="sm" /> : 'Confirm'}
                  </Button>
                  <Button
                    onClick={handleCancelConfirmation}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {isModelLoaded && workers.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                <p className="text-yellow-800">
                  No employees with face data found. Please ensure employees have registered their face data.
                </p>
              </div>
            )}

            {isModelLoaded && !isLoading && workers.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-medium">Instructions:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Position your face within the green circular frame</li>
                  <li>Ensure good lighting on your face</li>
                  <li>Remove sunglasses or face coverings</li>
                  <li>Look directly at the camera</li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default FaceAttendance;
