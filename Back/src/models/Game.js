const mongoose = require('mongoose');

const PlayerStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  color: { type: String, required: true },
  position: { type: Number, default: 0, min: 0, max: 39 },
  money: { type: Number, default: 1500 },
  properties: [{
    propertyId: Number,
    houses: { type: Number, default: 0, min: 0, max: 4 },
    hasHotel: { type: Boolean, default: false },
    mortgaged: { type: Boolean, default: false }
  }],
  prisonState: {
    isInJail: { type: Boolean, default: false },
    turnsInJail: { type: Number, default: 0 },
    hasGetOutOfJailCard: { type: Boolean, default: false },
    canPayFine: { type: Boolean, default: true }
  },
  getOutOfJailCards: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isConnected: { type: Boolean, default: true },
  lastAction: { type: Date, default: Date.now }
});

const GameLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  playerId: mongoose.Schema.Types.ObjectId,
  playerName: String,
  action: {
    type: String,
    enum: ['roll_dice', 'move', 'purchase', 'pay_rent', 'draw_card', 'go_to_jail', 'get_out_jail', 'end_turn', 'trade', 'build', 'mortgage', 'auction', 'bankrupt', 'game_start', 'game_end']
  },
  details: mongoose.Schema.Types.Mixed,
  message: String
});

const CardDeckSchema = new mongoose.Schema({
  type: { type: String, enum: ['chance', 'community-chest'], required: true },
  currentIndex: { type: Number, default: 0 },
  shuffledOrder: [Number] // Indices des cartes dans l'ordre mélangé
});

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    match: /^[A-Z0-9]{6}$/
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'paused', 'finished', 'cancelled'],
    default: 'waiting'
  },
  gameMode: {
    type: String,
    enum: ['classique', 'blitz', 'chaos'],
    default: 'classique'
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  maxPlayers: {
    type: Number,
    min: 2,
    max: 8,
    default: 4
  },
  currentPlayerIndex: {
    type: Number,
    default: 0
  },
  players: [PlayerStateSchema],
  
  // État du jeu
  gameState: {
    board: [{
      id: Number,
      name: String,
      type: String,
      color: String,
      price: Number,
      rent: [Number],
      ownerId: mongoose.Schema.Types.ObjectId
    }],
    dice: {
      values: { type: [Number], default: [1, 1] },
      isRolling: { type: Boolean, default: false }
    },
    consecutiveDoubles: { type: Number, default: 0 },
    
    // Cartes
    chanceCards: CardDeckSchema,
    communityCards: CardDeckSchema,
    currentCard: mongoose.Schema.Types.Mixed,
    
    // Propriétés et enchères
    availableHouses: { type: Number, default: 32 },
    availableHotels: { type: Number, default: 12 },
    currentAuction: {
      propertyId: Number,
      currentBid: Number,
      currentBidderId: mongoose.Schema.Types.ObjectId,
      biddingOrder: [mongoose.Schema.Types.ObjectId],
      isActive: { type: Boolean, default: false }
    },
    
    // Événements spéciaux (mode chaos)
    activeEvents: [mongoose.Schema.Types.Mixed]
  },
  
  // Configuration du jeu
  settings: {
    startingMoney: { type: Number, default: 1500 },
    salaryAmount: { type: Number, default: 200 },
    prisonFine: { type: Number, default: 50 },
    maxTurnsInPrison: { type: Number, default: 3 },
    allowTrading: { type: Boolean, default: true },
    allowMortgage: { type: Boolean, default: true },
    auctionOnDecline: { type: Boolean, default: true },
    timeLimit: { type: Number, default: 0 }, // 0 = pas de limite
    customRules: [String]
  },
  
  // Statistiques de la partie
  gameStats: {
    startedAt: Date,
    endedAt: Date,
    duration: Number, // en secondes
    totalTurns: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    winnerId: mongoose.Schema.Types.ObjectId,
    winCondition: {
      type: String,
      enum: ['bankruptcy', 'time_limit', 'forfeit', 'last_standing']
    }
  },
  
  // Journal de la partie
  gameLog: [GameLogSchema],
  
  // Métadonnées
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Pour la reconnexion
  socketRooms: [String],
  lastActivity: { type: Date, default: Date.now }
});

// Index pour les requêtes fréquentes
gameSchema.index({ gameId: 1 });
gameSchema.index({ hostId: 1 });
gameSchema.index({ status: 1 });
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ lastActivity: 1 });

// Middleware pour mettre à jour updatedAt
gameSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastActivity = new Date();
  next();
});

// Méthodes utiles
gameSchema.methods.addPlayer = function(user, color) {
  if (this.players.length >= this.maxPlayers) {
    throw new Error('La partie est complète');
  }
  
  if (this.status !== 'waiting') {
    throw new Error('Impossible de rejoindre une partie en cours');
  }
  
  const playerExists = this.players.some(p => p.userId.toString() === user._id.toString());
  if (playerExists) {
    throw new Error('Le joueur est déjà dans la partie');
  }
  
  this.players.push({
    userId: user._id,
    username: user.username,
    color: color,
    position: 0,
    money: this.settings.startingMoney,
    properties: [],
    prisonState: {
      isInJail: false,
      turnsInJail: 0,
      hasGetOutOfJailCard: false,
      canPayFine: true
    },
    getOutOfJailCards: 0,
    isActive: true,
    isConnected: true
  });
};

gameSchema.methods.removePlayer = function(userId) {
  this.players = this.players.filter(p => p.userId.toString() !== userId.toString());
  
  // Si c'était l'hôte, assigner un nouvel hôte
  if (this.hostId.toString() === userId.toString() && this.players.length > 0) {
    this.hostId = this.players[0].userId;
  }
  
  // Si plus de joueurs, annuler la partie
  if (this.players.length === 0) {
    this.status = 'cancelled';
  }
};

gameSchema.methods.getCurrentPlayer = function() {
  return this.players[this.currentPlayerIndex];
};

gameSchema.methods.nextTurn = function() {
  do {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  } while (!this.players[this.currentPlayerIndex].isActive);
  
  this.gameStats.totalTurns += 1;
};

gameSchema.methods.addLogEntry = function(playerId, action, details, message) {
  const player = this.players.find(p => p.userId.toString() === playerId?.toString());
  
  this.gameLog.push({
    playerId: playerId,
    playerName: player?.username || 'Système',
    action: action,
    details: details,
    message: message
  });
  
  // Garder seulement les 1000 dernières entrées
  if (this.gameLog.length > 1000) {
    this.gameLog = this.gameLog.slice(-1000);
  }
};

gameSchema.methods.toPublicJSON = function() {
  return {
    gameId: this.gameId,
    name: this.name,
    hostId: this.hostId,
    status: this.status,
    gameMode: this.gameMode,
    visibility: this.visibility,
    maxPlayers: this.maxPlayers,
    currentPlayers: this.players.length,
    players: this.players.map(p => ({
      userId: p.userId,
      username: p.username,
      color: p.color,
      isConnected: p.isConnected,
      isActive: p.isActive
    })),
    createdAt: this.createdAt,
    settings: this.settings
  };
};

module.exports = mongoose.model('Game', gameSchema); 