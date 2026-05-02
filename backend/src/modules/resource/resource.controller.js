const resourceService = require('./resource.service');
const asyncHandler = require('../../utils/asyncHandler');

class ResourceController {
  createResource = asyncHandler(async (req, res) => {
    const resource = await resourceService.createResource(
      req.user._id,
      req.body,
      req.files
    );
    
    res.status(201).json({
      success: true,
      data: resource
    });
  });
  
  getResources = asyncHandler(async (req, res) => {
    const result = await resourceService.getResources(
      req.query,
      req.user?._id
    );
    
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
      req.body,
      req.files
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  deleteResource = asyncHandler(async (req, res) => {
    const result = await resourceService.deleteResource(
      req.params.id,
      req.user._id
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  changeResourceStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const resource = await resourceService.changeResourceStatus(
      req.params.id,
      req.user._id,
      status
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  shareResource = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const resource = await resourceService.shareResource(
      req.params.id,
      req.user._id,
      userId
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  removeShareAccess = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const resource = await resourceService.removeShareAccess(
      req.params.id,
      req.user._id,
      userId
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  addCollaborator = asyncHandler(async (req, res) => {
    const { userId, permission } = req.body;
    const resource = await resourceService.addCollaborator(
      req.params.id,
      req.user._id,
      userId,
      permission
    );
    
    res.status(200).json({
      success: true,
      data: resource
    });
  });
  
  removeCollaborator = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const resource = await resourceService.removeCollaborator(
      req.params.id,
      req.user._id,
      userId
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
  
  getMyResources = asyncHandler(async (req, res) => {
    const result = await resourceService.getMyResources(
      req.user._id,
      req.query
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  downloadResource = asyncHandler(async (req, res) => {
    // Implement download logic with permission check
    const resource = await resourceService.getResourceById(
      req.params.id,
      req.user._id
    );
    
    // Increment download count
    // Implement file download logic
    
    res.status(200).json({
      success: true,
      data: {
        downloadUrl: resource.resourceFile.url,
        resource: resource
      }
    });
  });
}

module.exports = new ResourceController();