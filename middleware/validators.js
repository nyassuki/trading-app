// middleware/validators.js
const { body, validationResult } = require('express-validator');

exports.loginValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).trim().escape()
];

exports.registerValidator = [
  body('name').notEmpty().trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[^a-zA-Z0-9]/).withMessage('Password must contain at least one special character')
];