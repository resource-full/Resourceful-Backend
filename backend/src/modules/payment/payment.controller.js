const paymentService = require('./payment.service');
const asyncHandler = require('../../utils/asyncHandler');

class PaymentController {
  initializePayment = asyncHandler(async (req, res) => {
    const result = await paymentService.initializePayment(
      req.user._id,
      req.params.itemId,
      req.params.itemType
    );
    res.status(200).json({ success: true, data: result });
  });
  
  verifyPayment = asyncHandler(async (req, res) => {
    const payment = await paymentService.verifyPayment(req.params.reference);
    res.status(200).json({ success: true, data: payment });
  });
  
  checkPurchaseStatus = asyncHandler(async (req, res) => {
    const status = await paymentService.checkPurchaseStatus(
      req.user._id,
      req.params.itemId,
      req.params.itemType
    );
    res.status(200).json({ success: true, data: status });
  });
}

module.exports = new PaymentController();