exports.handleErrors = (err, req, res, next) => {
  console.error(err.stack);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN' 
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: Object.values(err.errors).map(e => e.message),
      code: 'VALIDATION_ERROR' 
    });
  }

  // Custom error code handling
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message,
    code: err.code || 'SERVER_ERROR'
  });
};