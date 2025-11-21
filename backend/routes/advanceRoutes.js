const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { createAdvance, getAdvances, getWorkerAdvances, deductAdvance } = require('../controllers/advanceController');

// All routes are protected and require admin access
router.route('/')
  .post(protect, adminOnly, createAdvance)
  .get(protect, adminOnly, getAdvances);

router.route('/worker/:id')
  .get(protect, adminOnly, getWorkerAdvances);

// New route for partial advance deduction
router.route('/:id/deduct')
  .post(protect, adminOnly, deductAdvance);

module.exports = router;