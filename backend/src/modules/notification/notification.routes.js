const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const notificationController = require('./notification.controller');

const router = express.Router();

router.use(protect);
router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;