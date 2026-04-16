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
  
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
}

module.exports = new AuthController();