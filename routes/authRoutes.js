// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { check, validationResult } = require('express-validator'); // Add this line
const authController = require('../controllers/authController');

// Login route with validation
router.post('/login',  [
  check('email').isEmail(),
  check('password').isLength({ min: 6 })
], authController.postLogin);

// Register route with validation
router.post('/register', [
  check('name').notEmpty().trim().escape(),
  check('email').isEmail().normalizeEmail(),
  check('password').isLength({ min: 8 })
], authController.postRegister);

// Other routes...
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);
router.get('/logout', authController.logout);

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

router.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureFlash: true 
  }),
  (req, res) => {
    req.session.save(() => {
      res.redirect('/dashboard');
    });
  }
);

module.exports = router;