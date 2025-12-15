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

// @desc    Update an advance voucher
// @route   PUT /api/advances/:id
// @access  Private/Admin
const updateAdvance = asyncHandler(async (req, res) => {
  console.log('Update advance called with ID:', req.params.id);
  const { id: advanceId } = req.params;
  const { amount, description } = req.body;
  const adminId = req.user.id;
  const subdomain = req.user.subdomain;

  // Validate input
  if (!amount) {
    return res.status(400).json({ message: 'Amount is required' });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  // Find the advance
  const advance = await Advance.findById(advanceId);
  console.log('Found advance:', advance);
  if (!advance) {
    return res.status(404).json({ message: 'Advance not found' });
  }

  // Check if advance belongs to the same subdomain
  if (advance.subdomain !== subdomain) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Store original values for calculations
  const originalAmount = advance.amount;
  const originalRemainingAmount = advance.remainingAmount;
  
  // Update advance details
  advance.amount = parseFloat(amount);
  advance.description = description || advance.description;
  
  // Update remaining amount based on the difference
  const amountDifference = advance.amount - originalAmount;
  advance.remainingAmount = originalRemainingAmount + amountDifference;

  // Save the advance
  await advance.save();

  // Update worker's final salary
  const worker = await Worker.findById(advance.worker);
  if (worker) {
    // Adjust worker's final salary based on the amount difference
    worker.finalSalary = worker.finalSalary - amountDifference;
    await worker.save();
  }

  res.status(200).json({
    message: 'Advance updated successfully',
    advance
  });
});

// @desc    Delete an advance voucher
// @route   DELETE /api/advances/:id
// @access  Private/Admin
const deleteAdvance = asyncHandler(async (req, res) => {
  console.log('Delete advance called with ID:', req.params.id);
  const { id: advanceId } = req.params;
  const adminId = req.user.id;
  const subdomain = req.user.subdomain;

  // Find the advance
  const advance = await Advance.findById(advanceId);
  console.log('Found advance for deletion:', advance);
  if (!advance) {
    return res.status(404).json({ message: 'Advance not found' });
  }

  // Check if advance belongs to the same subdomain
  if (advance.subdomain !== subdomain) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Store amount for worker salary adjustment
  const advanceAmount = advance.amount;
  const totalDeductions = advance.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);

  // PERMANENT DELETE: Use deleteOne instead of remove for more explicit deletion
  const deleteResult = await Advance.deleteOne({ _id: advanceId });
  console.log('Delete result:', deleteResult);

  // Verify deletion occurred
  if (deleteResult.deletedCount === 0) {
    return res.status(404).json({ message: 'Advance not found or already deleted' });
  }

  // Update worker's final salary
  const worker = await Worker.findById(advance.worker);
  if (worker) {
    // Add back the advance amount minus any deductions that were already taken
    // This ensures the worker's final salary is adjusted correctly
    worker.finalSalary = worker.finalSalary + (advanceAmount - totalDeductions);
    await worker.save();
  }

  res.status(200).json({
    message: 'Advance deleted successfully'
  });
});

module.exports = {
  createAdvance,
  getAdvances,
  getWorkerAdvances,
  deductAdvance,
  updateAdvance,
  deleteAdvance
};