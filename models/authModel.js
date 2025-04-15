const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userModel = require('./userModel');
const db = require('./db');

// Password configuration
const PASSWORD_SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_HOURS = 1;

module.exports = {
  /**
   * Register a new user with secure password hashing
   * @param {string} name - User's name
   * @param {string} email - User's email
   * @param {string} password - Plain text password
   * @returns {Promise<object>} Created user info (without sensitive data)
   */
  registerUser: async (name, email, password) => {
    try {
      // Input validation
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters');
      }

      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Hash password with modern cost factor
      const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

      // Create user through userModel
      const user = await userModel.create(
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword
      );

      // Return user without sensitive data
      return {
        id: user.id,
        name: user.name,
        email: user.email
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw for controller to handle
    }
  },

  /**
   * Validate user password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} True if password matches
   */
  validatePassword: async (password, hashedPassword) => {
    try {
      if (!password || !hashedPassword) {
        return false;
      }
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password validation error:', error);
      return false; // Fail securely
    }
  },

  /**
   * Create password reset token
   * @param {string} email - User's email
   * @returns {Promise<string>} Reset token
   */
  createPasswordResetToken: async (email) => {
    try {
      if (!email || typeof email !== 'string') {
        throw new Error('Invalid email');
      }

      // Generate secure random token
      const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
      const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 3600000);

      // Update user record with token
      const [result] = await db.query(
        `UPDATE users 
         SET reset_token = ?, reset_token_expires = ?
         WHERE email = ?`,
        [token, expires, email.toLowerCase().trim()]
      );

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      return token;
    } catch (error) {
      console.error('Reset token creation error:', error);
      throw error;
    }
  },

  /**
   * Reset user password using valid token
   * @param {string} token - Reset token
   * @param {string} newPassword - New plain text password
   * @returns {Promise<boolean>} True if password was reset
   */
  resetPassword: async (token, newPassword) => {
    try {
      if (!token || typeof token !== 'string' || token.length !== 64) {
        throw new Error('Invalid reset token');
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);

      // Update password and clear token if valid
      const [result] = await db.query(
        `UPDATE users 
         SET password = ?, reset_token = NULL, reset_token_expires = NULL
         WHERE reset_token = ? AND reset_token_expires > NOW()`,
        [hashedPassword, token]
      );

      if (result.affectedRows === 0) {
        throw new Error('Invalid or expired reset token');
      }

      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  /**
   * Verify reset token validity
   * @param {string} token - Reset token
   * @returns {Promise<boolean>} True if token is valid
   */
  verifyResetToken: async (token) => {
    try {
      const [rows] = await db.query(
        `SELECT 1 FROM users 
         WHERE reset_token = ? AND reset_token_expires > NOW() 
         LIMIT 1`,
        [token]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }
};