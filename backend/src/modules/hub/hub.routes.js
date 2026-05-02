const express = require('express');
const hubController = require('./hub.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/', hubController.createHub);
router.get('/', hubController.getHubs);
router.get('/my', hubController.getMyHubs);
router.get('/:id', hubController.getHubById);
router.put('/:id', hubController.updateHub);
router.delete('/:id', hubController.deleteHub);
router.patch('/:id/status', hubController.changeHubStatus);
router.post('/:id/resources/:resourceId', hubController.addResourceToHub);
router.delete('/:id/resources/:resourceId', hubController.removeResourceFromHub);
router.post('/:id/pathways/:pathwayId', hubController.addPathwayToHub);
router.delete('/:id/pathways/:pathwayId', hubController.removePathwayFromHub);

module.exports = router;