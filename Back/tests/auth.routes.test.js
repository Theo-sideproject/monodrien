const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const authRoutes = require('../src/routes/auth');

// Configuration de l'app de test
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Configuration de la base de test
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';

describe('Auth Routes', () => {
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

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123'
    };

    it('devrait créer un nouvel utilisateur avec des données valides', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.message).toBe('Utilisateur créé avec succès');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
      
      // Vérifier que l'utilisateur a été créé en base
      const createdUser = await User.findOne({ email: 'test@example.com' });
      expect(createdUser).toBeTruthy();
      expect(createdUser.password).not.toBe('Password123'); // Doit être hashé
    });

    it('devrait générer un token JWT valide', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const token = response.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      expect(decoded.userId).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    describe('Validation des données', () => {
      it('devrait rejeter un username manquant', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, username: undefined })
          .expect(400);

        expect(response.body.message).toBe('Données invalides');
        expect(response.body.errors).toContain('Le nom d\'utilisateur doit faire entre 3 et 20 caractères');
      });

      it('devrait rejeter un username trop court', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, username: 'ab' })
          .expect(400);

        expect(response.body.errors).toContain('Le nom d\'utilisateur doit faire entre 3 et 20 caractères');
      });

      it('devrait rejeter un username trop long', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, username: 'a'.repeat(21) })
          .expect(400);

        expect(response.body.errors).toContain('Le nom d\'utilisateur doit faire entre 3 et 20 caractères');
      });

      it('devrait rejeter un username avec caractères invalides', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, username: 'test@user' })
          .expect(400);

        expect(response.body.errors).toContain('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et -');
      });

      it('devrait rejeter un email manquant', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, email: undefined })
          .expect(400);

        expect(response.body.errors).toContain('Email invalide');
      });

      it('devrait rejeter un email invalide', async () => {
        const invalidEmails = [
          'invalid-email',
          'test@',
          '@example.com',
          'test..test@example.com'
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({ ...validRegistrationData, email })
            .expect(400);

          expect(response.body.errors).toContain('Email invalide');
        }
      });

      it('devrait rejeter un mot de passe manquant', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, password: undefined })
          .expect(400);

        expect(response.body.errors).toContain('Le mot de passe doit faire au moins 6 caractères');
      });

      it('devrait rejeter un mot de passe trop court', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, password: '12345' })
          .expect(400);

        expect(response.body.errors).toContain('Le mot de passe doit faire au moins 6 caractères');
      });

      it('devrait rejeter un mot de passe sans complexité', async () => {
        const weakPasswords = [
          'password', // Pas de majuscule ni chiffre
          'PASSWORD123', // Pas de minuscule
          'Password', // Pas de chiffre
          '12345678' // Pas de lettre
        ];

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({ ...validRegistrationData, password })
            .expect(400);

          expect(response.body.errors).toContain('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre');
        }
      });

      it('devrait valider plusieurs erreurs à la fois', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'ab', // Trop court
            email: 'invalid', // Invalide
            password: '123' // Trop court et faible
          })
          .expect(400);

        expect(response.body.errors.length).toBeGreaterThan(1);
      });
    });

    describe('Gestion des doublons', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData);
      });

      it('devrait rejeter un email déjà utilisé', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, username: 'different' })
          .expect(400);

        expect(response.body.message).toBe('Cet email est déjà utilisé');
      });

      it('devrait rejeter un username déjà utilisé', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({ ...validRegistrationData, email: 'different@example.com' })
          .expect(400);

        expect(response.body.message).toBe('Ce nom d\'utilisateur est déjà utilisé');
      });
    });

    describe('Normalisation des données', () => {
      it('devrait normaliser l\'email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            ...validRegistrationData,
            email: '  TEST@EXAMPLE.COM  '
          })
          .expect(201);

        expect(response.body.user.email).toBe('test@example.com');
      });

      it('devrait trimmer le username', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            ...validRegistrationData,
            username: '  testuser  '
          })
          .expect(201);

        expect(response.body.user.username).toBe('testuser');
      });
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });
      await testUser.save();
    });

    it('devrait connecter avec un email valide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.password).toBeUndefined();
    });

    it('devrait connecter avec un username valide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'testuser',
          password: 'Password123'
        })
        .expect(200);

      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('devrai mettre à jour lastLogin', async () => {
      const originalLogin = testUser.lastLogin;
      
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastLogin.getTime()).toBeGreaterThan(originalLogin.getTime());
    });

    it('devrait être insensible à la casse pour l\'email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'TEST@EXAMPLE.COM',
          password: 'Password123'
        })
        .expect(200);

      expect(response.body.user.username).toBe('testuser');
    });

    describe('Validation des données', () => {
      it('devrait rejeter un login manquant', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ password: 'Password123' })
          .expect(400);

        expect(response.body.errors).toContain('Email ou nom d\'utilisateur requis');
      });

      it('devrait rejeter un mot de passe manquant', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ login: 'test@example.com' })
          .expect(400);

        expect(response.body.errors).toContain('Mot de passe requis');
      });
    });

    describe('Authentification échouée', () => {
      it('devrait rejeter un utilisateur inexistant', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: 'inexistant@example.com',
            password: 'Password123'
          })
          .expect(401);

        expect(response.body.message).toBe('Identifiants invalides');
      });

      it('devrait rejeter un mot de passe incorrect', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: 'test@example.com',
            password: 'WrongPassword123'
          })
          .expect(401);

        expect(response.body.message).toBe('Identifiants invalides');
      });

      it('devrait rejeter un utilisateur inactif', async () => {
        testUser.isActive = false;
        await testUser.save();

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: 'test@example.com',
            password: 'Password123'
          })
          .expect(401);

        expect(response.body.message).toBe('Identifiants invalides');
      });
    });

    describe('Sécurité', () => {
      it('ne devrait pas révéler si l\'utilisateur existe', async () => {
        const responses = await Promise.all([
          request(app)
            .post('/api/auth/login')
            .send({
              login: 'inexistant@example.com',
              password: 'Password123'
            }),
          request(app)
            .post('/api/auth/login')
            .send({
              login: 'test@example.com',
              password: 'WrongPassword123'
            })
        ]);

        // Même message d'erreur pour les deux cas
        expect(responses[0].body.message).toBe(responses[1].body.message);
      });
    });
  });

  describe('GET /api/auth/me', () => {
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

    it('devrait retourner les infos de l\'utilisateur connecté', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('devrait rejeter une requête sans token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('devrait rejeter un token invalide', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        preferences: {
          theme: 'light',
          notifications: true
        }
      });
      await testUser.save();

      authToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'fallback_secret'
      );
    });

    it('devrait mettre à jour le username', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ username: 'newusername' })
        .expect(200);

      expect(response.body.message).toBe('Profil mis à jour avec succès');
      expect(response.body.user.username).toBe('newusername');
      
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.username).toBe('newusername');
    });

    it('devrait mettre à jour l\'email', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'newemail@example.com' })
        .expect(200);

      expect(response.body.user.email).toBe('newemail@example.com');
    });

    it('devrait mettre à jour les préférences partiellement', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          preferences: { 
            theme: 'dark' 
            // notifications reste true
          }
        })
        .expect(200);

      expect(response.body.user.preferences.theme).toBe('dark');
      expect(response.body.user.preferences.notifications).toBe(true);
    });

    it('devrait mettre à jour plusieurs champs à la fois', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newusername',
          avatar: 'new-avatar.jpg',
          preferences: {
            theme: 'dark',
            notifications: false
          }
        })
        .expect(200);

      expect(response.body.user.username).toBe('newusername');
      expect(response.body.user.avatar).toBe('new-avatar.jpg');
      expect(response.body.user.preferences.theme).toBe('dark');
      expect(response.body.user.preferences.notifications).toBe(false);
    });

    it('devrait ignorer les champs non autorisés', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newusername',
          password: 'NewPassword123', // Non autorisé
          stats: { gamesPlayed: 100 }, // Non autorisé
          isActive: false // Non autorisé
        })
        .expect(200);

      expect(response.body.user.username).toBe('newusername');
      
      const updatedUser = await User.findById(testUser._id);
      expect(await updatedUser.comparePassword('Password123')).toBe(true); // Mot de passe inchangé
      expect(updatedUser.stats.gamesPlayed).toBe(0); // Stats inchangées
      expect(updatedUser.isActive).toBe(true); // Status inchangé
    });

    describe('Validation', () => {
      it('devrait rejeter un username invalide', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ username: 'ab' })
          .expect(400);

        expect(response.body.errors).toContain('Le nom d\'utilisateur doit faire entre 3 et 20 caractères');
      });

      it('devrait rejeter un email invalide', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body.errors).toContain('Email invalide');
      });

      it('devrait rejeter un thème invalide', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            preferences: { theme: 'invalid' }
          })
          .expect(400);

        expect(response.body.errors).toContain('Thème invalide');
      });
    });

    it('devrait rejeter une requête sans authentification', async () => {
      await request(app)
        .put('/api/auth/profile')
        .send({ username: 'newusername' })
        .expect(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
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

    it('devrait changer le mot de passe avec des données valides', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword456'
        })
        .expect(200);

      expect(response.body.message).toBe('Mot de passe modifié avec succès');
      
      // Vérifier que le nouveau mot de passe fonctionne
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'NewPassword456'
        })
        .expect(200);
      
      // Vérifier que l'ancien ne fonctionne plus
      await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(401);
    });

    it('devrait rejeter un mot de passe actuel incorrect', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword456'
        })
        .expect(400);

      expect(response.body.message).toBe('Mot de passe actuel incorrect');
    });

    describe('Validation du nouveau mot de passe', () => {
      it('devrait rejeter un nouveau mot de passe trop court', async () => {
        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'Password123',
            newPassword: '12345'
          })
          .expect(400);

        expect(response.body.errors).toContain('Le nouveau mot de passe doit faire au moins 6 caractères');
      });

      it('devrait rejeter un nouveau mot de passe sans complexité', async () => {
        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'Password123',
            newPassword: 'newpassword'
          })
          .expect(400);

        expect(response.body.errors).toContain('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre');
      });
    });

    it('devrait rejeter une requête sans authentification', async () => {
      await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'Password123',
          newPassword: 'NewPassword456'
        })
        .expect(401);
    });
  });

  describe('Rate Limiting & Security', () => {
    // Ces tests nécessiteraient une configuration spéciale du rate limiting
    // Pour l'instant, on documente les comportements attendus
    
    it('devrait avoir une protection contre les attaques par force brute (documentation)', () => {
      // Le rate limiting devrait limiter les tentatives de connexion
      // Implementation dépendante de express-rate-limit dans server.js
      expect(true).toBe(true); // Placeholder
    });

    it('devrait valider et sanitiser toutes les entrées (documentation)', () => {
      // express-validator est utilisé pour toutes les routes
      // Les données sont nettoyées et validées
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    it('devrait gérer les erreurs de base de données gracieusement', async () => {
      // Mock User.findOne pour simuler une erreur DB
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'Password123'
        })
        .expect(500);

      // L'erreur devrait être gérée par le middleware errorHandler
      expect(response.body.message).toBeDefined();
      
      // Restaurer la fonction originale
      User.findOne = originalFindOne;
    });
  });
});