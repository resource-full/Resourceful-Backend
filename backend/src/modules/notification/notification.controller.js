const notificationService = require('./notification.service');
const asyncHandler = require('../../utils/asyncHandler');

class NotificationController {
  getNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getUserNotifications(
      req.user._id,
      req.query
    );
    res.status(200).json({ success: true, data: result });
  });
  
  markAsRead = asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user._id
    );
    res.status(200).json({ success: true, data: notification });
  });
  
  markAllAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json({ success: true, data: result });
  });
}

module.exports = new NotificationController();