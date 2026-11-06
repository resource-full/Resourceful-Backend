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
router.get('/resources/:id', adminController.getResourceDetail);
router.patch('/resources/:id/flag', adminController.flagResource);
router.delete('/resources/:id', adminController.deleteResource);
router.get('/pathways', adminController.getPathways);
router.get('/pathways/:id', adminController.getPathwayDetail);
router.patch('/pathways/:id/flag', adminController.flagPathway);
router.delete('/pathways/:id', adminController.deletePathway);

module.exports = router;
