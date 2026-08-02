const userService = require('./user.service');
const asyncHandler = require('../../utils/asyncHandler');
const { getCountries } = require('../../utils/countries');

class UserController {
  getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user._id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  });
  
  updateProfile = asyncHandler(async (req, res) => {
    console.log('[updateProfile] req.body keys:', Object.keys(req.body));
    console.log('[updateProfile] req.files:', req.files);
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
    const industries = [
      'Law',
      'Agriculture',
      'Nursing',
      'Medicine',
      'Software Development',
      'Education',
      'Finance',
      'Healthcare',
      'Marketing',
      'Engineering',
      'Construction',
      'Real Estate',
      'Transportation',
      'Hospitality',
      'Entertainment',
      'Media',
      'Telecommunications',
      'Energy',
      'Manufacturing',
      'Retail',
      'Government',
      'Non-profit',
      'Consulting',
      'Design',
      'Research',
      'Technology',
      'Fashion',
      'Food & Beverage',
      'Sports',
      'Environmental'
    ];
    
    res.status(200).json({
      success: true,
      data: { industries }
    });
  });
  
  getCountries = asyncHandler(async (req, res) => {
    const countries = getCountries();
    
    res.status(200).json({
      success: true,
      data: { countries }
    });
  });
  
  getProfessionalExperienceLevels = asyncHandler(async (req, res) => {
    const levels = [
      'Student',
      'Entry level',
      'Mid Level',
      'Senior',
      'Lead',
      'Manager',
      'Director',
      'Executive'
    ];
    
    res.status(200).json({
      success: true,
      data: { levels }
    });
  });
  
  getGoalReviewTimelines = asyncHandler(async (req, res) => {
    const timelines = [
      {
        value: '6months',
        label: "We'll remind you in 6 months",
        description: 'Review your career goals every 6 months to stay on track'
      },
      {
        value: '1year',
        label: "We'll remind you once a year",
        description: 'Annual review of your career goals and progress'
      }
    ];
    
    res.status(200).json({
      success: true,
      data: { timelines }
    });
  });
}

module.exports = new UserController();