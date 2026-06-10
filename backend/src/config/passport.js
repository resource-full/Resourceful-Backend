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

// Debug logging
console.log('Passport Config:');
console.log('GOOGLE_CALLBACK_URL:', GOOGLE_CALLBACK_URL);
console.log('LINKEDIN_CALLBACK_URL:', LINKEDIN_CALLBACK_URL);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
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
          console.log('Google auth successful for:', profile.emails[0].value);
          
          let user = await User.findOne({ googleId: profile.id });
          
          if (user) {
            user.lastLogin = new Date();
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
              user.avatar = profile.photos[0].value;
            }
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
          
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          if (email) {
            user = await User.findOne({ email });
            
            if (user) {
              user.googleId = profile.id;
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
          
          console.log('New user created:', newUser.email);
          return done(null, newUser);
        } catch (error) {
          console.error('Google Strategy Error:', error);
          return done(error, null);
        }
      }
    )
  );
}

// LinkedIn Strategy
if (LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: LINKEDIN_CLIENT_ID,
        clientSecret: LINKEDIN_CLIENT_SECRET,
        callbackURL: LINKEDIN_CALLBACK_URL,
        scope: ['openid', 'profile', 'email'],
        state: true,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          console.log('LinkedIn Profile received:', JSON.stringify(profile, null, 2));
          
          // Extract email from LinkedIn profile
          let email = null;
          if (profile.emails && profile.emails.length > 0) {
            email = profile.emails[0].value;
          }
          
          console.log('LinkedIn email:', email);
          
          // Check if user already exists with this LinkedIn ID
          let user = await User.findOne({ linkedinId: profile.id });
          
          if (user) {
            console.log('Existing user found by LinkedIn ID');
            user.lastLogin = new Date();
            
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
              user.avatar = profile.photos[0].value;
            }
            
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
          
          // Check if user exists with this email
          if (email) {
            user = await User.findOne({ email });
            
            if (user) {
              console.log('Existing user found by email, linking LinkedIn account');
              user.linkedinId = profile.id;
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
          
          // Create new user from LinkedIn profile
          console.log('Creating new user from LinkedIn profile');
          
          let username;
          if (email) {
            const baseUsername = email.split('@')[0];
            username = baseUsername + '_' + Math.random().toString(36).substring(7);
          } else {
            username = 'linkedin_' + profile.id.substring(0, 8);
          }
          
          const newUser = await User.create({
            linkedinId: profile.id,
            email: email || `${profile.id}@linkedin.user`,
            firstName: profile.name ? profile.name.givenName : '',
            lastName: profile.name ? profile.name.familyName : '',
            name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
            authProvider: 'linkedin',
            isEmailVerified: true,
            lastLogin: new Date(),
            username: username
          });
          
          console.log('New LinkedIn user created:', newUser.email);
          return done(null, newUser);
        } catch (error) {
          console.error('LinkedIn Strategy Error:', error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn('LinkedIn OAuth credentials not configured. LinkedIn login will not work.');
}

module.exports = passport;