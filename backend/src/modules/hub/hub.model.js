const mongoose = require('mongoose');
const moment = require('moment-timezone');

const hubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a hub name'],
    trim: true,
    maxlength: [100, 'Hub name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  resources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  resourceCount: {
    type: Number,
    default: 0
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followerCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

hubSchema.index({ owner: 1 });
hubSchema.index({ name: 'text', description: 'text' });
hubSchema.index({ isPublic: 1 });
hubSchema.index({ followerCount: -1 });

module.exports = mongoose.model('Hub', hubSchema);