const pathwayService = require('./pathway.service');
const asyncHandler = require('../../utils/asyncHandler');
const jwt = require('jsonwebtoken');

class PathwayController {
  getUserId(req) {
    if (req.user && req.user._id) {
      return req.user._id.toString();
    }
    if (req.user && req.user.id) {
      return req.user.id.toString();
    }
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  
  createPathway = asyncHandler(async (req, res) => {
    const pathway = await pathwayService.createPathway(req.user._id, req.body);
    
    res.status(201).json({
      success: true,
      data: pathway
    });
  });
  
  getPathways = asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const result = await pathwayService.getPathways(req.query, userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getPathwayById = asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const pathway = await pathwayService.getPathwayById(req.params.id, userId);
    
    res.status(200).json({
      success: true,
      data: pathway
    });
  });
  
  updatePathway = asyncHandler(async (req, res) => {
    const pathway = await pathwayService.updatePathway(
      req.params.id,
      req.user._id,
      req.body
    );
    
    res.status(200).json({
      success: true,
      data: pathway
    });
  });
  
  deletePathway = asyncHandler(async (req, res) => {
    const result = await pathwayService.deletePathway(req.params.id, req.user._id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  changePathwayStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const pathway = await pathwayService.changePathwayStatus(
      req.params.id,
      req.user._id,
      status
    );
    
    res.status(200).json({
      success: true,
      data: pathway
    });
  });
  
  getUserPathways = asyncHandler(async (req, res) => {
    const result = await pathwayService.getUserPathways(req.user._id, req.query);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  addBlock = asyncHandler(async (req, res) => {
    const pathway = await pathwayService.addBlock(
      req.params.id,
      req.user._id,
      req.body
    );
    
    res.status(200).json({
      success: true,
      data: pathway
    });
  });
  
  removeBlock = asyncHandler(async (req, res) => {
    const { blockId } = req.params;
    const pathway = await pathwayService.removeBlock(
      req.params.id,
      req.user._id,
      blockId
    );
    
    res.status(200).json({
      success: true,
      data: pathway
    });
  });
  
  reorderBlocks = asyncHandler(async (req, res) => {
    const { blockOrders } = req.body;
    const pathway = await pathwayService.reorderBlocks(
      req.params.id,
      req.user._id,
      blockOrders
    );
    
    res.status(200).json({
      success: true,
      data: pathway
    });
  });
}

module.exports = new PathwayController();