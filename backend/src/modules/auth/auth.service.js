const User = require('../user/user.model');
const { generateTokens, verifyRefreshToken } = require('../../utils/generateToken');
const ApiError = require('../../utils/apiError');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class AuthService {
  async register(userData) {
    const { name, email, password } = userData;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new ApiError(400, 'User already exists');
    }
    
    const user = await User.create({
      name,
      email,
      password
    });
    
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }
  
  async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    const isPasswordMatch = await user.matchPassword(password);
    
    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    const { accessToken, refreshToken } = generateTokens(user._id);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }
  
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token required');
    }
    
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await User.findById(decoded.id).select('+refreshToken +refreshTokenExpire');
      
      if (!user || user.refreshToken !== refreshToken) {
        throw new ApiError(401, 'Invalid refresh token');
      }
      
      if (user.refreshTokenExpire < new Date()) {
        throw new ApiError(401, 'Refresh token expired');
      }
      
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
      
      // Rotate refresh token
      user.refreshToken = newRefreshToken;
      user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save({ validateBeforeSave: false });
      
      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }
  
  async logout(userId) {
    const user = await User.findById(userId).select('+refreshToken');
    user.refreshToken = undefined;
    user.refreshTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    return { message: 'Logged out successfully' };
  }
  
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.passwordResetExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await user.save({ validateBeforeSave: false });
    
    // In production, send email with resetToken
    // For now, return it in response (development only)
    return {
      message: 'Password reset token generated',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    };
  }
  
  async resetPassword(resetToken, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpire: { $gt: new Date() }
    }).select('+password');
    
    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }
    
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.passwordChangedAt = new Date();
    
    await user.save();
    
    return { message: 'Password reset successful' };
  }
  
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const isPasswordMatch = await user.matchPassword(currentPassword);
    
    if (!isPasswordMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }
    
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    return { message: 'Password changed successfully' };
  }
  
  async getMe(userId) {
    const user = await User.findById(userId)
      .select('-__v')
      .populate('savedResources', 'title category')
      .populate('followers', 'name email')
      .populate('following', 'name email');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    return user;
  }
}

module.exports = new AuthService();