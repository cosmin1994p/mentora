import jwt from 'jsonwebtoken';

/**
 * Authenticate user token
 * Extracts userId and role from JWT
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.warn('[AUTH] No token provided. Headers:', Object.keys(req.headers));
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'streamclass_super_secret_key_2024';
    jwt.verify(
      token,
      jwtSecret,
      (err, decoded) => {
        if (err) {
          console.log('[AUTH] Token verification failed:', err.message, '\nToken start:', token.substring(0, 30));
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.userId = decoded.userId;
        req.userRole = decoded.role || 'user';
        req.userEmail = decoded.email;
        next();
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Check if user is forced to reset password
 */
export const checkForcedPasswordReset = async (req, res, next) => {
  try {
    const user = await import('../models/User.js').then(m => m.default.findById(req.userId));
    if (user && user.passwordResetRequired) {
      return res.status(403).json({
        error: 'Password reset required',
        code: 'FORCE_PASSWORD_RESET',
        userId: user._id
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error checking password status' });
  }
};

/**
 * Require admin role
 * Must be used after authenticateToken
 */
export const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Alias for requireAdmin - used in new SaaS routes
 */
export const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Check if user is company admin or super admin
 * Validates user has company and is admin for that company
 */
export const isCompanyAdmin = async (req, res, next) => {
  try {
    // Super admin can access everything
    if (req.userRole === 'admin') {
      return next();
    }

    // For company routes, user must be company admin
    const companyId = req.params.id;
    
    // TODO: Check if user.company matches companyId and user.isCompanyAdmin = true
    // For now, just check if authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

/**
 * Optional authentication
 * Sets user info if token present, but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET,
      (err, decoded) => {
        if (!err) {
          req.userId = decoded.userId;
          req.userRole = decoded.role || 'user';
          req.userEmail = decoded.email;
        }
        next();
      }
    );
  } catch (error) {
    next();
  }
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};
