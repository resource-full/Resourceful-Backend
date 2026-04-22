const express = require('express');
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.use(protect);
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);

module.exports = router;