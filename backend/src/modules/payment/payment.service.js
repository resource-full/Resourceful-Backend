const axios = require('axios');
const Payment = require('./payment.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const walletService = require('../wallet/wallet.service');
const ApiError = require('../../utils/apiError');
const crypto = require('crypto');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60000;

class PaymentService {
  async initializePayment(userId, itemId, itemType, userEmail) {
    let item;

    if (itemType === 'Resource') {
      item = await Resource.findById(itemId);
    } else if (itemType === 'Pathway') {
      item = await Pathway.findById(itemId);
    } else {
      throw new ApiError(400, 'Invalid item type');
    }

    if (!item) {
      throw new ApiError(404, `${itemType} not found`);
    }

    if (item.isFree) {
      throw new ApiError(400, 'This item is free');
    }

    if (item.owner && item.owner.toString() === userId.toString()) {
      throw new ApiError(400, 'You cannot buy your own item');
    }

    const existingPayment = await Payment.findOne({
      user: userId,
      item: itemId,
      itemType,
      status: 'success'
    });

    if (existingPayment) {
      throw new ApiError(400, 'You have already purchased this item');
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${userId}:${itemId}:${itemType}`)
      .digest('hex');

    const existingIdempotent = await Payment.findOne({ idempotencyKey });
    if (existingIdempotent) {
      if (existingIdempotent.status === 'pending') {
        const now = new Date();
        if (existingIdempotent.nextRetryAt && existingIdempotent.nextRetryAt <= now) {
          await this._retryPayment(existingIdempotent);
        }
        return {
          authorizationUrl: existingIdempotent.paystackResponse?.data?.authorization_url,
          reference: existingIdempotent.reference,
          message: 'Payment already initialized. Check your payment status.'
        };
      }
      if (existingIdempotent.status === 'success') {
        throw new ApiError(400, 'You have already purchased this item');
      }
    }

    const reference = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: userEmail,
          amount: Math.round(item.price * 100),
          reference,
          metadata: JSON.stringify({ userId, itemId, itemType })
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json'
          }
        }
      );

      await Payment.create({
        user: userId,
        item: itemId,
        itemType,
        amount: item.price,
        currency: item.currency || 'NGN',
        reference,
        idempotencyKey,
        status: 'pending',
        paystackResponse: response.data.data
      });

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(400, `Payment initialization failed: ${message}`);
    }
  }

  async verifyPayment(reference) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`
          }
        }
      );

      const payment = await Payment.findOne({ reference });

      if (!payment) {
        throw new ApiError(404, 'Payment not found');
      }

      if (response.data.data.status === 'success' && payment.status !== 'success') {
        payment.status = 'success';
        payment.paystackResponse = response.data.data;
        payment.retries = 0;
        payment.nextRetryAt = null;
        await payment.save();

        let item;
        if (payment.itemType === 'Resource') {
          item = await Resource.findById(payment.item);
        } else if (payment.itemType === 'Pathway') {
          item = await Pathway.findById(payment.item);
        }

        if (item && item.owner) {
          const sellerAmount = payment.amount * 0.9;
          await walletService.creditWallet(
            item.owner,
            sellerAmount,
            payment.item,
            payment.reference
          );
        }
      } else if (response.data.data.status !== 'success') {
        payment.status = 'failed';
        payment.paystackResponse = response.data.data;
        await payment.save();
      }

      return payment;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(400, `Payment verification failed: ${message}`);
    }
  }

  async checkPurchaseStatus(userId, itemId, itemType) {
    const payment = await Payment.findOne({
      user: userId,
      item: itemId,
      itemType,
      status: 'success'
    });

    return {
      hasPurchased: !!payment
    };
  }

  async reconcilePendingPayments() {
    const now = new Date();
    const pendingPayments = await Payment.find({
      status: 'pending',
      $or: [
        { nextRetryAt: { $lte: now } },
        { nextRetryAt: null }
      ]
    });

    let reconciled = 0;
    let failed = 0;

    for (const payment of pendingPayments) {
      try {
        const response = await axios.get(
          `${PAYSTACK_BASE_URL}/transaction/verify/${payment.reference}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET}`
            }
          }
        );

        if (response.data.data.status === 'success') {
          payment.status = 'success';
          payment.paystackResponse = response.data.data;
          payment.retries = 0;
          payment.nextRetryAt = null;
          await payment.save();

          let item;
          if (payment.itemType === 'Resource') {
            item = await Resource.findById(payment.item);
          } else if (payment.itemType === 'Pathway') {
            item = await Pathway.findById(payment.item);
          }

          if (item && item.owner) {
            const sellerAmount = payment.amount * 0.9;
            await walletService.creditWallet(
              item.owner,
              sellerAmount,
              payment.item,
              payment.reference
            );
          }

          reconciled++;
        } else {
          payment.status = 'failed';
          payment.paystackResponse = response.data.data;
          await payment.save();
          failed++;
        }
      } catch (error) {
        await this._handleRetry(payment, error);
      }
    }

    return { reconciled, failed, total: pendingPayments.length };
  }

  async retryPendingPayments() {
    const now = new Date();
    const paymentsToRetry = await Payment.find({
      status: 'pending',
      retries: { $lt: MAX_RETRIES },
      $or: [
        { nextRetryAt: { $lte: now } },
        { nextRetryAt: null }
      ]
    });

    let retried = 0;

    for (const payment of paymentsToRetry) {
      try {
        await this._retryPayment(payment);
        retried++;
      } catch (error) {
        console.error(`Retry failed for payment ${payment.reference}:`, error.message);
      }
    }

    return { retried, total: paymentsToRetry.length };
  }

  async _retryPayment(payment) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${payment.reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`
          }
        }
      );

      if (response.data.data.status === 'success') {
        payment.status = 'success';
        payment.paystackResponse = response.data.data;
        payment.retries = 0;
        payment.nextRetryAt = null;
        await payment.save();

        let item;
        if (payment.itemType === 'Resource') {
          item = await Resource.findById(payment.item);
        } else if (payment.itemType === 'Pathway') {
          item = await Pathway.findById(payment.item);
        }

        if (item && item.owner) {
          const sellerAmount = payment.amount * 0.9;
          await walletService.creditWallet(
            item.owner,
            sellerAmount,
            payment.item,
            payment.reference
          );
        }
      } else {
        payment.retries = (payment.retries || 0) + 1;
        payment.lastRetryAt = new Date();

        if (payment.retries >= MAX_RETRIES) {
          payment.status = 'failed';
          payment.nextRetryAt = null;
        } else {
          const backoff = Math.pow(2, payment.retries) * RETRY_DELAY_MS;
          payment.nextRetryAt = new Date(Date.now() + backoff);
        }

        await payment.save();
      }
    } catch (error) {
      payment.retries = (payment.retries || 0) + 1;
      payment.lastRetryAt = new Date();

      if (payment.retries >= MAX_RETRIES) {
        payment.status = 'failed';
        payment.nextRetryAt = null;
      } else {
        const backoff = Math.pow(2, payment.retries) * RETRY_DELAY_MS;
        payment.nextRetryAt = new Date(Date.now() + backoff);
      }

      await payment.save();
      throw error;
    }
  }

  async _handleRetry(payment, error) {
    payment.retries = (payment.retries || 0) + 1;
    payment.lastRetryAt = new Date();

    if (payment.retries >= MAX_RETRIES) {
      payment.status = 'failed';
      payment.nextRetryAt = null;
      console.error(`Payment ${payment.reference} failed after ${MAX_RETRIES} retries`);
    } else {
      const backoff = Math.pow(2, payment.retries) * RETRY_DELAY_MS;
      payment.nextRetryAt = new Date(Date.now() + backoff);
      console.warn(`Payment ${payment.reference} retry ${payment.retries}/${MAX_RETRIES} scheduled`);
    }

    await payment.save();
  }
}

module.exports = new PaymentService();