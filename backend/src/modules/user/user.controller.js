const userService = require('./user.service');
const asyncHandler = require('../../utils/asyncHandler');

class UserController {
  getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
  
  updateProfile = asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user._id, req.body, req.files);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
  
  followUser = asyncHandler(async (req, res) => {
    const result = await userService.followUser(req.user._id, req.params.userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  unfollowUser = asyncHandler(async (req, res) => {
    const result = await userService.unfollowUser(req.user._id, req.params.userId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getPublicProfile = asyncHandler(async (req, res) => {
    const user = await userService.getPublicProfile(req.params.userId);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
  
  getProfileByUsername = asyncHandler(async (req, res) => {
    const user = await userService.getProfileByUsername(req.params.username);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
  
  searchUsers = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;
    const result = await userService.searchUsers(q, parseInt(page), parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  checkUsername = asyncHandler(async (req, res) => {
    const result = await userService.checkUsernameAvailability(req.params.username);
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
  
  getIndustries = asyncHandler(async (req, res) => {
    const result = await userService.getIndustries();
    
    res.status(200).json({
      success: true,
      data: result
    });
  });
}

module.exports = new UserController();