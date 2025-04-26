// Enhanced error handler to provide more detailed errors
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);

  // MongoDB Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Key Error',
      details: `Duplicate value for ${Object.keys(err.keyValue).join(', ')}`,
      message: 'This organizer is already assigned to this event',
    });
  }

  // Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID Format',
      details: err.message,
    });
  }

  // Firebase Auth Error
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      error: 'Authentication Error',
      details: err.message,
    });
  }

  // Default error response
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path,
  });
};

module.exports = errorHandler;
