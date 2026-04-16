const resourceService = require('./resource.service');
const asyncHandler = require('../../utils/asyncHandler');

class ResourceController {
  createResource = asyncHandler(async (req, res) => {
    const resource = await resourceService.createResource(req.user._id, req.body);
    
    res.status(201).json({
      success: true,
      data: resource
    });
  });
  
  getResources = asyncHandler(async (req, res) => {
    const result = await resourceService.getResources(req.query);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getResourceById = asyncHandler(async (req, res) => {
    const resource = await resourceService.getResourceById(
      req.params.id,
      req.user?._id
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  updateResource = asyncHandler(async (req, res) => {
    const resource = await resourceService.updateResource(
      req.params.id,
      req.user._id,
      req.body
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  deleteResource = asyncHandler(async (req, res) => {
    const result = await resourceService.deleteResource(req.params.id, req.user._id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  addCollaborator = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const resource = await resourceService.addCollaborator(
      req.params.id,
      req.user._id,
      email
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  rateResource = asyncHandler(async (req, res) => {
    const { rating } = req.body;
    const resource = await resourceService.rateResource(
      req.params.id,
      req.user._id,
      rating
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
}

module.exports = new ResourceController();