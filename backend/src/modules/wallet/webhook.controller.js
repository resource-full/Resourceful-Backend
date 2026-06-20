const walletService = require('./wallet.service');
const crypto = require('crypto');

const handlePaystackWebhook = async (req, res) => {
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }
  
  const event = req.body;
  
  // Handle transfer events (withdrawals)
  if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) {
    await walletService.processWithdrawalWebhook(event);
  }
  
  // Handle charge events (payments)
  if (event.event === 'charge.success') {
    // Existing payment verification logic
    const paymentService = require('../payment/payment.service');
    await paymentService.verifyPayment(event.data.reference);
  }
  
  res.sendStatus(200);
};

module.exports = { handlePaystackWebhook };