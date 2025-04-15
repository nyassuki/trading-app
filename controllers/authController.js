const passport = require('passport');
const authModel = require('../models/authModel');
const { validationResult } = require('express-validator');

module.exports = {
  /**
   * Render login page with CSRF protection
   */
  getLogin: (req, res) => {
    try {
      res.render('login', { 
        csrfToken: req.csrfToken(),
        messages: req.flash()
      });
    } catch (err) {
      console.error('Error rendering login page:', err);
      res.status(500).send('Internal Server Error');
    }
  },

  /**
   * Render registration page with CSRF protection
   */
  getRegister: (req, res) => {
    try {
      res.render('register', { 
        csrfToken: req.csrfToken(),
        messages: req.flash()
      });
    } catch (err) {
      console.error('Error rendering register page:', err);
      res.status(500).send('Internal Server Error');
    }
  },

  /**
   * Handle login form submission
   */
  postLogin: (req, res, next) => {
    //console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login validation errors:', errors.array());
      const flash_m = {messages:'Login validation errors'};
      req.flash(flash_m);
      return res.redirect('/login');
    }
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.log('Login authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Login failed:', info);
        const flash_m = {messages:info.message};
        req.flash(flash_m);
        return res.redirect('/login');
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.log('Session login error:', err);
          return res.redirect('/login');
        }
        // Handle "remember me" functionality if needed
        if (req.body.rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }
        console.log('User logged in:', user.email);
        res.json({ success: true, redirectUrl: '/dashboard' });
      });
    })(req, res, next);
  },

  /**
   * Handle registration form submission
   */
  postRegister: async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      //console.log('Registration validation errors:', errors.array());
      return res.status(400).render('register', {
        errors: errors.array(),
        csrfToken: req.csrfToken(),
        input: req.body // Preserve form input
      });
    }

    try {
      await authModel.registerUser(
        req.body.name,
        req.body.email,
        req.body.password
      );
      
      req.flash('success', 'Registration successful! Please login.');
      //console.log('New user registered:', req.body.email);
      return res.redirect('/login');
      
    } catch (err) {
      console.error('Registration error:', err);
      
      let errorMessage = 'Registration failed';
      if (err.message.includes('already exists')) {
        errorMessage = 'Email already registered';
      }
      
      return res.status(500).render('register', {
        error: errorMessage,
        csrfToken: req.csrfToken(),
        input: req.body
      });
    }
  },

  /**
   * Initiate Google OAuth authentication
   */
  googleAuth: passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: true
  }),

  /**
   * Handle Google OAuth callback
   */
  googleCallback: (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: '/login',
      failureFlash: true
    })(req, res, (err) => {
      if (err) {
        console.error('Google auth callback error:', err);
        req.flash('error', err.message || 'Google login failed');
        return res.redirect('/login');
      }
      
      // Successful authentication
      //console.log('Google login successful for:', req.user.email);
      return res.redirect('/dashboard');
    });
  },

  /**
   * Handle user logout
   */
  logout: (req, res) => {
    try {
      const userEmail = req.user?.email;
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.redirect('/dashboard');
        }
        
        //console.log('User logged out:', userEmail);
        req.session.destroy(() => {
          res.redirect('/login');
        });
      });
    } catch (err) {
      console.error('Logout process error:', err);
      res.redirect('/');
    }
  },

  /**
   * Handle authentication errors
   */
  handleAuthError: (err, req, res, next) => {
    console.error('Authentication error:', err);
    
    if (err.name === 'AuthenticationError') {
      req.flash('error', err.message || 'Authentication failed');
      return res.redirect('/login');
    }
    
    next(err);
  }
};