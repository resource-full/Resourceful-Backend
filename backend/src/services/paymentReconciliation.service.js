const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const paymentService = require('../modules/payment/payment.service');

const redisConnection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  }
);

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected');
});

const queueName = 'payment-reconciliation';

const queue = new Queue(queueName, { connection: redisConnection });

const worker = new Worker(
  queueName,
  async (job) => {
    console.log('[Payment Reconciliation] Starting reconciliation...');
    const startTime = Date.now();

    try {
      const result = await paymentService.reconcilePendingPayments();
      console.log(
        `[Payment Reconciliation] Completed in ${Date.now() - startTime}ms: ` +
        `${result.reconciled} succeeded, ${result.failed} failed, ${result.total} total`
      );
      return result;
    } catch (error) {
      console.error('[Payment Reconciliation] Error:', error.message);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

worker.on('completed', (job, result) => {
  console.log(`[Payment Reconciliation] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Payment Reconciliation] Job ${job?.id} failed:`, err.message);
});

worker.on('stalled', (job) => {
  console.warn(`[Payment Reconciliation] Job ${job?.id} stalled, re-queuing`);
});

class PaymentReconciliationService {
  constructor() {
    this.repeatableJobId = null;
  }

  async start(interval = '*/5 * * * *') {
    if (this.repeatableJobId) {
      console.log('Payment reconciliation already running');
      return;
    }

    const job = await queue.add(
      'reconcile-pending-payments',
      {},
      {
        jobId: 'payment-reconciliation-job',
        repeat: { cron: interval, tz: 'Africa/Lagos' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    this.repeatableJobId = job.id;
    console.log(`[Payment Reconciliation] Started with repeatable job ${job.id}`);
  }

  async stop() {
    if (this.repeatableJobId) {
      await worker.close();
      await queue.close();
      await redisConnection.quit();
      this.repeatableJobId = null;
      console.log('[Payment Reconciliation] Stopped');
    }
  }
}

module.exports = new PaymentReconciliationService();