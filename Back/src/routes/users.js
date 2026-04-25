const express = require('express');
const { body, validationResult, param } = require('express-validator');
const User = require('../models/User');
const Game = require('../models/Game');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me - Profil de l'utilisateur connecté (même que /api/auth/me)
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: req.user.toPublicJSON()
  });
});

// GET /api/users/me/games - Historique des parties de l'utilisateur
router.get('/me/games', authMiddleware, async (req, res, next) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    const query = {
      'players.userId': req.user._id
    };
    
    if (status) {
      query.status = status;
    }
    
    const games = await Game.find(query)
      .populate('hostId', 'username avatar')
      .populate('players.userId', 'username avatar')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Game.countDocuments(query);
    
    // Enrichir avec les statistiques personnelles
    const gamesWithStats = games.map(game => {
      const gameData = game.toObject();
      const userPlayer = game.players.find(p => p.userId._id.toString() === req.user._id.toString());
      
      return {
        ...gameData,
        userStats: userPlayer ? {
          finalPosition: userPlayer.position,
          finalMoney: userPlayer.money,
          propertiesOwned: userPlayer.properties.length,
          isWinner: game.gameStats.winnerId?.toString() === req.user._id.toString()
        } : null
      };
    });
    
    res.json({
      games: gamesWithStats,
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

// GET /api/users/me/stats - Statistiques détaillées de l'utilisateur
router.get('/me/stats', authMiddleware, async (req, res, next) => {
  try {
    // Statistiques stockées dans le profil
    const userStats = req.user.stats;
    
    // Calculer des statistiques additionnelles depuis les parties
    const gamesPlayed = await Game.countDocuments({
      'players.userId': req.user._id,
      status: 'finished'
    });
    
    const gamesWon = await Game.countDocuments({
      'players.userId': req.user._id,
      'gameStats.winnerId': req.user._id,
      status: 'finished'
    });
    
    // Parties par mode de jeu
    const gamesByMode = await Game.aggregate([
      {
        $match: {
          'players.userId': req.user._id,
          status: 'finished'
        }
      },
      {
        $group: {
          _id: '$gameMode',
          count: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [
                { $eq: ['$gameStats.winnerId', req.user._id] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Durée moyenne des parties
    const avgDurationResult = await Game.aggregate([
      {
        $match: {
          'players.userId': req.user._id,
          status: 'finished',
          'gameStats.duration': { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$gameStats.duration' }
        }
      }
    ]);
    
    // Dernières parties
    const recentGames = await Game.find({
      'players.userId': req.user._id,
      status: 'finished'
    })
    .populate('hostId', 'username')
    .sort({ 'gameStats.endedAt': -1 })
    .limit(5)
    .select('gameId name gameMode gameStats.endedAt gameStats.winnerId players.userId players.username');
    
    const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
    const avgDuration = avgDurationResult.length > 0 ? Math.round(avgDurationResult[0].avgDuration / 60) : 0;
    
    res.json({
      stats: {
        overview: {
          gamesPlayed,
          gamesWon,
          winRate: parseFloat(winRate),
          averageGameDuration: avgDuration, // en minutes
          totalMoney: userStats.totalMoney || 0
        },
        gamesByMode: gamesByMode.reduce((acc, mode) => {
          acc[mode._id] = {
            played: mode.count,
            won: mode.wins,
            winRate: mode.count > 0 ? ((mode.wins / mode.count) * 100).toFixed(1) : 0
          };
          return acc;
        }, {}),
        recentGames: recentGames.map(game => ({
          gameId: game.gameId,
          name: game.name,
          gameMode: game.gameMode,
          endedAt: game.gameStats.endedAt,
          isWinner: game.gameStats.winnerId?.toString() === req.user._id.toString(),
          players: game.players.length
        }))
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:userId - Profil public d'un utilisateur
router.get('/:userId', [
  param('userId').isMongoId().withMessage('ID utilisateur invalide')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'ID utilisateur invalide'
      });
    }
    
    const user = await User.findById(req.params.userId)
      .select('username avatar stats createdAt');
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Statistiques publiques simplifiées
    const gamesPlayed = await Game.countDocuments({
      'players.userId': user._id,
      status: 'finished'
    });
    
    const gamesWon = await Game.countDocuments({
      'players.userId': user._id,
      'gameStats.winnerId': user._id,
      status: 'finished'
    });
    
    const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        memberSince: user.createdAt,
        stats: {
          gamesPlayed,
          gamesWon,
          winRate: parseFloat(winRate)
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/users/leaderboard - Classement des joueurs
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { limit = 100, sortBy = 'winRate' } = req.query;
    
    let sortField = {};
    switch (sortBy) {
      case 'gamesWon':
        sortField = { 'stats.gamesWon': -1 };
        break;
      case 'gamesPlayed':
        sortField = { 'stats.gamesPlayed': -1 };
        break;
      case 'totalMoney':
        sortField = { 'stats.totalMoney': -1 };
        break;
      default: // winRate
        sortField = { 'stats.gamesWon': -1, 'stats.gamesPlayed': 1 };
    }
    
    // Calculer le classement via aggregation pour avoir les vraies statistiques
    const leaderboard = await User.aggregate([
      {
        $match: {
          isActive: true,
          'stats.gamesPlayed': { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'games',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$$userId', '$players.userId'] },
                    { $eq: ['$status', 'finished'] }
                  ]
                }
              }
            }
          ],
          as: 'finishedGames'
        }
      },
      {
        $lookup: {
          from: 'games',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$$userId', '$players.userId'] },
                    { $eq: ['$status', 'finished'] },
                    { $eq: ['$gameStats.winnerId', '$$userId'] }
                  ]
                }
              }
            }
          ],
          as: 'wonGames'
        }
      },
      {
        $addFields: {
          actualGamesPlayed: { $size: '$finishedGames' },
          actualGamesWon: { $size: '$wonGames' },
          actualWinRate: {
            $cond: [
              { $gt: [{ $size: '$finishedGames' }, 0] },
              { $multiply: [{ $divide: [{ $size: '$wonGames' }, { $size: '$finishedGames' }] }, 100] },
              0
            ]
          }
        }
      },
      {
        $match: {
          actualGamesPlayed: { $gte: 3 } // Minimum 3 parties pour être dans le classement
        }
      },
      {
        $sort: {
          actualWinRate: -1,
          actualGamesWon: -1,
          actualGamesPlayed: 1
        }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          username: 1,
          avatar: 1,
          createdAt: 1,
          gamesPlayed: '$actualGamesPlayed',
          gamesWon: '$actualGamesWon',
          winRate: { $round: ['$actualWinRate', 1] }
        }
      }
    ]);
    
    res.json({
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        ...user
      }))
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router; 