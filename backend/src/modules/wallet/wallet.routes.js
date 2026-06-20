const express = require('express');
const { protect, authorize } = require('../../middleware/auth.middleware');
const walletController = require('./wallet.controller');
const walletAdminController = require('./wallet.admin.controller');

const router = express.Router();

// Protected user routes
router.use(protect);

// Wallet overview
router.get('/', walletController.getWallet);

// Withdrawal accounts CRUD
router.get('/accounts', walletController.getAccounts);
router.post('/accounts', walletController.addAccount);
router.delete('/accounts/:accountId', walletController.removeAccount);
router.put('/accounts/:accountId/default', walletController.setDefaultAccount);

// Withdrawal
router.post('/withdraw', walletController.requestWithdrawal);

// Transactions
router.get('/transactions', walletController.getTransactions);
router.get('/transactions/summary/:year/:month', walletController.getMonthlySummary);
router.get('/transactions/export/csv', walletController.exportCSV);
router.get('/transactions/export/pdf', walletController.exportPDF);

module.exports = router;