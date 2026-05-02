const Hub = require('./hub.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const User = require('../user/user.model');
const ApiError = require('../../utils/apiError');

class HubService {
  async createHub(userId, hubData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Validate resources if provided
    if (hubData.resources && hubData.resources.length > 0) {
      const resources = await Resource.find({ 
        _id: { $in: hubData.resources },
        owner: userId 
      });
      
      if (resources.length !== hubData.resources.length) {
        throw new ApiError(400, 'One or more resources not found or unauthorized');
      }
    }
    
    // Validate pathways if provided
    if (hubData.pathways && hubData.pathways.length > 0) {
      const pathways = await Pathway.find({ 
        _id: { $in: hubData.pathways },
        author: userId 
      });
      
      if (pathways.length !== hubData.pathways.length) {
        throw new ApiError(400, 'One or more pathways not found or unauthorized');
      }
    }
    
    const hub = await Hub.create({
      ...hubData,
      owner: userId,
      status: hubData.status || 'draft'
    });
    
    return hub.populate([
      { path: 'owner', select: 'name email avatar' },
      { path: 'resources', select: 'name coverPhoto industry experience' },
      { path: 'pathways', select: 'name description industry experience' }
    ]);
  }
  
  async getHubs(query = {}, userId = null) {
    const {
      page = 1,
      limit = 10,
      industry,
      experience,
      applicableLocation,
      search,
      sort = '-createdAt',
      status
    } = query;
    
    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };
    
    if (userId) {
      filter.$or = [
        { status: 'public' },
        { owner: userId }
      ];
    } else {
      filter.status = 'public';
    }
    
    if (status) filter.status = status;
    if (industry) filter.industry = industry;
    if (experience) filter.experience = experience;
    if (applicableLocation) filter.applicableLocation = applicableLocation;
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    const [hubs, total] = await Promise.all([
      Hub.find(filter)
        .populate('owner', 'name email avatar')
        .populate('resources', 'name coverPhoto')
        .populate('pathways', 'name')
        .limit(limit)
        .skip(skip)
        .sort(sort),
      Hub.countDocuments(filter)
    ]);
    
    return {
      hubs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getMyHubs(userId, query = {}) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;
    const filter = { owner: userId, isDeleted: false };
    
    if (status) filter.status = status;
    
    const [hubs, total] = await Promise.all([
      Hub.find(filter)
        .populate('resources', 'name coverPhoto')
        .populate('pathways', 'name')
        .limit(limit)
        .skip(skip)
        .sort('-updatedAt'),
      Hub.countDocuments(filter)
    ]);
    
    return {
      hubs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getHubById(hubId, userId = null) {
    const hub = await Hub.findById(hubId)
      .populate('owner', 'name email avatar')
      .populate('resources', 'name description coverPhoto industry experience applicableLocation isFree price currency peerRatings')
      .populate('pathways', 'name description industry experience applicableLocation isFree price');
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.status !== 'public') {
      if (!userId || hub.owner._id.toString() !== userId.toString()) {
        throw new ApiError(403, 'You do not have access to this hub');
      }
    }
    
    return hub;
  }
  
  async updateHub(hubId, userId, updateData) {
    const hub = await Hub.findById(hubId);
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to update this hub');
    }
    
    delete updateData.owner;
    
    const updatedHub = await Hub.findByIdAndUpdate(
      hubId,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'owner', select: 'name email' },
      { path: 'resources', select: 'name coverPhoto' },
      { path: 'pathways', select: 'name' }
    ]);
    
    return updatedHub;
  }
  
  async deleteHub(hubId, userId) {
    const hub = await Hub.findById(hubId);
    
    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to delete this hub');
    }
    
    hub.isDeleted = true;
    hub.deletedAt = new Date();
    hub.status = 'draft';
    await hub.save();
    
    return { message: 'Hub deleted successfully' };
  }
  
  async changeHubStatus(hubId, userId, newStatus) {
    const hub = await Hub.findById(hubId);
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Only the owner can change hub status');
    }
    
    if (!['draft', 'public'].includes(newStatus)) {
      throw new ApiError(400, 'Invalid status');
    }
    
    hub.status = newStatus;
    if (newStatus === 'public' && !hub.publishedAt) {
      hub.publishedAt = new Date();
    }
    
    await hub.save();
    
    return hub;
  }
  
  async addResourceToHub(hubId, resourceId, userId) {
    const hub = await Hub.findById(hubId);
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this hub');
    }
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    if (resource.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only add your own resources');
    }
    
    if (hub.resources.includes(resourceId)) {
      throw new ApiError(400, 'Resource already in hub');
    }
    
    hub.resources.push(resourceId);
    await hub.save();
    
    return hub.populate([
      { path: 'resources', select: 'name coverPhoto' },
      { path: 'pathways', select: 'name' }
    ]);
  }
  
  async removeResourceFromHub(hubId, resourceId, userId) {
    const hub = await Hub.findById(hubId);
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this hub');
    }
    
    hub.resources = hub.resources.filter(r => r.toString() !== resourceId);
    await hub.save();
    
    return hub.populate([
      { path: 'resources', select: 'name coverPhoto' },
      { path: 'pathways', select: 'name' }
    ]);
  }
  
  async addPathwayToHub(hubId, pathwayId, userId) {
    const hub = await Hub.findById(hubId);
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this hub');
    }
    
    const pathway = await Pathway.findById(pathwayId);
    if (!pathway) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (pathway.author.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only add your own pathways');
    }
    
    if (hub.pathways.includes(pathwayId)) {
      throw new ApiError(400, 'Pathway already in hub');
    }
    
    hub.pathways.push(pathwayId);
    await hub.save();
    
    return hub.populate([
      { path: 'resources', select: 'name coverPhoto' },
      { path: 'pathways', select: 'name' }
    ]);
  }
  
  async removePathwayFromHub(hubId, pathwayId, userId) {
    const hub = await Hub.findById(hubId);
    
    if (!hub || hub.isDeleted) {
      throw new ApiError(404, 'Hub not found');
    }
    
    if (hub.owner.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this hub');
    }
    
    hub.pathways = hub.pathways.filter(p => p.toString() !== pathwayId);
    await hub.save();
    
    return hub.populate([
      { path: 'resources', select: 'name coverPhoto' },
      { path: 'pathways', select: 'name' }
    ]);
  }
}

module.exports = new HubService();