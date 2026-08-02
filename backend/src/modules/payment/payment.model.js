const mongoose = require('mongoose');
const moment = require('moment-timezone');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  itemType: {
    type: String,
    required: true,
    enum: ['Resource', 'Pathway']
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  retries: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  lastRetryAt: Date,
  nextRetryAt: Date,
  paystackResponse: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ idempotencyKey: 1 }, { sparse: true });
paymentSchema.index({ nextRetryAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);