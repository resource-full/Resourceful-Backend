const express = require('express');
const pathwayController = require('./pathway.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// MUST be first - before any /:id routes
router.get('/user/my', protect, pathwayController.getUserPathways);

// Public routes
router.get('/', pathwayController.getPathways);
router.get('/:id', pathwayController.getPathwayById);

// Protected routes
router.use(protect);

router.post('/', pathwayController.createPathway);
router.put('/:id', pathwayController.updatePathway);
router.delete('/:id', pathwayController.deletePathway);
router.patch('/:id/status', pathwayController.changePathwayStatus);
router.post('/:id/blocks', pathwayController.addBlock);
router.delete('/:id/blocks/:blockId', pathwayController.removeBlock);
router.put('/:id/blocks/reorder', pathwayController.reorderBlocks);

module.exports = router;