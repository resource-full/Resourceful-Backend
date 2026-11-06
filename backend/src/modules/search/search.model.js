const mongoose = require('mongoose');

const searchQuerySchema = new mongoose.Schema({
  query: { type: String, required: true, trim: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  filters: { type: mongoose.Schema.Types.Mixed },
  resultsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
});

searchQuerySchema.index({ query: 'text' });
searchQuerySchema.index({ createdAt: -1 });

module.exports = mongoose.model('SearchQuery', searchQuerySchema);
