require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      connectTimeout: 60000
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    logging: process.env.NODE_ENV === 'development' 
      ? (msg) => logger.debug(msg) 
      : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
      paranoid: true, // Adds deletedAt for soft deletes
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    },
    timezone: process.env.DB_TIMEZONE || '+00:00', // UTC by default
    benchmark: true,
    retry: {
      max: 3,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTDOWN/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ]
    }
  }
);

// Test connection function
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('MySQL connection has been established successfully.');
    
    // Sync models in development (remove in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }
  } catch (error) {
    logger.error('Unable to connect to MySQL database:', error);
    process.exit(1); // Exit process with failure
  }
}

// Connection events
sequelize
  .authenticate()
  .then(() => {
    logger.info('Connection to MySQL has been established successfully.');
  })
  .catch(err => {
    logger.error('Unable to connect to MySQL database:', err);
  });

// Export the sequelize instance and test function
module.exports = {
  sequelize,
  testConnection,
  Op: Sequelize.Op, // Sequelize operators
  DataTypes: Sequelize.DataTypes // Sequelize data types
};