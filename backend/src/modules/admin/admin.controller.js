const adminService = require('./admin.service');
const asyncHandler = require('../../utils/asyncHandler');

class AdminController {
  getDashboard = asyncHandler(async (req, res) => {
    const data = await adminService.getDashboard();
    res.status(200).json({ success: true, data });
  });

  getStats = asyncHandler(async (req, res) => {
    const data = await adminService.getStats();
    res.status(200).json({ success: true, data });
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const data = await adminService.getAnalytics();
    res.status(200).json({ success: true, data });
  });

  getUsers = asyncHandler(async (req, res) => {
    const data = await adminService.getUsers(req.query);
    res.status(200).json({ success: true, data });
  });

  getUserDetail = asyncHandler(async (req, res) => {
    const data = await adminService.getUserDetail(req.params.id);
    res.status(200).json({ success: true, data });
  });

  suspendUser = asyncHandler(async (req, res) => {
    const isActive = req.body?.isActive;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive boolean required' });
    }
    const data = await adminService.suspendUser(req.params.id, isActive);
    res.status(200).json({ success: true, data });
  });

  getResources = asyncHandler(async (req, res) => {
    const data = await adminService.getResourcesAdmin(req.query);
    res.status(200).json({ success: true, data });
  });

  getResourceDetail = asyncHandler(async (req, res) => {
    const data = await adminService.getResourceDetail(req.params.id);
    res.status(200).json({ success: true, data });
  });

  flagResource = asyncHandler(async (req, res) => {
    const data = await adminService.flagResource(req.params.id, req.body?.isFlagged);
    res.status(200).json({ success: true, data });
  });

  deleteResource = asyncHandler(async (req, res) => {
    const data = await adminService.deleteResource(req.params.id);
    res.status(200).json({ success: true, data });
  });

  getPathways = asyncHandler(async (req, res) => {
    const data = await adminService.getPathwaysAdmin(req.query);
    res.status(200).json({ success: true, data });
  });

  getPathwayDetail = asyncHandler(async (req, res) => {
    const data = await adminService.getPathwayDetail(req.params.id);
    res.status(200).json({ success: true, data });
  });

  flagPathway = asyncHandler(async (req, res) => {
    const data = await adminService.flagPathway(req.params.id, req.body?.isFlagged);
    res.status(200).json({ success: true, data });
  });

  deletePathway = asyncHandler(async (req, res) => {
    const data = await adminService.deletePathway(req.params.id);
    res.status(200).json({ success: true, data });
  });
}

module.exports = new AdminController();
