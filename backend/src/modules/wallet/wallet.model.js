const mongoose = require('mongoose');
const moment = require('moment-timezone');

const withdrawalAccountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  bankCode: {
    type: String,
    required: [true, 'Bank code is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingWithdrawals: {
    type: Number,
    default: 0,
    min: 0
  },
  resourcesSold: {
    type: Number,
    default: 0
  },
  withdrawalAccounts: [withdrawalAccountSchema],
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available balance
walletSchema.virtual('availableBalance').get(function() {
  return Math.max(0, this.balance - this.pendingWithdrawals);
});

// Ensure max 3 withdrawal accounts
walletSchema.pre('save', function(next) {
  if (this.withdrawalAccounts.length > 3) {
    return next(new Error('Maximum of 3 withdrawal accounts allowed'));
  }
  
  // Ensure only one default account
  const defaultAccounts = this.withdrawalAccounts.filter(acc => acc.isDefault);
  if (defaultAccounts.length > 1) {
    this.withdrawalAccounts.forEach(acc => acc.isDefault = false);
    this.withdrawalAccounts[0].isDefault = true;
  }
  
  // If no default and accounts exist, set first as default
  if (this.withdrawalAccounts.length > 0 && defaultAccounts.length === 0) {
    this.withdrawalAccounts[0].isDefault = true;
  }
  
  next();
});

walletSchema.index({ user: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
