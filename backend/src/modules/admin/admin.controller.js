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
}

module.exports = new AdminController();
