// middleware/auditLog.js
exports.logAuthAttempt = (req, res, next) => {
  const logger = require('../utils/logger');
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  if (req.path === '/login' && req.method === 'POST') {
    logger.info(`Login attempt from ${ip} for email ${req.body.email}`);
  }
  
  if (req.path === '/register' && req.method === 'POST') {
    logger.info(`Registration attempt from ${ip} for email ${req.body.email}`);
  }
  
  next();
};