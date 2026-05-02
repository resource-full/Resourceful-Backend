const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const paymentController = require('./payment.controller');

const router = express.Router();

router.use(protect);
router.post('/initialize/:itemType/:itemId', paymentController.initializePayment);
router.get('/verify/:reference', paymentController.verifyPayment);
router.get('/status/:itemType/:itemId', paymentController.checkPurchaseStatus);

module.exports = router;