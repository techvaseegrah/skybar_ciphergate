const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { createAdvance, getAdvances, getWorkerAdvances, deductAdvance, deleteAdvance } = require('../controllers/advanceController');

// All routes are protected and require admin access
router.route('/')
  .post(protect, adminOnly, createAdvance)
  .get(protect, adminOnly, getAdvances);

// Specific routes should be defined before parameterized routes to avoid conflicts
// Route for deleting an advance voucher
router.route('/:id')
  .delete(protect, adminOnly, deleteAdvance);

// Route for partial advance deduction
router.route('/:id/deduct')
  .post(protect, adminOnly, deductAdvance);

// Route for getting worker advances (this should come after specific ID routes)
router.route('/worker/:id')
  .get(protect, adminOnly, getWorkerAdvances);

module.exports = router;