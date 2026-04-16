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
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'contributor'],
    default: 'user'
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
  savedResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  createdResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Index for search optimization
userSchema.index({ name: 'text', email: 'text', skills: 'text' });

module.exports = mongoose.model('User', userSchema);