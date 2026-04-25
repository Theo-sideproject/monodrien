const request = require('supertest');
const express = require('express');

// Simuler le serveur pour les tests
const app = express();
app.use(express.json());

// Mock des utilisateurs et lobbies
const mockUsers = {
  'token1': { id: 1, username: 'TestUser1', email: 'test1@example.com' },
  'token2': { id: 2, username: 'TestUser2', email: 'test2@example.com' },
  'admin': { id: 3, username: 'Admin', email: 'admin@example.com' }
};

const lobbyStorage = new Map();

// Classe Lobby (copiée du serveur principal)
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
    this.status = 'waiting';
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

// Middleware d'auth pour les tests
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }
  
  const user = mockUsers[token];
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }
  
  req.user = user;
  next();
};

// Routes pour les tests
app.post('/api/lobby/create', authMiddleware, (req, res) => {
  try {
    const lobby = new Lobby(req.user.id, req.user.username);
    lobbyStorage.set(lobby.id, lobby);
    
    res.status(201).json({
      message: 'Lobby créé avec succès',
      lobby: lobby.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création du lobby' });
  }
});

app.post('/api/lobby/join', authMiddleware, (req, res) => {
  const { lobbyId } = req.body;
  
  if (!lobbyId) {
    return res.status(400).json({ message: 'ID de lobby requis' });
  }
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  try {
    lobby.addPlayer(req.user.id, req.user.username);
    
    res.json({
      message: 'Lobby rejoint avec succès',
      lobby: lobby.toJSON()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/lobby/list', authMiddleware, (req, res) => {
  const publicLobbies = Array.from(lobbyStorage.values())
    .filter(lobby => !lobby.settings.isPrivate && lobby.status === 'waiting')
    .map(lobby => lobby.toJSON())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({
    lobbies: publicLobbies,
    total: publicLobbies.length
  });
});

app.get('/api/lobby/:lobbyId', authMiddleware, (req, res) => {
  const { lobbyId } = req.params;
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  res.json({
    lobby: lobby.toJSON()
  });
});

app.post('/api/lobby/leave', authMiddleware, (req, res) => {
  const { lobbyId } = req.body;
  
  if (!lobbyId) {
    return res.status(400).json({ message: 'ID de lobby requis' });
  }
  
  const lobby = lobbyStorage.get(lobbyId);
  if (!lobby) {
    return res.status(404).json({ message: 'Lobby non trouvé' });
  }
  
  try {
    lobby.removePlayer(req.user.id);
    
    if (lobby.players.length === 0) {
      lobbyStorage.delete(lobbyId);
      return res.json({ message: 'Lobby quitté et supprimé' });
    }
    
    res.json({
      message: 'Lobby quitté avec succès',
      lobby: lobby.toJSON()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/lobby/:lobbyId/start', authMiddleware, (req, res) => {
  const { lobbyId } = req.params;
  
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
  
  res.json({
    message: 'Partie démarrée avec succès',
    lobby: lobby.toJSON()
  });
});

// === TESTS ===

describe('🏠 Tests du système de lobby', () => {
  let lobbyId;

  beforeEach(() => {
    // Nettoyer les lobbies avant chaque test
    lobbyStorage.clear();
  });

  describe('POST /api/lobby/create', () => {
    it('✅ devrait créer un lobby avec succès', async () => {
      const response = await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token1')
        .expect(201);

      expect(response.body.message).toBe('Lobby créé avec succès');
      expect(response.body.lobby).toHaveProperty('id');
      expect(response.body.lobby.host).toBe(1);
      expect(response.body.lobby.players).toHaveLength(1);
      expect(response.body.lobby.players[0].username).toBe('TestUser1');
      expect(response.body.lobby.players[0].isHost).toBe(true);
      expect(response.body.lobby.status).toBe('waiting');

      lobbyId = response.body.lobby.id; // Sauvegarder pour les autres tests
    });

    it('❌ devrait échouer sans token', async () => {
      await request(app)
        .post('/api/lobby/create')
        .expect(401);
    });

    it('❌ devrait échouer avec token invalide', async () => {
      await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('POST /api/lobby/join', () => {
    beforeEach(async () => {
      // Créer un lobby pour les tests de join
      const response = await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token1');
      lobbyId = response.body.lobby.id;
    });

    it('✅ devrait rejoindre un lobby avec succès', async () => {
      const response = await request(app)
        .post('/api/lobby/join')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId })
        .expect(200);

      expect(response.body.message).toBe('Lobby rejoint avec succès');
      expect(response.body.lobby.players).toHaveLength(2);
      expect(response.body.lobby.players[1].username).toBe('TestUser2');
      expect(response.body.lobby.players[1].isHost).toBe(false);
    });

    it('❌ devrait échouer sans lobbyId', async () => {
      const response = await request(app)
        .post('/api/lobby/join')
        .set('Authorization', 'Bearer token2')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('ID de lobby requis');
    });

    it('❌ devrait échouer avec lobby inexistant', async () => {
      const response = await request(app)
        .post('/api/lobby/join')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId: 'lobby_inexistant' })
        .expect(404);

      expect(response.body.message).toBe('Lobby non trouvé');
    });

    it('❌ devrait échouer si déjà dans le lobby', async () => {
      const response = await request(app)
        .post('/api/lobby/join')
        .set('Authorization', 'Bearer token1')
        .send({ lobbyId })
        .expect(400);

      expect(response.body.message).toBe('Vous êtes déjà dans ce lobby');
    });
  });

  describe('GET /api/lobby/:lobbyId', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token1');
      lobbyId = response.body.lobby.id;
    });

    it('✅ devrait récupérer les détails du lobby', async () => {
      const response = await request(app)
        .get(`/api/lobby/${lobbyId}`)
        .set('Authorization', 'Bearer token1')
        .expect(200);

      expect(response.body.lobby.id).toBe(lobbyId);
      expect(response.body.lobby.players).toHaveLength(1);
      expect(response.body.lobby.host).toBe(1);
    });

    it('❌ devrait échouer avec lobby inexistant', async () => {
      await request(app)
        .get('/api/lobby/lobby_inexistant')
        .set('Authorization', 'Bearer token1')
        .expect(404);
    });
  });

  describe('POST /api/lobby/leave', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token1');
      lobbyId = response.body.lobby.id;
      
      // Ajouter un deuxième joueur
      await request(app)
        .post('/api/lobby/join')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId });
    });

    it('✅ devrait quitter le lobby avec succès', async () => {
      const response = await request(app)
        .post('/api/lobby/leave')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId })
        .expect(200);

      expect(response.body.message).toBe('Lobby quitté avec succès');
      expect(response.body.lobby.players).toHaveLength(1);
    });

    it('✅ devrait supprimer le lobby si dernier joueur part', async () => {
      // Faire partir le deuxième joueur
      await request(app)
        .post('/api/lobby/leave')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId });

      // Faire partir l'hôte (dernier joueur)
      const response = await request(app)
        .post('/api/lobby/leave')
        .set('Authorization', 'Bearer token1')
        .send({ lobbyId })
        .expect(200);

      expect(response.body.message).toBe('Lobby quitté et supprimé');

      // Vérifier que le lobby n'existe plus
      await request(app)
        .get(`/api/lobby/${lobbyId}`)
        .set('Authorization', 'Bearer token1')
        .expect(404);
    });

    it('✅ devrait promouvoir un nouveau hôte si l\'hôte part', async () => {
      // L'hôte (token1) quitte
      const response = await request(app)
        .post('/api/lobby/leave')
        .set('Authorization', 'Bearer token1')
        .send({ lobbyId })
        .expect(200);

      expect(response.body.lobby.host).toBe(2); // token2 devient hôte
      expect(response.body.lobby.players[0].isHost).toBe(true);
      expect(response.body.lobby.players[0].username).toBe('TestUser2');
    });
  });

  describe('GET /api/lobby/list', () => {
    beforeEach(async () => {
      // Créer plusieurs lobbies
      await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token1');
      
      await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token2');
    });

    it('✅ devrait lister les lobbies publics', async () => {
      const response = await request(app)
        .get('/api/lobby/list')
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(response.body.lobbies).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.lobbies[0]).toHaveProperty('id');
      expect(response.body.lobbies[0].status).toBe('waiting');
    });
  });

  describe('POST /api/lobby/:lobbyId/start', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/lobby/create')
        .set('Authorization', 'Bearer token1');
      lobbyId = response.body.lobby.id;
      
      // Ajouter un deuxième joueur
      await request(app)
        .post('/api/lobby/join')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId });
    });

    it('✅ devrait démarrer la partie avec succès', async () => {
      const response = await request(app)
        .post(`/api/lobby/${lobbyId}/start`)
        .set('Authorization', 'Bearer token1')
        .expect(200);

      expect(response.body.message).toBe('Partie démarrée avec succès');
      expect(response.body.lobby.status).toBe('playing');
    });

    it('❌ devrait échouer si pas l\'hôte', async () => {
      const response = await request(app)
        .post(`/api/lobby/${lobbyId}/start`)
        .set('Authorization', 'Bearer token2')
        .expect(403);

      expect(response.body.message).toBe('Seul l\'hôte peut démarrer la partie');
    });

    it('❌ devrait échouer avec moins de 2 joueurs', async () => {
      // Faire partir le deuxième joueur
      await request(app)
        .post('/api/lobby/leave')
        .set('Authorization', 'Bearer token2')
        .send({ lobbyId });

      const response = await request(app)
        .post(`/api/lobby/${lobbyId}/start`)
        .set('Authorization', 'Bearer token1')
        .expect(400);

      expect(response.body.message).toBe('Au moins 2 joueurs requis pour démarrer');
    });
  });
});

// Tests de la classe Lobby
describe('🏗️ Tests de la classe Lobby', () => {
  let lobby;

  beforeEach(() => {
    lobby = new Lobby(1, 'TestUser1');
  });

  it('✅ devrait créer un lobby correctement', () => {
    expect(lobby.host).toBe(1);
    expect(lobby.players).toHaveLength(1);
    expect(lobby.players[0].username).toBe('TestUser1');
    expect(lobby.players[0].isHost).toBe(true);
    expect(lobby.status).toBe('waiting');
    expect(lobby.maxPlayers).toBe(4);
  });

  it('✅ devrait ajouter un joueur', () => {
    lobby.addPlayer(2, 'TestUser2');
    
    expect(lobby.players).toHaveLength(2);
    expect(lobby.players[1].username).toBe('TestUser2');
    expect(lobby.players[1].isHost).toBe(false);
  });

  it('❌ devrait échouer si lobby plein', () => {
    lobby.addPlayer(2, 'User2');
    lobby.addPlayer(3, 'User3');
    lobby.addPlayer(4, 'User4');
    
    expect(() => {
      lobby.addPlayer(5, 'User5');
    }).toThrow('Lobby plein');
  });

  it('❌ devrait échouer si joueur déjà présent', () => {
    expect(() => {
      lobby.addPlayer(1, 'TestUser1');
    }).toThrow('Vous êtes déjà dans ce lobby');
  });

  it('✅ devrait supprimer un joueur', () => {
    lobby.addPlayer(2, 'TestUser2');
    lobby.removePlayer(2);
    
    expect(lobby.players).toHaveLength(1);
    expect(lobby.players[0].username).toBe('TestUser1');
  });

  it('✅ devrait promouvoir un nouveau hôte', () => {
    lobby.addPlayer(2, 'TestUser2');
    lobby.removePlayer(1); // Supprimer l'hôte
    
    expect(lobby.host).toBe(2);
    expect(lobby.players[0].isHost).toBe(true);
    expect(lobby.players[0].username).toBe('TestUser2');
  });
});

console.log('🧪 Tests du système de lobby prêts à être exécutés avec: npm test'); 