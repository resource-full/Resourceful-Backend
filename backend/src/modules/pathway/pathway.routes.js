const express = require('express');
const pathwayController = require('./pathway.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', pathwayController.getPathways);
router.get('/:id', pathwayController.getPathwayById);

// Protected routes
router.use(protect);

// CRUD
router.post('/', pathwayController.createPathway);
router.put('/:id', pathwayController.updatePathway);
router.delete('/:id', pathwayController.deletePathway);

// Status
router.patch('/:id/status', pathwayController.changePathwayStatus);

// Blocks management
router.post('/:id/blocks', pathwayController.addBlock);
router.delete('/:id/blocks/:blockId', pathwayController.removeBlock);
router.put('/:id/blocks/reorder', pathwayController.reorderBlocks);

// User pathways
router.get('/user/my', pathwayController.getUserPathways);

module.exports = router;