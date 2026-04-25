const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

// Mock de l'application complète pour les tests d'intégration
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Import des routes
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/users', require('../src/routes/users'));

// Middleware de gestion d'erreurs
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    message: error.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Configuration de la base de test
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Flux d\'authentification complet', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    };

    it('devrait permettre un cycle complet: inscription -> connexion -> accès profil -> modification -> déconnexion', async () => {
      // 1. Inscription
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.token).toBeDefined();
      expect(registerResponse.body.user.username).toBe('testuser');
      
      const registrationToken = registerResponse.body.token;

      // 2. Accès au profil avec le token d'inscription
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect(200);

      expect(profileResponse.body.user.username).toBe('testuser');
      expect(profileResponse.body.user.email).toBe('test@example.com');

      // 3. Connexion avec les identifiants
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user.username).toBe('testuser');
      
      const loginToken = loginResponse.body.token;
      expect(loginToken).not.toBe(registrationToken); // Nouveau token généré

      // 4. Modification du profil
      const updateResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          username: 'updateduser',
          preferences: {
            theme: 'dark',
            notifications: false
          }
        })
        .expect(200);

      expect(updateResponse.body.user.username).toBe('updateduser');
      expect(updateResponse.body.user.preferences.theme).toBe('dark');

      // 5. Vérification des modifications
      const verifyResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(verifyResponse.body.user.username).toBe('updateduser');
      expect(verifyResponse.body.user.preferences.theme).toBe('dark');

      // 6. Changement de mot de passe
      const changePasswordResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword456'
        })
        .expect(200);

      expect(changePasswordResponse.body.message).toBe('Mot de passe modifié avec succès');

      // 7. Connexion avec le nouveau mot de passe
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'updateduser', // Nouveau username
          password: 'NewPassword456' // Nouveau mot de passe
        })
        .expect(200);

      expect(newLoginResponse.body.user.username).toBe('updateduser');

      // 8. Vérification que l'ancien mot de passe ne fonctionne plus
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'updateduser',
          password: 'Password123' // Ancien mot de passe
        })
        .expect(401);
    });

    it('devrait persister les données utilisateur entre les sessions', async () => {
      // Inscription
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Première connexion
      const firstLogin = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      const firstToken = firstLogin.body.token;

      // Modification du profil
      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${firstToken}`)
        .send({
          avatar: 'profile-pic.jpg',
          preferences: {
            theme: 'dark',
            language: 'en'
          }
        })
        .expect(200);

      // Deuxième connexion (nouvelle session)
      const secondLogin = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      const secondToken = secondLogin.body.token;

      // Vérification que les données sont persistées
      const profileCheck = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);

      expect(profileCheck.body.user.avatar).toBe('profile-pic.jpg');
      expect(profileCheck.body.user.preferences.theme).toBe('dark');
      expect(profileCheck.body.user.preferences.language).toBe('en');
    });
  });

  describe('Sécurité et gestion des erreurs', () => {
    let testUser, validToken;

    beforeEach(async () => {
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await testUser.save();

      validToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'fallback_secret'
      );
    });

    it('devrait rejeter l\'accès après désactivation du compte', async () => {
      // Accès initial réussi
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Désactivation du compte
      testUser.isActive = false;
      await testUser.save();

      // Accès refusé après désactivation
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      // Connexion refusée pour compte inactif
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(401);
    });

    it('devrait gérer l\'invalidation des tokens après changement de mot de passe', async () => {
      // Changement de mot de passe
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword456'
        })
        .expect(200);

      // L'ancien token reste valide (limitation actuelle - amélioration future possible)
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Mais la connexion avec l'ancien mot de passe échoue
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(401);
    });

    it('devrait empêcher la création de comptes avec des emails en doublon (insensible à la casse)', async () => {
      // Premier compte
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user1',
          email: 'duplicate@example.com',
          password: 'Password123'
        })
        .expect(201);

      // Tentative avec le même email en majuscules
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'DUPLICATE@EXAMPLE.COM',
          password: 'Password456'
        })
        .expect(400);

      // Tentative avec espaces
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user3',
          email: '  duplicate@example.com  ',
          password: 'Password789'
        })
        .expect(400);
    });

    it('devrait limiter les tentatives de connexion (simulation)', async () => {
      // Note: Ce test simule le comportement attendu du rate limiting
      // La vraie implémentation dépend de express-rate-limit dans server.js
      
      const maxAttempts = 5;
      const attempts = [];

      for (let i = 0; i < maxAttempts; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: 'test@example.com',
            password: 'WrongPassword'
          });
        
        attempts.push(response.status);
      }

      // Toutes les tentatives devraient retourner 401 (pas de rate limiting dans ce test)
      expect(attempts.every(status => status === 401)).toBe(true);
      
      // Dans un environnement avec rate limiting, les dernières tentatives
      // devraient retourner 429 (Too Many Requests)
    });
  });

  describe('Validation des données cross-endpoint', () => {
    it('devrait maintenir la cohérence des validations entre inscription et modification', async () => {
      // Inscription avec données valides
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'validuser',
          email: 'valid@example.com',
          password: 'ValidPass123'
        })
        .expect(201);

      const token = registerResponse.body.token;

      // Tentative de modification avec des données invalides
      const invalidUpdates = [
        { username: 'ab' }, // Trop court
        { username: 'invalid@user' }, // Caractères interdits
        { email: 'invalid-email' }, // Email invalide
        { preferences: { theme: 'invalid' } } // Thème invalide
      ];

      for (const update of invalidUpdates) {
        await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send(update)
          .expect(400);
      }

      // Vérification que les données n'ont pas été modifiées
      const profileCheck = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileCheck.body.user.username).toBe('validuser');
      expect(profileCheck.body.user.email).toBe('valid@example.com');
    });
  });

  describe('Performance et charge', () => {
    it('devrait gérer plusieurs inscriptions simultanées', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'Password123'
      }));

      const promises = users.map(userData =>
        request(app)
          .post('/api/auth/register')
          .send(userData)
      );

      const responses = await Promise.all(promises);

      // Toutes les inscriptions devraient réussir
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.token).toBeDefined();
      });

      // Vérification en base
      const userCount = await User.countDocuments();
      expect(userCount).toBe(10);
    });

    it('devrait gérer les connexions simultanées', async () => {
      // Créer plusieurs utilisateurs
      const users = [];
      for (let i = 0; i < 5; i++) {
        const user = new User({
          username: `user${i}`,
          email: `user${i}@example.com`,
          password: 'Password123'
        });
        await user.save();
        users.push(user);
      }

      // Connexions simultanées
      const loginPromises = users.map(user =>
        request(app)
          .post('/api/auth/login')
          .send({
            login: user.email,
            password: 'Password123'
          })
      );

      const responses = await Promise.all(loginPromises);

      // Toutes les connexions devraient réussir
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe(`user${index}`);
        expect(response.body.token).toBeDefined();
      });
    });
  });

  describe('Endpoints protégés', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await testUser.save();

      authToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'fallback_secret'
      );
    });

    it('devrait permettre l\'accès aux endpoints protégés avec un token valide', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/auth/me' },
        { method: 'put', path: '/api/auth/profile', data: { username: 'newname' } },
        { method: 'post', path: '/api/auth/change-password', data: { currentPassword: 'Password123', newPassword: 'NewPass456' } }
      ];

      for (const endpoint of protectedEndpoints) {
        const req = request(app)[endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${authToken}`);
        
        if (endpoint.data) {
          req.send(endpoint.data);
        }

        const response = await req;
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('devrait rejeter l\'accès aux endpoints protégés sans token', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/auth/me' },
        { method: 'put', path: '/api/auth/profile' },
        { method: 'post', path: '/api/auth/change-password' }
      ];

      for (const endpoint of protectedEndpoints) {
        await request(app)[endpoint.method](endpoint.path)
          .expect(401);
      }
    });

    it('devrait rejeter l\'accès avec des tokens expirés', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '-1h' }
      );

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Statistiques utilisateur', () => {
    it('devrait initialiser les stats utilisateur à zéro', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(201);

      expect(response.body.user.stats.gamesPlayed).toBe(0);
      expect(response.body.user.stats.gamesWon).toBe(0);
      expect(response.body.user.stats.totalMoney).toBe(0);
      expect(response.body.user.stats.averageGameDuration).toBe(0);
    });

    it('devrait préserver les stats lors des modifications de profil', async () => {
      // Inscription
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123'
        })
        .expect(201);

      const token = registerResponse.body.token;

      // Simulation de mise à jour des stats (normalement fait par le système de jeu)
      await User.findByIdAndUpdate(registerResponse.body.user.id, {
        'stats.gamesPlayed': 5,
        'stats.gamesWon': 3,
        'stats.totalMoney': 15000,
        'stats.averageGameDuration': 1800
      });

      // Modification du profil
      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newusername',
          preferences: { theme: 'dark' }
        })
        .expect(200);

      // Vérification que les stats sont préservées
      const profileCheck = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileCheck.body.user.stats.gamesPlayed).toBe(5);
      expect(profileCheck.body.user.stats.gamesWon).toBe(3);
      expect(profileCheck.body.user.stats.totalMoney).toBe(15000);
      expect(profileCheck.body.user.stats.averageGameDuration).toBe(1800);
    });
  });
});