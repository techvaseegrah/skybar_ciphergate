const asyncHandler = require('express-async-handler');
const Advance = require('../models/Advance');
const Worker = require('../models/Worker');

// @desc    Create a new advance voucher
// @route   POST /api/advances
// @access  Private/Admin
const createAdvance = asyncHandler(async (req, res) => {
  const { workerId, amount, description } = req.body;
  const adminId = req.user.id; // Assuming admin info is in req.user from auth middleware
  const subdomain = req.user.subdomain;

  // Validate input
  if (!workerId || !amount) {
    return res.status(400).json({ message: 'Worker and amount are required' });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  // Check if worker exists
  const worker = await Worker.findById(workerId);
  if (!worker) {
    return res.status(404).json({ message: 'Worker not found' });
  }

  // Check if worker belongs to the same subdomain
  if (worker.subdomain !== subdomain) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Create advance record
  const advance = await Advance.create({
    worker: workerId,
    amount: parseFloat(amount),
    remainingAmount: parseFloat(amount), // Initially, remaining amount equals the full advance amount
    description: description || 'Advance Voucher',
    subdomain,
    approvedBy: adminId
  });

  // Update worker's final salary by deducting the advance amount
  worker.finalSalary = worker.finalSalary - parseFloat(amount);
  await worker.save();

  res.status(201).json({
    message: 'Advance voucher created successfully',
    advance
  });
});

// @desc    Get all advances for a subdomain
// @route   GET /api/advances
// @access  Private/Admin
const getAdvances = asyncHandler(async (req, res) => {
  const { subdomain } = req.user;
  
  const advances = await Advance.find({ subdomain })
    .populate('worker', 'name rfid')
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(advances);
});

// @desc    Get advances for a specific worker
// @route   GET /api/advances/worker/:id
// @access  Private/Admin
const getWorkerAdvances = asyncHandler(async (req, res) => {
  const { id: workerId } = req.params;
  const { subdomain } = req.user;

  // Check if worker belongs to the same subdomain
  const worker = await Worker.findById(workerId);
  if (!worker || worker.subdomain !== subdomain) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const advances = await Advance.find({ worker: workerId, subdomain })
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(advances);
});

// @desc    Deduct partial amount from advance
// @route   POST /api/advances/:id/deduct
// @access  Private/Admin
const deductAdvance = asyncHandler(async (req, res) => {
  const { id: advanceId } = req.params;
  const { amount, description } = req.body;
  const adminId = req.user.id;
  const subdomain = req.user.subdomain;

  // Validate input
  if (!amount) {
    return res.status(400).json({ message: 'Deduction amount is required' });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  // Find the advance
  const advance = await Advance.findById(advanceId);
  if (!advance) {
    return res.status(404).json({ message: 'Advance not found' });
  }

  // Check if advance belongs to the same subdomain
  if (advance.subdomain !== subdomain) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Check if sufficient remaining amount
  if (amount > advance.remainingAmount) {
    return res.status(400).json({ message: `Insufficient remaining advance. Only ₹${advance.remainingAmount} available.` });
  }

  // Add deduction record
  advance.deductions.push({
    amount: parseFloat(amount),
    description: description || 'Partial deduction',
    date: new Date()
  });

  // Update remaining amount
  advance.remainingAmount = advance.remainingAmount - parseFloat(amount);

  // Save the advance
  await advance.save();

  // Update worker's final salary (increase it by the deducted amount since less is being deducted now)
  const worker = await Worker.findById(advance.worker);
  if (worker) {
    worker.finalSalary = worker.finalSalary + parseFloat(amount);
    await worker.save();
  }

  res.status(200).json({
    message: `₹${amount} deducted successfully from advance`,
    advance
  });
});

module.exports = {
  createAdvance,
  getAdvances,
  getWorkerAdvances,
  deductAdvance
};