const mongoose = require('mongoose');
const moment = require('moment-timezone');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a resource title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  link: {
    type: String,
    required: [true, 'Please provide a resource link']
  },
  category: {
    type: String,
    enum: ['ebook', 'course', 'video', 'article', 'tool', 'template', 'podcast', 'community', 'other'],
    required: [true, 'Please specify a category']
  },
  country: {
    type: String,
    default: 'Global'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  verificationStatus: {
    type: Boolean,
    default: false
  },
  peerRatings: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  confidenceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  tags: [{
    type: String,
    trim: true
  }],
  thumbnail: {
    type: String,
    default: ''
  },
  viewCount: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  totalRatingSum: {
    type: Number,
    default: 0
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

// Calculate confidence score before saving
resourceSchema.pre('save', function(next) {
  const recencyScore = calculateRecencyScore(this.updatedAt || this.createdAt);
  this.confidenceScore = calculateConfidenceScore(
    this.peerRatings,
    this.verificationStatus,
    recencyScore
  );
  next();
});

// Calculate confidence score before update
resourceSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.peerRatings !== undefined || update.verificationStatus !== undefined) {
    const peerRatings = update.peerRatings || 0;
    const verificationStatus = update.verificationStatus || false;
    const recencyScore = calculateRecencyScore(new Date());
    
    update.confidenceScore = calculateConfidenceScore(
      peerRatings,
      verificationStatus,
      recencyScore
    );
  }
  
  next();
});

// Helper function to calculate recency score
function calculateRecencyScore(date) {
  const now = moment().tz('Africa/Lagos').toDate();
  const diffInDays = (now - new Date(date)) / (1000 * 60 * 60 * 24);
  
  // Resources updated within last 30 days get higher scores
  if (diffInDays <= 7) return 1;
  if (diffInDays <= 30) return 0.8;
  if (diffInDays <= 90) return 0.6;
  if (diffInDays <= 180) return 0.4;
  if (diffInDays <= 365) return 0.2;
  return 0.1;
}

// Helper function to calculate confidence score
function calculateConfidenceScore(peerRatings, verificationStatus, recencyScore) {
  // Normalize peer ratings (0-5 scale to 0-1)
  const normalizedRating = peerRatings / 5;
  
  // Calculate weighted score
  return (normalizedRating * 0.4) + 
         (verificationStatus ? 0.3 : 0) + 
         (recencyScore * 0.3);
}

// Indexes for efficient querying
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });
resourceSchema.index({ category: 1 });
resourceSchema.index({ country: 1 });
resourceSchema.index({ confidenceScore: -1 });
resourceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);