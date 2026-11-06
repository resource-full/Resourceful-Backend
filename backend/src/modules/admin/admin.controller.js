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
}

module.exports = new AdminController();
