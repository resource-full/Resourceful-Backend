const mongoose = require('mongoose');
const Payment = require('../payment/payment.model');
const Resource = require('../resource/resource.model');
const Interaction = require('../interaction/interaction.model');
const User = require('../user/user.model');
const ApiError = require('../../utils/apiError');

function getTimeRange(period) {
  const now = new Date();
  switch (period) {
    case '7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function generateMonthLabels(startDate, endDate) {
  const labels = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (current <= endDate) {
    labels.push(current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    current.setMonth(current.getMonth() + 1);
  }
  return labels;
}

function generateDayLabels(startDate, endDate) {
  const labels = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    labels.push(current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    current.setDate(current.getDate() + 1);
  }
  return labels;
}

function mapResultsToLabels(results, labels, field, period) {
  const dataMap = {};
  results.forEach(r => {
    if (period === '7days') {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`;
      dataMap[key] = r[field];
    } else {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
      dataMap[key] = r[field];
    }
  });

  return labels.map(label => {
    const d = new Date(label);
    let key;
    if (period === '7days') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return dataMap[key] || 0;
  });
}

class AnalyticsService {
  async getStats(userId, period = '30days') {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const startTime = getTimeRange(period);
    const userResourceIds = await Resource.find({ owner: userId }).distinct('_id');

    const [earnings, downloads, saves, confidence] = await Promise.all([
      this._getEarnings(userResourceIds, startTime),
      this._getDownloads(userResourceIds, startTime),
      this._getSaves(userResourceIds, startTime),
      this._getAvgConfidence(userResourceIds, startTime),
    ]);

    return {
      earnings,
      downloads,
      saves,
      confidence,
      period,
    };
  }

  async _getEarnings(resourceIds, startTime) {
    const match = {
      item: { $in: resourceIds.map(id => new mongoose.Types.ObjectId(id)) },
      itemType: 'Resource',
      status: 'success',
    };
    if (startTime) {
      match.createdAt = { $gte: startTime };
    }

    const result = await Payment.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async _getDownloads(resourceIds, startTime) {
    if (startTime) {
      const resources = await Resource.find({
        _id: { $in: resourceIds.map(id => new mongoose.Types.ObjectId(id)) },
        createdAt: { $gte: startTime },
      });
      return resources.reduce((sum, r) => sum + (r.downloadCount || 0), 0);
    }

    const result = await Resource.aggregate([
      { $match: { _id: { $in: resourceIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async _getSaves(resourceIds, startTime) {
    const match = {
      resource: { $in: resourceIds.map(id => new mongoose.Types.ObjectId(id)) },
      type: 'save',
    };
    if (startTime) {
      match.createdAt = { $gte: startTime };
    }

    return Interaction.countDocuments(match);
  }

  async _getAvgConfidence(resourceIds, startTime) {
    const match = {
      _id: { $in: resourceIds.map(id => new mongoose.Types.ObjectId(id)) },
    };
    if (startTime) {
      match.createdAt = { $gte: startTime };
    }

    const result = await Resource.aggregate([
      { $match: match },
      { $group: { _id: null, avg: { $avg: '$confidenceScore' } } },
    ]);

    return result.length > 0 ? Math.round(result[0].avg * 100) / 100 : 0;
  }

  async getOverallPerformance(userId, period = '30days') {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const startTime = getTimeRange(period);
    const userResourceIds = await Resource.find({ owner: userId }).distinct('_id');

    if (userResourceIds.length === 0) {
      return { labels: [], earnings: [], downloads: [], saves: [] };
    }

    const objectIds = userResourceIds.map(id => new mongoose.Types.ObjectId(id));
    const now = new Date();

    let labels;
    switch (period) {
      case '7days':
        labels = generateDayLabels(startTime, now);
        break;
      case '30days':
      case '90days':
      case 'all':
      default:
        labels = generateMonthLabels(startTime, now);
        break;
    }

    const [earningsByPeriod, downloadsByPeriod, savesByPeriod] = await Promise.all([
      this._aggregateByPeriod(objectIds, startTime, period, 'earnings'),
      this._aggregateByPeriod(objectIds, startTime, period, 'downloads'),
      this._aggregateByPeriod(objectIds, startTime, period, 'saves'),
    ]);

    return {
      labels,
      earnings: mapResultsToLabels(earningsByPeriod, labels, 'total', period),
      downloads: mapResultsToLabels(downloadsByPeriod, labels, 'total', period),
      saves: mapResultsToLabels(savesByPeriod, labels, 'total', period),
    };
  }

  async _aggregateByPeriod(resourceIds, startTime, period, metric) {
    const endDate = new Date();
    const groupFields = period === '7days'
      ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
      : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

    if (metric === 'earnings') {
      const match = {
        item: { $in: resourceIds },
        itemType: 'Resource',
        status: 'success',
      };
      if (startTime) {
        match.createdAt = { $gte: startTime };
      }
      return Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: groupFields,
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);
    }

    if (metric === 'downloads') {
      const match = { _id: { $in: resourceIds } };
      if (startTime) {
        match.createdAt = { $gte: startTime };
      }
      return Resource.aggregate([
        { $match: match },
        {
          $group: {
            _id: groupFields,
            total: { $sum: '$downloadCount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);
    }

    if (metric === 'saves') {
      const match = {
        resource: { $in: resourceIds },
        type: 'save',
      };
      if (startTime) {
        match.createdAt = { $gte: startTime };
      }
      return Interaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: groupFields,
            total: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);
    }

    return [];
  }

  async getProductPerformance(userId, query = {}) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const { search, sortBy = 'downloads', order = 'desc', page = 1, limit = 20 } = query;

    const userResourceIds = await Resource.find({ owner: userId }).distinct('_id');
    if (userResourceIds.length === 0) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }

    const objectIds = userResourceIds.map(id => new mongoose.Types.ObjectId(id));

    const match = { _id: { $in: objectIds } };
    if (search) {
      match.title = { $regex: search, $options: 'i' };
    }

    const sort = {};
    switch (sortBy) {
      case 'downloads':
        sort.downloadCount = order === 'desc' ? -1 : 1;
        break;
      case 'earnings':
        sort._id = 1;
        break;
      default:
        sort.downloadCount = order === 'desc' ? -1 : 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [resources, total] = await Promise.all([
      Resource.find(match)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('title category downloadCount viewCount confidenceScore isFree price currency'),
      Resource.countDocuments(match),
    ]);

    const resourceIds = resources.map(r => r._id);

    const [earningsMap, savesMap] = await Promise.all([
      this._getEarningsByResource(resourceIds),
      this._getSavesByResource(resourceIds),
    ]);

    const data = resources.map(r => ({
      type: 'Resource',
      name: r.title,
      category: r.category,
      earnings: earningsMap.get(r._id.toString()) || 0,
      downloads: r.downloadCount || 0,
      saves: savesMap.get(r._id.toString()) || 0,
      views: r.viewCount || 0,
      confidence: r.confidenceScore || 0,
    }));

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async _getEarningsByResource(resourceIds) {
    const results = await Payment.aggregate([
      {
        $match: {
          item: { $in: resourceIds },
          itemType: 'Resource',
          status: 'success',
        },
      },
      {
        $group: {
          _id: '$item',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const map = new Map();
    results.forEach(r => {
      map.set(r._id.toString(), r.total);
    });
    return map;
  }

  async _getSavesByResource(resourceIds) {
    const results = await Interaction.aggregate([
      {
        $match: {
          resource: { $in: resourceIds },
          type: 'save',
        },
      },
      {
        $group: {
          _id: '$resource',
          total: { $sum: 1 },
        },
      },
    ]);

    const map = new Map();
    results.forEach(r => {
      map.set(r._id.toString(), r.total);
    });
    return map;
  }

  async exportPDF(userId, period = '30days') {
    const stats = await this.getStats(userId, period);
    const performance = await this.getOverallPerformance(userId, period);
    const products = await this.getProductPerformance(userId, {});

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    doc.fontSize(20).text('Analytics Report', { align: 'center' });
    doc.fontSize(12).text(`Period: ${period}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Stats Overview', { bold: true });
    doc.moveDown();

    doc.fontSize(10).text(`Earnings: $${stats.earnings.toFixed(2)}`, { left: 50 });
    doc.text(`Downloads: ${stats.downloads}`, { left: 50 });
    doc.text(`Saves: ${stats.saves}`, { left: 50 });
    doc.text(`Avg. Confidence: ${stats.confidence.toFixed(2)}`, { left: 50 });

    doc.moveDown();
    doc.fontSize(14).text('Overall Performance', { bold: true });
    doc.moveDown();

    doc.fontSize(10).text('Monthly breakdown:', { left: 50 });
    performance.labels.forEach((label, i) => {
      doc.text(`${label}: Earnings=$${(performance.earnings[i] || 0).toFixed(2)}, Downloads=${performance.downloads[i] || 0}, Saves=${performance.saves[i] || 0}`, { left: 70 });
    });

    doc.moveDown();
    doc.fontSize(14).text('Product Performance', { bold: true });
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Type | Name | Earnings | Downloads | Saves | Views | Confidence', { left: 50 });

    doc.font('Helvetica').fontSize(8);
    products.data.forEach(product => {
      const row = `${product.type} | ${product.name} | $${product.earnings.toFixed(2)} | ${product.downloads} | ${product.saves} | ${product.views} | ${product.confidence.toFixed(2)}`;
      doc.text(row, { left: 50 });
    });

    return doc;
  }

  async exportPNG(userId, period = '30days') {
    const performance = await this.getOverallPerformance(userId, period);

    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

    const width = 800;
    const height = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    const configuration = {
      type: 'line',
      data: {
        labels: performance.labels,
        datasets: [
          {
            label: 'Earnings ($)',
            data: performance.earnings,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Downloads',
            data: performance.downloads,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.3,
            yAxisID: 'y1',
          },
          {
            label: 'Saves',
            data: performance.saves,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: `Overall Performance (${period})`,
          },
          legend: {
            position: 'top',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Earnings ($)',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Downloads / Saves',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return imageBuffer;
  }
}

module.exports = new AnalyticsService();