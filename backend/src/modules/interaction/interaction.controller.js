const interactionService = require('./interaction.service');
const asyncHandler = require('../../utils/asyncHandler');

class InteractionController {
  likeResource = asyncHandler(async (req, res) => {
    const result = await interactionService.likeResource(
      req.user._id,
      req.params.resourceId
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  saveResource = asyncHandler(async (req, res) => {
    const result = await interactionService.saveResource(
      req.user._id,
      req.params.resourceId
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  commentOnResource = asyncHandler(async (req, res) => {
    const { comment } = req.body;
    const interaction = await interactionService.commentOnResource(
      req.user._id,
      req.params.resourceId,
      comment
    );
    
    res.status(201).json({
      success: true,
      data: interaction
    });
  });
  
  getResourceComments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await interactionService.getResourceComments(
      req.params.resourceId,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  deleteComment = asyncHandler(async (req, res) => {
    const result = await interactionService.deleteComment(
      req.params.commentId,
      req.user._id
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getUserInteractions = asyncHandler(async (req, res) => {
    const { type } = req.query;
    const interactions = await interactionService.getUserInteractions(
      req.user._id,
      type
    );
    
    res.status(200).json({
      success: true,
      data: interactions
    });
  });
  
  getResourceStats = asyncHandler(async (req, res) => {
    const stats = await interactionService.getResourceStats(req.params.resourceId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  });
}

module.exports = new InteractionController();