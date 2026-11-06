const mongoose = require('mongoose');
const User = require('../user/user.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const Hub = require('../hub/hub.model');
const Payment = require('../payment/payment.model');
const Interaction = require('../interaction/interaction.model');
const SearchQuery = require('../search/search.model');

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
      userFacet,
      totalResources,
      totalPathways,
      publicHubs,
      resourceSums,
      totalSaves,
      paymentsAgg,
      monthlyUserGrowth,
      revenueTrend,
      usersByIndustry
    ] = await Promise.all([
      User.aggregate([
        { $facet: {
          total: [ { $match: { isActive: { $ne: false } } }, { $count: 'c' } ],
          newToday: [ { $match: { createdAt: { $gte: todayStart } } }, { $count: 'c' } ],
          active: [ { $match: { lastLogin: { $gte: thirtyDaysAgo } } }, { $count: 'c' } ],
          loginsToday: [ { $match: { lastLogin: { $gte: todayStart } } }, { $count: 'c' } ]
        }}
      ]),
      Resource.countDocuments({ isDeleted: false }),
      Pathway.countDocuments({ isDeleted: false }),
      Hub.countDocuments({ status: 'public', isDeleted: false }),
      Resource.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: null, downloads: { $sum: '$downloadCount' }, siteVisits: { $sum: '$viewCount' } } }]),
      Interaction.countDocuments({ type: 'save' }),
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

    const totalUsers = userFacet[0]?.total?.[0]?.c || 0;
    const newToday = userFacet[0]?.newToday?.[0]?.c || 0;
    const activeUsers = userFacet[0]?.active?.[0]?.c || 0;
    const loginsToday = userFacet[0]?.loginsToday?.[0]?.c || 0;

    const downloads = resourceSums[0]?.downloads || 0;
    const siteVisits = resourceSums[0]?.siteVisits || 0;

    const gross = paymentsAgg[0] || { total: 0, count: 0 };
    const grossRevenue = gross.total || 0;
    const totalPurchases = gross.count || 0;

    const creatorRevenueAgg = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $lookup: { from: 'resources', localField: 'item', foreignField: '_id', as: 'resource' } },
      { $unwind: '$resource' },
      { $group: { _id: '$resource.owner', revenue: { $sum: '$amount' } } },
      { $group: { _id: null, avgRevenue: { $avg: '$revenue' } } }
    ]);
    const avgCreatorRevenue = creatorRevenueAgg[0]?.avgRevenue || 0;

    return {
      users: {
        totalUsers,
        new: newToday,
        active: activeUsers,
        loginsToday,
        siteVisits
      },
      marketplace: {
        totalPurchases,
        grossRevenue,
        avgCreatorRevenue: Math.round(avgCreatorRevenue * 100) / 100
      },
      content: {
        totalResources,
        totalPathways,
        publicHubs,
        downloads,
        totalSaves
      },
      charts: {
        monthlyUserGrowth: monthlyUserGrowth.map(m => ({ label: `${m._id.month}/${m._id.year}`, value: m.count })),
        revenueTrend: revenueTrend.map(r => ({ label: `${r._id.month}/${r._id.year}`, value: r.revenue })),
        usersByIndustry: usersByIndustry.map(u => ({ industry: u.industry, count: u.count }))
      }
    };
  }

  async getStats() {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      userFacet,
      totalResources,
      totalPathways,
      resourceSums
    ] = await Promise.all([
      User.aggregate([
        { $facet: {
          total: [ { $match: { isActive: { $ne: false } } }, { $count: 'c' } ],
          newToday: [ { $match: { createdAt: { $gte: todayStart } } }, { $count: 'c' } ],
          active: [ { $match: { lastLogin: { $gte: thirtyDaysAgo } } }, { $count: 'c' } ],
          loginsToday: [ { $match: { lastLogin: { $gte: todayStart } } }, { $count: 'c' } ]
        }}
      ]),
      Resource.countDocuments({ isDeleted: false }),
      Pathway.countDocuments({ isDeleted: false }),
      Resource.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: null, downloads: { $sum: '$downloadCount' }, siteVisits: { $sum: '$viewCount' } } }])
    ]);

    const totalUsers = userFacet[0]?.total?.[0]?.c || 0;
    const newToday = userFacet[0]?.newToday?.[0]?.c || 0;
    const activeUsers = userFacet[0]?.active?.[0]?.c || 0;
    const loginsToday = userFacet[0]?.loginsToday?.[0]?.c || 0;

    const downloads = resourceSums[0]?.downloads || 0;
    const siteVisits = resourceSums[0]?.siteVisits || 0;

    return {
      stats: {
        totalUsers,
        newToday,
        activeUsers,
        loginsToday,
        siteVisits,
        resources: totalResources,
        pathways: totalPathways,
        downloads
      }
    };
  }

  async getAnalytics() {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [
      activeCounts,
      dailyActiveLast30,
      usersByCountry,
      mostVisitedPages,
      interactionStats,
      topSearchQueries
    ] = await Promise.all([
      User.aggregate([
        { $facet: {
          daily: [ { $match: { lastLogin: { $gte: todayStart } } }, { $count: 'c' } ],
          weekly: [ { $match: { lastLogin: { $gte: sevenDaysAgo } } }, { $count: 'c' } ],
          monthly: [ { $match: { lastLogin: { $gte: thirtyDaysAgo } } }, { $count: 'c' } ]
        }}
      ]),
      User.aggregate([
        { $match: { lastLogin: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: { location: { $exists: true, $ne: '' } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Resource.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$_id', name: { $first: '$name' }, views: { $first: '$viewCount' } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, page: '$name', views: 1 } }
      ]),
      Interaction.aggregate([
        { $facet: {
          totalInteractions: [ { $count: 'c' } ],
          recClicks: [ { $match: { type: 'recommendation_click' } }, { $count: 'c' } ],
          returningUsers: [
            { $group: { _id: '$user', first: { $min: '$createdAt' }, last: { $max: '$createdAt' } } },
            { $match: { $expr: { $lt: [ '$first', { $subtract: [ '$last', 30 * 24 * 60 * 60 * 1000 ] } ] } } },
            { $count: 'c' }
          ]
        }}
      ]),
      SearchQuery.aggregate([
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, query: '$_id', count: 1 } }
      ])
    ]);

    const dailyActive = activeCounts[0]?.daily?.[0]?.c || 0;
    const weeklyActive = activeCounts[0]?.weekly?.[0]?.c || 0;
    const monthlyActive = activeCounts[0]?.monthly?.[0]?.c || 0;

    const totalUsers = await User.countDocuments({ isActive: { $ne: false } });
    const returningUsersCount = interactionStats[0]?.returningUsers?.[0]?.c || 0;
    const returningUsersPct = totalUsers ? Math.round((returningUsersCount / totalUsers) * 100 * 100) / 100 : 0;

    const totalInteractions = interactionStats[0]?.totalInteractions?.[0]?.c || 0;
    const recClicks = interactionStats[0]?.recClicks?.[0]?.c || 0;
    const recClickRate = totalInteractions ? Math.round((recClicks / totalInteractions) * 100 * 100) / 100 : 0;

    // Approx bounce rate as users with only 1 interaction in last 30 days
    const bounceAgg = await Interaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$user', cnt: { $sum: 1 } } },
      { $group: { _id: null, bounceUsers: { $sum: { $cond: [{ $eq: ['$cnt', 1] }, 1, 0] } }, totalUsers: { $sum: 1 } } }
    ]);
    const bounceRate = bounceAgg[0] ? Math.round((bounceAgg[0].bounceUsers / bounceAgg[0].totalUsers) * 100 * 100) / 100 : 0;

    // Sessions % change vs previous 30 days
    const sessionsCurrent = await Interaction.countDocuments({ createdAt: { $gte: thirtyDaysAgo, $lt: now } });
    const sessionsPrev = await Interaction.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const sessionsChange = sessionsPrev ? Math.round(((sessionsCurrent - sessionsPrev) / sessionsPrev) * 100 * 100) / 100 : 0;

    const avgSessionMin = 0; // No session duration tracking in current schema

    return {
      analytics: {
        dailyActiveUsers: dailyActive,
        weeklyActiveUsers: weeklyActive,
        monthlyActiveUsers: monthlyActive,
        avgSessionMin: avgSessionMin,
        bounceRate,
        sessionsChange,
        returningUsersPct,
        recClickRate
      },
      charts: {
        dailyActiveUsersLast30: dailyActiveLast30.map(d => ({ date: d._id, value: d.count })),
        topSearchQueries: topSearchQueries.map(q => ({ query: q.query, count: q.count })),
        usersByCountry: usersByCountry.map(u => ({ country: u._id, count: u.count })),
        mostVisitedPages: mostVisitedPages.map(p => ({ page: p.page, views: p.views }))
      }
    };
  }

  async getUsers(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = query.search?.trim();
    const status = query.status;
    const industry = query.industry;
    const location = query.location;
    const experience = query.experience;

    const match = {};
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      if (status === 'suspended') match.isActive = false;
      else if (status === 'active') match.isActive = true;
    }
    if (industry) match.industry = industry;
    if (location) match.location = { $regex: location, $options: 'i' };
    if (experience) match.professionalExperience = experience;

    const [stats, users, total] = await Promise.all([
      Promise.all([
        User.countDocuments({ isActive: { $ne: false } }),
        User.countDocuments({ role: 'contributor', isEmailVerified: true }),
        User.countDocuments({ role: 'contributor', isEmailVerified: false }),
        User.countDocuments({ isActive: false })
      ]),
      User.find(match)
        .select('name avatar email username location professionalExperience industry createdAt isActive isEmailVerified role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(match)
    ]);

    const [totalUsers, verifiedCreators, pendingVerification, suspended] = stats;

    const usersFormatted = users.map(u => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      username: u.username,
      location: u.location,
      experience: u.professionalExperience,
      industry: u.industry,
      joined: u.createdAt,
      status: u.isActive ? 'active' : 'suspended',
      creator: u.role === 'contributor' || u.role === 'admin' || u.role === 'superadmin',
      verified: u.isEmailVerified
    }));

    return {
      stats: {
        totalUsers,
        verifiedCreators,
        pendingVerification,
        suspended
      },
      users: usersFormatted,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserDetail(id) {
    const user = await User.findById(id)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpire -passwordChangedAt')
      .lean();
    if (!user) throw new Error('User not found');
    return user;
  }

  async suspendUser(id, isActive) {
    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('name email isActive');
    if (!user) throw new Error('User not found');
    return user;
  }
}

module.exports = new AdminService();
