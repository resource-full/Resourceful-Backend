const mongoose = require('mongoose');
const Payout = require('./payout.model');
const User = require('../user/user.model');
const Payment = require('../payment/payment.model');
const ApiError = require('../../utils/apiError');

class PayoutService {
  // Get paginated payouts with optional filters
  async getPayouts(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const status = query.status;
    const creator = query.creator;
    const search = query.search?.trim();

    const match = {};
    if (status) match.status = status;
    if (creator) match.creator = creator;
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const userIds = users.map(u => u._id);
      match.creator = { $in: userIds };
    }

    const [payouts, total] = await Promise.all([
      Payout.find(match)
        .populate('creator', 'name email avatar')
        .populate({
          path: 'payment',
          select: 'reference amount status itemType item user',
          populate: [
            { path: 'user', select: 'name email avatar' }, // buyer
            { path: 'item', refPath: 'itemType', select: 'name industry price currency status' }, // resource or pathway
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payout.countDocuments(match),
    ]);

    return {
      payouts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Create a new payout record
  async createPayout(payoutData) {
    const { creator, payment, amount, fee, creatorNet, currency } = payoutData;

    if (!creator || !amount || creatorNet === undefined) {
      throw new ApiError(400, 'creator, amount, and creatorNet are required');
    }

    const user = await User.findById(creator);
    if (!user) {
      throw new ApiError(404, 'Creator not found');
    }

    let paymentDoc = null;
    if (payment) {
      paymentDoc = await Payment.findById(payment);
      if (!paymentDoc) {
        throw new ApiError(404, 'Payment not found');
      }
    }

    const payout = await Payout.create({
      creator,
      payment: paymentDoc ? paymentDoc._id : undefined,
      amount,
      fee: fee || 0,
      creatorNet,
      currency: currency || 'NGN',
      status: 'pending',
    });

    return payout.populate('creator', 'name email avatar');
  }

  // Update payout status
  async updatePayoutStatus(payoutId, status) {
    if (!['pending', 'completed', 'failed'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      { status },
      { new: true }
    )
      .populate('creator', 'name email avatar')
      .populate({
        path: 'payment',
        select: 'reference amount status itemType item user',
        populate: [
          { path: 'user', select: 'name email avatar' },
          { path: 'item', refPath: 'itemType', select: 'name industry price currency status' },
        ],
      });

    if (!payout) {
      throw new ApiError(404, 'Payout not found');
    }

    return payout;
  }

  // Get payout by ID
  async getPayoutById(payoutId) {
    const payout = await Payout.findById(payoutId)
      .populate('creator', 'name email avatar')
      .populate({
        path: 'payment',
        select: 'reference amount status itemType item user',
        populate: [
          { path: 'user', select: 'name email avatar' },
          { path: 'item', refPath: 'itemType', select: 'name industry price currency status' },
        ],
      });

    if (!payout) {
      throw new ApiError(404, 'Payout not found');
    }

    return payout;
  }
}

module.exports = new PayoutService();
