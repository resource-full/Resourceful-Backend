const hubService = require('./hub.service');
const asyncHandler = require('../../utils/asyncHandler');
const jwt = require('jsonwebtoken');

class HubController {
  getUserId(req) {
    if (req.user && req.user._id) return req.user._id.toString();
    if (req.user && req.user.id) return req.user.id.toString();
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

  createHub = asyncHandler(async (req, res) => {
    const hub = await hubService.createHub(req.user._id, req.body);
    res.status(201).json({ success: true, data: hub });
  });
  
  getHubs = asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const result = await hubService.getHubs(req.query, userId);
    res.status(200).json({ success: true, data: result });
  });
  
  getHubFilters = asyncHandler(async (req, res) => {
    const result = await hubService.getFilters(req.query);
    res.status(200).json({ success: true, data: result });
  });
  
  getMyHubs = asyncHandler(async (req, res) => {
    const result = await hubService.getMyHubs(req.user._id, req.query);
    res.status(200).json({ success: true, data: result });
  });
  
  getHubById = asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const hub = await hubService.getHubById(req.params.id, userId);
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
  
  changeHubStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const hub = await hubService.changeHubStatus(req.params.id, req.user._id, status);
    res.status(200).json({ success: true, data: hub });
  });
  
  addResourceToHub = asyncHandler(async (req, res) => {
    const hub = await hubService.addResourceToHub(req.params.id, req.params.resourceId, req.user._id);
    res.status(200).json({ success: true, data: hub });
  });
  
  removeResourceFromHub = asyncHandler(async (req, res) => {
    const hub = await hubService.removeResourceFromHub(req.params.id, req.params.resourceId, req.user._id);
    res.status(200).json({ success: true, data: hub });
  });
  
  addPathwayToHub = asyncHandler(async (req, res) => {
    const hub = await hubService.addPathwayToHub(req.params.id, req.params.pathwayId, req.user._id);
    res.status(200).json({ success: true, data: hub });
  });
  
  removePathwayFromHub = asyncHandler(async (req, res) => {
    const hub = await hubService.removePathwayFromHub(req.params.id, req.params.pathwayId, req.user._id);
    res.status(200).json({ success: true, data: hub });
  });
}

module.exports = new HubController();