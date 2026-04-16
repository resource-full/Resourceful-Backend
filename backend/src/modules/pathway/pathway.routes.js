const express = require('express');
const pathwayController = require('./pathway.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', pathwayController.getPathways);
router.get('/:id', pathwayController.getPathwayById);

// Protected routes
router.use(protect);
router.post('/', pathwayController.createPathway);
router.get('/user/my', pathwayController.getUserPathways);
router.put('/:id', pathwayController.updatePathway);
router.delete('/:id', pathwayController.deletePathway);

module.exports = router;