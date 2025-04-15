// config/passport.js
const passport = require('passport'); // Add this line at the top
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/userModel');
const authModel = require('../models/authModel');

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await userModel.findByEmail(email);
      if (!user) return done(null, false, { message: 'Incorrect email' });
      
      const isValid = await authModel.validatePassword(password, user.password);
      if (!isValid) return done(null, false, { message: 'Incorrect password' });
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google Strategy
// config/passport.js
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile received:', profile);
    
    if (!profile.emails || !profile.emails[0]) {
      console.error('No email in Google profile');
      return done(null, false, { message: 'No email associated with Google account' });
    }

    const email = profile.emails[0].value;
    const photos = profile.photos[0].value;
    let user = await userModel.findByEmail(email);

    if (!user) {
      console.log('Creating new user from Google profile');
      user = await userModel.create({
        name: profile.displayName,
        email: email,
        provider: 'google',
        providerId: profile.id,
        profile_picture:photos,
        email_verified:profile.emails[0].verified
      });
    }

    console.log('Google authentication successful for user:', user.id);
    return done(null, user);
  } catch (err) {
    console.error('Google auth error:', err);
    return done(err);
  }
}));
module.exports = passport; // Export passport at the end