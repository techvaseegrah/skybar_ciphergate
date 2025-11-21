const express = require('express');
const router = express.Router();

const { 
  getWorkers, 
  createWorker, 
  getWorkerById, 
  updateWorker, 
  deleteWorker,
  getWorkerActivities,
  resetWorkerActivities,
  getPublicWorkers,
  generateId,
  getWorkersByDepartment,
  getWorkerByRfid
} = require('../controllers/workerController');
const { protect, adminOnly, adminOrWorker } = require('../middleware/authMiddleware');

router.route('/').post(protect, adminOnly, createWorker); // Remove adminOnly for now
router.route('/all').post(protect, adminOrWorker, getWorkers);
router.route('/generate-id').get(protect, generateId);
router.route('/department/:departmentId').get(protect, adminOrWorker, getWorkersByDepartment);
router.route('/get-worker-by-rfid').post(protect, adminOrWorker, getWorkerByRfid);

router.post('/public', getPublicWorkers);
  
router.route('/:id')
  .get(protect, getWorkerById)
  .put(protect, adminOnly, updateWorker)
  .delete(protect, adminOnly, deleteWorker);

router.route('/:id/activities')
  .get(protect, getWorkerActivities)
  .delete(protect, adminOnly, resetWorkerActivities);

module.exports = router;