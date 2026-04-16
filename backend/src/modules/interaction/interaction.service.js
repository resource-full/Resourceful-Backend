const Interaction = require('./interaction.model');
const Resource = require('../resource/resource.model');
const User = require('../user/user.model');
const ApiError = require('../../utils/apiError');

class InteractionService {
  async likeResource(userId, resourceId) {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    const existingInteraction = await Interaction.findOne({
      user: userId,
      resource: resourceId,
      type: 'like'
    });
    
    if (existingInteraction) {
      // Unlike
      await existingInteraction.deleteOne();
      return { liked: false, message: 'Resource unliked' };
    }
    
    // Like
    await Interaction.create({
      user: userId,
      resource: resourceId,
      type: 'like'
    });
    
    return { liked: true, message: 'Resource liked' };
  }
  
  async saveResource(userId, resourceId) {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    const existingInteraction = await Interaction.findOne({
      user: userId,
      resource: resourceId,
      type: 'save'
    });
    
    if (existingInteraction) {
      // Unsave
      await existingInteraction.deleteOne();
      await User.findByIdAndUpdate(userId, {
        $pull: { savedResources: resourceId }
      });
      return { saved: false, message: 'Resource removed from saved' };
    }
    
    // Save
    await Interaction.create({
      user: userId,
      resource: resourceId,
      type: 'save'
    });
    
    await User.findByIdAndUpdate(userId, {
      $addToSet: { savedResources: resourceId }
    });
    
    return { saved: true, message: 'Resource saved' };
  }
  
  async commentOnResource(userId, resourceId, comment) {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    const interaction = await Interaction.create({
      user: userId,
      resource: resourceId,
      type: 'comment',
      comment
    });
    
    await interaction.populate('user', 'name email avatar');
    
    return interaction;
  }
  
  async getResourceComments(resourceId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [comments, total] = await Promise.all([
      Interaction.find({
        resource: resourceId,
        type: 'comment'
      })
        .populate('user', 'name email avatar')
        .limit(limit)
        .skip(skip)
        .sort('-createdAt'),
      Interaction.countDocuments({
        resource: resourceId,
        type: 'comment'
      })
    ]);
    
    return {
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async deleteComment(commentId, userId) {
    const comment = await Interaction.findOne({
      _id: commentId,
      type: 'comment'
    });
    
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }
    
    // Check if user owns the comment
    if (comment.user.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }
    
    await comment.deleteOne();
    
    return { message: 'Comment deleted successfully' };
  }
  
  async getUserInteractions(userId, type) {
    const filter = { user: userId };
    if (type) filter.type = type;
    
    const interactions = await Interaction.find(filter)
      .populate('resource', 'title category confidenceScore')
      .sort('-createdAt');
    
    return interactions;
  }
  
  async getResourceStats(resourceId) {
    const stats = await Interaction.aggregate([
      { $match: { resource: mongoose.Types.ObjectId(resourceId) } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }}
    ]);
    
    const statsObj = {};
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
    });
    
    return statsObj;
  }
}

module.exports = new InteractionService();