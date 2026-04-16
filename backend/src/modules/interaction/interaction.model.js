const mongoose = require('mongoose');
const moment = require('moment-timezone');

const interactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'save', 'comment', 'rate', 'share'],
    required: true
  },
  comment: {
    type: String,
    maxlength: [1000, 'Comment cannot be more than 1000 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

// Compound index to ensure unique likes/saves per user per resource
interactionSchema.index(
  { user: 1, resource: 1, type: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      type: { $in: ['like', 'save'] } 
    }
  }
);

// Index for efficient queries
interactionSchema.index({ resource: 1, type: 1 });
interactionSchema.index({ user: 1, type: 1 });
interactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);