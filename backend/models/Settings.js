const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
  subdomain: {
    type: String,
    required: true,
    unique: true
  },

  // Email settings
  emailReportsEnabled: {
    type: Boolean,
    default: false
  },
  lastEmailSent: {
    type: Date
  },
  emailSentToday: {
    type: Boolean,
    default: false
  },

  // Attendance and productivity settings
  considerOvertime: {
    type: Boolean,
    default: false
  },
  deductSalary: {
    type: Boolean,
    default: true
  },
  permissionTimeMinutes: {
    type: Number,
    default: 15
  },
  salaryDeductionPerBreak: {
    type: Number,
    default: 10
  },

  // Location settings for attendance restrictions
  attendanceLocation: {
    enabled: {
      type: Boolean,
      default: false
    },
    latitude: {
      type: Number,
      default: 0
    },
    longitude: {
      type: Number,
      default: 0
    },
    radius: {
      type: Number, // in meters
      default: 100
    },
    // Add locked status to prevent changes once set
    locked: {
      type: Boolean,
      default: false // Changed from default: false to ensure locations are not locked by default
    }
  },

  // Common fields
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },

  // Batches and intervals
  batches: {
    type: [
      {
        batchName: {
          type: String,
          required: true
        },
        from: {
          type: String,
          default: '09:00'
        },
        to: {
          type: String,
          default: '19:00'
        },
        lunchFrom: {
          type: String,
          default: '12:00'
        },
        lunchTo: {
          type: String,
          default: '13:00'
        },
        isLunchConsider: {
          type: Boolean,
          default: false
        }
      }
    ],
    default: [
      {
        batchName: 'Full Time',
        from: '09:00',
        to: '19:00',
        lunchFrom: '12:00',
        lunchTo: '13:00',
        isLunchConsider: false
      }
    ]
  },

  intervals: {
    type: [
      {
        intervalName: {
          type: String,
          default: 'interval1'
        },
        from: {
          type: String,
          default: '10:15'
        },
        to: {
          type: String,
          default: '10:30'
        },
        isBreakConsider: {
          type: Boolean,
          default: false
        }
      }
    ],
    default: [
      {
        intervalName: 'interval1',
        from: '10:15',
        to: '10:30',
        isBreakConsider: false
      },
      {
        intervalName: 'interval2',
        from: '14:15',
        to: '14:30',
        isBreakConsider: false
      }
    ]
  }
}, {
  timestamps: true
});

// Method to reset daily email flag
settingsSchema.methods.resetDailyEmailFlag = function () {
  const today = new Date();
  const lastSent = this.lastEmailSent;

  if (!lastSent || lastSent.toDateString() !== today.toDateString()) {
    this.emailSentToday = false;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Settings', settingsSchema);