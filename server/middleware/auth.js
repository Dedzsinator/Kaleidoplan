const admin = require('firebase-admin');

// Middleware to authenticate Firebase token
exports.authenticateFirebaseToken = async (req, res, next) => {
  try {
    // Check for token in cookie first, then Authorization header
    const token = req.cookies.authToken || 
                  (req.headers.authorization && req.headers.authorization.split('Bearer ')[1]);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      
      // Add additional user data if needed
      next();
    } catch (error) {
      // Handle token expiration
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ error: 'Token expired', code: 'token-expired' });
      }
      
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid authentication' });
    }
  } catch (error) {
    next(error);
  }
};

// Middleware to authorize user roles
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You do not have permission to access this resource' 
      });
    }
    
    next();
  };
};