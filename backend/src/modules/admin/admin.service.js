const mongoose = require('mongoose');
const User = require('../user/user.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const Hub = require('../hub/hub.model');
const Payment = require('../payment/payment.model');
const Interaction = require('../interaction/interaction.model');

class AdminService {
  startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    return d;
  }
  startOfMonth(date = new Date()) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  }

  async getDashboard() {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      newToday,
      activeUsers,
      loginsToday,
      totalResources,
      totalPathways,
      publicHubs,
      totalDownloads,
      totalSaves,
      totalPurchases,
      grossRevenueAgg,
      monthlyUserGrowth,
      revenueTrend,
      usersByIndustry
    ] = await Promise.all([
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ lastLogin: { $gte: todayStart } }),
      Resource.countDocuments({ isDeleted: false }),
      Pathway.countDocuments({ isDeleted: false }),
      Hub.countDocuments({ status: 'public', isDeleted: false }),
      Resource.aggregate([{ $group: { _id: null, total: { $sum: '$downloadCount' } } }]),
      Interaction.countDocuments({ type: 'save' }),
      Payment.countDocuments({ status: 'success' }),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      User.aggregate([
        { $match: { industry: { $exists: true, $ne: '' } } },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $project: { _id: 0, industry: '$_id', count: 1 } }
      ])
    ]);

    const totalDownloadsVal = totalDownloads[0]?.total || 0;
    const gross = grossRevenueAgg[0] || { total: 0, count: 0 };
    const grossRevenue = gross.total || 0;
    const totalPurchasesVal = gross.count || totalPurchases;

    // Site visits approximation: sum viewCount from resources
    const siteVisitsAgg = await Resource.aggregate([{ $group: { _id: null, total: { $sum: '$viewCount' } } }]);
    const siteVisits = siteVisitsAgg[0]?.total || 0;

    // Avg creator revenue
    const creatorRevenueAgg = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $lookup: {
          from: 'resources',
          localField: 'item',
          foreignField: '_id',
          as: 'resource'
        } },
      { $unwind: '$resource' },
      { $group: { _id: '$resource.owner', revenue: { $sum: '$amount' } } },
      { $group: { _id: null, avgRevenue: { $avg: '$revenue' } } }
    ]);
    const avgCreatorRevenue = creatorRevenueAgg[0]?.avgRevenue || 0;

    return {
      stats: {
        totalUsers,
        newToday,
        activeUsers,
        loginsToday,
        siteVisits,
        resources: totalResources,
        pathways: totalPathways,
        downloads: totalDownloadsVal
      },
      users: {
        totalUsers,
        new: newToday,
        active: activeUsers,
        loginsToday,
        siteVisits
      },
      marketplace: {
        totalPurchases: totalPurchasesVal,
        grossRevenue,
        avgCreatorRevenue: Math.round(avgCreatorRevenue * 100) / 100
      },
      content: {
        totalResources,
        totalPathways,
        publicHubs,
        downloads: totalDownloadsVal,
        totalSaves
      },
      charts: {
        monthlyUserGrowth: monthlyUserGrowth.map(m => ({
          label: `${m._id.month}/${m._id.year}`,
          value: m.count
        })),
        revenueTrend: revenueTrend.map(r => ({
          label: `${r._id.month}/${r._id.year}`,
          value: r.revenue
        })),
        usersByIndustry: usersByIndustry.map(u => ({
          industry: u.industry,
          count: u.count
        }))
      }
    };
  }
}

module.exports = new AdminService();
