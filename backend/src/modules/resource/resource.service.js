const Resource = require('./resource.model');
const User = require('../user/user.model');
const Hub = require('../hub/hub.model');
const Interaction = require('../interaction/interaction.model');
const NotificationService = require('../notification/notification.service');
const ApiError = require('../../utils/apiError');
const FileUploadService = require('../../services/fileUpload.service');

class ResourceService {
  async createResource(userId, resourceData, files) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    let resourceFileData = {};
    let coverPhotoUrl = '';
    
    if (files && files.resourceFile && files.resourceFile.length > 0) {
      const file = files.resourceFile[0];
      
      if (file.size > 10485760) {
        throw new ApiError(400, 'File size must not exceed 10MB');
      }
      
      resourceFileData = {
        url: file.path,
        format: file.originalname.split('.').pop().toLowerCase(),
        size: file.size
      };
    } else {
      throw new ApiError(400, 'Please upload a resource file');
    }
    
    if (files && files.coverPhoto && files.coverPhoto.length > 0) {
      const file = files.coverPhoto[0];
      coverPhotoUrl = file.path;
    } else {
      throw new ApiError(400, 'Please upload a cover photo');
    }
    
    const resourcePayload = {
      ...resourceData,
      owner: userId,
      resourceFile: resourceFileData,
      coverPhoto: coverPhotoUrl,
      status: resourceData.status || 'draft'
    };
    
    if (resourceData.hubId) {
      const hub = await Hub.findOne({
        _id: resourceData.hubId,
        owner: userId
      });
      
      if (!hub) {
        throw new ApiError(404, 'Hub not found or unauthorized');
      }
      
      resourcePayload.hub = resourceData.hubId;
    }
    
    const resource = await Resource.create(resourcePayload);
    
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
    
    if (userId) {
      filter.$or = [
        { status: 'public' },
        { owner: userId },
        { 'sharedWith.user': userId }
      ];
    } else {
      filter.status = 'public';
    }
    
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
      .populate('sharedWith.user', 'name email');
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    const hasAccess = this.checkResourceAccess(resource, userId);
    
    if (!hasAccess) {
      throw new ApiError(403, 'You do not have access to this resource');
    }
    
    if (resource.status === 'public' || 
        (userId && this.getOwnerId(resource) !== userId.toString())) {
      await Resource.findByIdAndUpdate(resourceId, {
        $inc: { viewCount: 1 },
        $set: { lastAccessedAt: new Date() }
      });
    }
    
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
    
    const hasUpdatePermission = await this.checkUpdatePermission(resource, userId);
    
    if (!hasUpdatePermission) {
      throw new ApiError(403, 'You do not have permission to update this resource');
    }
    
    if (files && files.resourceFile && files.resourceFile.length > 0) {
      const file = files.resourceFile[0];
      
      if (file.size > 10485760) {
        throw new ApiError(400, 'File size must not exceed 10MB');
      }
      
      updateData.resourceFile = {
        url: file.path,
        format: file.originalname.split('.').pop().toLowerCase(),
        size: file.size
      };
    }
    
    if (files && files.coverPhoto && files.coverPhoto.length > 0) {
      const file = files.coverPhoto[0];
      updateData.coverPhoto = file.path;
    }
    
    if (updateData.hubId) {
      const hub = await Hub.findOne({
        _id: updateData.hubId,
        owner: userId
      });
      
      if (!hub) {
        throw new ApiError(404, 'Hub not found or unauthorized');
      }
      
      if (resource.hub) {
        await Hub.findByIdAndUpdate(resource.hub, {
          $pull: { resources: resourceId }
        });
      }
      
      await Hub.findByIdAndUpdate(updateData.hubId, {
        $addToSet: { resources: resourceId }
      });
      
      updateData.hub = updateData.hubId;
    }
    
    delete updateData.hubId;
    delete updateData.owner;
    
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
    
    if (this.getOwnerId(resource) !== userId.toString()) {
      throw new ApiError(403, 'Only the owner can delete this resource');
    }
    
    resource.isDeleted = true;
    resource.deletedAt = new Date();
    resource.status = 'draft';
    await resource.save();
    
    if (resource.hub) {
      await Hub.findByIdAndUpdate(resource.hub, {
        $pull: { resources: resourceId }
      });
    }
    
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
    
    if (this.getOwnerId(resource) !== userId.toString()) {
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
    
    if (newStatus === 'public') {
      await NotificationService.createNotification({
        recipient: resource.owner,
        sender: resource.owner,
        type: 'resource_published',
        message: 'Your resource is now live in the marketplace',
        item: resource._id,
        itemType: 'Resource'
      });
    }
    
    return resource;
  }
  
  async shareResource(resourceId, ownerId, targetEmail) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    if (this.getOwnerId(resource) !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can share this resource');
    }
    
    if (!['private', 'shared'].includes(resource.status)) {
      throw new ApiError(400, 'Only private or shared resources can be shared');
    }
    
    const owner = await User.findById(ownerId);
    
    if (owner.email.toLowerCase() === targetEmail.toLowerCase()) {
      throw new ApiError(400, 'You cannot share a resource with yourself');
    }
    
    const targetUser = await User.findOne({ email: targetEmail.toLowerCase() });
    if (!targetUser) {
      throw new ApiError(404, 'User not found with this email');
    }
    
    const alreadyShared = resource.sharedWith.some(
      share => this.getUserId(share.user) === targetUser._id.toString()
    );
    
    if (alreadyShared) {
      throw new ApiError(400, 'Resource already shared with this user');
    }
    
    resource.sharedWith.push({
      user: targetUser._id,
      sharedAt: new Date()
    });
    
    if (resource.status === 'private') {
      resource.status = 'shared';
    }
    
    await resource.save();
    
    await Resource.findByIdAndUpdate(resourceId, {
      $inc: { shareCount: 1 }
    });
    
    await NotificationService.createNotification({
      recipient: targetUser._id,
      sender: ownerId,
      type: 'resource_shared',
      message: 'A resource has been shared with you',
      item: resource._id,
      itemType: 'Resource'
    });
    
    return resource;
  }
  
  async removeShareAccess(resourceId, ownerId, targetUserId) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    if (this.getOwnerId(resource) !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can remove share access');
    }
    
    resource.sharedWith = resource.sharedWith.filter(
      share => this.getUserId(share.user) !== targetUserId
    );
    
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
    
    if (this.getOwnerId(resource) !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can add collaborators');
    }
    
    const collaborator = await User.findById(collaboratorId);
    if (!collaborator) {
      throw new ApiError(404, 'Collaborator not found');
    }
    
    const existingCollaborator = resource.collaborators.find(
      c => this.getUserId(c.user) === collaboratorId
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
    
    if (this.getOwnerId(resource) !== ownerId.toString()) {
      throw new ApiError(403, 'Only the owner can remove collaborators');
    }
    
    resource.collaborators = resource.collaborators.filter(
      c => this.getUserId(c.user) !== collaboratorId
    );
    
    await resource.save();
    
    return resource;
  }
  
  async rateResource(resourceId, userId, rating) {
    const resource = await Resource.findById(resourceId);
    
    if (!resource || resource.isDeleted) {
      throw new ApiError(404, 'Resource not found');
    }
    
    if (resource.status !== 'public') {
      throw new ApiError(400, 'Cannot rate non-public resources');
    }
    
    if (this.getOwnerId(resource) === userId.toString()) {
      throw new ApiError(400, 'Cannot rate your own resource');
    }
    
    await Interaction.findOneAndUpdate(
      { user: userId, resource: resourceId, type: 'rate' },
      { rating },
      { upsert: true, new: true }
    );
    
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
  
  // Helper: Get owner ID whether populated or not
  getOwnerId(resource) {
    if (typeof resource.owner === 'object' && resource.owner._id) {
      return resource.owner._id.toString();
    }
    return resource.owner.toString();
  }
  
  // Helper: Get user ID from populated or plain field
  getUserId(userField) {
    if (typeof userField === 'object' && userField._id) {
      return userField._id.toString();
    }
    return userField.toString();
  }
  
  checkResourceAccess(resource, userId) {
    if (resource.status === 'public') return true;
    if (!userId) return false;
    
    const userIdStr = userId.toString();
    
    // Check owner
    if (this.getOwnerId(resource) === userIdStr) return true;
    
    // Check sharedWith
    if (resource.sharedWith?.some(share => this.getUserId(share.user) === userIdStr)) return true;
    
    // Check collaborators
    if (resource.collaborators?.some(collab => this.getUserId(collab.user) === userIdStr)) return true;
    
    return false;
  }
  
  async checkUpdatePermission(resource, userId) {
    if (this.getOwnerId(resource) === userId.toString()) return true;
    
    const collaborator = resource.collaborators.find(
      c => this.getUserId(c.user) === userId.toString() && 
           (c.permission === 'edit' || c.permission === 'admin')
    );
    
    return !!collaborator;
  }
}

module.exports = new ResourceService();