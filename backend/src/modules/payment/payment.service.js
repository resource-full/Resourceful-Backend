const Paystack = require('paystack-node');
const Payment = require('./payment.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const ApiError = require('../../utils/apiError');

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

class PaymentService {
  async initializePayment(userId, itemId, itemType) {
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
    
    if (item.owner.toString() === userId.toString()) {
      throw new ApiError(400, 'You cannot buy your own item');
    }
    
    // Check if already paid
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
    
    const response = await paystack.initializeTransaction({
      email: req.user.email,
      amount: item.price * 100,
      reference,
      metadata: {
        userId,
        itemId,
        itemType
      }
    });
    
    await Payment.create({
      user: userId,
      item: itemId,
      itemType,
      amount: item.price,
      currency: item.currency,
      reference,
      status: 'pending'
    });
    
    return {
      authorizationUrl: response.data.authorization_url,
      reference
    };
  }
  
  async verifyPayment(reference) {
    const response = await paystack.verifyTransaction(reference);
    
    const payment = await Payment.findOne({ reference });
    
    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }
    
    if (response.data.status === 'success') {
      payment.status = 'success';
      payment.paystackResponse = response.data;
      await payment.save();
    } else {
      payment.status = 'failed';
      payment.paystackResponse = response.data;
      await payment.save();
    }
    
    return payment;
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