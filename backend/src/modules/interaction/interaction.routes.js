const express = require('express');
const interactionController = require('./interaction.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/resources/:resourceId/comments', interactionController.getResourceComments);
router.get('/resources/:resourceId/stats', interactionController.getResourceStats);

// Protected routes
router.use(protect);
router.post('/resources/:resourceId/like', interactionController.likeResource);
router.post('/resources/:resourceId/save', interactionController.saveResource);
router.post('/resources/:resourceId/comments', interactionController.commentOnResource);
router.delete('/comments/:commentId', interactionController.deleteComment);
router.get('/user/me', interactionController.getUserInteractions);

module.exports = router;