const paymentService = require('../modules/payment/payment.service');
const cron = require('node-cron');

class PaymentReconciliationService {
  constructor() {
    this.task = null;
  }

  start(interval = '*/5 * * * *') {
    if (this.task) {
      console.log('Payment reconciliation already running');
      return;
    }

    this.task = cron.schedule(interval, async () => {
      console.log('[Payment Reconciliation] Starting reconciliation...');
      const startTime = Date.now();

      try {
        const result = await paymentService.reconcilePendingPayments();
        console.log(
          `[Payment Reconciliation] Completed in ${Date.now() - startTime}ms: ` +
          `${result.reconciled} succeeded, ${result.failed} failed, ${result.total} total`
        );
      } catch (error) {
        console.error('[Payment Reconciliation] Error:', error.message);
      }
    }, {
      scheduled: false,
      timezone: 'Africa/Lagos'
    });

    this.task.start();
    console.log('[Payment Reconciliation] Started');
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[Payment Reconciliation] Stopped');
    }
  }
}

module.exports = new PaymentReconciliationService();