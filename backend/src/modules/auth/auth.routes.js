const express = require('express');
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const passport = require('passport');

const router = express.Router();

// Local auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleAuthCallback);

// LinkedIn OAuth routes
router.get('/linkedin', authController.linkedinAuth);
router.get('/linkedin/callback', authController.linkedinAuthCallback);

// Protected routes
router.use(protect);

// Onboarding routes
router.get('/onboarding/status', authController.getOnboardingStatus);
router.post('/onboarding', authController.saveOnboardingStep);
router.post('/onboarding/skip/:step', authController.skipOnboardingStep);

// User routes
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);

module.exports = router;