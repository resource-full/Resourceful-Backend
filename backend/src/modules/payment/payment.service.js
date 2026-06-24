const axios = require('axios');
const Payment = require('./payment.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const walletService = require('../wallet/wallet.service');
const ApiError = require('../../utils/apiError');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

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
        status: 'pending'
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
}

module.exports = new PaymentService();