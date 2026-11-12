const mongoose = require('mongoose');
const moment = require('moment-timezone');

const payoutSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  creatorNet: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  currency: { type: String, default: 'NGN' }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

// Indexes for efficient payout queries
payoutSchema.index({ creator: 1 });
payoutSchema.index({ payment: 1 });
payoutSchema.index({ status: 1 });
payoutSchema.index({ createdAt: -1 });
payoutSchema.index({ creator: 1, status: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
