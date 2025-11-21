const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { 
  generateSalaryReport,
  getWorkerAttendanceSummary
} = require('../controllers/salaryReportController');

// Admin routes for salary reports
router.get('/:subdomain/:year/:month', protect, adminOnly, generateSalaryReport);
router.get('/:subdomain/:year/:month/worker/:workerId', protect, adminOnly, getWorkerAttendanceSummary);

module.exports = router;