const pathwayService = require('./pathway.service');
const asyncHandler = require('../../utils/asyncHandler');

class PathwayController {
  createPathway = asyncHandler(async (req, res) => {
    const pathway = await pathwayService.createPathway(req.user._id, req.body);
    
    res.status(201).json({
      success: true,
      data: pathway
    });
  });
  
  getPathways = asyncHandler(async (req, res) => {
    const result = await pathwayService.getPathways(req.query);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getPathwayById = asyncHandler(async (req, res) => {
    const pathway = await pathwayService.getPathwayById(
      req.params.id,
      req.user?._id
    );
    
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
  
  getUserPathways = asyncHandler(async (req, res) => {
    const pathways = await pathwayService.getUserPathways(req.user._id);
    
    res.status(200).json({
      success: true,
      data: pathways
    });
  });
}

module.exports = new PathwayController();