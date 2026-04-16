const Resource = require('./resource.model');
const User = require('../user/user.model');
const Interaction = require('../interaction/interaction.model');
const ApiError = require('../../utils/apiError');

class ResourceService {
  async createResource(userId, resourceData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const resource = await Resource.create({
      ...resourceData,
      owner: userId
    });
    
    // Add resource to user's createdResources
    await User.findByIdAndUpdate(userId, {
      $addToSet: { createdResources: resource._id }
    });
    
    return resource;
  }
  
  async getResources(query = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      country,
      verificationStatus,
      sort = '-confidenceScore',
      search,
      owner
    } = query;
    
    const skip = (page - 1) * limit;
    
    // Build filter criteria
    const filter = {};
    
    if (category) filter.category = category;
    if (country) filter.country = country;
    if (verificationStatus !== undefined) filter.verificationStatus = verificationStatus;
    if (owner) filter.owner = owner;
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('owner', 'name email avatar')
        .populate('collaborators', 'name email')
        .limit(limit)
        .skip(skip)
        .sort(sort),
      Resource.countDocuments(filter)
    ]);
    
    return {
      resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getResourceById(resourceId, userId) {
    const resource = await Resource.findById(resourceId)
      .populate('owner', 'name email avatar bio')
      .populate('collaborators', 'name email avatar');
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Increment view count
    await Resource.findByIdAndUpdate(resourceId, {
      $inc: { viewCount: 1 }
    });
    
    // Get user interactions if userId provided
    let userInteractions = null;
    if (userId) {
      userInteractions = await Interaction.find({
        user: userId,
        resource: resourceId
      }).select('type');
    }
    
    return {
      ...resource.toObject(),
      userInteractions: userInteractions?.map(i => i.type) || []
    };
  }
  
  async updateResource(resourceId, userId, updateData) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check ownership
    if (resource.owner.toString() !== userId.toString() && 
        !resource.collaborators.includes(userId)) {
      throw new ApiError(403, 'Not authorized to update this resource');
    }
    
    // Prevent owner change
    delete updateData.owner;
    
    const updatedResource = await Resource.findByIdAndUpdate(
      resourceId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('owner', 'name email');
    
    return updatedResource;
  }
  
  async deleteResource(resourceId, userId) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check ownership
    if (resource.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to delete this resource');
    }
    
    // Remove resource from user's createdResources
    await User.findByIdAndUpdate(userId, {
      $pull: { createdResources: resourceId }
    });
    
    // Remove all interactions for this resource
    await Interaction.deleteMany({ resource: resourceId });
    
    // Delete resource
    await resource.deleteOne();
    
    return { message: 'Resource deleted successfully' };
  }
  
  async addCollaborator(resourceId, ownerId, collaboratorEmail) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check ownership
    if (resource.owner.toString() !== ownerId.toString()) {
      throw new ApiError(403, 'Only owner can add collaborators');
    }
    
    const collaborator = await User.findOne({ email: collaboratorEmail });
    if (!collaborator) {
      throw new ApiError(404, 'User not found with this email');
    }
    
    if (resource.collaborators.includes(collaborator._id)) {
      throw new ApiError(400, 'User is already a collaborator');
    }
    
    resource.collaborators.push(collaborator._id);
    await resource.save();
    
    return resource;
  }
  
  async rateResource(resourceId, userId, rating) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Update or create rating interaction
    const interaction = await Interaction.findOneAndUpdate(
      { user: userId, resource: resourceId, type: 'rate' },
      { rating },
      { upsert: true, new: true }
    );
    
    // Recalculate average rating
    const ratings = await Interaction.aggregate([
      { $match: { resource: resource._id, type: 'rate' } },
      { $group: { 
        _id: null, 
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }}
    ]);
    
    if (ratings.length > 0) {
      resource.peerRatings = ratings[0].avgRating;
      resource.ratingCount = ratings[0].count;
      await resource.save();
    }
    
    return resource;
  }
}

module.exports = new ResourceService();