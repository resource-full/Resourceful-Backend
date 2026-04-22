const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRE, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE } = require('../config/env');

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
  
  const refreshToken = jwt.sign({ id }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE
  });
  
  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

module.exports = { generateTokens, verifyRefreshToken };