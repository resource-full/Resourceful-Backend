const express = require('express');
const { handlePaystackWebhook } = require('./webhook.controller');

const router = express.Router();

router.post('/', handlePaystackWebhook);

module.exports = router;