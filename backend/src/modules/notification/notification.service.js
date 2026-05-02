const Notification = require('./notification.model');

class NotificationService {
  async createNotification(data) {
    const notification = await Notification.create(data);
    return notification;
  }
  
  async getUserNotifications(userId, query = {}) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;
    const filter = { recipient: userId };
    
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name avatar')
        .populate('item')
        .limit(limit)
        .skip(skip)
        .sort('-createdAt'),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);
    
    return {
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
    return notification;
  }
  
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    return { message: 'All notifications marked as read' };
  }
}

module.exports = new NotificationService();