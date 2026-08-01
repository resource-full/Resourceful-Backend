const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { countryNames } = require('../../utils/countries');

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
  resources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  pathways: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pathway'
  }],
  status: {
    type: String,
    enum: ['draft', 'public'],
    default: 'draft'
  },
  publishedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

hubSchema.index({ owner: 1 });
hubSchema.index({ name: 'text', description: 'text' });
hubSchema.index({ status: 1, isDeleted: 1 });
hubSchema.index({ industry: 1 });
hubSchema.index({ experience: 1 });
hubSchema.index({ applicableLocation: 1 });
hubSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Hub', hubSchema);