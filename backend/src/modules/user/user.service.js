const User = require('./user.model');
const Resource = require('../resource/resource.model');
const Payment = require('../payment/payment.model');
const FileUploadService = require('../../services/fileUpload.service');
const ApiError = require('../../utils/apiError');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId)
      .select('-__v -password')
      .populate('savedResources', 'name coverPhoto industry peerRatings confidenceScore')
      .populate('createdResources', 'name coverPhoto industry peerRatings confidenceScore status')
      .populate('followers', 'name email avatar username position')
      .populate('following', 'name email avatar username position');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const totalSold = await Payment.countDocuments({
      item: { $in: user.createdResources.map(r => r._id) },
      itemType: 'Resource',
      status: 'success'
    });
    
    const publicResources = user.createdResources.filter(r => r.status === 'public');
    const avgRelevancyScore = publicResources.length > 0
      ? publicResources.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / publicResources.length
      : 0;
    
    const userObj = user.toObject();
    userObj.stats = {
      following: user.following.length,
      followers: user.followers.length,
      totalCreated: user.createdResources.length,
      totalSold,
      avgRelevancyScore: Math.round(avgRelevancyScore * 100) / 100
    };
    
    return userObj;
  }
  
  async updateProfile(userId, updateData, files) {
    delete updateData.password;
    delete updateData.role;
    delete updateData.email;
    delete updateData.followers;
    delete updateData.following;
    delete updateData.createdResources;
    delete updateData.savedResources;
    
    // Check username uniqueness
    if (updateData.username) {
      const existingUser = await User.findOne({ 
        username: updateData.username.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        throw new ApiError(400, 'Username is already taken');
      }
    }
    
    // Handle avatar upload
    if (files && files.avatar && files.avatar.length > 0) {
      const uploadResult = await FileUploadService.uploadFile(
        files.avatar[0],
        'avatars'
      );
      updateData.avatar = uploadResult.url;
    } else if (updateData.avatar && typeof updateData.avatar === 'string' && updateData.avatar.startsWith('data:image')) {
      const uploadResult = await FileUploadService.uploadBase64(
        updateData.avatar,
        'avatars'
      );
      updateData.avatar = uploadResult.url;
    }
    
    // Handle cover image upload
    if (files && files.coverImage && files.coverImage.length > 0) {
      const uploadResult = await FileUploadService.uploadFile(
        files.coverImage[0],
        'covers'
      );
      updateData.coverImage = uploadResult.url;
    }
    
    // Remove coverPhoto from updateData if present (frontend may send this as a CSS gradient string)
    delete updateData.coverPhoto;
    
    // Set profile status
    if (updateData.profileStatus) {
      updateData.profileStatus = updateData.profileStatus;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v -password');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    return user;
  }
  
  async followUser(followerId, followingId) {
    if (followerId.toString() === followingId.toString()) {
      throw new ApiError(400, 'You cannot follow yourself');
    }
    
    const [follower, following] = await Promise.all([
      User.findById(followerId),
      User.findById(followingId)
    ]);
    
    if (!follower || !following) {
      throw new ApiError(404, 'User not found');
    }
    
    if (follower.following.includes(followingId)) {
      throw new ApiError(400, 'You are already following this user');
    }
    
    await Promise.all([
      User.findByIdAndUpdate(followerId, {
        $addToSet: { following: followingId }
      }),
      User.findByIdAndUpdate(followingId, {
        $addToSet: { followers: followerId }
      })
    ]);
    
    return { 
      message: 'Successfully followed user',
      following: follower.following.length + 1,
      followers: following.followers.length + 1
    };
  }
  
  async unfollowUser(followerId, followingId) {
    const [follower, following] = await Promise.all([
      User.findById(followerId),
      User.findById(followingId)
    ]);
    
    if (!follower || !following) {
      throw new ApiError(404, 'User not found');
    }
    
    if (!follower.following.includes(followingId)) {
      throw new ApiError(400, 'You are not following this user');
    }
    
    await Promise.all([
      User.findByIdAndUpdate(followerId, {
        $pull: { following: followingId }
      }),
      User.findByIdAndUpdate(followingId, {
        $pull: { followers: followerId }
      })
    ]);
    
    return { 
      message: 'Successfully unfollowed user',
      following: follower.following.length - 1,
      followers: following.followers.length - 1
    };
  }
  
  async getPublicProfile(userId) {
    const user = await User.findById(userId)
      .select('name username email avatar coverImage bio position shortDescription industry location currentCareer skills socials profileLink profileStatus createdAt')
      .populate('createdResources', 'name coverPhoto industry peerRatings confidenceScore status');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const publicResources = user.createdResources.filter(r => r.status === 'public');
    
    const totalSold = await Payment.countDocuments({
      item: { $in: user.createdResources.map(r => r._id) },
      itemType: 'Resource',
      status: 'success'
    });
    
    const avgRelevancyScore = publicResources.length > 0
      ? publicResources.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / publicResources.length
      : 0;
    
    const userObj = user.toObject();
    userObj.stats = {
      following: user.following ? user.following.length : 0,
      followers: user.followers ? user.followers.length : 0,
      totalCreated: user.createdResources.length,
      totalSold,
      avgRelevancyScore: Math.round(avgRelevancyScore * 100) / 100
    };
    
    return userObj;
  }
  
  async getProfileByUsername(username) {
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('name username email avatar coverImage bio position shortDescription industry location currentCareer skills socials profileLink profileStatus createdAt')
      .populate('createdResources', 'name coverPhoto industry peerRatings confidenceScore status');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const publicResources = user.createdResources.filter(r => r.status === 'public');
    
    const totalSold = await Payment.countDocuments({
      item: { $in: user.createdResources.map(r => r._id) },
      itemType: 'Resource',
      status: 'success'
    });
    
    const avgRelevancyScore = publicResources.length > 0
      ? publicResources.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / publicResources.length
      : 0;
    
    const userObj = user.toObject();
    userObj.stats = {
      following: user.following ? user.following.length : 0,
      followers: user.followers ? user.followers.length : 0,
      totalCreated: user.createdResources.length,
      totalSold,
      avgRelevancyScore: Math.round(avgRelevancyScore * 100) / 100
    };
    
    return userObj;
  }
  
  async searchUsers(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const searchCriteria = query
      ? { $text: { $search: query } }
      : {};
    
    const [users, total] = await Promise.all([
      User.find(searchCriteria)
        .select('name username email avatar coverImage position industry')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 }),
      User.countDocuments(searchCriteria)
    ]);
    
    return {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }
  
  async checkUsernameAvailability(username) {
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    return { available: !existingUser };
  }
  
  async getIndustries() {
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
    return { industries };
  }
}

module.exports = new UserService();
