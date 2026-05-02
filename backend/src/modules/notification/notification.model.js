const mongoose = require('mongoose');
const moment = require('moment-timezone');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'resource_published',
      'pathway_published',
      'hub_published',
      'resource_saved',
      'pathway_saved',
      'hub_saved',
      'comment_added',
      'comment_reply',
      'comment_liked',
      'resource_shared'
    ]
  },
  message: {
    type: String,
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'itemType'
  },
  itemType: {
    type: String,
    enum: ['Resource', 'Pathway', 'Hub', 'Comment']
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: {
    currentTime: () => moment().tz('Africa/Lagos').toDate()
  }
});

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);