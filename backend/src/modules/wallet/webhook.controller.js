const walletService = require('./wallet.service');
const crypto = require('crypto');

const handlePaystackWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const event = req.body;

  try {
    // Handle transfer events (withdrawals)
    if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) {
      await walletService.processWithdrawalWebhook(event);
    }

    // Handle charge events (payments)
    if (event.event === 'charge.success') {
      const paymentService = require('../payment/payment.service');
      await paymentService.verifyPayment(event.data.reference);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.sendStatus(200);
  }
};

module.exports = { handlePaystackWebhook };