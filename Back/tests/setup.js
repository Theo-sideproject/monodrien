// Configuration globale pour les tests
const mongoose = require('mongoose');

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRE = '1h';
process.env.MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';

// Configuration des timeouts pour les tests
jest.setTimeout(30000);

// Mock console.log pour les tests (optionnel)
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Fonction utilitaire pour nettoyer la base de test
global.cleanupDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
};

// Fonction utilitaire pour créer un utilisateur de test
global.createTestUser = async (userData = {}) => {
  const User = require('../src/models/User');
  const defaultUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
    ...userData
  };
  
  const user = new User(defaultUserData);
  await user.save();
  return user;
};

// Fonction utilitaire pour générer un token JWT
global.generateTestToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Configuration avant tous les tests
beforeAll(async () => {
  // Connexion à la base de test
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  }
});

// Nettoyage après tous les tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

// Nettoyage entre chaque test suite
beforeEach(async () => {
  await global.cleanupDatabase();
});

// Gestion des erreurs non gérées dans les tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

module.exports = {
  cleanupDatabase: global.cleanupDatabase,
  createTestUser: global.createTestUser,
  generateTestToken: global.generateTestToken
};