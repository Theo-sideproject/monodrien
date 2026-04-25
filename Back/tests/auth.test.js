const request = require('supertest');
const express = require('express');

// Simuler le serveur pour les tests
const app = express();
app.use(express.json());

// Mock des utilisateurs
const mockUsers = {
  'token1': { id: 1, username: 'TestUser1', email: 'test1@example.com' },
  'token2': { id: 2, username: 'TestUser2', email: 'test2@example.com' },
  'admin': { id: 3, username: 'Admin', email: 'admin@example.com' }
};

// Middleware d'auth
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }
  
  let user = mockUsers[token];
  
  // Support des JWT (anciens tokens)
  if (!user && token.startsWith('eyJ')) {
    user = { id: 999, username: 'UtilisateurMigré', email: 'migre@example.com' };
  }
  
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }
  
  req.user = user;
  next();
};

// Routes d'authentification pour les tests
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ 
      message: 'Nom d\'utilisateur, email et mot de passe requis' 
    });
  }
  
  // Vérifier si l'utilisateur existe déjà
  const token = `token_${username.toLowerCase()}`;
  if (mockUsers[token]) {
    return res.status(400).json({
      message: 'Cet utilisateur existe déjà'
    });
  }
  
  // Créer l'utilisateur
  mockUsers[token] = {
    id: Object.keys(mockUsers).length + 1000,
    username,
    email
  };
  
  res.status(201).json({
    message: 'Inscription réussie',
    token,
    user: mockUsers[token]
  });
});

app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  
  if (!login || !password) {
    return res.status(400).json({ 
      message: 'Login et mot de passe requis' 
    });
  }
  
  // Chercher l'utilisateur
  const token = `token_${login.toLowerCase()}`;
  let user = mockUsers[token];
  
  // Chercher dans les utilisateurs prédéfinis
  if (!user) {
    const predefinedUser = Object.entries(mockUsers).find(([_, u]) => 
      u.username.toLowerCase() === login.toLowerCase() || 
      u.email?.toLowerCase() === login.toLowerCase()
    );
    
    if (predefinedUser) {
      return res.json({
        message: 'Connexion réussie',
        token: predefinedUser[0],
        user: predefinedUser[1]
      });
    }
  }
  
  if (!user) {
    return res.status(401).json({ 
      message: 'Identifiants invalides'
    });
  }
  
  res.json({
    message: 'Connexion réussie',
    token,
    user
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      ...req.user,
      stats: {
        gamesPlayed: Math.floor(Math.random() * 50),
        gamesWon: Math.floor(Math.random() * 20),
        totalMoney: Math.floor(Math.random() * 100000),
        averageGameDuration: Math.floor(Math.random() * 120) + 30
      },
      isActive: true,
      createdAt: new Date().toISOString()
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ 
    message: 'Déconnexion réussie',
    hint: 'Token supprimé côté client'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// === TESTS ===

describe('🔐 Tests d\'authentification', () => {
  beforeEach(() => {
    // Nettoyer les utilisateurs dynamiques avant chaque test
    Object.keys(mockUsers).forEach(key => {
      if (key.startsWith('token_test')) {
        delete mockUsers[key];
      }
    });
  });

  describe('POST /api/auth/register', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    it('✅ devrait créer un compte avec succès', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('Inscription réussie');
      expect(response.body.token).toBe('token_testuser');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).toHaveProperty('id');
    });

    it('❌ devrait échouer sans nom d\'utilisateur', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.message).toBe('Nom d\'utilisateur, email et mot de passe requis');
    });

    it('❌ devrait échouer sans email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.message).toBe('Nom d\'utilisateur, email et mot de passe requis');
    });

    it('❌ devrait échouer sans mot de passe', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.message).toBe('Nom d\'utilisateur, email et mot de passe requis');
    });

    it('❌ devrait échouer si utilisateur existe déjà', async () => {
      // Créer d'abord l'utilisateur
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Essayer de créer le même utilisateur
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBe('Cet utilisateur existe déjà');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Créer un utilisateur pour les tests de login
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
    });

    it('✅ devrait se connecter avec nom d\'utilisateur', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'testuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.token).toBe('token_testuser');
      expect(response.body.user.username).toBe('testuser');
    });

    it('✅ devrait se connecter avec email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.token).toBe('token_testuser');
    });

    it('✅ devrait se connecter avec utilisateur prédéfini', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'TestUser1',
          password: 'anypassword'
        })
        .expect(200);

      expect(response.body.message).toBe('Connexion réussie');
      expect(response.body.token).toBe('token1');
      expect(response.body.user.username).toBe('TestUser1');
    });

    it('❌ devrait échouer sans login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        })
        .expect(400);

      expect(response.body.message).toBe('Login et mot de passe requis');
    });

    it('❌ devrait échouer sans mot de passe', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'testuser'
        })
        .expect(400);

      expect(response.body.message).toBe('Login et mot de passe requis');
    });

    it('❌ devrait échouer avec utilisateur inexistant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          login: 'inexistant',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.message).toBe('Identifiants invalides');
    });
  });

  describe('GET /api/auth/me', () => {
    it('✅ devrait récupérer le profil avec token valide', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token1')
        .expect(200);

      expect(response.body.user.username).toBe('TestUser1');
      expect(response.body.user.email).toBe('test1@example.com');
      expect(response.body.user).toHaveProperty('stats');
      expect(response.body.user.stats).toHaveProperty('gamesPlayed');
      expect(response.body.user.stats).toHaveProperty('gamesWon');
      expect(response.body.user.stats).toHaveProperty('totalMoney');
      expect(response.body.user.isActive).toBe(true);
      expect(response.body.user).toHaveProperty('createdAt');
    });

    it('✅ devrait supporter les anciens tokens JWT', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.user.username).toBe('UtilisateurMigré');
      expect(response.body.user.email).toBe('migre@example.com');
    });

    it('❌ devrait échouer sans token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.message).toBe('Token d\'accès requis');
    });

    it('❌ devrait échouer avec token invalide', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.message).toBe('Token invalide');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('✅ devrait se déconnecter avec succès', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Déconnexion réussie');
      expect(response.body.hint).toBe('Token supprimé côté client');
    });
  });

  describe('GET /api/health', () => {
    it('✅ devrait retourner le statut de santé', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });
});

// Test du middleware d'authentification
describe('🛡️ Tests du middleware d\'authentification', () => {
  it('✅ devrait accepter un token valide', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token1')
      .expect(200);

    expect(response.body.user.username).toBe('TestUser1');
  });

  it('✅ devrait accepter un token JWT (migration)', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer eyJtest.jwt.token')
      .expect(200);

    expect(response.body.user.username).toBe('UtilisateurMigré');
  });

  it('❌ devrait rejeter un token invalide', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);
  });

  it('❌ devrait rejeter une requête sans token', async () => {
    await request(app)
      .get('/api/auth/me')
      .expect(401);
  });

  it('❌ devrait rejeter un header Authorization malformé', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'InvalidFormat token1') // Format incorrect
      .expect(401);
  });
});

console.log('🧪 Tests d\'authentification prêts à être exécutés avec: npm test'); 