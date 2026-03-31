const { ObjectId } = require('mongodb');

/**
 * Middleware to validate ObjectId parameters
 * Usage: app.get('/api/resource/:id', validateObjectId('id'), handler)
 */
function validateObjectId(...paramNames) {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName] || req.body[paramName];
      if (value && !ObjectId.isValid(value)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid ${paramName}: must be a valid ObjectId` 
        });
      }
    }
    next();
  };
}

/**
 * Sanitize user input to prevent NoSQL injection
 * Removes MongoDB operators from objects
 */
function sanitizeInput(obj) {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      // Remove MongoDB operators
      if (key.startsWith('$')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitizeInput(obj[key]);
      }
    });
  }
  return obj;
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 */
function sanitizeQuery(req, res, next) {
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
function validatePassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

module.exports = {
  validateObjectId,
  sanitizeInput,
  sanitizeBody,
  sanitizeQuery,
  validateEmail,
  validatePassword
};
