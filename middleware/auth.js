const logger = require('../utils/logger');

// בדיקה אם המשתמש מחובר
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  logger.warn('Unauthorized access attempt', {
    path: req.path,
    ip: req.ip
  });
  
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Please log in to access this resource'
  });
};

// בדיקה אם המשתמש הוא admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.isAdmin) {
    return next();
  }
  
  logger.warn('Admin access attempt by non-admin user', {
    userId: req.session?.userId,
    path: req.path
  });
  
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Admin access required'
  });
};

// בדיקה אם יש פרופיל פעיל
const hasActiveProfile = (req, res, next) => {
  if (req.session && req.session.currentProfileId) {
    return next();
  }
  
  return res.status(400).json({
    error: 'No active profile',
    message: 'Please select a profile first'
  });
};

// הוספת מידע משתמש ל-request
const attachUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.session.userId).select('-password');
      
      if (user) {
        req.user = user;
        req.currentProfile = user.getCurrentProfile();
      }
    } catch (error) {
      logger.error('Error attaching user to request', error);
    }
  }
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  hasActiveProfile,
  attachUser
};