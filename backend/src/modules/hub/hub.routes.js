const express = require('express');
const hubController = require('./hub.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// User hubs MUST be first
router.get('/my', protect, hubController.getMyHubs);

// Public routes
router.get('/', hubController.getHubs);
router.get('/filters', hubController.getHubFilters);
router.get('/:id', hubController.getHubById);

// Protected routes
router.use(protect);

router.post('/', hubController.createHub);
router.put('/:id', hubController.updateHub);
router.delete('/:id', hubController.deleteHub);
router.patch('/:id/status', hubController.changeHubStatus);
router.post('/:id/resources/:resourceId', hubController.addResourceToHub);
router.delete('/:id/resources/:resourceId', hubController.removeResourceFromHub);
router.post('/:id/pathways/:pathwayId', hubController.addPathwayToHub);
router.delete('/:id/pathways/:pathwayId', hubController.removePathwayFromHub);

module.exports = router;