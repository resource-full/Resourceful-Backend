const express = require('express');
const payoutController = require('./payout.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

// All payout routes require admin/superadmin
router.use(protect, authorize('superadmin', 'admin'));

router.get('/', payoutController.getPayouts);
router.get('/:id', payoutController.getPayout);
router.post('/', payoutController.createPayout);
router.patch('/:id/status', payoutController.updatePayoutStatus);

module.exports = router;
