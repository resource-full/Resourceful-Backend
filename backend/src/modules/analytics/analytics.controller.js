const asyncHandler = require('../../utils/asyncHandler');
const analyticsService = require('./analytics.service');

class AnalyticsController {
  getStats = asyncHandler(async (req, res) => {
    const { period } = req.query;
    const stats = await analyticsService.getStats(req.user._id, period);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  getOverallPerformance = asyncHandler(async (req, res) => {
    const { period } = req.query;
    const performance = await analyticsService.getOverallPerformance(req.user._id, period);

    res.status(200).json({
      success: true,
      data: performance,
    });
  });

  getProductPerformance = asyncHandler(async (req, res) => {
    const { search, sortBy, order, page, limit } = req.query;
    const query = { search, sortBy, order, page, limit };
    const result = await analyticsService.getProductPerformance(req.user._id, query);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  exportPDF = asyncHandler(async (req, res) => {
    const { period } = req.query;
    const doc = await analyticsService.exportPDF(req.user._id, period);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${period}.pdf`);

    doc.pipe(res);
    doc.end();
  });

  exportPNG = asyncHandler(async (req, res) => {
    const { period } = req.query;
    const imageBuffer = await analyticsService.exportPNG(req.user._id, period);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-chart-${period}.png`);

    res.send(imageBuffer);
  });
}

module.exports = new AnalyticsController();