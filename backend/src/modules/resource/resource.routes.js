const express = require('express');
const resourceController = require('./resource.controller');
const { protect } = require('../../middleware/auth.middleware');
const fileUploadService = require('../../services/fileUpload.service');

const router = express.Router();

// Public routes (no auth required)
router.get('/', resourceController.getResources);
router.get('/:id', resourceController.getResourceById);

// My resources (needs auth, must be before protected routes with /:id patterns)
router.get('/my/resources', protect, resourceController.getMyResources);

// Protected routes
router.use(protect);

const uploadMiddleware = fileUploadService.getUploadMiddleware();

router.post('/', uploadMiddleware, resourceController.createResource);
router.put('/:id', uploadMiddleware, resourceController.updateResource);
router.delete('/:id', resourceController.deleteResource);
router.patch('/:id/status', resourceController.changeResourceStatus);
router.post('/:id/share', resourceController.shareResource);
router.delete('/:id/share', resourceController.removeShareAccess);
router.post('/:id/collaborators', resourceController.addCollaborator);
router.delete('/:id/collaborators', resourceController.removeCollaborator);
router.post('/:id/rate', resourceController.rateResource);
router.get('/:id/download', resourceController.downloadResource);

module.exports = router;