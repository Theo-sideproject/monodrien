const express = require('express');
const { body, validationResult, param } = require('express-validator');
const Game = require('../models/Game');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { generateGameId } = require('../utils/gameUtils');
const { BOARD_DATA } = require('../data/boardData');

const router = express.Router();

// GET /api/games - Lister les parties publiques
router.get('/', async (req, res, next) => {
  try {
    const { status = 'waiting', gameMode, limit = 20, page = 1 } = req.query;
    
    const query = { 
      visibility: 'public',
      status: status 
    };
    
    if (gameMode) {
      query.gameMode = gameMode;
    }
    
    const games = await Game.find(query)
      .populate('hostId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Game.countDocuments(query);
    
    res.json({
      games: games.map(game => game.toPublicJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/games - Créer une nouvelle partie
router.post('/', authMiddleware, [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom de la partie doit faire entre 3 et 50 caractères'),
  body('gameMode')
    .isIn(['classique', 'blitz', 'chaos'])
    .withMessage('Mode de jeu invalide'),
  body('visibility')
    .isIn(['public', 'private'])
    .withMessage('Visibilité invalide'),
  body('maxPlayers')
    .isInt({ min: 2, max: 8 })
    .withMessage('Le nombre de joueurs doit être entre 2 et 8')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array().map(err => err.msg)
      });
    }
    
    const { name, gameMode, visibility, maxPlayers } = req.body;
    
    // Vérifier que l'utilisateur n'est pas déjà dans une partie active
    const existingGame = await Game.findOne({
      'players.userId': req.user._id,
      status: { $in: ['waiting', 'playing', 'paused'] }
    });
    
    if (existingGame) {
      return res.status(400).json({
        message: 'Vous êtes déjà dans une partie active'
      });
    }
    
    // Générer un ID unique pour la partie
    const gameId = await generateGameId();
    
    // Créer la partie
    const game = new Game({
      gameId,
      name,
      hostId: req.user._id,
      gameMode,
      visibility,
      maxPlayers,
      gameState: {
        board: BOARD_DATA,
        dice: { values: [1, 1], isRolling: false },
        chanceCards: { type: 'chance', currentIndex: 0, shuffledOrder: [] },
        communityCards: { type: 'community-chest', currentIndex: 0, shuffledOrder: [] },
        availableHouses: 32,
        availableHotels: 12,
        currentAuction: { isActive: false },
        activeEvents: []
      }
    });
    
    // Ajouter l'hôte comme premier joueur
    const colors = ['bg-monodrien-blue', 'bg-monodrien-yellow', 'bg-monodrien-green', 'bg-red-500'];
    game.addPlayer(req.user, colors[0]);
    
    await game.save();
    
    res.status(201).json({
      message: 'Partie créée avec succès',
      game: game.toPublicJSON(),
      gameId: game.gameId
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:gameId - Récupérer les détails d'une partie
router.get('/:gameId', [
  param('gameId').matches(/^[A-Z0-9]{6}$/).withMessage('ID de partie invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'ID de partie invalide'
      });
    }
    
    const game = await Game.findOne({ gameId: req.params.gameId })
      .populate('hostId', 'username avatar')
      .populate('players.userId', 'username avatar');
    
    if (!game) {
      return res.status(404).json({ 
        message: 'Partie non trouvée' 
      });
    }
    
    // Si la partie est privée, vérifier l'accès
    if (game.visibility === 'private') {
      // Permettre l'accès si c'est un joueur de la partie ou si authentifié (pour rejoindre)
      const hasAccess = !req.user || 
        game.players.some(p => p.userId._id.toString() === req.user._id.toString());
        
      if (!hasAccess) {
        return res.status(403).json({ 
          message: 'Accès refusé à cette partie privée' 
        });
      }
    }
    
    res.json({
      game: game.toPublicJSON()
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/games/:gameId/join - Rejoindre une partie
router.post('/:gameId/join', authMiddleware, [
  param('gameId').matches(/^[A-Z0-9]{6}$/).withMessage('ID de partie invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'ID de partie invalide'
      });
    }
    
    const game = await Game.findOne({ gameId: req.params.gameId });
    
    if (!game) {
      return res.status(404).json({ 
        message: 'Partie non trouvée' 
      });
    }
    
    // Vérifier que l'utilisateur n'est pas déjà dans une partie active
    const existingGame = await Game.findOne({
      'players.userId': req.user._id,
      status: { $in: ['waiting', 'playing', 'paused'] }
    });
    
    if (existingGame && existingGame._id.toString() !== game._id.toString()) {
      return res.status(400).json({
        message: 'Vous êtes déjà dans une autre partie active'
      });
    }
    
    // Couleurs disponibles
    const colors = [
      'bg-monodrien-blue', 'bg-monodrien-yellow', 'bg-monodrien-green', 
      'bg-red-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'
    ];
    
    const usedColors = game.players.map(p => p.color);
    const availableColor = colors.find(color => !usedColors.includes(color));
    
    try {
      game.addPlayer(req.user, availableColor);
      game.addLogEntry(req.user._id, 'game_start', {}, `${req.user.username} a rejoint la partie`);
      
      await game.save();
      
      res.json({
        message: 'Partie rejointe avec succès',
        game: game.toPublicJSON()
      });
      
    } catch (gameError) {
      return res.status(400).json({
        message: gameError.message
      });
    }
    
  } catch (error) {
    next(error);
  }
});

// POST /api/games/:gameId/leave - Quitter une partie
router.post('/:gameId/leave', authMiddleware, [
  param('gameId').matches(/^[A-Z0-9]{6}$/).withMessage('ID de partie invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'ID de partie invalide'
      });
    }
    
    const game = await Game.findOne({ gameId: req.params.gameId });
    
    if (!game) {
      return res.status(404).json({ 
        message: 'Partie non trouvée' 
      });
    }
    
    const playerInGame = game.players.find(p => p.userId.toString() === req.user._id.toString());
    if (!playerInGame) {
      return res.status(400).json({
        message: 'Vous n\'êtes pas dans cette partie'
      });
    }
    
    // Si la partie est en cours, marquer le joueur comme inactif plutôt que de le supprimer
    if (game.status === 'playing') {
      playerInGame.isActive = false;
      playerInGame.isConnected = false;
      game.addLogEntry(req.user._id, 'game_end', {}, `${req.user.username} a quitté la partie`);
      
      // Vérifier s'il ne reste qu'un joueur actif
      const activePlayers = game.players.filter(p => p.isActive);
      if (activePlayers.length <= 1) {
        game.status = 'finished';
        if (activePlayers.length === 1) {
          game.gameStats.winnerId = activePlayers[0].userId;
          game.gameStats.winCondition = 'forfeit';
        }
        game.gameStats.endedAt = new Date();
      }
    } else {
      // Si la partie n'a pas commencé, supprimer le joueur
      game.removePlayer(req.user._id);
      game.addLogEntry(req.user._id, 'game_end', {}, `${req.user.username} a quitté la partie`);
    }
    
    await game.save();
    
    res.json({
      message: 'Partie quittée avec succès'
    });
    
  } catch (error) {
    next(error);
  }
});

// POST /api/games/:gameId/start - Démarrer une partie (hôte seulement)
router.post('/:gameId/start', authMiddleware, [
  param('gameId').matches(/^[A-Z0-9]{6}$/).withMessage('ID de partie invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'ID de partie invalide'
      });
    }
    
    const game = await Game.findOne({ gameId: req.params.gameId });
    
    if (!game) {
      return res.status(404).json({ 
        message: 'Partie non trouvée' 
      });
    }
    
    // Vérifier que l'utilisateur est l'hôte
    if (game.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Seul l\'hôte peut démarrer la partie'
      });
    }
    
    if (game.status !== 'waiting') {
      return res.status(400).json({
        message: 'La partie ne peut pas être démarrée'
      });
    }
    
    if (game.players.length < 2) {
      return res.status(400).json({
        message: 'Il faut au moins 2 joueurs pour démarrer'
      });
    }
    
    // Démarrer la partie
    game.status = 'playing';
    game.gameStats.startedAt = new Date();
    game.currentPlayerIndex = 0;
    
    // Mélanger les cartes
    game.gameState.chanceCards.shuffledOrder = shuffleArray(Array.from({length: 16}, (_, i) => i));
    game.gameState.communityCards.shuffledOrder = shuffleArray(Array.from({length: 16}, (_, i) => i));
    
    game.addLogEntry(null, 'game_start', {}, `La partie commence avec ${game.players.length} joueurs !`);
    game.addLogEntry(null, 'game_start', {}, `C'est au tour de ${game.players[0].username}.`);
    
    await game.save();
    
    res.json({
      message: 'Partie démarrée avec succès',
      game: game.toPublicJSON()
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:gameId/state - Récupérer l'état complet du jeu (pour les joueurs)
router.get('/:gameId/state', authMiddleware, [
  param('gameId').matches(/^[A-Z0-9]{6}$/).withMessage('ID de partie invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'ID de partie invalide'
      });
    }
    
    const game = await Game.findOne({ gameId: req.params.gameId })
      .populate('players.userId', 'username avatar');
    
    if (!game) {
      return res.status(404).json({ 
        message: 'Partie non trouvée' 
      });
    }
    
    // Vérifier que l'utilisateur est dans la partie
    const playerInGame = game.players.find(p => p.userId._id.toString() === req.user._id.toString());
    if (!playerInGame) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas dans cette partie'
      });
    }
    
    res.json({
      gameState: {
        gameId: game.gameId,
        status: game.status,
        currentPlayerIndex: game.currentPlayerIndex,
        players: game.players,
        board: game.gameState.board,
        dice: game.gameState.dice,
        gameLog: game.gameLog.slice(-50), // Dernières 50 entrées
        settings: game.settings,
        gameStats: game.gameStats
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// Utilitaire pour mélanger un tableau
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = router; 