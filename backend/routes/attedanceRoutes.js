// backend/routes/attedanceRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAttendance,
  getWorkerAttendance,
  putAttendance,
  putRfidAttendance,
  getWorkerLastAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// Worker routes (protected)
router.post('/', protect, getAttendance);
router.post('/worker', protect, getWorkerAttendance);
router.put('/', protect, putAttendance);
router.put('/rfid', protect, putRfidAttendance);
router.post('/worker-last', protect, getWorkerLastAttendance);

// Note: Face recognition route has been removed as the controller function doesn't exist
// router.post('/face-recognition', recognizeFaceAndMarkAttendance);

module.exports = router;