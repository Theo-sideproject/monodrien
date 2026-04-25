const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');

// Authentification Socket.io
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Token requis pour la connexion'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Utilisateur non trouvé ou inactif'));
    }
    
    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
};

// Gestionnaire principal des événements Socket.io
const setupSocketHandlers = (io) => {
  // Middleware d'authentification
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log(`🔌 Utilisateur connecté: ${socket.user.username} (${socket.userId})`);
    
    // Rejoindre une partie
    socket.on('game:join', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId })
          .populate('players.userId', 'username avatar');
        
        if (!game) {
          socket.emit('error', { message: 'Partie non trouvée' });
          return;
        }
        
        // Vérifier que l'utilisateur est dans la partie
        const playerInGame = game.players.find(p => p.userId._id.toString() === socket.userId);
        if (!playerInGame) {
          socket.emit('error', { message: 'Vous n\'êtes pas dans cette partie' });
          return;
        }
        
        // Rejoindre la room de la partie
        await socket.join(`game:${gameId}`);
        
        // Marquer le joueur comme connecté
        playerInGame.isConnected = true;
        await game.save();
        
        // Envoyer l'état du jeu au joueur
        socket.emit('game:state', {
          gameId: game.gameId,
          status: game.status,
          currentPlayerIndex: game.currentPlayerIndex,
          players: game.players,
          board: game.gameState.board,
          dice: game.gameState.dice,
          gameLog: game.gameLog.slice(-50),
          settings: game.settings,
          gameStats: game.gameStats
        });
        
        // Notifier les autres joueurs de la reconnexion
        socket.to(`game:${gameId}`).emit('player:reconnected', {
          playerId: socket.userId,
          username: socket.user.username
        });
        
        console.log(`🎮 ${socket.user.username} a rejoint la partie ${gameId}`);
        
      } catch (error) {
        console.error('Erreur lors de la connexion à la partie:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion à la partie' });
      }
    });
    
    // Quitter une partie
    socket.on('game:leave', async (data) => {
      try {
        const { gameId } = data;
        
        socket.leave(`game:${gameId}`);
        
        // Marquer le joueur comme déconnecté
        const game = await Game.findOne({ gameId });
        if (game) {
          const playerInGame = game.players.find(p => p.userId.toString() === socket.userId);
          if (playerInGame) {
            playerInGame.isConnected = false;
            await game.save();
            
            // Notifier les autres joueurs
            socket.to(`game:${gameId}`).emit('player:disconnected', {
              playerId: socket.userId,
              username: socket.user.username
            });
          }
        }
        
        console.log(`🚪 ${socket.user.username} a quitté la partie ${gameId}`);
        
      } catch (error) {
        console.error('Erreur lors de la déconnexion de la partie:', error);
      }
    });
    
    // Lancer les dés
    socket.on('game:roll_dice', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId });
        if (!game || game.status !== 'playing') {
          socket.emit('error', { message: 'Partie non trouvée ou non active' });
          return;
        }
        
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.userId.toString() !== socket.userId) {
          socket.emit('error', { message: 'Ce n\'est pas votre tour' });
          return;
        }
        
        if (game.gameState.dice.isRolling) {
          socket.emit('error', { message: 'Les dés sont déjà lancés' });
          return;
        }
        
        // Lancer les dés
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const isDouble = die1 === die2;
        
        game.gameState.dice = {
          values: [die1, die2],
          isRolling: true
        };
        
        if (isDouble) {
          game.gameState.consecutiveDoubles += 1;
        } else {
          game.gameState.consecutiveDoubles = 0;
        }
        
        game.addLogEntry(socket.userId, 'roll_dice', { die1, die2, isDouble }, 
          `${socket.user.username} a lancé ${die1} + ${die2} = ${die1 + die2}`);
        
        await game.save();
        
        // Diffuser le résultat à tous les joueurs
        io.to(`game:${gameId}`).emit('dice:rolled', {
          playerId: socket.userId,
          dice: [die1, die2],
          total: die1 + die2,
          isDouble: isDouble,
          consecutiveDoubles: game.gameState.consecutiveDoubles
        });
        
        // Simuler le délai de roulement et déplacer le joueur
        setTimeout(() => {
          movePlayer(io, game, currentPlayer, die1 + die2);
        }, 1000);
        
      } catch (error) {
        console.error('Erreur lors du lancer de dés:', error);
        socket.emit('error', { message: 'Erreur lors du lancer de dés' });
      }
    });
    
    // Terminer le tour
    socket.on('game:end_turn', async (data) => {
      try {
        const { gameId } = data;
        
        const game = await Game.findOne({ gameId });
        if (!game || game.status !== 'playing') {
          socket.emit('error', { message: 'Partie non trouvée ou non active' });
          return;
        }
        
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.userId.toString() !== socket.userId) {
          socket.emit('error', { message: 'Ce n\'est pas votre tour' });
          return;
        }
        
        // Passer au joueur suivant
        game.nextTurn();
        game.gameState.dice.isRolling = false;
        game.gameState.consecutiveDoubles = 0;
        
        const nextPlayer = game.getCurrentPlayer();
        game.addLogEntry(null, 'end_turn', {}, `C'est maintenant au tour de ${nextPlayer.username}`);
        
        await game.save();
        
        // Notifier tous les joueurs
        io.to(`game:${gameId}`).emit('turn:changed', {
          currentPlayerIndex: game.currentPlayerIndex,
          currentPlayer: nextPlayer,
          gameLog: game.gameLog.slice(-5)
        });
        
      } catch (error) {
        console.error('Erreur lors de la fin du tour:', error);
        socket.emit('error', { message: 'Erreur lors de la fin du tour' });
      }
    });

    // Acheter une propriété
    socket.on('game:purchase_property', async (data) => {
      try {
        const { gameId, propertyId } = data;
        
        const game = await Game.findOne({ gameId });
        if (!game || game.status !== 'playing') {
          socket.emit('error', { message: 'Partie non trouvée ou non active' });
          return;
        }
        
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.userId.toString() !== socket.userId) {
          socket.emit('error', { message: 'Ce n\'est pas votre tour' });
          return;
        }
        
        const property = game.gameState.board.find(square => square.id === propertyId);
        if (!property || !property.price) {
          socket.emit('error', { message: 'Propriété non trouvée ou non achetable' });
          return;
        }
        
        if (property.ownerId) {
          socket.emit('error', { message: 'Cette propriété est déjà possédée' });
          return;
        }
        
        if (currentPlayer.money < property.price) {
          socket.emit('error', { message: 'Fonds insuffisants' });
          return;
        }
        
        // Acheter la propriété
        currentPlayer.money -= property.price;
        property.ownerId = currentPlayer.userId;
        
        currentPlayer.properties.push({
          propertyId: property.id,
          houses: 0,
          hasHotel: false,
          mortgaged: false
        });
        
        game.addLogEntry(socket.userId, 'purchase', { propertyId, price: property.price }, 
          `${socket.user.username} achète ${property.name} pour ${property.price}€`);
        
        await game.save();
        
        // Notifier tous les joueurs
        io.to(`game:${gameId}`).emit('property:purchased', {
          playerId: socket.userId,
          playerName: socket.user.username,
          property: property,
          playerMoney: currentPlayer.money
        });
        
      } catch (error) {
        console.error('Erreur lors de l\'achat de propriété:', error);
        socket.emit('error', { message: 'Erreur lors de l\'achat de propriété' });
      }
    });
    
    // Refuser l'achat d'une propriété
    socket.on('game:decline_purchase', async (data) => {
      try {
        const { gameId, propertyId } = data;
        
        const game = await Game.findOne({ gameId });
        if (!game) {
          socket.emit('error', { message: 'Partie non trouvée' });
          return;
        }
        
        const property = game.gameState.board.find(square => square.id === propertyId);
        if (!property) {
          socket.emit('error', { message: 'Propriété non trouvée' });
          return;
        }
        
        game.addLogEntry(socket.userId, 'purchase', { propertyId, declined: true }, 
          `${socket.user.username} refuse d'acheter ${property.name}`);
        
        await game.save();
        
        // Notifier l'événement
        io.to(`game:${gameId}`).emit('property:purchase_declined', {
          playerId: socket.userId,
          playerName: socket.user.username,
          property: property
        });
        
        // Note: Ici on pourrait déclencher une enchère en Phase 2
        
      } catch (error) {
        console.error('Erreur lors du refus d\'achat:', error);
        socket.emit('error', { message: 'Erreur lors du refus d\'achat' });
      }
    });
    
    // Message de chat
    socket.on('chat:message', async (data) => {
      try {
        const { gameId, message } = data;
        
        if (!message || message.trim().length === 0) {
          return;
        }
        
        const game = await Game.findOne({ gameId });
        if (!game) {
          socket.emit('error', { message: 'Partie non trouvée' });
          return;
        }
        
        // Vérifier que l'utilisateur est dans la partie
        const playerInGame = game.players.find(p => p.userId.toString() === socket.userId);
        if (!playerInGame) {
          socket.emit('error', { message: 'Vous n\'êtes pas dans cette partie' });
          return;
        }
        
        // Diffuser le message à tous les joueurs de la partie
        io.to(`game:${gameId}`).emit('chat:message', {
          playerId: socket.userId,
          playerName: socket.user.username,
          message: message.trim(),
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
      }
    });
    
    // Déconnexion
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Utilisateur déconnecté: ${socket.user.username} (${reason})`);
      
      // Marquer le joueur comme déconnecté dans toutes ses parties actives
      try {
        const activeGames = await Game.find({
          'players.userId': socket.userId,
          status: { $in: ['waiting', 'playing', 'paused'] }
        });
        
        for (const game of activeGames) {
          const player = game.players.find(p => p.userId.toString() === socket.userId);
          if (player) {
            player.isConnected = false;
            await game.save();
            
            // Notifier les autres joueurs
            socket.to(`game:${game.gameId}`).emit('player:disconnected', {
              playerId: socket.userId,
              username: socket.user.username
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    });
  });
};

// Fonction utilitaire pour déplacer un joueur
const movePlayer = async (io, game, player, steps) => {
  try {
    const oldPosition = player.position;
    const newPosition = (oldPosition + steps) % 40;
    
    player.position = newPosition;
    
    // Vérifier le passage par la case Départ
    if (oldPosition > newPosition || newPosition === 0) {
      player.money += game.settings.salaryAmount;
      game.addLogEntry(player.userId, 'move', { passedStart: true }, 
        `${player.username} passe par la case Départ et reçoit ${game.settings.salaryAmount}€`);
    }
    
    const square = game.gameState.board[newPosition];
    game.addLogEntry(player.userId, 'move', { oldPosition, newPosition, square: square.name }, 
      `${player.username} se déplace vers "${square.name}" (case ${newPosition})`);
    
    game.gameState.dice.isRolling = false;
    await game.save();
    
    // Notifier le déplacement
    io.to(`game:${game.gameId}`).emit('player:moved', {
      playerId: player.userId.toString(),
      playerName: player.username,
      oldPosition,
      newPosition,
      playerMoney: player.money,
      square: square
    });
    
    // Gérer l'effet de la case après un délai
    setTimeout(() => {
      handleSquareEffect(io, game, player, square);
    }, 500);
    
  } catch (error) {
    console.error('Erreur lors du déplacement du joueur:', error);
  }
};

// Fonction pour gérer les effets des cases
const handleSquareEffect = async (io, game, player, square) => {
  try {
    switch (square.type) {
      case 'property':
      case 'station':
      case 'utility':
        if (!square.ownerId) {
          // Propriété libre - proposer l'achat
          io.to(`game:${game.gameId}`).emit('property:available_for_purchase', {
            playerId: player.userId.toString(),
            property: square
          });
        } else if (square.ownerId.toString() !== player.userId.toString()) {
          // Payer le loyer
          const owner = game.players.find(p => p.userId.toString() === square.ownerId.toString());
          const rentAmount = calculateRent(square, owner);
          
          player.money = Math.max(0, player.money - rentAmount);
          owner.money += rentAmount;
          
          game.addLogEntry(player.userId, 'pay_rent', { propertyId: square.id, amount: rentAmount }, 
            `${player.username} paie ${rentAmount}€ de loyer à ${owner.username}`);
          
          await game.save();
          
          io.to(`game:${game.gameId}`).emit('rent:paid', {
            payerId: player.userId.toString(),
            payerName: player.username,
            ownerId: owner.userId.toString(),
            ownerName: owner.username,
            amount: rentAmount,
            property: square
          });
        }
        break;
        
      case 'tax':
        const taxAmount = square.price || 200;
        player.money = Math.max(0, player.money - taxAmount);
        
        game.addLogEntry(player.userId, 'pay_rent', { amount: taxAmount, tax: true }, 
          `${player.username} paie ${taxAmount}€ d'impôt`);
        
        await game.save();
        
        io.to(`game:${game.gameId}`).emit('tax:paid', {
          playerId: player.userId.toString(),
          playerName: player.username,
          amount: taxAmount,
          square: square
        });
        break;
        
      case 'chance':
      case 'community-chest':
        // Tirer une carte
        drawCard(io, game, player, square.type);
        break;
    }
  } catch (error) {
    console.error('Erreur lors de la gestion de l\'effet de case:', error);
  }
};

// Fonction pour calculer le loyer
const calculateRent = (property, owner) => {
  // Logique simplifiée - peut être enrichie plus tard
  if (property.type === 'property') {
    return Math.floor(property.price * 0.1); // 10% du prix de base
  } else if (property.type === 'station') {
    const stationsOwned = owner.properties.filter(p => 
      property.rent && property.rent.length > 0
    ).length;
    return 25 * Math.pow(2, stationsOwned - 1); // 25, 50, 100, 200
  } else if (property.type === 'utility') {
    return 50; // Fixe pour l'instant
  }
  return 0;
};

// Fonction pour tirer une carte
const drawCard = async (io, game, player, cardType) => {
  try {
    // Logique simplifiée - à enrichir avec les vraies cartes
    const mockCards = [
      { title: 'Avancez au GO', effect: 'move_to_start' },
      { title: 'Reculez de 3 cases', effect: 'move_back_3' },
      { title: 'Recevez 200€', effect: 'collect_money', amount: 200 },
      { title: 'Payez 100€', effect: 'pay_money', amount: 100 }
    ];
    
    const card = mockCards[Math.floor(Math.random() * mockCards.length)];
    
    game.addLogEntry(player.userId, 'draw_card', { cardType, card }, 
      `${player.username} tire une carte ${cardType}: ${card.title}`);
    
    // Appliquer l'effet de la carte
    switch (card.effect) {
      case 'collect_money':
        player.money += card.amount;
        break;
      case 'pay_money':
        player.money = Math.max(0, player.money - card.amount);
        break;
      case 'move_to_start':
        player.position = 0;
        player.money += game.settings.salaryAmount;
        break;
      case 'move_back_3':
        player.position = Math.max(0, player.position - 3);
        break;
    }
    
    await game.save();
    
    io.to(`game:${game.gameId}`).emit('card:drawn', {
      playerId: player.userId.toString(),
      playerName: player.username,
      cardType: cardType,
      card: card,
      playerMoney: player.money,
      playerPosition: player.position
    });
    
  } catch (error) {
    console.error('Erreur lors du tirage de carte:', error);
  }
};

module.exports = { setupSocketHandlers }; 