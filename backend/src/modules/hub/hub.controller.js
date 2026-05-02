const hubService = require('./hub.service');
const asyncHandler = require('../../utils/asyncHandler');

class HubController {
  createHub = asyncHandler(async (req, res) => {
    const hub = await hubService.createHub(req.user._id, req.body);
    res.status(201).json({ success: true, data: hub });
  });
  
  getHubs = asyncHandler(async (req, res) => {
    const result = await hubService.getHubs(req.query);
    res.status(200).json({ success: true, data: result });
  });
  
  getMyHubs = asyncHandler(async (req, res) => {
    const result = await hubService.getMyHubs(req.user._id);
    res.status(200).json({ success: true, data: result });
  });
  
  getHubById = asyncHandler(async (req, res) => {
    const hub = await hubService.getHubById(req.params.id);
    res.status(200).json({ success: true, data: hub });
  });
  
  updateHub = asyncHandler(async (req, res) => {
    const hub = await hubService.updateHub(req.params.id, req.user._id, req.body);
    res.status(200).json({ success: true, data: hub });
  });
  
  deleteHub = asyncHandler(async (req, res) => {
    const result = await hubService.deleteHub(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: result });
  });
  
  addResourceToHub = asyncHandler(async (req, res) => {
    const hub = await hubService.addResourceToHub(
      req.params.id,
      req.params.resourceId,
      req.user._id
    );
    res.status(200).json({ success: true, data: hub });
  });
  
  removeResourceFromHub = asyncHandler(async (req, res) => {
    const hub = await hubService.removeResourceFromHub(
      req.params.id,
      req.params.resourceId,
      req.user._id
    );
    res.status(200).json({ success: true, data: hub });
  });
  
  followHub = asyncHandler(async (req, res) => {
    const hub = await hubService.followHub(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: hub });
  });
  
  unfollowHub = asyncHandler(async (req, res) => {
    const hub = await hubService.unfollowHub(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: hub });
  });
}

module.exports = new HubController();