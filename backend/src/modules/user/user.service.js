const User = require('./user.model');
const ApiError = require('../../utils/apiError');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId)
      .select('-__v')
      .populate('savedResources', 'title category confidenceScore')
      .populate('createdResources', 'title category confidenceScore')
      .populate('followers', 'name email avatar')
      .populate('following', 'name email avatar');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    return user;
  }
  
  async updateProfile(userId, updateData) {
    // Prevent password update through this method
    delete updateData.password;
    delete updateData.role; // Role should be updated through admin routes only
    delete updateData.email; // Email change should require verification
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-__v');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    return user;
  }
  
  async followUser(followerId, followingId) {
    if (followerId === followingId) {
      throw new ApiError(400, 'You cannot follow yourself');
    }
    
    const [follower, following] = await Promise.all([
      User.findById(followerId),
      User.findById(followingId)
    ]);
    
    if (!follower || !following) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check if already following
    if (follower.following.includes(followingId)) {
      throw new ApiError(400, 'You are already following this user');
    }
    
    // Update both users
    await Promise.all([
      User.findByIdAndUpdate(followerId, {
        $addToSet: { following: followingId }
      }),
      User.findByIdAndUpdate(followingId, {
        $addToSet: { followers: followerId }
      })
    ]);
    
    return { message: 'Successfully followed user' };
  }
  
  async unfollowUser(followerId, followingId) {
    const [follower, following] = await Promise.all([
      User.findById(followerId),
      User.findById(followingId)
    ]);
    
    if (!follower || !following) {
      throw new ApiError(404, 'User not found');
    }
    
    // Check if following
    if (!follower.following.includes(followingId)) {
      throw new ApiError(400, 'You are not following this user');
    }
    
    // Update both users
    await Promise.all([
      User.findByIdAndUpdate(followerId, {
        $pull: { following: followingId }
      }),
      User.findByIdAndUpdate(followingId, {
        $pull: { followers: followerId }
      })
    ]);
    
    return { message: 'Successfully unfollowed user' };
  }
  
  async getPublicProfile(userId) {
    const user = await User.findById(userId)
      .select('name email avatar bio location currentCareer skills createdAt')
      .populate('createdResources', 'title category confidenceScore');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    return user;
  }
  
  async searchUsers(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const searchCriteria = query
      ? { $text: { $search: query } }
      : {};
    
    const [users, total] = await Promise.all([
      User.find(searchCriteria)
        .select('name email avatar bio location currentCareer')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 }),
      User.countDocuments(searchCriteria)
    ]);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new UserService();