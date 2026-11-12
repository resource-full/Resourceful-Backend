const payoutService = require('./payout.service');
const asyncHandler = require('../../utils/asyncHandler');

class PayoutController {
  // GET /api/v1/admin/payouts
  getPayouts = asyncHandler(async (req, res) => {
    const result = await payoutService.getPayouts(req.query);
    res.status(200).json({ success: true, data: result });
  });

  // GET /api/v1/admin/payouts/:id
  getPayout = asyncHandler(async (req, res) => {
    const payout = await payoutService.getPayoutById(req.params.id);
    res.status(200).json({ success: true, data: payout });
  });

  // POST /api/v1/admin/payouts
  createPayout = asyncHandler(async (req, res) => {
    const payout = await payoutService.createPayout(req.body);
    res.status(201).json({ success: true, data: payout });
  });

  // PATCH /api/v1/admin/payouts/:id/status
  updatePayoutStatus = asyncHandler(async (req, res) => {
    const payout = await payoutService.updatePayoutStatus(
      req.params.id,
      req.body.status
    );
    res.status(200).json({ success: true, data: payout });
  });
}

module.exports = new PayoutController();
