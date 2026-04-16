const mongoose = require('mongoose');
const moment = require('moment-timezone');

const pathwaySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a pathway title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  resources: [{
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      maxlength: 500
    }
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['career-change', 'skill-development', 'interview-prep', 'networking', 'personal-branding', 'other'],
    default: 'other'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedDuration: {
    type: String,
    default: ''
  },
  enrolledCount: {
    type: Number,
    default: 0
  },
  completionCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  thumbnail: {
    type: String,
    default: ''
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

// Index for search
pathwaySchema.index({ title: 'text', description: 'text', tags: 'text' });
pathwaySchema.index({ category: 1 });
pathwaySchema.index({ author: 1 });
pathwaySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Pathway', pathwaySchema);