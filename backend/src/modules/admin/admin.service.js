const mongoose = require('mongoose');
const User = require('../user/user.model');
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const Hub = require('../hub/hub.model');
const Payment = require('../payment/payment.model');
const Interaction = require('../interaction/interaction.model');
const SearchQuery = require('../search/search.model');
const Payout = require('../payout/payout.model');

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

  async getResourcesAdmin(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const status = query.status;
    const industry = query.industry;
    const location = query.location;
    const search = query.search?.trim();

    const match = { isDeleted: false };
    if (status) match.status = status;
    if (industry) match.industry = industry;
    if (location) match.applicableLocation = { $regex: location, $options: 'i' };
    if (search) match.name = { $regex: search, $options: 'i' };

    const [stats, charts, resourcesData] = await Promise.all([
      Promise.all([
        Resource.countDocuments({ isDeleted: false }),
        Resource.countDocuments({ isDeleted: false, status: 'public' }),
        Resource.countDocuments({ isDeleted: false, status: 'draft' }),
        Resource.countDocuments({ isDeleted: false, status: { $ne: 'public' } })
      ]),
      Promise.all([
        User.aggregate([
          { $match: { location: { $exists: true, $ne: '' } } },
          { $group: { _id: '$location', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Resource.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$isFree', count: { $sum: 1 } } }
        ]),
        Resource.aggregate([
          { $match: { isDeleted: false } },
          { $sort: { viewCount: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, name: 1, views: '$viewCount', downloads: '$downloadCount' } }
        ])
      ]),
      (async () => {
        const pipeline = [
          { $match: match },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'creator',
              pipeline: [{ $project: { name: 1, avatar: 1 } }]
            }
          },
          { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'interactions',
              let: { resId: '$_id' },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$resource', '$$resId'] }, { $eq: ['$type', 'save'] }] } } },
                { $count: 'cnt' }
              ],
              as: 'savesAgg'
            }
          },
          {
            $addFields: {
              saves: { $ifNull: [{ $arrayElemAt: ['$savesAgg.cnt', 0] }, 0] }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              industry: 1,
              price: 1,
              isFree: 1,
              status: 1,
              confidenceScore: 1,
              downloadCount: 1,
              viewCount: 1,
              saves: 1,
              creatorName: '$creator.name',
              creatorAvatar: '$creator.avatar'
            }
          }
        ];
        const [items, total] = await Promise.all([
          Resource.aggregate(pipeline),
          Resource.countDocuments(match)
        ]);
        return { items, total };
      })()
    ]);

    const [totalResources, verified, pendingReview, flagged] = stats;
    const [usersByCountry, freeVsPaidRaw, topPerforming] = charts;
    const { items, total } = resourcesData;

    const freeVsPaid = [
      { label: 'Free', count: freeVsPaidRaw.find(d => d._id === true)?.count || 0 },
      { label: 'Paid', count: freeVsPaidRaw.find(d => d._id === false)?.count || 0 }
    ];

    const resourcesFormatted = items.map(r => ({
      _id: r._id,
      name: r.name,
      creator: { name: r.creatorName, avatar: r.creatorAvatar },
      category: r.industry,
      price: r.isFree ? 'Free' : `${r.price} ${r.currency || ''}`.trim(),
      status: r.status,
      confidence: r.confidenceScore,
      downloads: r.downloadCount,
      saves: r.saves,
      views: r.viewCount
    }));

    return {
      stats: {
        totalResources,
        verified,
        pendingReview,
        flagged
      },
      charts: {
        usersByCountry: usersByCountry.map(u => ({ country: u._id, count: u.count })),
        freeVsPaid,
        topPerformingResources: topPerforming.map(r => ({ name: r.name, views: r.views, downloads: r.downloads }))
      },
      resources: resourcesFormatted,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getResourceDetail(id) {
    const resource = await Resource.findOne({ _id: id, isDeleted: false }).populate('owner', 'name avatar email');
    if (!resource) throw new Error('Resource not found');
    return resource;
  }

  async flagResource(id, isFlagged) {
    if (typeof isFlagged !== 'boolean') {
      throw new Error('isFlagged boolean required');
    }
    const resource = await Resource.findByIdAndUpdate(id, { isFlagged }, { new: true });
    if (!resource) throw new Error('Resource not found');
    return resource;
  }

  async getPathwaysAdmin(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const status = query.status;
    const industry = query.industry;
    const location = query.location;
    const search = query.search?.trim();

    const match = { isDeleted: false };
    if (status) match.status = status;
    if (industry) match.industry = industry;
    if (location) match.applicableLocation = { $regex: location, $options: 'i' };
    if (search) match.name = { $regex: search, $options: 'i' };

    const [stats, tableData] = await Promise.all([
      Promise.all([
        Pathway.countDocuments({ isDeleted: false }),
        Interaction.countDocuments({ type: 'complete' })
      ]),
      (async () => {
        const pipeline = [
          { $match: match },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'author',
              foreignField: '_id',
              as: 'creator',
              pipeline: [{ $project: { name: 1, avatar: 1 } }]
            }
          },
          { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'interactions',
              let: { pwId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$resource', '$$pwId'] } } },
                { $count: 'cnt' }
              ],
              as: 'savesAgg'
            }
          },
          {
            $addFields: {
              saves: { $ifNull: [{ $arrayElemAt: ['$savesAgg.cnt', 0] }, 0] },
              resourcesCount: { $size: { $ifNull: ['$blocks', []] } }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              industry: 1,
              status: 1,
              applicableLocation: 1,
              viewCount: 1,
              saves: 1,
              resourcesCount: 1,
              creatorName: '$creator.name',
              creatorAvatar: '$creator.avatar'
            }
          }
        ];
        const [items, total] = await Promise.all([
          Pathway.aggregate(pipeline),
          Pathway.countDocuments(match)
        ]);
        return { items, total };
      })()
    ]);

    const [totalPathways, completions] = stats;
    const { items, total } = tableData;

    const pathwaysFormatted = items.map(p => ({
      _id: p._id,
      name: p.name,
      creator: { name: p.creatorName, avatar: p.creatorAvatar },
      industry: p.industry,
      resources: p.resourcesCount,
      completion: 0,
      saves: p.saves,
      views: p.viewCount,
      status: p.status
    }));

    return {
      stats: {
        totalPathways,
        completions
      },
      pathways: pathwaysFormatted,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPathwayDetail(id) {
    const pathway = await Pathway.findOne({ _id: id, isDeleted: false }).populate('author', 'name avatar email');
    if (!pathway) throw new Error('Pathway not found');
    return pathway;
  }

  async flagPathway(id, isFlagged) {
    if (typeof isFlagged !== 'boolean') {
      throw new Error('isFlagged boolean required');
    }
    const pathway = await Pathway.findByIdAndUpdate(id, { isFlagged }, { new: true });
    if (!pathway) throw new Error('Pathway not found');
    return pathway;
  }

  async deletePathway(id) {
    const pathway = await Pathway.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!pathway) throw new Error('Pathway not found');
    return { message: 'Pathway deleted' };
  }

  async deleteResource(id) {
    const resource = await Resource.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!resource) throw new Error('Resource not found');
    return { message: 'Resource deleted' };
  }

  async getHubsAdmin(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const status = query.status;
    const industry = query.industry;
    const location = query.location;
    const search = query.search?.trim();

    const match = { isDeleted: false };
    if (status) match.status = status;
    if (industry) match.industry = industry;
    if (location) match.applicableLocation = { $regex: location, $options: 'i' };
    if (search) match.name = { $regex: search, $options: 'i' };

    const [stats, hubsData] = await Promise.all([
      Promise.all([
        Hub.countDocuments({ isDeleted: false }),
        Hub.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: null, total: { $sum: '$viewCount' } } }])
      ]),
      (async () => {
        const pipeline = [
          { $match: match },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'creator',
              pipeline: [{ $project: { name: 1, avatar: 1 } }]
            }
          },
          { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              resourcesCount: { $size: { $ifNull: ['$resources', []] } },
              pathwaysCount: { $size: { $ifNull: ['$pathways', []] } }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              industry: 1,
              applicableLocation: 1,
              status: 1,
              viewCount: 1,
              resourcesCount: 1,
              pathwaysCount: 1,
              creatorName: '$creator.name',
              creatorAvatar: '$creator.avatar'
            }
          }
        ];
        const [items, total] = await Promise.all([
          Hub.aggregate(pipeline),
          Hub.countDocuments(match)
        ]);
        return { items, total };
      })()
    ]);

    const [totalHubs, viewAgg] = stats;
    const totalHubVisit = viewAgg[0]?.total || 0;
    const { items, total } = hubsData;

    const hubsFormatted = items.map(h => ({
      _id: h._id,
      name: h.name,
      creator: { name: h.creatorName, avatar: h.creatorAvatar },
      industry: h.industry,
      location: h.applicableLocation,
      status: h.status,
      views: h.viewCount,
      resources: h.resourcesCount,
      pathways: h.pathwaysCount
    }));

    return {
      stats: {
        totalHubs,
        totalHubVisit
      },
      hubs: hubsFormatted,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getHubDetail(id) {
    const hub = await Hub.findOne({ _id: id, isDeleted: false }).populate('owner', 'name avatar email');
    if (!hub) throw new Error('Hub not found');
    return hub;
  }

  async flagHub(id, isFlagged) {
    if (typeof isFlagged !== 'boolean') {
      throw new Error('isFlagged boolean required');
    }
    const hub = await Hub.findByIdAndUpdate(id, { isFlagged }, { new: true });
    if (!hub) throw new Error('Hub not found');
    return hub;
  }

  async deleteHub(id) {
    const hub = await Hub.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!hub) throw new Error('Hub not found');
    return { message: 'Hub deleted' };
  }

  async getMarketplaceAdmin(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const status = query.status;
    const industry = query.industry;
    const location = query.location;
    const search = query.search?.trim();
    const tab = query.tab || 'purchases';

    // Stats
    const [grossRevenueAgg, netRevenueAgg, creatorEarningsAgg, pendingPayouts, completedPayouts, totalPurchases] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: { $multiply: ['$amount', 0.9] } } } }]),
      Payout.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$creatorNet' } } }]),
      Payout.countDocuments({ status: 'pending' }),
      Payout.countDocuments({ status: 'completed' }),
      Payment.countDocuments({ status: 'success' })
    ]);

    const grossRevenue = grossRevenueAgg[0]?.total || 0;
    const netRevenue = netRevenueAgg[0]?.total || 0;
    const creatorEarnings = creatorEarningsAgg[0]?.total || 0;

    // Purchases table
    const purchasesMatch = { status: status || 'success' };
    // We will filter by industry/location via lookup later, keep simple

    const purchasesPipeline = [
      { $match: { status: status || 'success' } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'buyer', pipeline: [{ $project: { name: 1, email: 1 } }] } },
      { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'resources',
          let: { itemId: '$item', itemType: '$itemType' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$itemId'] }, { $eq: ['$isDeleted', false] }] } } },
            { $project: { name: 1, industry: 1, applicableLocation: 1, owner: 1 } }
          ],
          as: 'itemResource'
        }
      },
      {
        $lookup: {
          from: 'pathways',
          let: { itemId: '$item', itemType: '$itemType' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$itemId'] }, { $eq: ['$isDeleted', false] }] } } },
            { $project: { name: 1, industry: 1, applicableLocation: 1, author: 1 } }
          ],
          as: 'itemPathway'
        }
      },
      {
        $addFields: {
          itemName: { $ifNull: [{ $arrayElemAt: ['$itemResource.name', 0] }, { $arrayElemAt: ['$itemPathway.name', 0] }] },
          industry: { $ifNull: [{ $arrayElemAt: ['$itemResource.industry', 0] }, { $arrayElemAt: ['$itemPathway.industry', 0] }] },
          applicableLocation: { $ifNull: [{ $arrayElemAt: ['$itemResource.applicableLocation', 0] }, { $arrayElemAt: ['$itemPathway.applicableLocation', 0] }] },
          creatorId: { $ifNull: [{ $arrayElemAt: ['$itemResource.owner', 0] }, { $arrayElemAt: ['$itemPathway.author', 0] }] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: '_id',
          as: 'creator',
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      { $addFields: { fee: { $multiply: ['$amount', 0.1] }, creatorNet: { $multiply: ['$amount', 0.9] } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const purchases = await Payment.aggregate(purchasesPipeline);

    return {
      stats: {
        grossRevenue,
        netRevenue,
        creatorEarnings,
        pendingPayouts,
        completedPayouts,
        totalPurchases
      },
      purchases: purchases.map(p => ({
        buyer: p.buyer?.name || '',
        resource: p.itemName || '',
        creator: p.creator?.name || '',
        amount: p.amount,
        fee: p.fee,
        creatorNet: p.creatorNet,
        date: p.createdAt,
        completion: p.status
      })),
      payoutRequests: [],
      creatorEarningsTable: []
    };
  }
}

module.exports = new AdminService();
