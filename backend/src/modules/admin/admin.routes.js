const express = require('express');
const adminController = require('./admin.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect, authorize('superadmin', 'admin'));

router.get('/dashboard', adminController.getDashboard);

module.exports = router;
