const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { countryNames } = require('../../utils/countries');

const pathwayBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'resource'],
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  // For text blocks
  name: {
    type: String,
    maxlength: [200, 'Block name cannot be more than 200 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot be more than 500 characters']
  },
  // For resource blocks
  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, { _id: true });

const pathwaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a pathway name'],
    trim: true,
    maxlength: [200, 'Pathway name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [5000, 'Description cannot be more than 5000 characters']
  },
  blocks: [pathwayBlockSchema],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicableLocation: {
    type: String,
    required: [true, 'Please select application location'],
    enum: ['Worldwide', ...countryNames]
  },
  experience: {
    type: String,
    required: [true, 'Please select experience level'],
    enum: [
      'Undergraduate',
      'Recent graduate (0-2 years)',
      'Experienced level (3-6 years)',
      'Professional (above 6 years)'
    ]
  },
  industry: {
    type: String,
    required: [true, 'Please select industry'],
    enum: ['Law', 'Agriculture', 'Nursing', 'Medicine', 'Software Development']
  },
  isFree: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    required: function() {
      return !this.isFree;
    },
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'NGN']
  },
  status: {
    type: String,
    enum: ['draft', 'public'],
    default: 'draft'
  },
  hub: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hub',
    default: null
  },
  viewCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  totalRatingSum: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  publishedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

pathwaySchema.virtual('averageRating').get(function() {
  if (this.ratingCount === 0) return 0;
  return this.totalRatingSum / this.ratingCount;
});

pathwaySchema.virtual('blockCount').get(function() {
  return this.blocks ? this.blocks.length : 0;
});

pathwaySchema.virtual('resourceCount').get(function() {
  if (!this.blocks) return 0;
  return this.blocks.filter(block => block.type === 'resource').length;
});

pathwaySchema.pre('save', function(next) {
  if (this.blocks && this.blocks.length > 0) {
    this.blocks.forEach((block, index) => {
      if (block.order === undefined) {
        block.order = index + 1;
      }
    });
    this.blocks.sort((a, b) => a.order - b.order);
  }
  
  if (this.isModified('status') && this.status === 'public' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

pathwaySchema.index({ name: 'text', description: 'text', tags: 'text' });
pathwaySchema.index({ status: 1, isDeleted: 1 });
pathwaySchema.index({ author: 1, status: 1 });
pathwaySchema.index({ industry: 1 });
pathwaySchema.index({ experience: 1 });
pathwaySchema.index({ applicableLocation: 1 });
pathwaySchema.index({ isFree: 1, price: 1 });
pathwaySchema.index({ hub: 1 });
pathwaySchema.index({ createdAt: -1 });
pathwaySchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Pathway', pathwaySchema);