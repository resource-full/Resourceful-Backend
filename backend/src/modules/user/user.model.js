const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [30, 'First name cannot be more than 30 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [30, 'Last name cannot be more than 30 characters']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    match: [
      /^[a-zA-Z0-9._]+$/,
      'Username can only contain letters, numbers, dots and underscores'
    ]
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'contributor'],
    default: 'user'
  },
  
  // OAuth fields
  authProvider: {
    type: String,
    enum: ['local', 'google', 'linkedin'],
    default: 'local'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  linkedinId: {
    type: String,
    unique: true,
    sparse: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Onboarding fields
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingStep: {
    type: Number,
    default: 0
  },
  
  // Professional Information (from onboarding)
  professionalExperience: {
    type: String,
    enum: ['Student', 'Entry level', 'Mid Level', 'Senior', ''],
    default: ''
  },
  currentRole: {
    type: String,
    trim: true,
    maxlength: [100, 'Current role cannot be more than 100 characters'],
    default: ''
  },
  roleLocation: {
    type: String,
    default: ''
  },
  
  // Profile Images
  avatar: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  
  // Professional Info
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot be more than 100 characters'],
    default: ''
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot be more than 200 characters'],
    default: ''
  },
  industry: {
    type: String,
    enum: ['Law', 'Agriculture', 'Nursing', 'Medicine', 'Software Development', ''],
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  currentCareer: {
    type: String,
    default: ''
  },
  projectedCareer: {
    type: String,
    default: ''
  },
  skills: [{
    type: String,
    trim: true
  }],
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  
  // Goals (from onboarding)
  primaryCareerGoal: {
    type: String,
    trim: true,
    maxlength: [200, 'Career goal cannot be more than 200 characters'],
    default: ''
  },
  targetRoles: [{
    type: String,
    trim: true
  }],
  goalReviewTimeline: {
    type: String,
    enum: ['6months', '1year', ''],
    default: ''
  },
  
  // Social Links
  socials: {
    instagram: { type: String, default: '' },
    x: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    facebook: { type: String, default: '' }
  },
  
  // Profile link
  profileLink: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Resources
  savedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  createdResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  
  // Social connections
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Profile status
  profileStatus: {
    type: String,
    enum: ['draft', 'done'],
    default: 'draft'
  },
  
  // Security fields
  refreshToken: {
    type: String,
    select: false
  },
  refreshTokenExpire: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpire: {
    type: Date,
    select: false
  },
  passwordChangedAt: {
    type: Date,
    select: false
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true,
    select: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for stats
userSchema.virtual('stats').get(function() {
  return {
    following: this.following ? this.following.length : 0,
    followers: this.followers ? this.followers.length : 0,
    totalCreated: this.createdResources ? this.createdResources.length : 0,
    totalSold: 0,
    avgRelevancyScore: 0
  };
});

// Generate profile link before save
userSchema.pre('save', function(next) {
  if (this.isModified('username') && this.username) {
    this.profileLink = this.username.toLowerCase();
  }
  
  // Auto-generate name from firstName and lastName if name is not provided
  if ((this.isModified('firstName') || this.isModified('lastName')) && !this.isModified('name')) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  
  next();
});

// Hash password before saving (only for local auth)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  if (!this.isNew) {
    this.passwordChangedAt = moment().tz('Africa/Lagos').toDate();
  }
  
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if password was changed after JWT issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
    updates.$set = { 
      lockUntil: moment().tz('Africa/Lagos').add(1, 'hour').toDate() 
    };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.index({ name: 'text', email: 'text', skills: 'text' });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);