const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de base
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting DESACTIVÉ pour les tests
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 99999, // Pratiquement illimité
  message: {
    message: 'Trop de requêtes, veuillez réessayer dans une minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // Skip complètement le rate limiting
  handler: (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log(`🚨 RATE LIMIT dépassé pour IP ${clientIp} sur ${req.originalUrl}`);
    console.log(`   Headers: ${JSON.stringify(req.headers)}`);
    console.log(`   User-Agent: ${req.get('User-Agent')}`);
    
    res.status(429).json({
      message: 'Trop de requêtes, veuillez réessayer dans une minute'
    });
  }
});

// Désactiver complètement le rate limiting
// app.use('/api/', limiter);

// Mock des utilisateurs en mémoire (pas de DB)
const mockUsers = {
  'token1': { id: 1, username: 'TestUser1', email: 'test1@example.com' },
  'token2': { id: 2, username: 'TestUser2', email: 'test2@example.com' },
  'admin': { id: 3, username: 'Admin', email: 'admin@example.com' },
  'player': { id: 4, username: 'Player', email: 'player@example.com' }
};

// Stockage des parties en mémoire
const gameStorage = new Map();

// === NOUVEAU : Gestion des lobbies ===
const lobbyStorage = new Map(); // Map<lobbyId, LobbyData>

// Structure d'un lobby
class Lobby {
  constructor(hostId, hostUsername) {
    this.id = `lobby_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.host = hostId;
    this.players = [{
      userId: hostId,
      username: hostUsername,
      isHost: true,
      joinedAt: new Date().toISOString()
    }];
    this.maxPlayers = 4;
    this.status = 'waiting'; // waiting, playing, finished
    this.createdAt = new Date().toISOString();
    this.settings = {
      gameMode: 'classique',
      maxPlayers: 4,
      isPrivate: false
    };
  }

  addPlayer(userId, username) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Lobby plein');
    }
    
    if (this.players.find(p => p.userId === userId)) {
      throw new Error('Vous êtes déjà dans ce lobby');
    }

    this.players.push({
      userId,
      username,
      isHost: false,
      joinedAt: new Date().toISOString()
    });

    return this;
  }

  removePlayer(userId) {
    const playerIndex = this.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) {
      throw new Error('Vous n\'êtes pas dans ce lobby');
    }

    const wasHost = this.players[playerIndex].isHost;
    this.players.splice(playerIndex, 1);

    // Si l'host quitte et qu'il reste des joueurs, promouvoir le suivant
    if (wasHost && this.players.length > 0) {
      this.players[0].isHost = true;
      this.host = this.players[0].userId;
    }

    return this;
  }

  toJSON() {
    return {
      id: this.id,
      host: this.host,
      players: this.players,
      maxPlayers: this.maxPlayers,
      status: this.status,
      createdAt: this.createdAt,
      settings: this.settings,
      currentPlayers: this.players.length
    };
  }
}

// Middleware d'auth simplifié (mock)
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  console.log(`🔐 Auth check - Token: ${token ? token.substring(0, 10) + '...' : 'aucun'}`);
  
  if (!token) {
    console.log('❌ Pas de token fourni');
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }
  
  // Vérifier d'abord les tokens simples (mock)
  let user = mockUsers[token];
  
  // Si pas trouvé et que c'est un JWT, utiliser un utilisateur par défaut
  if (!user && token.startsWith('eyJ')) {
    console.log('🔧 Token JWT détecté (ancien système) - utilisation utilisateur par défaut');
    user = { id: 999, username: 'UtilisateurMigré', email: 'migre@example.com' };
  }
  
  if (!user) {
    console.log('❌ Token invalide:', token.substring(0, 20) + '...');
    return res.status(401).json({ 
      message: 'Token invalide',
      hint: 'Utilisez un des tokens de test: token1, token2, admin, player'
    });
  }
  
  console.log('✅ Utilisateur authentifié:', user.username);
  req.user = user;
  next();
};

// === ROUTES LOBBIES ===

// POST /api/lobby/create - Créer un nouveau lobby
app.post('/api/lobby/create', authMiddleware, (req, res) => {
  console.log('🏠 Création de lobby par:', req.user.username);
  
  try {
    const lobby = new Lobby(req.user.id, req.user.username);
    lobbyStorage.set(lobby.id, lobby);
    
    console.log(`✅ Lobby ${lobby.id} créé avec succès`);
    
    res.status(201).json({
      message: 'Lobby créé avec succès',
      lobby: lobby.toJSON()
    });
  } catch (error) {
    console.error('❌ Erreur création lobby:', error.message);
    res.status(500).json({ message: 'Erreur lors de la création du lobby' });
  }
});

// POST /api/lobby/join - Rejoindre un lobby
app.post('/api/lobby/join', authMiddleware, (req, res) => {
  const { lobbyId } = req.body;
  
  console.log(`🚪 ${req.user.username} tente de rejoindre le lobby ${lobbyId}`);
  
  if (!lobbyId) {
    return res.status(400).json({ message: 'ID de lobby requis' });
  }
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    console.log(`❌ Lobby ${lobbyId} non trouvé`);
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  try {
    lobby.addPlayer(req.user.id, req.user.username);
    console.log(`✅ ${req.user.username} a rejoint le lobby ${lobbyId}`);
    
    res.json({
      message: 'Lobby rejoint avec succès',
      lobby: lobby.toJSON()
    });
  } catch (error) {
    console.error('❌ Erreur rejoindre lobby:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// GET /api/lobby/:lobbyId - Récupérer l'état d'un lobby
app.get('/api/lobby/:lobbyId', authMiddleware, (req, res) => {
  const { lobbyId } = req.params;
  
  console.log(`👀 ${req.user.username} consulte le lobby ${lobbyId}`);
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    console.log(`❌ Lobby ${lobbyId} non trouvé`);
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  res.json({
    lobby: lobby.toJSON()
  });
});

// POST /api/lobby/leave - Quitter un lobby
app.post('/api/lobby/leave', authMiddleware, (req, res) => {
  const { lobbyId } = req.body;
  
  console.log(`🚪 ${req.user.username} quitte le lobby ${lobbyId}`);
  
  if (!lobbyId) {
    return res.status(400).json({ message: 'ID de lobby requis' });
  }
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  try {
    lobby.removePlayer(req.user.id);
    
    // Si le lobby est vide, le supprimer
    if (lobby.players.length === 0) {
      lobbyStorage.delete(lobbyId);
      console.log(`🗑️ Lobby ${lobbyId} supprimé (vide)`);
      return res.json({ message: 'Lobby quitté et supprimé' });
    }
    
    console.log(`✅ ${req.user.username} a quitté le lobby ${lobbyId}`);
    
    res.json({
      message: 'Lobby quitté avec succès',
      lobby: lobby.toJSON()
    });
  } catch (error) {
    console.error('❌ Erreur quitter lobby:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// GET /api/lobby/list - Lister les lobbies publics
app.get('/api/lobby/list', authMiddleware, (req, res) => {
  console.log('📋 Liste des lobbies demandée par:', req.user.username);
  
  const publicLobbies = Array.from(lobbyStorage.values())
    .filter(lobby => !lobby.settings.isPrivate && lobby.status === 'waiting')
    .map(lobby => lobby.toJSON())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({
    lobbies: publicLobbies,
    total: publicLobbies.length
  });
});

// POST /api/lobby/:lobbyId/start - Démarrer une partie (host seulement)
app.post('/api/lobby/:lobbyId/start', authMiddleware, (req, res) => {
  const { lobbyId } = req.params;
  
  console.log(`🎮 ${req.user.username} tente de démarrer la partie ${lobbyId}`);
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  if (lobby.host !== req.user.id) {
    return res.status(403).json({ message: 'Seul l\'hôte peut démarrer la partie' });
  }
  
  if (lobby.players.length < 2) {
    return res.status(400).json({ message: 'Au moins 2 joueurs requis pour démarrer' });
  }
  
  lobby.status = 'playing';
  console.log(`🎮 Partie ${lobbyId} démarrée avec ${lobby.players.length} joueurs`);
  
  res.json({
    message: 'Partie démarrée avec succès',
    lobby: lobby.toJSON()
  });
});

// === ROUTES EXISTANTES ===

// Route pour nettoyer le token (logout)
app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 Logout demandé');
  res.json({ 
    message: 'Déconnexion réussie',
    hint: 'Token supprimé côté client'
  });
});

// POST /api/auth/register - Inscription (mock)
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  console.log('📝 Inscription demandée pour:', username);
  
  if (!username || !email || !password) {
    return res.status(400).json({ 
      message: 'Nom d\'utilisateur, email et mot de passe requis' 
    });
  }
  
  // Mock : générer un token basé sur le nom d'utilisateur
  const token = `token_${username.toLowerCase()}`;
  
  // Ajouter l'utilisateur aux mocks (temporaire)
  mockUsers[token] = {
    id: Object.keys(mockUsers).length + 1000,
    username,
    email
  };
  
  console.log(`✅ Utilisateur ${username} inscrit avec le token ${token}`);
  
  res.status(201).json({
    message: 'Inscription réussie',
    token,
    user: mockUsers[token]
  });
});

// POST /api/auth/login - Connexion (mock)
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  
  console.log('🔑 Connexion demandée pour:', login);
  
  if (!login || !password) {
    return res.status(400).json({ 
      message: 'Login et mot de passe requis' 
    });
  }
  
  // Mock : chercher l'utilisateur par nom d'utilisateur
  const token = `token_${login.toLowerCase()}`;
  let user = mockUsers[token];
  
  // Si pas trouvé, utiliser les tokens prédéfinis
  if (!user) {
    const predefinedUser = Object.entries(mockUsers).find(([_, u]) => 
      u.username.toLowerCase() === login.toLowerCase() || 
      u.email?.toLowerCase() === login.toLowerCase()
    );
    
    if (predefinedUser) {
      user = predefinedUser[1];
      // Utiliser le token prédéfini
      const foundToken = predefinedUser[0];
      return res.json({
        message: 'Connexion réussie',
        token: foundToken,
        user
      });
    }
  }
  
  if (!user) {
    console.log('❌ Utilisateur non trouvé:', login);
    return res.status(401).json({ 
      message: 'Identifiants invalides'
    });
  }
  
  console.log(`✅ Connexion réussie pour ${user.username} avec token ${token}`);
  
  res.json({
    message: 'Connexion réussie',
    token,
    user
  });
});

// Route de santé (pas d'auth requise)
app.get('/api/health', (req, res) => {
  console.log('💚 Health check appelé');
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Route profil utilisateur (avec auth)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  console.log('👤 Profil demandé pour:', req.user.username);
  
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

// Routes pour les parties (mock basique)
app.post('/api/games', authMiddleware, (req, res) => {
  console.log('🎮 Création de partie par:', req.user.username);
  
  const gameId = `game_${Date.now()}`;
  const game = {
    gameId,
    name: req.body.name || 'Partie sans nom',
    hostId: req.user.id,
    status: 'waiting',
    gameMode: req.body.gameMode || 'classique',
    visibility: req.body.visibility || 'public',
    maxPlayers: req.body.maxPlayers || 4,
    currentPlayers: 1,
    players: [{
      userId: req.user.id,
      username: req.user.username,
      color: 'red',
      isConnected: true,
      isActive: true
    }],
    createdAt: new Date().toISOString(),
    settings: {
      startingMoney: 1500,
      salaryAmount: 200,
      allowTrading: true,
      allowMortgage: true,
      auctionOnDecline: false
    }
  };

  // Stocker la partie en mémoire
  gameStorage.set(gameId, game);
  console.log(`✅ Partie ${gameId} stockée en mémoire`);
  
  res.json({
    message: 'Partie créée avec succès',
    gameId,
    game
  });
});

// NOUVELLE ROUTE : Récupérer les détails d'une partie spécifique
app.get('/api/games/:id', (req, res) => {
  const gameId = req.params.id;
  console.log(`🔍 Récupération de la partie ${gameId}`);
  
  const game = gameStorage.get(gameId);
  
  if (!game) {
    console.log(`❌ Partie ${gameId} non trouvée`);
    return res.status(404).json({ 
      message: 'Partie non trouvée',
      gameId 
    });
  }
  
  console.log(`✅ Partie ${gameId} trouvée`);
  res.json({ game });
});

app.get('/api/games', (req, res) => {
  console.log('📋 Liste des parties demandée');
  
  // Récupérer toutes les parties stockées + une partie mock
  const storedGames = Array.from(gameStorage.values());
  const mockGame = {
    gameId: 'game_mock',
    name: 'Partie test permanente',
    hostId: '1',
    status: 'waiting',
    gameMode: 'classique',
    visibility: 'public',
    maxPlayers: 4,
    currentPlayers: 2,
    players: [
      { userId: '1', username: 'TestUser1', color: 'red', isConnected: true },
      { userId: '2', username: 'TestUser2', color: 'blue', isConnected: true }
    ],
    createdAt: new Date().toISOString()
  };
  
  const allGames = [...storedGames, mockGame];
  
  res.json({
    games: allGames,
    pagination: { total: allGames.length, page: 1, limit: 10 }
  });
});

// Route catch-all pour 404
app.use('*', (req, res) => {
  console.log('❓ Route non trouvée:', req.originalUrl);
  res.status(404).json({ message: 'Route non trouvée' });
});

// Middleware d'erreur global
app.use((error, req, res, next) => {
  console.error('💥 Erreur serveur:', error);
  res.status(500).json({ 
    message: 'Erreur serveur interne',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 Frontend attendu sur ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`📋 Tokens de test disponibles: token1, token2, admin, player`);
});

// Logs de démarrage
console.log('=== CONFIGURATION RATE LIMITING ===');
console.log(`- Fenêtre: 1 minute`);
console.log(`- Max requêtes: 100 par IP`);
console.log(`- Logs: Activés pour tous les 429`);
console.log('==================================='); 