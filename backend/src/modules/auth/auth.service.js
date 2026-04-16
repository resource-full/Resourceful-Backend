const User = require('../user/user.model');
const generateToken = require('../../utils/generateToken');
const ApiError = require('../../utils/apiError');

class AuthService {
  async register(userData) {
    const { name, email, password } = userData;
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new ApiError(400, 'User already exists');
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password
    });
    
    const token = generateToken(user._id);
    
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    };
  }
  
  async login(email, password) {
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    
    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }
    
    const token = generateToken(user._id);
    
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    };
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