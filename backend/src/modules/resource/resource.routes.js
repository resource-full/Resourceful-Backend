const express = require('express');
const resourceController = require('./resource.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', resourceController.getResources);
router.get('/:id', resourceController.getResourceById);

// Protected routes
router.use(protect);
router.post('/', resourceController.createResource);
router.put('/:id', resourceController.updateResource);
router.delete('/:id', resourceController.deleteResource);
router.post('/:id/collaborators', resourceController.addCollaborator);
router.post('/:id/rate', resourceController.rateResource);

module.exports = router;