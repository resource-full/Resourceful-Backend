const walletService = require('./wallet.service');
const asyncHandler = require('../../utils/asyncHandler');

class WalletController {
  // GET /api/v1/wallet
  getWallet = asyncHandler(async (req, res) => {
    const wallet = await walletService.getWallet(req.user._id);
    
    res.status(200).json({
      success: true,
      data: wallet
    });
  });

  // GET /api/v1/wallet/accounts
  getAccounts = asyncHandler(async (req, res) => {
    const accounts = await walletService.getWithdrawalAccounts(req.user._id);
    
    res.status(200).json({
      success: true,
      data: { accounts }
    });
  });

  // POST /api/v1/wallet/accounts
  addAccount = asyncHandler(async (req, res) => {
    const wallet = await walletService.addWithdrawalAccount(req.user._id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Withdrawal account added successfully',
      data: { accounts: wallet.withdrawalAccounts }
    });
  });

  // DELETE /api/v1/wallet/accounts/:accountId
  removeAccount = asyncHandler(async (req, res) => {
    const wallet = await walletService.removeWithdrawalAccount(req.user._id, req.params.accountId);
    
    res.status(200).json({
      success: true,
      message: 'Withdrawal account removed successfully',
      data: { accounts: wallet.withdrawalAccounts }
    });
  });

  // PUT /api/v1/wallet/accounts/:accountId/default
  setDefaultAccount = asyncHandler(async (req, res) => {
    const wallet = await walletService.setDefaultAccount(req.user._id, req.params.accountId);
    
    res.status(200).json({
      success: true,
      message: 'Default account updated',
      data: { accounts: wallet.withdrawalAccounts }
    });
  });

  // POST /api/v1/wallet/withdraw
  requestWithdrawal = asyncHandler(async (req, res) => {
    const { amount, accountId } = req.body;
    const result = await walletService.requestWithdrawal(req.user._id, amount, accountId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });

  // GET /api/v1/wallet/transactions
  getTransactions = asyncHandler(async (req, res) => {
    const result = await walletService.getTransactions(req.user._id, req.query);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });

  // GET /api/v1/wallet/transactions/summary/:year/:month
  getMonthlySummary = asyncHandler(async (req, res) => {
    const { year, month } = req.params;
    const summary = await walletService.getMonthlySummary(
      req.user._id, 
      parseInt(year), 
      parseInt(month)
    );
    
    res.status(200).json({
      success: true,
      data: summary
    });
  });

  // GET /api/v1/wallet/transactions/export/csv
  exportCSV = asyncHandler(async (req, res) => {
    const csv = await walletService.exportCSV(req.user._id, req.query);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
    res.send(csv);
  });

  // GET /api/v1/wallet/transactions/export/pdf
  exportPDF = asyncHandler(async (req, res) => {
    const pdf = await walletService.exportPDF(req.user._id, req.query);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=statement-${Date.now()}.pdf`);
    res.send(pdf);
  });
}

module.exports = new WalletController();