// src/modules/explore/explore.controller.js
const exploreService = require('./explore.service');
const asyncHandler = require('../../utils/asyncHandler');

class ExploreController {
  getFeed = asyncHandler(async (req, res) => {
    const data = await exploreService.getFeed(req.query);
    res.status(200).json({ success: true, data });
  });
}

module.exports = new ExploreController();
