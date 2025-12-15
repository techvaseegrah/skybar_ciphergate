const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { createAdvance, getAdvances, getWorkerAdvances, deductAdvance, updateAdvance, deleteAdvance } = require('../controllers/advanceController');

// Add logging middleware
router.use((req, res, next) => {
  console.log(`Advance route accessed: ${req.method} ${req.originalUrl}`);
  next();
});

// All routes are protected and require admin access
router.route('/')
  .post(protect, adminOnly, createAdvance)
  .get(protect, adminOnly, getAdvances);

// More specific routes first to avoid conflicts
router.route('/:id/deduct')
  .post(protect, adminOnly, deductAdvance);

router.route('/worker/:id')
  .get(protect, adminOnly, getWorkerAdvances);

// General ID-based routes last
router.route('/:id')
  .put(protect, adminOnly, updateAdvance)
  .delete(protect, adminOnly, deleteAdvance);

module.exports = router;