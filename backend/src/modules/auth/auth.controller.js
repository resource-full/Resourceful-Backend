const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

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
  
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
}

module.exports = new AuthController();