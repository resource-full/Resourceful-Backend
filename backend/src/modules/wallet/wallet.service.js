const Wallet = require('./wallet.model');
const Transaction = require('./transaction.model');
const User = require('../user/user.model');
const ApiError = require('../../utils/apiError');
const moment = require('moment-timezone');
const axios = require('axios');
const PDFDocument = require('pdfkit');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

// Nigerian Bank Codes
const BANK_CODES = {
  'Access Bank': '044',
  'Citibank Nigeria': '023',
  'Ecobank Nigeria': '050',
  'Fidelity Bank': '070',
  'First Bank of Nigeria': '011',
  'First City Monument Bank': '214',
  'Globus Bank': '028',
  'Guaranty Trust Bank': '058',
  'Jaiz Bank': '301',
  'Keystone Bank': '082',
  'Optimus Bank': '030',
  'Parallex Bank': '031',
  'Polaris Bank': '076',
  'Premium Trust Bank': '033',
  'Providus Bank': '024',
  'Signature Bank': '036',
  'Stanbic IBTC Bank': '221',
  'Standard Chartered Bank': '068',
  'Sterling Bank': '232',
  'Titan Trust Bank': '026',
  'Union Bank of Nigeria': '032',
  'United Bank for Africa': '033',
  'Unity Bank': '215',
  'Wema Bank': '035',
  'Zenith Bank': '057'
};

class WalletService {
  // Get bank list
  getBankList() {
    return Object.keys(BANK_CODES).sort();
  }

  // Get or create wallet
  async getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      wallet = await Wallet.create({ 
        user: userId,
        currency: 'NGN'
      });
    }
    
    return wallet;
  }

  // Credit wallet after successful sale
  async creditWallet(userId, amount, resourceId, paymentReference) {
    const wallet = await this.getOrCreateWallet(userId);
    
    const transactionRef = `INC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = await Transaction.create({
      user: userId,
      wallet: wallet._id,
      type: 'credit',
      category: 'resource_sale',
      amount,
      currency: wallet.currency,
      status: 'completed',
      reference: transactionRef,
      description: `Income from resource sale`,
      metadata: { resourceId, paymentReference },
      completedAt: new Date()
    });
    
    wallet.balance += amount;
    wallet.totalEarned += amount;
    wallet.resourcesSold += 1;
    await wallet.save();
    
    return { wallet, transaction };
  }

  // Get wallet details
  async getWallet(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    
    const pendingWithdrawals = await Transaction.aggregate([
      {
        $match: {
          user: wallet.user,
          category: 'withdrawal',
          status: { $in: ['pending', 'processing'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const pendingAmount = pendingWithdrawals.length > 0 ? pendingWithdrawals[0].total : 0;
    wallet.pendingWithdrawals = pendingAmount;
    
    return {
      ...wallet.toObject(),
      availableBalance: wallet.balance - pendingAmount,
      pendingWithdrawals: pendingAmount
    };
  }

  // Add withdrawal account
  async addWithdrawalAccount(userId, accountData) {
    const { accountName, accountNumber, bankName } = accountData;
    
    if (!accountName || !accountNumber || !bankName) {
      throw new ApiError(400, 'Account name, account number, and bank name are required');
    }
    
    // Auto-resolve bank code
    const bankCode = BANK_CODES[bankName];
    if (!bankCode) {
      throw new ApiError(400, 'Invalid bank name. Please select from the supported banks list.');
    }
    
    accountData.bankCode = bankCode;
    
    const wallet = await this.getOrCreateWallet(userId);
    
    if (wallet.withdrawalAccounts.length >= 3) {
      throw new ApiError(400, 'Maximum of 3 withdrawal accounts allowed');
    }
    
    // Check for duplicate
    const exists = wallet.withdrawalAccounts.find(
      acc => acc.accountNumber === accountNumber && acc.bankCode === bankCode
    );
    
    if (exists) {
      throw new ApiError(400, 'This bank account already exists');
    }
    
    // First account is default
    if (wallet.withdrawalAccounts.length === 0) {
      accountData.isDefault = true;
    }
    
    wallet.withdrawalAccounts.push(accountData);
    await wallet.save();
    
    return wallet;
  }

  // Remove withdrawal account
  async removeWithdrawalAccount(userId, accountId) {
    const wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      throw new ApiError(404, 'Wallet not found');
    }
    
    const account = wallet.withdrawalAccounts.id(accountId);
    if (!account) {
      throw new ApiError(404, 'Withdrawal account not found');
    }
    
    // Check for pending withdrawals to this account
    const pendingWithdrawal = await Transaction.findOne({
      user: userId,
      category: 'withdrawal',
      status: { $in: ['pending', 'processing'] },
      'metadata.accountId': accountId
    });
    
    if (pendingWithdrawal) {
      throw new ApiError(400, 'Cannot remove account with pending withdrawals');
    }
    
    const wasDefault = account.isDefault;
    wallet.withdrawalAccounts.pull(accountId);
    
    // Set new default if needed
    if (wasDefault && wallet.withdrawalAccounts.length > 0) {
      wallet.withdrawalAccounts[0].isDefault = true;
    }
    
    await wallet.save();
    return wallet;
  }

  // Set default withdrawal account
  async setDefaultAccount(userId, accountId) {
    const wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      throw new ApiError(404, 'Wallet not found');
    }
    
    const account = wallet.withdrawalAccounts.id(accountId);
    if (!account) {
      throw new ApiError(404, 'Withdrawal account not found');
    }
    
    // Reset all
    wallet.withdrawalAccounts.forEach(acc => acc.isDefault = false);
    
    // Set selected as default
    account.isDefault = true;
    
    await wallet.save();
    return wallet;
  }

  // Get withdrawal accounts
  async getWithdrawalAccounts(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.withdrawalAccounts;
  }

  // Request withdrawal
  async requestWithdrawal(userId, amount, accountId) {
    const wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      throw new ApiError(404, 'Wallet not found');
    }
    
    // Check minimum withdrawal
    const minAmount = wallet.currency === 'NGN' ? 1000 : 200;
    if (amount < minAmount) {
      throw new ApiError(400, 
        `Minimum withdrawal is ${wallet.currency === 'NGN' ? '₦1,000' : '$200'}`
      );
    }
    
    // Check available balance
    if (amount > wallet.balance) {
      throw new ApiError(400, 'Insufficient balance');
    }
    
    // Get withdrawal account
    let account;
    if (accountId) {
      account = wallet.withdrawalAccounts.id(accountId);
    } else {
      account = wallet.withdrawalAccounts.find(acc => acc.isDefault);
    }
    
    if (!account) {
      throw new ApiError(400, 'No withdrawal account found. Please add one first.');
    }
    
    // Check for pending withdrawals (max 3)
    const pendingCount = await Transaction.countDocuments({
      user: userId,
      category: 'withdrawal',
      status: { $in: ['pending', 'processing'] }
    });
    
    if (pendingCount >= 3) {
      throw new ApiError(400, 'You have 3 pending withdrawals. Wait for them to complete.');
    }
    
    const reference = `WTH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create Paystack Transfer Recipient
      const recipientResponse = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        {
          type: 'nuban',
          name: account.accountName,
          account_number: account.accountNumber,
          bank_code: account.bankCode,
          currency: wallet.currency
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const recipientCode = recipientResponse.data.data.recipient_code;
      
      // Initiate Paystack Transfer
      const transferResponse = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        {
          source: 'balance',
          amount: Math.round(amount * 100),
          recipient: recipientCode,
          reason: `ResourceFull payout - ${reference}`
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Create transaction record
      const transaction = await Transaction.create({
        user: userId,
        wallet: wallet._id,
        type: 'debit',
        category: 'withdrawal',
        amount,
        currency: wallet.currency,
        status: 'processing',
        reference,
        description: `Withdrawal to ${account.bankName} - ${account.accountNumber}`,
        metadata: {
          accountId: account._id,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          bankCode: account.bankCode
        },
        paystackRecipientCode: recipientCode,
        paystackTransferCode: transferResponse.data.data.transfer_code,
        paystackResponse: transferResponse.data.data
      });
      
      // Deduct from wallet
      wallet.balance -= amount;
      wallet.totalWithdrawn += amount;
      await wallet.save();
      
      return { 
        wallet, 
        transaction,
        message: 'Withdrawal initiated successfully. Funds will arrive within 24 hours.'
      };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new ApiError(400, `Withdrawal failed: ${errorMessage}`);
    }
  }

  // Process withdrawal webhook from Paystack
  async processWithdrawalWebhook(event) {
    const { event: eventType, data } = event;
    
    if (eventType === 'transfer.success') {
      const transaction = await Transaction.findOneAndUpdate(
        { paystackTransferCode: data.transfer_code },
        { 
          status: 'completed',
          completedAt: new Date(),
          'metadata.paystackWebhook': data
        },
        { new: true }
      );
      
      return transaction;
    }
    
    if (eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
      const transaction = await Transaction.findOneAndUpdate(
        { paystackTransferCode: data.transfer_code },
        { 
          status: 'failed',
          failureReason: data.reason || 'Transfer failed',
          'metadata.paystackWebhook': data
        },
        { new: true }
      );
      
      if (transaction) {
        // Refund to wallet
        await Wallet.findOneAndUpdate(
          { user: transaction.user },
          { 
            $inc: { 
              balance: transaction.amount,
              totalWithdrawn: -transaction.amount
            } 
          }
        );
      }
      
      return transaction;
    }
    
    return null;
  }

  // Get transactions with filtering
  async getTransactions(userId, query = {}) {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      type, 
      status,
      startDate,
      endDate,
      month,
      year,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;
    
    const filter = { user: userId };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = moment(startDate).startOf('day').toDate();
      if (endDate) filter.createdAt.$lte = moment(endDate).endOf('day').toDate();
    }
    
    if (month && year) {
      const start = moment().year(parseInt(year)).month(parseInt(month) - 1).startOf('month').toDate();
      const end = moment().year(parseInt(year)).month(parseInt(month) - 1).endOf('month').toDate();
      filter.createdAt = { $gte: start, $lte: end };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);
    
    let monthlySummary = null;
    if (month && year) {
      monthlySummary = await this.getMonthlySummary(userId, parseInt(year), parseInt(month));
    }
    
    return {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      monthlySummary
    };
  }

  // Get monthly summary
  async getMonthlySummary(userId, year, month) {
    const start = moment().year(year).month(month - 1).startOf('month').toDate();
    const end = moment().year(year).month(month - 1).endOf('month').toDate();
    
    const transactions = await Transaction.find({
      user: userId,
      createdAt: { $gte: start, $lte: end }
    });
    
    const totalEarnings = transactions
      .filter(t => t.category === 'resource_sale' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawn = transactions
      .filter(t => t.category === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalPendingWithdrawals = transactions
      .filter(t => t.category === 'withdrawal' && ['pending', 'processing'].includes(t.status))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const resourcesSold = transactions.filter(
      t => t.category === 'resource_sale' && t.status === 'completed'
    ).length;
    
    return {
      month: parseInt(month),
      year: parseInt(year),
      monthName: moment().month(month - 1).format('MMMM'),
      totalEarnings,
      totalWithdrawn,
      totalPendingWithdrawals,
      resourcesSold,
      netEarnings: totalEarnings - totalWithdrawn,
      transactionCount: transactions.length
    };
  }

  // Export CSV
  async exportCSV(userId, query = {}) {
    const { transactions } = await this.getTransactions(userId, {
      ...query,
      limit: 10000
    });
    
    const headers = [
      'Date', 'Reference', 'Type', 'Category', 'Amount', 
      'Currency', 'Status', 'Description'
    ];
    
    const rows = transactions.map(t => [
      moment(t.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      t.reference,
      t.type,
      t.category,
      t.amount.toFixed(2),
      t.currency,
      t.status,
      `"${t.description.replace(/"/g, '""')}"`
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  // Export PDF
  async exportPDF(userId, query = {}) {
    const { transactions } = await this.getTransactions(userId, {
      ...query,
      limit: 10000
    });
    
    const user = await User.findById(userId).select('name email');
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      doc.fontSize(20).text('Transaction Statement', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`User: ${user.name}`);
      doc.text(`Email: ${user.email}`);
      doc.text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
      doc.text(`Total Transactions: ${transactions.length}`);
      doc.moveDown();
      
      doc.fontSize(10);
      const tableTop = doc.y;
      const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Status', 'Description'];
      
      headers.forEach((h, i) => doc.text(h, 50 + i * 80, tableTop));
      doc.moveDown();
      
      transactions.forEach(t => {
        if (doc.y > 700) doc.addPage();
        
        const row = [
          moment(t.createdAt).format('YYYY-MM-DD'),
          t.type,
          t.category,
          t.amount.toFixed(2),
          t.currency,
          t.status,
          t.description.substring(0, 25)
        ];
        
        row.forEach((cell, i) => doc.text(cell, 50 + i * 80, doc.y));
        doc.moveDown();
      });
      
      doc.end();
    });
  }
}

module.exports = new WalletService();