// src/modules/explore/explore.service.js
const Resource = require('../resource/resource.model');
const Pathway = require('../pathway/pathway.model');
const Hub = require('../hub/hub.model');

class ExploreService {
  buildFilter(query) {
    const { country, industry, experience, isFree, search } = query;
    const filter = { status: 'public', isDeleted: false };

    if (country) filter.applicableLocation = country;
    if (industry) filter.industry = industry;
    if (experience) filter.experience = experience;
    if (isFree !== undefined) filter.isFree = isFree === 'true';
    if (search) filter.$text = { $search: search };

    return filter;
  }

  async getFeed(query = {}) {
    const limit = Math.min(parseInt(query.limit) || 50, 100);
    const cursor = query.cursor ? new Date(query.cursor) : null;
    const filter = this.buildFilter(query);
    if (cursor) filter.createdAt = { $lt: cursor };

    const resourceSelect = 'name description coverPhoto industry experience applicableLocation isFree price currency peerRatings confidenceScore createdAt';
    const pathwaySelect = 'name description industry experience applicableLocation isFree price currency rating ratingCount viewCount author createdAt';
    const hubSelect = 'name description industry experience applicableLocation owner createdAt';

    const [resources, pathways, hubs] = await Promise.all([
      Resource.find(filter).select(resourceSelect).sort({ createdAt: -1 }).limit(limit),
      Pathway.find(filter).select(pathwaySelect).populate('author', 'name avatar').sort({ createdAt: -1 }).limit(limit),
      Hub.find(filter).select(hubSelect).populate('owner', 'name avatar').sort({ createdAt: -1 }).limit(limit)
    ]);

    const data = {
      resources,
      pathways,
      hubs
    };

    if (!cursor) {
      data.filters = await this.getFilterOptions(query);
    }

    const timestamps = [
      ...resources.map(r => r.createdAt),
      ...pathways.map(p => p.createdAt),
      ...hubs.map(h => h.createdAt)
    ].filter(Boolean);

    data.nextCursor = timestamps.length > 0
      ? new Date(Math.min(...timestamps.map(t => t.getTime()))).toISOString()
      : null;

    return data;
  }

  async getFilterOptions(query) {
    const { country, industry, experience, isFree } = query;
    const scope = { status: 'public', isDeleted: false };

    if (country) scope.applicableLocation = country;
    if (industry) scope.industry = industry;
    if (experience) scope.experience = experience;
    if (isFree !== undefined) scope.isFree = isFree === 'true';

    const dimension = (model, field) => model.aggregate([
      { $match: scope },
      { $match: { [field]: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $project: { _id: 0, value: '$_id', count: 1 } }
    ]);

    const pricing = (model) => model.aggregate([
      { $match: scope },
      { $group: { _id: '$isFree', count: { $sum: 1 } } },
      { $project: { _id: 0, value: { $cond: [{ $eq: ['$_id', true] }, 'Free', 'Paid'] }, count: 1 } }
    ]);

    const [countries, industries, experiences, prices] = await Promise.all([
      Promise.all([
        dimension(Resource, 'applicableLocation'),
        dimension(Pathway, 'applicableLocation'),
        dimension(Hub, 'applicableLocation')
      ]),
      Promise.all([
        dimension(Resource, 'industry'),
        dimension(Pathway, 'industry'),
        dimension(Hub, 'industry')
      ]),
      Promise.all([
        dimension(Resource, 'experience'),
        dimension(Pathway, 'experience'),
        dimension(Hub, 'experience')
      ]),
      Promise.all([
        pricing(Resource),
        pricing(Pathway)
      ])
    ]);

    const merge = (results) => {
      const map = {};
      results.flat().forEach(r => {
        map[r.value] = (map[r.value] || 0) + r.count;
      });
      return Object.entries(map)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));
    };

    return {
      countries: merge(countries),
      industries: merge(industries),
      experiences: merge(experiences),
      pricing: merge(prices)
    };
  }
}

module.exports = new ExploreService();
