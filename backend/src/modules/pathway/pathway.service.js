const mongoose = require('mongoose');
const Pathway = require('./pathway.model');
const Resource = require('../resource/resource.model');
const Hub = require('../hub/hub.model');
const User = require('../user/user.model');
const Payment = require('../payment/payment.model');
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
      const resourceIds = [...new Set(resourceBlocks.map(b => b.resource))];
      if (resourceIds.length > 0) {
        const found = await Resource.find({ _id: { $in: resourceIds } }).select('_id');
        if (found.length !== resourceIds.length) {
          const foundIds = found.map(r => r._id.toString());
          const missing = resourceIds.find(id => !foundIds.includes(id.toString()));
          throw new ApiError(404, `Resource not found: ${missing}`);
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
  
  async getFilters(query = {}) {
    const { country, industry, experience, isFree } = query;
    const scope = { status: 'public', isDeleted: false };
    if (country) scope.applicableLocation = country;
    if (industry) scope.industry = industry;
    if (experience) scope.experience = experience;
    if (isFree !== undefined) scope.isFree = isFree === 'true';

    const run = (field) => Pathway.aggregate([
      { $match: scope },
      { $match: { [field]: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $project: { _id: 0, value: '$_id', count: 1 } },
      { $sort: { value: 1 } }
    ]);

    const [countries, industries, experiences, pricing] = await Promise.all([
      run('applicableLocation'),
      run('industry'),
      run('experience'),
      Pathway.aggregate([
        { $match: scope },
        { $group: { _id: '$isFree', count: { $sum: 1 } } },
        {
          $project: {
            _id: 0,
            value: {
              $cond: [{ $eq: ['$_id', true] }, 'Free', 'Paid']
            },
            count: 1
          }
        },
        { $sort: { value: 1 } }
      ])
    ]);

    return { countries, industries, experiences, pricing };
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

    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

    const pipeline = [
      { $match: filter },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }]
        }
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'hubs',
          localField: 'hub',
          foreignField: '_id',
          as: 'hub',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      { $unwind: { path: '$hub', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$blocks', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'resources',
          localField: 'blocks.resource',
          foreignField: '_id',
          as: 'blocks.resource',
          pipeline: [{ $project: { name: 1, coverPhoto: 1, industry: 1, experience: 1, peerRatings: 1 } }]
        }
      },
      {
        $group: {
          _id: '$_id',
          author: { $first: '$author' },
          hub: { $first: '$hub' },
          blocks: { $push: '$blocks' },
          industry: { $first: '$industry' },
          experience: { $first: '$experience' },
          applicableLocation: { $first: '$applicableLocation' },
          isFree: { $first: '$isFree' },
          price: { $first: '$price' },
          currency: { $first: '$currency' },
          title: { $first: '$title' },
          description: { $first: '$description' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      {
        $addFields: {
          'blocks': {
            $map: {
              input: '$blocks',
              as: 'b',
              in: {
                $mergeObjects: [
                  '$$b',
                  {
                    resource: { $arrayElemAt: ['$$b.resource', 0] }
                  }
                ]
              }
            }
          }
        }
      }
    ];

    const [pathways, total, totalPublicResources, totalPublicPathways, totalPublicHubs] = await Promise.all([
      Pathway.aggregate(pipeline),
      Pathway.countDocuments(filter),
      Resource.countDocuments({ status: 'public', isDeleted: false }),
      Pathway.countDocuments({ status: 'public', isDeleted: false }),
      Hub.countDocuments({ status: 'public', isDeleted: false })
    ]);
    
    return {
      pathways,
      counts: {
        resources: totalPublicResources,
        pathways: totalPublicPathways,
        hubs: totalPublicHubs
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
async getPathwayById(pathwayId, userId = null) {
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(pathwayId), isDeleted: false } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [{ $project: { name: 1, email: 1, avatar: 1, bio: 1 } }]
        }
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'hubs',
          localField: 'hub',
          foreignField: '_id',
          as: 'hub',
          pipeline: [{ $project: { name: 1, description: 1 } }]
        }
      },
      { $unwind: { path: '$hub', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$blocks', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'resources',
          localField: 'blocks.resource',
          foreignField: '_id',
          as: 'blocks.resource',
          pipeline: [{ $project: { name: 1, description: 1, coverPhoto: 1, industry: 1, experience: 1, applicableLocation: 1, isFree: 1, price: 1, currency: 1, peerRatings: 1, confidenceScore: 1 } }]
        }
      },
      {
        $group: {
          _id: '$_id',
          author: { $first: '$author' },
          hub: { $first: '$hub' },
          blocks: { $push: '$blocks' },
          industry: { $first: '$industry' },
          experience: { $first: '$experience' },
          applicableLocation: { $first: '$applicableLocation' },
          isFree: { $first: '$isFree' },
          price: { $first: '$price' },
          currency: { $first: '$currency' },
          title: { $first: '$title' },
          description: { $first: '$description' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      {
        $addFields: {
          blocks: {
            $map: {
              input: '$blocks',
              as: 'b',
              in: { $mergeObjects: ['$$b', { resource: { $arrayElemAt: ['$$b.resource', 0] } }] }
            }
          }
        }
      }
    ];

    const [pathway] = await Pathway.aggregate(pipeline);

    if (!pathway) {
      throw new ApiError(404, 'Pathway not found');
    }

    if (pathway.status === 'public' && !pathway.isFree) {
      if (!userId) {
        throw new ApiError(403, 'You must purchase this pathway to access it');
      }

      const hasPurchased = await Payment.findOne({
        user: userId,
        item: pathwayId,
        itemType: 'Pathway',
        status: 'success'
      });

      if (!hasPurchased) {
        throw new ApiError(403, 'You must purchase this pathway to access it');
      }
    }

    if (pathway.status === 'public') {
      return pathway;
    }

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
      const resourceIds = [...new Set(resourceBlocks.map(b => b.resource))];
      if (resourceIds.length > 0) {
        const found = await Resource.find({ _id: { $in: resourceIds } }).select('_id');
        if (found.length !== resourceIds.length) {
          const foundIds = found.map(r => r._id.toString());
          const missing = resourceIds.find(id => !foundIds.includes(id.toString()));
          throw new ApiError(404, `Resource not found: ${missing}`);
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
    const filter = { author: new mongoose.Types.ObjectId(userId), isDeleted: false };
    
    if (status) filter.status = status;

    const pipeline = [
      { $match: filter },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'hubs',
          localField: 'hub',
          foreignField: '_id',
          as: 'hub',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      { $unwind: { path: '$hub', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$blocks', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'resources',
          localField: 'blocks.resource',
          foreignField: '_id',
          as: 'blocks.resource',
          pipeline: [{ $project: { name: 1, coverPhoto: 1 } }]
        }
      },
      {
        $group: {
          _id: '$_id',
          hub: { $first: '$hub' },
          blocks: { $push: '$blocks' },
          title: { $first: '$title' },
          description: { $first: '$description' },
          status: { $first: '$status' },
          updatedAt: { $first: '$updatedAt' },
          createdAt: { $first: '$createdAt' }
        }
      },
      {
        $addFields: {
          blocks: {
            $map: {
              input: '$blocks',
              as: 'b',
              in: { $mergeObjects: ['$$b', { resource: { $arrayElemAt: ['$$b.resource', 0] } }] }
            }
          }
        }
      }
    ];

    const [pathways, total] = await Promise.all([
      Pathway.aggregate(pipeline),
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