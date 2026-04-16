const Pathway = require('./pathway.model');
const Resource = require('../resource/resource.model');
const ApiError = require('../../utils/apiError');

class PathwayService {
  async createPathway(userId, pathwayData) {
    // Validate resources exist
    if (pathwayData.resources && pathwayData.resources.length > 0) {
      const resourceIds = pathwayData.resources.map(r => r.resource);
      const resources = await Resource.find({ _id: { $in: resourceIds } });
      
      if (resources.length !== resourceIds.length) {
        throw new ApiError(400, 'One or more resources not found');
      }
    }
    
    const pathway = await Pathway.create({
      ...pathwayData,
      author: userId
    });
    
    return pathway.populate([
      { path: 'author', select: 'name email avatar' },
      { path: 'resources.resource', select: 'title category confidenceScore' }
    ]);
  }
  
  async getPathways(query = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      difficulty,
      author,
      search,
      sort = '-createdAt'
    } = query;
    
    const skip = (page - 1) * limit;
    
    const filter = { isPublic: true };
    
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (author) filter.author = author;
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    const [pathways, total] = await Promise.all([
      Pathway.find(filter)
        .populate('author', 'name email avatar')
        .populate('resources.resource', 'title category confidenceScore')
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
  
  async getPathwayById(pathwayId, userId) {
    const pathway = await Pathway.findById(pathwayId)
      .populate('author', 'name email avatar bio')
      .populate('resources.resource', 'title description category link confidenceScore');
    
    if (!pathway) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    // Increment view count (optional)
    await Pathway.findByIdAndUpdate(pathwayId, {
      $inc: { enrolledCount: 1 }
    });
    
    return pathway;
  }
  
  async updatePathway(pathwayId, userId, updateData) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    // Check ownership
    if (pathway.author.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to update this pathway');
    }
    
    const updatedPathway = await Pathway.findByIdAndUpdate(
      pathwayId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('author', 'name email');
    
    return updatedPathway;
  }
  
  async deletePathway(pathwayId, userId) {
    const pathway = await Pathway.findById(pathwayId);
    
    if (!pathway) {
      throw new ApiError(404, 'Pathway not found');
    }
    
    // Check ownership
    if (pathway.author.toString() !== userId.toString()) {
      throw new ApiError(403, 'Not authorized to delete this pathway');
    }
    
    await pathway.deleteOne();
    
    return { message: 'Pathway deleted successfully' };
  }
  
  async getUserPathways(userId) {
    const pathways = await Pathway.find({ author: userId })
      .populate('resources.resource', 'title category')
      .sort('-createdAt');
    
    return pathways;
  }
}

module.exports = new PathwayService();