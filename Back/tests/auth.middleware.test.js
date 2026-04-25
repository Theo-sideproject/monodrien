const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { authMiddleware, optionalAuth } = require('../src/middleware/auth');

// Configuration de la base de test
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;
  let testUser;
  let validToken;

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    
    // Créer un utilisateur de test
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    });
    await testUser.save();

    // Générer un token valide
    validToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // Mock des objets req, res, next
    mockReq = {
      header: jest.fn()
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    describe('Token validation', () => {
      it('devrait authentifier avec un token valide', async () => {
        mockReq.header.mockReturnValue(`Bearer ${validToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user._id.toString()).toBe(testUser._id.toString());
        expect(mockReq.user.username).toBe('testuser');
        expect(mockReq.user.password).toBeUndefined(); // Mot de passe exclu
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('devrait rejeter une requête sans token', async () => {
        mockReq.header.mockReturnValue(undefined);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token d\'accès requis'
        });
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockReq.user).toBeUndefined();
      });

      it('devrait rejeter un token sans Bearer prefix', async () => {
        mockReq.header.mockReturnValue(validToken); // Sans "Bearer "
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token invalide'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('devrait rejeter un token invalide', async () => {
        mockReq.header.mockReturnValue('Bearer invalid-token');
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token invalide'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('devrait rejeter un token expiré', async () => {
        const expiredToken = jwt.sign(
          { userId: testUser._id },
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '-1h' } // Expiré
        );
        
        mockReq.header.mockReturnValue(`Bearer ${expiredToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token expiré'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('devrait rejeter un token avec une signature invalide', async () => {
        const invalidSignatureToken = jwt.sign(
          { userId: testUser._id },
          'wrong-secret' // Mauvaise clé
        );
        
        mockReq.header.mockReturnValue(`Bearer ${invalidSignatureToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token invalide'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('devrait rejeter un token avec un userId inexistant', async () => {
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const tokenWithInvalidUser = jwt.sign(
          { userId: nonExistentUserId },
          process.env.JWT_SECRET || 'fallback_secret'
        );
        
        mockReq.header.mockReturnValue(`Bearer ${tokenWithInvalidUser}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token invalide ou utilisateur inactif'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('devrait rejeter un token d\'utilisateur inactif', async () => {
        // Désactiver l'utilisateur
        testUser.isActive = false;
        await testUser.save();
        
        mockReq.header.mockReturnValue(`Bearer ${validToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token invalide ou utilisateur inactif'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Header parsing', () => {
      it('devrait gérer différents formats d\'Authorization header', async () => {
        const testCases = [
          `Bearer ${validToken}`,
          `bearer ${validToken}`,
          `BEARER ${validToken}`
        ];

        for (const authHeader of testCases) {
          mockReq.header.mockReturnValue(authHeader);
          mockNext.mockClear();
          
          await authMiddleware(mockReq, mockRes, mockNext);
          
          expect(mockNext).toHaveBeenCalledWith();
          expect(mockReq.user).toBeDefined();
        }
      });

      it('devrait gérer les espaces supplémentaires', async () => {
        mockReq.header.mockReturnValue(`  Bearer   ${validToken}  `);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.user).toBeDefined();
      });

      it('devrait rejeter les tokens malformés', async () => {
        const malformedTokens = [
          'Bearer',
          'Bearer ',
          `Basic ${validToken}`,
          `Token ${validToken}`,
          validToken // Sans préfixe
        ];

        for (const malformedToken of malformedTokens) {
          mockReq.header.mockReturnValue(malformedToken);
          mockRes.status.mockClear();
          mockRes.json.mockClear();
          
          await authMiddleware(mockReq, mockRes, mockNext);
          
          expect(mockRes.status).toHaveBeenCalledWith(401);
          expect(mockNext).not.toHaveBeenCalled();
        }
      });
    });

    describe('Error handling', () => {
      it('devrait gérer les erreurs de base de données', async () => {
        // Mock User.findById pour simuler une erreur DB
        const originalFindById = User.findById;
        User.findById = jest.fn().mockRejectedValue(new Error('Database error'));
        
        mockReq.header.mockReturnValue(`Bearer ${validToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Erreur serveur'
        });
        expect(mockNext).not.toHaveBeenCalled();
        
        // Restaurer la fonction originale
        User.findById = originalFindById;
      });

      it('devrait logger les erreurs serveur', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Mock User.findById pour simuler une erreur
        const originalFindById = User.findById;
        const dbError = new Error('Database connection failed');
        User.findById = jest.fn().mockRejectedValue(dbError);
        
        mockReq.header.mockReturnValue(`Bearer ${validToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(consoleSpy).toHaveBeenCalledWith('Erreur d\'authentification:', dbError);
        
        // Nettoyage
        consoleSpy.mockRestore();
        User.findById = originalFindById;
      });
    });

    describe('User data security', () => {
      it('ne devrait pas inclure le mot de passe dans req.user', async () => {
        mockReq.header.mockReturnValue(`Bearer ${validToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.user.password).toBeUndefined();
        expect(mockReq.user.username).toBeDefined();
        expect(mockReq.user.email).toBeDefined();
      });

      it('devrait inclure toutes les autres données utilisateur', async () => {
        mockReq.header.mockReturnValue(`Bearer ${validToken}`);
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.user._id).toBeDefined();
        expect(mockReq.user.username).toBe('testuser');
        expect(mockReq.user.email).toBe('test@example.com');
        expect(mockReq.user.isActive).toBe(true);
        expect(mockReq.user.stats).toBeDefined();
        expect(mockReq.user.preferences).toBeDefined();
      });
    });
  });

  describe('optionalAuth', () => {
    it('devrait authentifier avec un token valide', async () => {
      mockReq.header.mockReturnValue(`Bearer ${validToken}`);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user._id.toString()).toBe(testUser._id.toString());
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('devrait continuer sans erreur si pas de token', async () => {
      mockReq.header.mockReturnValue(undefined);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('devrait continuer sans erreur avec un token invalide', async () => {
      mockReq.header.mockReturnValue('Bearer invalid-token');
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('devrait continuer sans erreur avec un token expiré', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '-1h' }
      );
      
      mockReq.header.mockReturnValue(`Bearer ${expiredToken}`);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('devrait continuer sans erreur avec un utilisateur inexistant', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      const tokenWithInvalidUser = jwt.sign(
        { userId: nonExistentUserId },
        process.env.JWT_SECRET || 'fallback_secret'
      );
      
      mockReq.header.mockReturnValue(`Bearer ${tokenWithInvalidUser}`);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('devrait ignorer un utilisateur inactif', async () => {
      // Désactiver l'utilisateur
      testUser.isActive = false;
      await testUser.save();
      
      mockReq.header.mockReturnValue(`Bearer ${validToken}`);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('devrait gérer les erreurs de base de données silencieusement', async () => {
      // Mock User.findById pour simuler une erreur DB
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));
      
      mockReq.header.mockReturnValue(`Bearer ${validToken}`);
      
      await optionalAuth(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      
      // Restaurer la fonction originale
      User.findById = originalFindById;
    });
  });

  describe('JWT Secret Management', () => {
    it('devrait utiliser JWT_SECRET de l\'environnement', async () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';
      
      const customToken = jwt.sign(
        { userId: testUser._id },
        'test-secret'
      );
      
      mockReq.header.mockReturnValue(`Bearer ${customToken}`);
      
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      
      // Restaurer
      process.env.JWT_SECRET = originalSecret;
    });

    it('devrait utiliser fallback_secret si JWT_SECRET n\'est pas défini', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      const fallbackToken = jwt.sign(
        { userId: testUser._id },
        'fallback_secret'
      );
      
      mockReq.header.mockReturnValue(`Bearer ${fallbackToken}`);
      
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
      
      // Restaurer
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('Edge Cases', () => {
    it('devrait gérer les tokens JWT malformés', async () => {
      const malformedTokens = [
        'Bearer eyJ.invalid.token',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header seulement
        'Bearer .',
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..' // Payload vide
      ];

      for (const token of malformedTokens) {
        mockReq.header.mockReturnValue(token);
        mockRes.status.mockClear();
        mockRes.json.mockClear();
        
        await authMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Token invalide'
        });
      }
    });

    it('devrait gérer les tokens sans userId', async () => {
      const tokenWithoutUserId = jwt.sign(
        { differentField: 'value' },
        process.env.JWT_SECRET || 'fallback_secret'
      );
      
      mockReq.header.mockReturnValue(`Bearer ${tokenWithoutUserId}`);
      
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token invalide ou utilisateur inactif'
      });
    });

    it('devrait gérer les ObjectId invalides', async () => {
      const tokenWithInvalidObjectId = jwt.sign(
        { userId: 'invalid-object-id' },
        process.env.JWT_SECRET || 'fallback_secret'
      );
      
      mockReq.header.mockReturnValue(`Bearer ${tokenWithInvalidObjectId}`);
      
      await authMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Erreur serveur'
      });
    });
  });
});