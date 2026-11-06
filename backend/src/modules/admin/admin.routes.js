const express = require('express');
const adminController = require('./admin.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect, authorize('superadmin', 'admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/stats', adminController.getStats);
router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.get('/resources', adminController.getResources);

module.exports = router;
