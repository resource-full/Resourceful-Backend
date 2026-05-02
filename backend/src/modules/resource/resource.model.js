const mongoose = require('mongoose');
const moment = require('moment-timezone');

const resourceSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide a resource name'],
    trim: true,
    maxlength: [200, 'Resource name cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [5000, 'Description cannot be more than 5000 characters']
  },
  
  // File Management
  resourceFile: {
    url: {
      type: String,
      required: [true, 'Please upload a resource file']
    },
    format: {
      type: String,
      enum: ['pdf', 'mp3', 'mp4', 'jpg', 'png'],
      required: true
    },
    size: {
      type: Number,
      required: true,
      max: 10485760 // 10MB in bytes
    }
  },
  coverPhoto: {
    type: String,
    required: [true, 'Please upload a cover photo'],
    validate: {
      validator: function(v) {
        return /\.(jpg|jpeg|png)$/i.test(v);
      },
      message: 'Cover photo must be JPG or PNG format'
    }
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['draft', 'private', 'shared', 'public'],
    default: 'draft'
  },
  
  // Ownership & Permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Categorization
  applicationLocation: {
    type: String,
    required: [true, 'Please select application location'],
    enum: [
      'Worldwide',
      'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
      'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
      'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
      'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
      'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
      'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic',
      'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
      'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
      'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
      'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
      'Eswatini', 'Ethiopia',
      'Fiji', 'Finland', 'France',
      'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
      'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
      'Haiti', 'Honduras', 'Hungary',
      'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
      'Jamaica', 'Japan', 'Jordan',
      'Kazakhstan', 'Kenya', 'Kiribati', 'Korea, North', 'Korea, South', 'Kosovo',
      'Kuwait', 'Kyrgyzstan',
      'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
      'Lithuania', 'Luxembourg',
      'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
      'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
      'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
      'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
      'Nigeria', 'North Macedonia', 'Norway',
      'Oman',
      'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
      'Philippines', 'Poland', 'Portugal',
      'Qatar',
      'Romania', 'Russia', 'Rwanda',
      'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
      'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
      'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
      'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka',
      'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
      'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
      'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
      'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
      'Uruguay', 'Uzbekistan',
      'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
      'Yemen',
      'Zambia', 'Zimbabwe'
    ]
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
    enum: [
      'Law',
      'Agriculture',
      'Nursing',
      'Medicine',
      'Software Development'
    ]
  },
  
  // Pricing
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
    enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR']
  },
  
  // Hub Association
  hub: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hub',
    default: null
  },
  
  // Analytics & Ratings
  viewCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  peerRatings: {
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
  
  // Verification
  verificationStatus: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: Date,
  
  // Confidence Score
  confidenceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  
  // Tags for Search
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Metadata
  version: {
    type: Number,
    default: 1
  },
  publishedAt: Date,
  lastAccessedAt: Date,
  
  // Soft Delete
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

// Virtuals
resourceSchema.virtual('averageRating').get(function() {
  if (this.ratingCount === 0) return 0;
  return this.totalRatingSum / this.ratingCount;
});

// Pre-save middleware for confidence score
resourceSchema.pre('save', function(next) {
  if (this.isModified('peerRatings') || 
      this.isModified('verificationStatus') || 
      this.isModified('updatedAt')) {
    this.confidenceScore = calculateConfidenceScore(
      this.peerRatings,
      this.verificationStatus,
      this.updatedAt || this.createdAt
    );
  }
  
  // Set published date when status changes to public
  if (this.isModified('status') && this.status === 'public' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Pre-findOneAndUpdate for confidence score
resourceSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.peerRatings !== undefined || 
      update.verificationStatus !== undefined) {
    const recencyScore = calculateRecencyScore(new Date());
    update.confidenceScore = calculateConfidenceScore(
      update.peerRatings || 0,
      update.verificationStatus || false,
      recencyScore
    );
  }
  
  if (update.status === 'public') {
    update.publishedAt = new Date();
  }
  
  next();
});

// Helper Functions
function calculateRecencyScore(date) {
  const now = moment().tz('Africa/Lagos').toDate();
  const diffInDays = (now - new Date(date)) / (1000 * 60 * 60 * 24);
  
  if (diffInDays <= 7) return 1;
  if (diffInDays <= 30) return 0.8;
  if (diffInDays <= 90) return 0.6;
  if (diffInDays <= 180) return 0.4;
  if (diffInDays <= 365) return 0.2;
  return 0.1;
}

function calculateConfidenceScore(peerRatings, verificationStatus, date) {
  // Normalize peer ratings (0-5 scale to 0-1)
  const normalizedRating = peerRatings / 5;
  
  // Calculate weighted score: confidence = (0.4*ratings) + (0.3*verification) + (0.3*recency)
  return (normalizedRating * 0.4) + 
         (verificationStatus ? 0.3 : 0) + 
         (calculateRecencyScore(date) * 0.3);
}

// Indexes
resourceSchema.index({ name: 'text', description: 'text', tags: 'text' });
resourceSchema.index({ status: 1, isDeleted: 1 });
resourceSchema.index({ industry: 1 });
resourceSchema.index({ experience: 1 });
resourceSchema.index({ applicationLocation: 1 });
resourceSchema.index({ isFree: 1, price: 1 });
resourceSchema.index({ confidenceScore: -1 });
resourceSchema.index({ owner: 1, status: 1 });
resourceSchema.index({ 'collaborators.user': 1 });
resourceSchema.index({ 'sharedWith.user': 1 });
resourceSchema.index({ hub: 1 });
resourceSchema.index({ createdAt: -1 });
resourceSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);