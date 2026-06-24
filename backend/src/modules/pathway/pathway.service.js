const Pathway = require('./pathway.model');
const Resource = require('../resource/resource.model');
const Hub = require('../hub/hub.model');
const User = require('../user/user.model');
const ApiError = require('../../utils/apiError');

class PathwayService {
  // Helper to get ID whether populated or not
  getId(field) {
    if (!field) return null;
    if (typeof field === 'object' && field._id) return field._id.toString();
    if (typeof field === 'object' && field.toString) return field.toString();
    return field.toString();
  }
  
  async createPathway(userId, pathwayData) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    if (pathwayData.blocks && pathwayData.blocks.length > 0) {
      const resourceBlocks = pathwayData.blocks.filter(block => block.type === 'resource');
      
      for (const block of resourceBlocks) {
        const resource = await Resource.findById(block.resource);
        if (!resource) {
          throw new ApiError(404, `Resource not found: ${block.resource}`);
        }
      }
    }
    
    if (pathwayData.hubId) {
      const hub = await Hub.findOne({
        _id: pathwayData.hubId,
        owner: userId
      });
      
      if (!hub) {
        throw new ApiError(404, 'Hub not found or unauthorized');
      }
      
      pathwayData.hub = pathwayData.hubId;
    }
    
    delete pathwayData.hubId;
    
    const pathway = await Pathway.create({
      ...pathwayData,
      author: userId,
      status: pathwayData.status || 'draft'
    });
    
    return pathway.populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'blocks.resource', select: 'name description coverPhoto industry experience' },
      { path: 'hub', select: 'name' }
    ]);
  }
  
  async getPathways(query = {}, userId = null) {
    const {
      page = 1, limit = 10, industry, experience, applicableLocation,
      isFree, minPrice, maxPrice, hub, author, search, sort = '-createdAt', status
    } = query;
    
    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };
    
    if (userId) {
      filter.$or = [
        { status: 'public' },
        { author: userId }
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
    if (author) filter.author = author;
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    const [pathways, total] = await Promise.all([
      Pathway.find(filter)
        .populate('author', 'name email avatar')
        .populate('blocks.resource', 'name coverPhoto industry experience peerRatings')
        .populate('hub', 'name')
        .limit(limit)
        .skip(skip)
        .sort(sort),
      Pathway.countDocuments(filter)
    ]);
    
    return {
      pathways,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async getPathwayById(pathwayId, userId = null) {
    const pathway = await Pathway.findById(pathwayId)
      .populate('author', 'name email avatar bio')
      .populate('blocks.resource', 'name description coverPhoto industry experience applicableLocation isFree price currency peerRatings confidenceScore')
      .populate('hub', 'name description');
    
    if (!pathway || pathway.isDeleted) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    // Public pathways - anyone can view
    if (pathway.status === 'public') {
      return pathway;
    }
    
    // Non-public - must be the author
    const authorId = this.getId(pathway.author);
    if (!userId || authorId !== userId.toString()) {
      throw new ApiError(403, 'You do not have access to this pathway');
    }
    
    return pathway;
  }
  
  async updatePathway(pathwayId, userId, updateData) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway || pathway.isDeleted) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (this.getId(pathway.author) !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to update this pathway');
    }
    
    if (updateData.blocks) {
      const resourceBlocks = updateData.blocks.filter(block => block.type === 'resource');
      for (const block of resourceBlocks) {
        const resource = await Resource.findById(block.resource);
        if (!resource) {
          throw new ApiError(404, `Resource not found: ${block.resource}`);
        }
      }
    }
    
    if (updateData.hubId) {
      const hub = await Hub.findOne({ _id: updateData.hubId, owner: userId });
      if (!hub) {
        throw new ApiError(404, 'Hub not found or unauthorized');
      }
      updateData.hub = updateData.hubId;
    }
    
    delete updateData.hubId;
    delete updateData.author;
    
    const updatedPathway = await Pathway.findByIdAndUpdate(
      pathwayId, updateData, { new: true, runValidators: true }
    ).populate([
      { path: 'author', select: 'name email' },
      { path: 'blocks.resource', select: 'name coverPhoto' },
      { path: 'hub', select: 'name' }
    ]);
    
    return updatedPathway;
  }
  
  async deletePathway(pathwayId, userId) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (this.getId(pathway.author) !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to delete this pathway');
    }
    
    pathway.isDeleted = true;
    pathway.deletedAt = new Date();
    pathway.status = 'draft';
    await pathway.save();
    
    return { message: 'Pathway deleted successfully' };
  }
  
  async changePathwayStatus(pathwayId, userId, newStatus) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway || pathway.isDeleted) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (this.getId(pathway.author) !== userId.toString()) {
      throw new ApiError(403, 'Only the author can change pathway status');
    }
    
    if (!['draft', 'public'].includes(newStatus)) {
      throw new ApiError(400, 'Invalid status');
    }
    
    if (newStatus === 'public') {
      if (!pathway.name || !pathway.description) {
        throw new ApiError(400, 'Pathway must have a name and description before publishing');
      }
      if (!pathway.blocks || pathway.blocks.length === 0) {
        throw new ApiError(400, 'Pathway must have at least one block before publishing');
      }
    }
    
    pathway.status = newStatus;
    if (newStatus === 'public' && !pathway.publishedAt) {
      pathway.publishedAt = new Date();
    }
    
    await pathway.save();
    return pathway;
  }
  
  async getUserPathways(userId, query = {}) {
    const { page = 1, limit = 10, status } = query;
    
    const skip = (page - 1) * limit;
    const filter = { author: userId, isDeleted: false };
    
    if (status) filter.status = status;
    
    const [pathways, total] = await Promise.all([
      Pathway.find(filter)
        .populate('blocks.resource', 'name coverPhoto')
        .populate('hub', 'name')
        .limit(limit)
        .skip(skip)
        .sort('-updatedAt'),
      Pathway.countDocuments(filter)
    ]);
    
    return {
      pathways,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async addBlock(pathwayId, userId, blockData) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway || pathway.isDeleted) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (this.getId(pathway.author) !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this pathway');
    }
    
    if (blockData.type === 'resource') {
      const resource = await Resource.findById(blockData.resource);
      if (!resource) {
        throw new ApiError(404, 'Resource not found');
      }
    }
    
    const maxOrder = pathway.blocks.length > 0 
      ? Math.max(...pathway.blocks.map(b => b.order)) 
      : 0;
    
    pathway.blocks.push({ ...blockData, order: maxOrder + 1 });
    await pathway.save();
    
    return pathway.populate('blocks.resource', 'name coverPhoto');
  }
  
  async removeBlock(pathwayId, userId, blockId) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway || pathway.isDeleted) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (this.getId(pathway.author) !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this pathway');
    }
    
    pathway.blocks = pathway.blocks.filter(block => block._id.toString() !== blockId);
    pathway.blocks.forEach((block, index) => { block.order = index + 1; });
    await pathway.save();
    
    return pathway;
  }
  
  async reorderBlocks(pathwayId, userId, blockOrders) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway || pathway.isDeleted) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    if (this.getId(pathway.author) !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to modify this pathway');
    }
    
    for (const orderItem of blockOrders) {
      const block = pathway.blocks.find(b => b._id.toString() === orderItem.id);
      if (block) { block.order = orderItem.order; }
    }
    
    pathway.blocks.sort((a, b) => a.order - b.order);
    await pathway.save();
    
    return pathway;
  }
}

module.exports = new PathwayService();