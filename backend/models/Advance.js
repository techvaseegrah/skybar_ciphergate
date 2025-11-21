const mongoose = require('mongoose');

const advanceSchema = mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: [true, 'Worker is required']
  },
  amount: {
    type: Number,
    required: [true, 'Advance amount is required'],
    min: [0, 'Amount must be positive']
  },
  description: {
    type: String,
    default: 'Advance Voucher'
  },
  subdomain: {
    type: String,
    required: [true, 'Company name is missing']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Approved by admin is required']
  },
  // New fields for partial deduction tracking
  remainingAmount: {
    type: Number,
    default: function() {
      return this.amount; // Initially, remaining amount equals the full advance amount
    }
  },
  deductions: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      default: 'Partial deduction'
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Advance', advanceSchema);