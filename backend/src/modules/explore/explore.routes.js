// src/modules/explore/explore.routes.js
const express = require('express');
const exploreController = require('./explore.controller');

const router = express.Router();

router.get('/', exploreController.getFeed);

module.exports = router;
