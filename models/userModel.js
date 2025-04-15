const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// Enhanced user model with error handling and security
module.exports = {
  /**
   * Find user by email
   * @param {string} email - User's email
   * @returns {Promise<object|null>} User object or null if not found
   */
  findByEmail: async (email) => {
    try {
      if (!email || typeof email !== 'string') {
        throw new Error('Invalid email parameter');
      }

      const [rows] = await db.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1", 
        [email.toLowerCase().trim()]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error('Error in findByEmail:', error);
      throw new Error('Failed to find user by email');
    }
  },

  /**
   * Find user by ID
   * @param {number|string} id - User ID
   * @returns {Promise<object|null>} User object or null if not found
   */
  findById: async (id) => {
    try {
      if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
        throw new Error('Invalid id parameter');
      }

      const [rows] = await db.query(
        "SELECT * FROM users WHERE id = ? LIMIT 1", 
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error('Error in findById:', error);
      throw new Error('Failed to find user by ID');
    }
  },

  /**
   * Create a new user
   * @param {string} name - User's name
   * @param {string} email - User's email
   * @param {string} password - Plain text password
   * @returns {Promise<object>} Created user info (without password)
   */
  create: async (data) => {
    try {
      let result = null;
      let name = null;
      const normalizedEmail = data.email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await db.query(
        "SELECT id FROM users WHERE email = ? LIMIT 1", 
        [normalizedEmail]
      );

      if (existingUser[0].length > 0) {
        throw new Error('User with this email already exists');
      } 
      if(data.provider !="google") {
        // Hash password
        name = name;
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
          result = await db.query(
          "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
          [name.trim(), normalizedEmail, hashedPassword]
        );
      } else {
        name =data.name
        const keys = Object.keys(data); // ['name', 'email', 'provider', ...]
        const values = Object.values(data); // ['sakip guard', 'sakip.guard@gmail.com', ...]
        const placeholders = keys.map(() => '?').join(', '); // "?, ?, ?, ?, ?"
        const sql = `INSERT INTO users (${keys.join(', ')}) VALUES (${placeholders})`;
        
          result = await db.query(sql,values);
      }
      // Return user without password
      return {
        id: result.insertId,
        name,
        email: normalizedEmail
      };
    } catch (error) {
      console.error('Error in create user:', error);
      throw error; // Re-throw for controller to handle
    }
  },

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated user info
   */
  updateProfile: async (userId, updates) => {
    try {
      if (!userId) throw new Error('User ID required');
      if (!updates || typeof updates !== 'object') throw new Error('Invalid updates');

      const validFields = {};
      const validKeys = ['name', 'email']; // Add other updatable fields

      // Filter only valid fields
      Object.keys(updates).forEach(key => {
        if (validKeys.includes(key) && updates[key] !== undefined) {
          validFields[key] = updates[key];
        }
      });

      if (Object.keys(validFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      // Build dynamic query
      const setClause = Object.keys(validFields)
        .map(key => `${key} = ?`)
        .join(', ');

      const values = Object.values(validFields);
      values.push(userId);

      await db.query(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      return this.findById(userId);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  /**
   * Verify user password
   * @param {number} userId - User ID
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>} True if password matches
   */
  verifyPassword: async (userId, password) => {
    try {
      const [rows] = await db.query(
        "SELECT password FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      
      if (!rows[0]) return false;
      
      return await bcrypt.compare(password, rows[0].password);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }
};