const errorHandler = (err, req, res, next) => {
  console.error('🔥 Erreur:', err.stack);
  
  // Erreurs de validation Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      message: 'Erreur de validation',
      errors: errors
    });
  }
  
  // Erreur de duplication (email/username déjà utilisé)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      message: `${field === 'email' ? 'Email' : 'Nom d\'utilisateur'} déjà utilisé: ${value}`
    });
  }
  
  // Erreur de cast MongoDB (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'ID invalide'
    });
  }
  
  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token invalide'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expiré'
    });
  }
  
  // Erreurs personnalisées
  if (err.status) {
    return res.status(err.status).json({
      message: err.message
    });
  }
  
  // Erreur par défaut
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Erreur serveur interne' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler; 