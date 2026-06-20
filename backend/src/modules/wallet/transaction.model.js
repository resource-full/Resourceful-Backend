const mongoose = require('mongoose');
const moment = require('moment-timezone');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  category: {
    type: String,
    enum: ['resource_sale', 'withdrawal', 'refund', 'payout', 'referral_bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  paystackRecipientCode: String,
  paystackTransferCode: String,
  paystackResponse: mongoose.Schema.Types.Mixed,
  failureReason: String,
  completedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ reference: 1 }, { unique: true });
transactionSchema.index({ paystackTransferCode: 1 }, { sparse: true });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);