const express = require('express');
const userController = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');
const fileUploadService = require('../../services/fileUpload.service');

const router = express.Router();

// Public routes
router.get('/username/:username', userController.getProfileByUsername);
router.get('/check-username/:username', userController.checkUsername);
router.get('/industries', userController.getIndustries);
router.get('/countries', userController.getCountries);
router.get('/experience-levels', userController.getProfessionalExperienceLevels);
router.get('/goal-review-timelines', userController.getGoalReviewTimelines);

// Protected routes
router.use(protect);

const uploadMiddleware = fileUploadService.getUserProfileUploadMiddleware();

router.get('/profile', userController.getProfile);
router.put('/profile', uploadMiddleware, userController.updateProfile);
router.post('/follow/:userId', userController.followUser);
router.post('/unfollow/:userId', userController.unfollowUser);
router.get('/search', userController.searchUsers);
router.get('/:userId', userController.getPublicProfile);

module.exports = router;