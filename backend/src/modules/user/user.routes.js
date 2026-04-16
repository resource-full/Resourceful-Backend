const express = require('express');
const userController = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/follow/:userId', userController.followUser);
router.post('/unfollow/:userId', userController.unfollowUser);
router.get('/search', userController.searchUsers);
router.get('/:userId', userController.getPublicProfile);

module.exports = router;