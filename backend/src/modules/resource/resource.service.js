const Resource = require('./resource.model');
const User = require('../user/user.model');
const Hub = require('../hub/hub.model');
const Interaction = require('../interaction/interaction.model');
const ApiError = require('../../utils/apiError');
const FileUploadService = require('../../services/fileUpload.service');

class ResourceService {
  async createResource(userId, resourceData, files) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Upload files if provided
    let resourceFileData = {};
    let coverPhotoUrl = '';
    
    if (files && files.resourceFile) {
      const uploadResult = await FileUploadService.uploadFile(
        files.resourceFile,
        'resources'
      );
      
      // Validate file size
      if (files.resourceFile.size > 10485760) {
        throw new ApiError(400, 'File size must not exceed 10MB');
      }
      
      resourceFileData = {
        url: uploadResult.url,
        format: uploadResult.format,
        size: files.resourceFile.size
      };
    }
    
    if (files && files.coverPhoto) {
      const coverResult = await FileUploadService.uploadFile(
        files.coverPhoto,
        'covers'
      );
      coverPhotoUrl = coverResult.url;
    }
    
    // Prepare resource data
    const resourcePayload = {
      ...resourceData,
      owner: userId,
      resourceFile: resourceFileData,
      coverPhoto: coverPhotoUrl,
      status: resourceData.status || 'draft'
    };
    
    // Handle hub association
    if (resourceData.hubId) {
      const hub = await Hub.findOne({
        _id: resourceData.hubId,
        owner: userId
      });
      
      if (!hub) {
        throw new ApiError(404, 'Hub not found or unauthorized');
      }
      
      resourcePayload.hub = resourceData.hubId;
      
      // Update hub resource count
      await Hub.findByIdAndUpdate(resourceData.hubId, {
        $addToSet: { resources: resourcePayload._id },
        $inc: { resourceCount: 1 }
      });
    }
    
    const resource = await Resource.create(resourcePayload);
    
    // Add to user's created resources
    await User.findByIdAndUpdate(userId, {
      $addToSet: { createdResources: resource._id }
    });
    
    return resource;
  }
  
  async getResources(query = {}, userId = null) {
    const {
      page = 1,
      limit = 10,
      status,
      industry,
      experience,
      applicableLocation,
      isFree,
      minPrice,
      maxPrice,
      hub,
      sort = '-confidenceScore',
      search,
      owner
    } = query;
    
    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };
    
    // If user is authenticated, show their private resources + all public
    if (userId) {
      filter.$or = [
        { status: 'public' },
        { owner: userId },
        { 'sharedWith.user': userId }
      ];
    } else {
      filter.status = 'public';
    }
    
    // Apply filters
    if (status) filter.status = status;
    if (industry) filter.industry = industry;
    if (experience) filter.experience = experience;
    if (applicableLocation) filter.applicableLocation = applicableLocation;
    if (isFree !== undefined) filter.isFree = isFree === 'true';
    if (hub) filter.hub = hub;
    if (owner) filter.owner = owner;
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('owner', 'name email avatar')
        .populate('hub', 'name')
        .populate('collaborators.user', 'name email')
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
  
  async getResourceById(resourceId, userId = null) {
    const resource = await Resource.findById(resourceId)
      .populate('owner', 'name email avatar bio')
      .populate('hub', 'name description')
      .populate('collaborators.user', 'name email avatar')
      .populate('sharedWith.user', 'name email')
      .populate('verifiedBy', 'name');
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check permissions
    const hasAccess = this.checkResourceAccess(resource, userId);
    
    if (!hasAccess) {
      throw new ApiError(403, 'You do not have access to this resource');
    }
    
    // Increment view count for public resources
    if (resource.status === 'public' || 
        (userId && resource.owner._id.toString() !== userId.toString())) {
      await Resource.findByIdAndUpdate(resourceId, {
        $inc: { viewCount: 1 },
        $set: { lastAccessedAt: new Date() }
      });
    }
    
    // Get user interactions
    let userInteractions = [];
    if (userId) {
      userInteractions = await Interaction.find({
        user: userId,
        resource: resourceId
      }).select('type rating');
    }
    
    return {
      ...resource.toObject(),
      userInteractions
    };
  }
  
  async updateResource(resourceId, userId, updateData, files) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check update permissions
    const hasUpdatePermission = await this.checkUpdatePermission(resource, userId);
    
    if (!hasUpdatePermission) {
      throw new ApiError(403, 'You do not have permission to update this resource');
    }
    
    // Handle file updates
    if (files && files.resourceFile) {
      if (files.resourceFile.size > 10485760) {
        throw new ApiError(400, 'File size must not exceed 10MB');
      }
      
      const uploadResult = await FileUploadService.uploadFile(
        files.resourceFile,
        'resources'
      );
      
      updateData.resourceFile = {
        url: uploadResult.url,
        format: uploadResult.format,
        size: files.resourceFile.size
      };
    }
    
    if (files && files.coverPhoto) {
      const coverResult = await FileUploadService.uploadFile(
        files.coverPhoto,
        'covers'
      );
      updateData.coverPhoto = coverResult.url;
    }
    
    // Handle hub updates
    if (updateData.hubId) {
      const hub = await Hub.findOne({
        _id: updateData.hubId,
        owner: userId
      });
      
      if (!hub) {
        throw new ApiError(404, 'Hub not found or unauthorized');
      }
      
      // Remove from old hub if exists
      if (resource.hub) {
        await Hub.findByIdAndUpdate(resource.hub, {
          $pull: { resources: resourceId },
          $inc: { resourceCount: -1 }
        });
      }
      
      // Add to new hub
      await Hub.findByIdAndUpdate(updateData.hubId, {
        $addToSet: { resources: resourceId },
        $inc: { resourceCount: 1 }
      });
      
      updateData.hub = updateData.hubId;
    }
    
    delete updateData.hubId;
    delete updateData.owner;
    
    // Increment version if content changes
    if (Object.keys(updateData).length > 0) {
      updateData.version = (resource.version || 1) + 1;
    }
    
    const updatedResource = await Resource.findByIdAndUpdate(
      resourceId,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email')
     .populate('hub', 'name');
    
    return updatedResource;
  }
  
  async deleteResource(resourceId, userId) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Only owner can delete
    if (resource.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Only the owner can delete this resource');
    }
    
    // Soft delete
    resource.isDeleted = true;
    resource.deletedAt = new Date();
    resource.status = 'draft';
    await resource.save();
    
    // Remove from hub if associated
    if (resource.hub) {
      await Hub.findByIdAndUpdate(resource.hub, {
        $pull: { resources: resourceId },
        $inc: { resourceCount: -1 }
      });
    }
    
    // Remove from user's created resources
    await User.findByIdAndUpdate(userId, {
      $pull: { createdResources: resourceId }
    });
    
    return { message: 'Resource deleted successfully' };
  }
  
  async changeResourceStatus(resourceId, userId, newStatus) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Only owner can change status
    if (resource.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Only the owner can change resource status');
    }
    
    const allowedTransitions = {
      'draft': ['private', 'public'],
      'private': ['draft', 'shared', 'public'],
      'shared': ['private', 'public'],
      'public': ['private', 'draft']
    };
    
    if (!allowedTransitions[resource.status]?.includes(newStatus)) {
      throw new ApiError(400, `Cannot change status from ${resource.status} to ${newStatus}`);
    }
    
    // Validate resource completeness before publishing
    if (newStatus === 'public') {
      if (!resource.name || !resource.description || !resource.coverPhoto) {
        throw new ApiError(400, 'Resource must have name, description, and cover photo before publishing');
      }
    }
    
    resource.status = newStatus;
    if (newStatus === 'public' && !resource.publishedAt) {
      resource.publishedAt = new Date();
    }
    
    await resource.save();
    
    return resource;
  }
  
  async shareResource(resourceId, ownerId, targetUserId) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Only owner can share
    if (resource.owner.toString() !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can share this resource');
    }
    
    // Check if resource can be shared
    if (!['private', 'shared'].includes(resource.status)) {
      throw new ApiError(400, 'Only private or shared resources can be shared');
    }
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check if already shared
    const alreadyShared = resource.sharedWith.some(
      share => share.user.toString() === targetUserId
    );
    
    if (alreadyShared) {
      throw new ApiError(400, 'Resource already shared with this user');
    }
    
    resource.sharedWith.push({
      user: targetUserId,
      sharedAt: new Date()
    });
    
    if (resource.status === 'private') {
      resource.status = 'shared';
    }
    
    await resource.save();
    
    // Increment share count
    await Resource.findByIdAndUpdate(resourceId, {
      $inc: { shareCount: 1 }
    });
    
    return resource;
  }
  
  async removeShareAccess(resourceId, ownerId, targetUserId) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    if (resource.owner.toString() !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can remove share access');
    }
    
    resource.sharedWith = resource.sharedWith.filter(
      share => share.user.toString() !== targetUserId
    );
    
    // If no more shared users, revert to private
    if (resource.sharedWith.length === 0 && resource.status === 'shared') {
      resource.status = 'private';
    }
    
    await resource.save();
    
    return resource;
  }
  
  async addCollaborator(resourceId, ownerId, collaboratorId, permission = 'view') {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Only owner can add collaborators
    if (resource.owner.toString() !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can add collaborators');
    }
    
    const collaborator = await User.findById(collaboratorId);
    if (!collaborator) {
      throw new ApiError(404, 'Collaborator not found');
    }
    
    // Check if already a collaborator
    const existingCollaborator = resource.collaborators.find(
      c => c.user.toString() === collaboratorId
    );
    
    if (existingCollaborator) {
      existingCollaborator.permission = permission;
    } else {
      resource.collaborators.push({
        user: collaboratorId,
        permission,
        addedAt: new Date()
      });
    }
    
    await resource.save();
    
    return resource;
  }
  
  async removeCollaborator(resourceId, ownerId, collaboratorId) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    if (resource.owner.toString() !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can remove collaborators');
    }
    
    resource.collaborators = resource.collaborators.filter(
      c => c.user.toString() !== collaboratorId
    );
    
    await resource.save();
    
    return resource;
  }
  
  async rateResource(resourceId, userId, rating) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Only allow rating public resources
    if (resource.status !== 'public') {
      throw new ApiError(400, 'Cannot rate non-public resources');
    }
    
    // Can't rate own resource
    if (resource.owner.toString() === userId.toString()) {
      throw new ApiError(400, 'Cannot rate your own resource');
    }
    
    // Update or create rating interaction
    await Interaction.findOneAndUpdate(
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
      resource.peerRatings = Math.round(ratings[0].avgRating * 10) / 10;
      resource.ratingCount = ratings[0].count;
      resource.totalRatingSum = ratings[0].avgRating * ratings[0].count;
      await resource.save();
    }
    
    return resource;
  }
  
  async getMyResources(userId, query = {}) {
    const {
      page = 1,
      limit = 10,
      status
    } = query;
    
    const skip = (page - 1) * limit;
    const filter = {
      owner: userId,
      isDeleted: false
    };
    
    if (status) filter.status = status;
    
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('hub', 'name')
        .limit(limit)
        .skip(skip)
        .sort('-updatedAt'),
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
  
  // Helper Methods
  checkResourceAccess(resource, userId) {
    // Public resources are accessible to all
    if (resource.status === 'public') return true;
    
    // Owner always has access
    if (userId && resource.owner._id?.toString() === userId.toString()) return true;
    if (userId && resource.owner.toString() === userId.toString()) return true;
    
    // Check if user is in sharedWith list
    if (userId && resource.sharedWith?.some(
      share => share.user._id?.toString() === userId.toString() || 
               share.user.toString() === userId.toString()
    )) return true;
    
    // Check if user is collaborator
    if (userId && resource.collaborators?.some(
      collab => collab.user._id?.toString() === userId.toString() || 
                collab.user.toString() === userId.toString()
    )) return true;
    
    return false;
  }
  
  async checkUpdatePermission(resource, userId) {
    // Owner has full update permission
    if (resource.owner._id?.toString() === userId.toString() || 
        resource.owner.toString() === userId.toString()) {
      return true;
    }
    
    // Check if user has edit permission as collaborator
    const collaborator = resource.collaborators.find(
      c => (c.user._id?.toString() === userId.toString() || 
            c.user.toString() === userId.toString()) && 
           (c.permission === 'edit' || c.permission === 'admin')
    );
    
    return !!collaborator;
  }
}

module.exports = new ResourceService();