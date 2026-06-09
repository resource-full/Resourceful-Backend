const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const User = require('../modules/user/user.model');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_CALLBACK_URL
} = require('./env');

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // Update last login and profile info
          user.lastLogin = new Date();
          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }
        
        // Check if email exists (user might have registered with email/password)
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (email) {
          user = await User.findOne({ email });
          
          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            if (user.authProvider === 'local') {
              user.authProvider = 'google';
            }
            user.isEmailVerified = true;
            user.lastLogin = new Date();
            
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
              user.avatar = profile.photos[0].value;
            }
            
            // Set name if not already set
            if (!user.firstName && profile.name) {
              user.firstName = profile.name.givenName || '';
              user.lastName = profile.name.familyName || '';
            }
            
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
        }
        
        // Create new user with Google profile
        const newUser = await User.create({
          googleId: profile.id,
          email: email || `${profile.id}@google.com`,
          firstName: profile.name ? profile.name.givenName : '',
          lastName: profile.name ? profile.name.familyName : '',
          name: profile.displayName || '',
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          authProvider: 'google',
          isEmailVerified: true,
          lastLogin: new Date(),
          username: email ? email.split('@')[0] + '_' + Math.random().toString(36).substring(7) : undefined
        });
        
        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// LinkedIn Strategy
passport.use(
  new LinkedInStrategy(
    {
      clientID: LINKEDIN_CLIENT_ID,
      clientSecret: LINKEDIN_CLIENT_SECRET,
      callbackURL: LINKEDIN_CALLBACK_URL,
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this LinkedIn ID
        let user = await User.findOne({ linkedinId: profile.id });
        
        if (user) {
          user.lastLogin = new Date();
          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }
        
        // Check if email exists
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (email) {
          user = await User.findOne({ email });
          
          if (user) {
            user.linkedinId = profile.id;
            if (user.authProvider === 'local') {
              user.authProvider = 'linkedin';
            }
            user.isEmailVerified = true;
            user.lastLogin = new Date();
            
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
              user.avatar = profile.photos[0].value;
            }
            
            if (!user.firstName && profile.name) {
              user.firstName = profile.name.givenName || '';
              user.lastName = profile.name.familyName || '';
            }
            
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
        }
        
        // Create new user with LinkedIn profile
        const newUser = await User.create({
          linkedinId: profile.id,
          email: email || `${profile.id}@linkedin.com`,
          firstName: profile.name ? profile.name.givenName : '',
          lastName: profile.name ? profile.name.familyName : '',
          name: profile.displayName || '',
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          authProvider: 'linkedin',
          isEmailVerified: true,
          lastLogin: new Date(),
          username: email ? email.split('@')[0] + '_' + Math.random().toString(36).substring(7) : undefined
        });
        
        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;