const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');
const passport = require('passport');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      data: result
    });
  });
  
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  // Google OAuth
  googleAuth = (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false
    })(req, res, next);
  };
  
  googleAuthCallback = (req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.CLIENT_URL}/auth/login?error=google_auth_failed`
    }, async (err, user, info) => {
      if (err) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=${encodeURIComponent(err.message)}`);
      }
      
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=authentication_failed`);
      }
      
      try {
        const result = await authService.oauthLogin(user, 'google');
        
        // Redirect to frontend with tokens
        const tokenParams = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: JSON.stringify(result.user)
        });
        
        res.redirect(`${process.env.CLIENT_URL}/auth/oauth-callback?${tokenParams.toString()}`);
      } catch (error) {
        res.redirect(`${process.env.CLIENT_URL}/auth/login?error=${encodeURIComponent(error.message)}`);
      }
    })(req, res, next);
  };
  
  // LinkedIn OAuth
  linkedinAuth = (req, res, next) => {
    passport.authenticate('linkedin', {
      scope: ['openid', 'profile', 'email'],
      session: false
    })(req, res, next);
  };
  
  linkedinAuthCallback = (req, res, next) => {
    passport.authenticate('linkedin', {
      session: false,
      failureRedirect: `${process.env.CLIENT_URL}/auth/login?error=linkedin_auth_failed`
    }, async (err, user, info) => {
      if (err) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=${encodeURIComponent(err.message)}`);
      }
      
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=authentication_failed`);
      }
      
      try {
        const result = await authService.oauthLogin(user, 'linkedin');
        
        const tokenParams = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: JSON.stringify(result.user)
        });
        
        res.redirect(`${process.env.CLIENT_URL}/auth/oauth-callback?${tokenParams.toString()}`);
      } catch (error) {
        res.redirect(`${process.env.CLIENT_URL}/auth/login?error=${encodeURIComponent(error.message)}`);
      }
    })(req, res, next);
  };
  
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  logout = asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user._id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user._id,
      currentPassword,
      newPassword
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  // Onboarding controllers
  saveOnboardingStep = asyncHandler(async (req, res) => {
    const result = await authService.saveOnboardingStep(req.user._id, req.body);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  skipOnboardingStep = asyncHandler(async (req, res) => {
    const { step } = req.params;
    const result = await authService.skipOnboardingStep(req.user._id, parseInt(step));
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getOnboardingStatus = asyncHandler(async (req, res) => {
    const result = await authService.getOnboardingStatus(req.user._id);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
}

module.exports = new AuthController();