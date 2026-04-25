const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

// Configuration de l'app de test
const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/auth', require('../src/routes/auth'));

// Configuration de la base de test
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';

describe('Auth Performance Tests', () => {
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

  describe('Password Hashing Performance', () => {
    it('devrait hasher les mots de passe dans un temps raisonnable', async () => {
      const passwords = [
        'Password123',
        'ComplexPassword456!',
        'VeryLongPasswordWithManyCharacters789',
        'Short1!',
        'AnotherPassword2023'
      ];

      const startTime = Date.now();
      
      const hashPromises = passwords.map(password => 
        bcrypt.hash(password, 12)
      );
      
      await Promise.all(hashPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / passwords.length;

      // Le hachage bcrypt avec salt 12 devrait prendre entre 100ms et 2000ms par mot de passe
      expect(averageTime).toBeGreaterThan(50); // Au moins 50ms (sécurité)
      expect(averageTime).toBeLessThan(5000); // Moins de 5s (utilisabilité)
      
      console.log(`Temps moyen de hachage: ${averageTime.toFixed(2)}ms`);
    });

    it('devrait maintenir une performance constante pour différentes longueurs', async () => {
      const passwordLengths = [6, 12, 25, 50, 100];
      const times = [];

      for (const length of passwordLengths) {
        const password = 'A'.repeat(length - 1) + '1'; // Pour respecter la complexité
        
        const startTime = process.hrtime.bigint();
        await bcrypt.hash(password, 12);
        const endTime = process.hrtime.bigint();
        
        const timeMs = Number(endTime - startTime) / 1000000;
        times.push(timeMs);
      }

      // La variance ne devrait pas être trop importante
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = (maxTime - minTime) / minTime;

      expect(variance).toBeLessThan(2); // Moins de 200% de différence
      
      console.log('Temps par longueur:', passwordLengths.map((len, i) => 
        `${len}: ${times[i].toFixed(2)}ms`
      ).join(', '));
    });

    it('devrait résister aux attaques par timing lors de la comparaison', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'CorrectPassword123'
      });
      await user.save();

      const passwords = [
        'CorrectPassword123',
        'WrongPassword123',
        'CompletelyDifferent',
        '',
        'C', // Très court
        'A'.repeat(100) // Très long
      ];

      const times = [];

      for (const password of passwords) {
        const startTime = process.hrtime.bigint();
        await user.comparePassword(password);
        const endTime = process.hrtime.bigint();
        
        const timeMs = Number(endTime - startTime) / 1000000;
        times.push(timeMs);
      }

      // bcrypt devrait avoir des temps similaires indépendamment de l'input
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = (maxTime - minTime) / minTime;

      // Tolérance de 100% car les timings peuvent varier selon la charge système
      expect(variance).toBeLessThan(1);
      
      console.log('Temps de comparaison:', passwords.map((pwd, i) => 
        `"${pwd.substring(0, 10)}...": ${times[i].toFixed(2)}ms`
      ).join(', '));
    });
  });

  describe('JWT Performance', () => {
    it('devrait générer des tokens JWT rapidement', async () => {
      const userIds = Array.from({ length: 100 }, () => new mongoose.Types.ObjectId());
      
      const startTime = Date.now();
      
      const tokens = userIds.map(userId => 
        jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret')
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / userIds.length;

      expect(averageTime).toBeLessThan(10); // Moins de 10ms par token
      expect(tokens).toHaveLength(100);
      expect(new Set(tokens).size).toBe(100); // Tous uniques
      
      console.log(`Génération JWT - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });

    it('devrait vérifier des tokens JWT rapidement', async () => {
      const tokens = Array.from({ length: 100 }, () => 
        jwt.sign(
          { userId: new mongoose.Types.ObjectId() },
          process.env.JWT_SECRET || 'fallback_secret'
        )
      );
      
      const startTime = Date.now();
      
      const verifications = tokens.map(token => {
        try {
          return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        } catch (error) {
          return null;
        }
      });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / tokens.length;

      expect(averageTime).toBeLessThan(5); // Moins de 5ms par vérification
      expect(verifications.filter(v => v !== null)).toHaveLength(100);
      
      console.log(`Vérification JWT - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Database Performance', () => {
    it('devrait gérer des recherches d\'utilisateurs rapides', async () => {
      // Créer plusieurs utilisateurs
      const users = await Promise.all(
        Array.from({ length: 50 }, (_, i) => 
          new User({
            username: `user${i}`,
            email: `user${i}@example.com`,
            password: 'Password123'
          }).save()
        )
      );

      const emails = users.map(user => user.email);
      
      const startTime = Date.now();
      
      // Rechercher tous les utilisateurs par email
      const foundUsers = await Promise.all(
        emails.map(email => User.findOne({ email }))
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / emails.length;

      expect(averageTime).toBeLessThan(50); // Moins de 50ms par recherche
      expect(foundUsers.filter(u => u !== null)).toHaveLength(50);
      
      console.log(`Recherche utilisateur - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });

    it('devrait gérer les créations d\'utilisateurs concurrentes', async () => {
      const userCount = 20;
      const users = Array.from({ length: userCount }, (_, i) => ({
        username: `concurrentuser${i}`,
        email: `concurrent${i}@example.com`,
        password: 'Password123'
      }));

      const startTime = Date.now();
      
      const createdUsers = await Promise.all(
        users.map(userData => new User(userData).save())
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / userCount;

      expect(averageTime).toBeLessThan(500); // Moins de 500ms par création (plus réaliste)
      expect(createdUsers).toHaveLength(userCount);
      
      // Vérifier que tous ont des mots de passe différents (salt unique)
      const passwords = createdUsers.map(user => user.password);
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBe(userCount);
      
      console.log(`Création concurrente - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('API Endpoint Performance', () => {
    it('devrait gérer les inscriptions rapidement', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        username: `perfuser${i}`,
        email: `perf${i}@example.com`,
        password: 'Password123'
      }));

      const startTime = Date.now();
      
      const responses = await Promise.all(
        users.map(userData =>
          request(app)
            .post('/api/auth/register')
            .send(userData)
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / users.length;

      expect(averageTime).toBeLessThan(1000); // Moins de 1s par inscription
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.token).toBeDefined();
      });
      
      console.log(`Inscription API - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });

    it('devrait gérer les connexions rapidement', async () => {
      // Créer des utilisateurs de test
      const users = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          new User({
            username: `loginuser${i}`,
            email: `login${i}@example.com`,
            password: 'Password123'
          }).save()
        )
      );

      const startTime = Date.now();
      
      const responses = await Promise.all(
        users.map(user =>
          request(app)
            .post('/api/auth/login')
            .send({
              login: user.email,
              password: 'Password123'
            })
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / users.length;

      expect(averageTime).toBeLessThan(500); // Moins de 500ms par connexion
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
      });
      
      console.log(`Connexion API - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });

    it('devrait gérer les accès au profil rapidement', async () => {
      // Créer un utilisateur
      const user = new User({
        username: 'profileuser',
        email: 'profile@example.com',
        password: 'Password123'
      });
      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'fallback_secret'
      );

      const requestCount = 20;
      const startTime = Date.now();
      
      const responses = await Promise.all(
        Array.from({ length: requestCount }, () =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;

      expect(averageTime).toBeLessThan(100); // Moins de 100ms par accès profil
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe('profileuser');
      });
      
      console.log(`Accès profil - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('ne devrait pas fuiter de mémoire lors de créations multiples', async () => {
      const initialMemory = process.memoryUsage();
      
      // Créer et supprimer beaucoup d'utilisateurs
      for (let batch = 0; batch < 5; batch++) {
        const users = await Promise.all(
          Array.from({ length: 20 }, (_, i) =>
            new User({
              username: `memuser${batch}_${i}`,
              email: `mem${batch}_${i}@example.com`,
              password: 'Password123'
            }).save()
          )
        );
        
        // Supprimer immédiatement
        await Promise.all(users.map(user => user.deleteOne()));
        
        // Forcer le garbage collection si disponible
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseRatio = memoryIncrease / initialMemory.heapUsed;

      // L'augmentation de mémoire ne devrait pas dépasser 50%
      expect(memoryIncreaseRatio).toBeLessThan(0.5);
      
      console.log(`Utilisation mémoire - Augmentation: ${(memoryIncreaseRatio * 100).toFixed(2)}%`);
    });

    it('devrait gérer les connexions MongoDB efficacement', async () => {
      const connectionsBefore = mongoose.connection.db?.serverConfig?.s?.pool?.totalConnectionCount || 0;
      
      // Effectuer beaucoup d'opérations
      await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          User.findOne({ email: `nonexistent${i}@example.com` })
        )
      );
      
      const connectionsAfter = mongoose.connection.db?.serverConfig?.s?.pool?.totalConnectionCount || 0;
      const connectionIncrease = connectionsAfter - connectionsBefore;

      // Ne devrait pas créer de nouvelles connexions pour des opérations simples
      expect(connectionIncrease).toBeLessThanOrEqual(1);
      
      console.log(`Connexions MongoDB - Avant: ${connectionsBefore}, Après: ${connectionsAfter}`);
    });
  });

  describe('Stress Testing', () => {
    it('devrait survivre à une charge importante de connexions échouées', async () => {
      const attemptCount = 100;
      const startTime = Date.now();
      
      const responses = await Promise.all(
        Array.from({ length: attemptCount }, (_, i) =>
          request(app)
            .post('/api/auth/login')
            .send({
              login: `nonexistent${i}@example.com`,
              password: 'WrongPassword123'
            })
        )
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / attemptCount;

      // Toutes les tentatives devraient échouer proprement
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Identifiants invalides');
      });

      // Le système devrait rester réactif même sous charge
      expect(averageTime).toBeLessThan(200);
      
      console.log(`Stress test connexions - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });

    it('devrait gérer les validations multiples sans dégradation', async () => {
      const invalidData = [
        { username: '', email: 'test@example.com', password: 'Password123' },
        { username: 'ab', email: 'test@example.com', password: 'Password123' },
        { username: 'testuser', email: 'invalid-email', password: 'Password123' },
        { username: 'testuser', email: 'test@example.com', password: '123' },
        { username: 'test@user', email: 'test@example.com', password: 'Password123' }
      ];

      const attemptCount = 20;
      const requests = [];
      
      for (let i = 0; i < attemptCount; i++) {
        const dataIndex = i % invalidData.length;
        const invalidDataItem = invalidData[dataIndex];
        requests.push(
          request(app)
            .post('/api/auth/register')
            .send(invalidDataItem) // Utiliser les données invalides sans modification
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / attemptCount;

      // Toutes les validations devraient échouer rapidement
      responses.forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body.errors || response.body.message).toBeDefined();
      });

      expect(averageTime).toBeLessThan(100);
      
      console.log(`Stress test validation - Temps moyen: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Scalability Tests', () => {
    it('devrait maintenir les performances avec une base de données chargée', async () => {
      // Créer beaucoup d'utilisateurs en base
      const baseUsers = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          new User({
            username: `baseuser${i}`,
            email: `base${i}@example.com`,
            password: 'Password123'
          }).save()
        )
      );

      // Mesurer les performances avec la base chargée
      const testUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123'
      };

      const startTime = Date.now();
      
      // Inscription
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      // Connexion
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          login: testUser.email,
          password: testUser.password
        });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(registerResponse.status).toBe(201);
      expect(loginResponse.status).toBe(200);
      expect(totalTime).toBeLessThan(2000); // Moins de 2s pour inscription + connexion
      
      console.log(`Performance avec base chargée - Temps total: ${totalTime}ms`);
      
      // Nettoyer
      await User.deleteMany({ username: { $regex: /^baseuser/ } });
    });
  });
});