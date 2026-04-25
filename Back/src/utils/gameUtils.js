const Game = require('../models/Game');

/**
 * Génère un ID unique pour une partie
 * Format: 6 caractères alphanumériques majuscules
 */
const generateGameId = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let gameId;
  let exists = true;
  
  // Boucle jusqu'à trouver un ID unique
  while (exists) {
    gameId = '';
    for (let i = 0; i < 6; i++) {
      gameId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Vérifier si l'ID existe déjà
    const existingGame = await Game.findOne({ gameId });
    exists = !!existingGame;
  }
  
  return gameId;
};

/**
 * Mélange un tableau de façon aléatoire (algorithme Fisher-Yates)
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Calcule la distance entre deux positions sur le plateau
 */
const calculateDistance = (from, to) => {
  if (from === to) return 0;
  
  // Distance normale (sens horaire)
  const normalDistance = to > from ? to - from : (40 - from) + to;
  
  return normalDistance;
};

/**
 * Vérifie si un joueur passe par la case Départ
 */
const passesStart = (oldPosition, newPosition, steps) => {
  const expectedPosition = (oldPosition + steps) % 40;
  return expectedPosition === newPosition && (oldPosition + steps >= 40);
};

/**
 * Calcule le loyer d'une propriété
 */
const calculateRent = (property, owner, diceRoll = null) => {
  if (!property || !owner) return 0;
  
  switch (property.type) {
    case 'property':
      // Propriété normale - loyer de base
      if (property.rent && property.rent.length > 0) {
        return property.rent[0]; // Loyer de base
      }
      return Math.floor((property.price || 0) * 0.1);
      
    case 'station':
      // Gares - loyer dépend du nombre de gares possédées
      const stationsOwned = owner.properties.filter(p => {
        const boardProperty = property.board?.find(bp => bp.id === p.propertyId);
        return boardProperty?.type === 'station';
      }).length;
      
      const stationRents = [25, 50, 100, 200];
      return stationRents[Math.min(stationsOwned - 1, 3)] || 25;
      
    case 'utility':
      // Services publics - loyer dépend du lancé de dés et du nombre possédé
      const utilitiesOwned = owner.properties.filter(p => {
        const boardProperty = property.board?.find(bp => bp.id === p.propertyId);
        return boardProperty?.type === 'utility';
      }).length;
      
      const multiplier = utilitiesOwned === 1 ? 4 : 10;
      return (diceRoll || 0) * multiplier;
      
    default:
      return 0;
  }
};

/**
 * Vérifie si un joueur possède un monopole
 */
const hasMonopoly = (playerId, colorGroup, allPlayers, boardData) => {
  // Trouver toutes les propriétés de cette couleur
  const propertiesInGroup = boardData.filter(square => 
    square.type === 'property' && square.color === colorGroup
  );
  
  // Vérifier si le joueur possède toutes les propriétés du groupe
  const player = allPlayers.find(p => p.userId.toString() === playerId.toString());
  if (!player) return false;
  
  const ownedInGroup = player.properties.filter(prop => {
    const boardProperty = boardData.find(bp => bp.id === prop.propertyId);
    return boardProperty && boardProperty.color === colorGroup;
  });
  
  return ownedInGroup.length === propertiesInGroup.length;
};

/**
 * Valide les données d'une partie
 */
const validateGameState = (gameState) => {
  const errors = [];
  
  if (!gameState.players || gameState.players.length < 2) {
    errors.push('Il faut au moins 2 joueurs');
  }
  
  if (gameState.players && gameState.players.length > 8) {
    errors.push('Maximum 8 joueurs autorisés');
  }
  
  if (gameState.currentPlayerIndex < 0 || gameState.currentPlayerIndex >= gameState.players.length) {
    errors.push('Index du joueur actuel invalide');
  }
  
  // Vérifier que tous les joueurs ont des positions valides
  gameState.players?.forEach((player, index) => {
    if (player.position < 0 || player.position > 39) {
      errors.push(`Position invalide pour le joueur ${index + 1}`);
    }
    
    if (player.money < 0) {
      errors.push(`Argent négatif pour le joueur ${index + 1}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formate l'argent pour l'affichage
 */
const formatMoney = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Génère les statistiques de fin de partie
 */
const generateGameStats = (game) => {
  const stats = {
    duration: 0,
    totalTurns: game.gameStats.totalTurns || 0,
    totalTransactions: game.gameStats.totalTransactions || 0,
    playerStats: []
  };
  
  // Calculer la durée
  if (game.gameStats.startedAt && game.gameStats.endedAt) {
    stats.duration = Math.floor((game.gameStats.endedAt - game.gameStats.startedAt) / 1000);
  }
  
  // Statistiques par joueur
  game.players.forEach(player => {
    const totalAssets = player.money + player.properties.reduce((sum, prop) => {
      const boardProp = game.gameState.board.find(bp => bp.id === prop.propertyId);
      return sum + (boardProp?.price || 0);
    }, 0);
    
    stats.playerStats.push({
      playerId: player.userId,
      username: player.username,
      finalMoney: player.money,
      finalPosition: player.position,
      propertiesOwned: player.properties.length,
      totalAssets: totalAssets,
      isWinner: game.gameStats.winnerId?.toString() === player.userId.toString()
    });
  });
  
  // Trier par total des actifs
  stats.playerStats.sort((a, b) => b.totalAssets - a.totalAssets);
  
  return stats;
};

module.exports = {
  generateGameId,
  shuffleArray,
  calculateDistance,
  passesStart,
  calculateRent,
  hasMonopoly,
  validateGameState,
  formatMoney,
  generateGameStats
}; 