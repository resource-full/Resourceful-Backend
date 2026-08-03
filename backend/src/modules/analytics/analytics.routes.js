const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const analyticsController = require('./analytics.controller');

const router = express.Router();

router.use(protect);

router.get('/stats', analyticsController.getStats);
router.get('/performance', analyticsController.getOverallPerformance);
router.get('/products', analyticsController.getProductPerformance);
router.get('/export/pdf', analyticsController.exportPDF);
router.get('/export/png', analyticsController.exportPNG);

module.exports = router;