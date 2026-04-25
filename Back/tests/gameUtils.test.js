const {
  generateGameId,
  shuffleArray,
  calculateDistance,
  passesStart,
  calculateRent,
  hasMonopoly,
  validateGameState,
  formatMoney,
  generateGameStats
} = require('../src/utils/gameUtils');
const Game = require('../src/models/Game');

// Mock du modèle Game pour les tests
jest.mock('../src/models/Game', () => ({
  findOne: jest.fn()
}));

describe('Game Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateGameId', () => {
    it('devrait générer un ID de 6 caractères alphanumériques', async () => {
      Game.findOne.mockResolvedValue(null);
      
      const gameId = await generateGameId();
      
      expect(gameId).toHaveLength(6);
      expect(gameId).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('devrait générer des IDs uniques', async () => {
      Game.findOne.mockResolvedValue(null);
      
      const ids = await Promise.all([
        generateGameId(),
        generateGameId(),
        generateGameId(),
        generateGameId(),
        generateGameId()
      ]);
      
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });

    it('devrait retry en cas de collision', async () => {
      // Premier appel : collision, deuxième appel : libre
      Game.findOne
        .mockResolvedValueOnce({ gameId: 'ABC123' })
        .mockResolvedValueOnce(null);
      
      const gameId = await generateGameId();
      
      expect(Game.findOne).toHaveBeenCalledTimes(2);
      expect(gameId).toHaveLength(6);
      expect(gameId).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('devrait gérer plusieurs collisions consécutives', async () => {
      // Simuler 3 collisions puis un ID libre
      Game.findOne
        .mockResolvedValueOnce({ gameId: 'ABC123' })
        .mockResolvedValueOnce({ gameId: 'DEF456' })
        .mockResolvedValueOnce({ gameId: 'GHI789' })
        .mockResolvedValueOnce(null);
      
      const gameId = await generateGameId();
      
      expect(Game.findOne).toHaveBeenCalledTimes(4);
      expect(gameId).toHaveLength(6);
    });

    it('devrait utiliser seulement des caractères alphanumériques majuscules', async () => {
      Game.findOne.mockResolvedValue(null);
      
      const gameIds = await Promise.all(
        Array(100).fill().map(() => generateGameId())
      );
      
      gameIds.forEach(id => {
        expect(id).toMatch(/^[A-Z0-9]{6}$/);
        expect(id).not.toMatch(/[a-z]/); // Pas de minuscules
        expect(id).not.toMatch(/[^A-Z0-9]/); // Pas de caractères spéciaux
      });
    });
  });

  describe('shuffleArray', () => {
    it('devrait mélanger un tableau sans le modifier', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled).not.toBe(original); // Nouveau tableau
      expect(shuffled.sort()).toEqual(original); // Mêmes éléments
    });

    it('devrait retourner un tableau vide pour un tableau vide', () => {
      expect(shuffleArray([])).toEqual([]);
    });

    it('devrait retourner le même élément pour un tableau à un élément', () => {
      expect(shuffleArray([42])).toEqual([42]);
    });

    it('devrait bien mélanger (test probabiliste)', () => {
      const original = [1, 2, 3, 4, 5];
      let allSame = true;
      
      // Tester 100 fois, au moins une fois devrait être différente
      for (let i = 0; i < 100; i++) {
        const shuffled = shuffleArray(original);
        if (JSON.stringify(shuffled) !== JSON.stringify(original)) {
          allSame = false;
          break;
        }
      }
      
      expect(allSame).toBe(false);
    });

    it('devrait préserver tous les éléments', () => {
      const original = ['a', 'b', 'c', 'd', 'e', 'f'];
      const shuffled = shuffleArray(original);
      
      original.forEach(item => {
        expect(shuffled).toContain(item);
      });
    });

    it('devrait gérer les types de données mixtes', () => {
      const original = [1, 'hello', { id: 3 }, null, true];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toHaveLength(5);
      expect(shuffled).toContain(1);
      expect(shuffled).toContain('hello');
      expect(shuffled).toContain(null);
      expect(shuffled).toContain(true);
      expect(shuffled.find(item => typeof item === 'object' && item?.id === 3)).toBeDefined();
    });
  });

  describe('calculateDistance', () => {
    it('devrait calculer la distance normale', () => {
      expect(calculateDistance(0, 10)).toBe(10);
      expect(calculateDistance(5, 15)).toBe(10);
      expect(calculateDistance(30, 35)).toBe(5);
    });

    it('devrait calculer la distance avec passage par Départ', () => {
      expect(calculateDistance(35, 5)).toBe(10); // 35->39->0->5
      expect(calculateDistance(38, 2)).toBe(4);  // 38->39->0->1->2
      expect(calculateDistance(30, 10)).toBe(20); // 30->39->0->10
    });

    it('devrait retourner 0 pour la même position', () => {
      expect(calculateDistance(0, 0)).toBe(0);
      expect(calculateDistance(15, 15)).toBe(0);
      expect(calculateDistance(39, 39)).toBe(0);
    });

    it('devrait gérer les positions limites', () => {
      expect(calculateDistance(0, 39)).toBe(39);
      expect(calculateDistance(39, 0)).toBe(1);
      expect(calculateDistance(1, 0)).toBe(39);
    });

    it('devrait toujours retourner une distance positive', () => {
      for (let from = 0; from < 40; from++) {
        for (let to = 0; to < 40; to++) {
          const distance = calculateDistance(from, to);
          expect(distance).toBeGreaterThanOrEqual(0);
          expect(distance).toBeLessThan(40);
        }
      }
    });
  });

  describe('passesStart', () => {
    it('devrait détecter le passage par Départ avec mouvement normal', () => {
      expect(passesStart(35, 5, 10)).toBe(true);  // 35 + 10 = 45, position finale 5
      expect(passesStart(38, 2, 4)).toBe(true);   // 38 + 4 = 42, position finale 2
      expect(passesStart(30, 10, 20)).toBe(true); // 30 + 20 = 50, position finale 10
    });

    it('ne devrait pas détecter de passage sans tour complet', () => {
      expect(passesStart(5, 10, 5)).toBe(false);   // 5 + 5 = 10, pas de passage
      expect(passesStart(20, 25, 5)).toBe(false);  // 20 + 5 = 25, pas de passage
      expect(passesStart(10, 30, 20)).toBe(false); // 10 + 20 = 30, pas de passage
    });

    it('devrait gérer l\'arrêt exact sur Départ', () => {
      expect(passesStart(35, 0, 5)).toBe(true);  // 35 + 5 = 40, arrêt sur Départ
      expect(passesStart(30, 0, 10)).toBe(true); // 30 + 10 = 40, arrêt sur Départ
    });

    it('devrait gérer les multiples tours', () => {
      expect(passesStart(10, 20, 50)).toBe(true); // 10 + 50 = 60, position finale 20
      expect(passesStart(0, 0, 40)).toBe(true);   // Tour complet
      expect(passesStart(0, 0, 80)).toBe(true);   // Deux tours complets
    });

    it('devrait valider la cohérence avec calculateDistance', () => {
      for (let oldPos = 0; oldPos < 40; oldPos++) {
        for (let steps = 1; steps <= 60; steps++) {
          const newPos = (oldPos + steps) % 40;
          const expectedPasses = steps >= (40 - oldPos);
          
          expect(passesStart(oldPos, newPos, steps)).toBe(expectedPasses);
        }
      }
    });
  });

  describe('calculateRent', () => {
    const mockOwner = {
      properties: [
        { propertyId: 5 },
        { propertyId: 15 },
        { propertyId: 25 },
        { propertyId: 35 }
      ]
    };

    const mockBoard = [
      { id: 5, type: 'station' },
      { id: 15, type: 'station' },
      { id: 25, type: 'utility' },
      { id: 35, type: 'utility' }
    ];

    describe('Propriétés normales', () => {
      it('devrait calculer le loyer de base', () => {
        const property = {
          type: 'property',
          rent: [10, 50, 150, 450, 625, 750],
          price: 100
        };
        
        expect(calculateRent(property, mockOwner)).toBe(10);
      });

      it('devrait utiliser 10% du prix si pas de loyer défini', () => {
        const property = {
          type: 'property',
          price: 200
        };
        
        expect(calculateRent(property, mockOwner)).toBe(20);
      });

      it('devrait gérer les propriétés sans prix', () => {
        const property = {
          type: 'property'
        };
        
        expect(calculateRent(property, mockOwner)).toBe(0);
      });
    });

    describe('Gares', () => {
      it('devrait calculer le loyer selon le nombre de gares possédées', () => {
        const property = {
          type: 'station',
          board: mockBoard
        };

        // Avec 2 gares dans les propriétés du joueur (id 5 et 15)
        const ownerWith2Stations = {
          properties: [
            { propertyId: 5 },  // station
            { propertyId: 15 }  // station
          ]
        };
        
        expect(calculateRent(property, ownerWith2Stations)).toBe(50);

        // Avec 4 gares
        expect(calculateRent(property, mockOwner)).toBe(200);
      });

      it('devrait retourner le loyer minimum pour une gare', () => {
        const property = {
          type: 'station',
          board: mockBoard
        };

        const ownerWith1Station = {
          properties: [{ propertyId: 5 }]
        };
        
        expect(calculateRent(property, ownerWith1Station)).toBe(25);
      });

      it('devrait gérer les cas limites pour les gares', () => {
        const property = {
          type: 'station',
          board: mockBoard
        };

        const ownerWithNoStations = {
          properties: []
        };
        
        expect(calculateRent(property, ownerWithNoStations)).toBe(25);
      });
    });

    describe('Services publics', () => {
      it('devrait calculer le loyer avec multiplicateur selon le nombre possédé', () => {
        const property = {
          type: 'utility',
          board: mockBoard
        };

        // Avec 1 service public (multiplicateur 4)
        const ownerWith1Utility = {
          properties: [{ propertyId: 25 }]
        };
        
        expect(calculateRent(property, ownerWith1Utility, 8)).toBe(32); // 8 × 4

        // Avec 2 services publics (multiplicateur 10)
        expect(calculateRent(property, mockOwner, 8)).toBe(80); // 8 × 10
      });

      it('devrait retourner 0 sans lancé de dés', () => {
        const property = {
          type: 'utility',
          board: mockBoard
        };
        
        expect(calculateRent(property, mockOwner)).toBe(0);
        expect(calculateRent(property, mockOwner, null)).toBe(0);
      });
    });

    describe('Cas d\'erreur', () => {
      it('devrait retourner 0 pour des paramètres invalides', () => {
        expect(calculateRent(null, mockOwner)).toBe(0);
        expect(calculateRent({}, null)).toBe(0);
        expect(calculateRent(null, null)).toBe(0);
      });

      it('devrait retourner 0 pour des types de propriété non reconnus', () => {
        const unknownProperty = {
          type: 'unknown',
          price: 100
        };
        
        expect(calculateRent(unknownProperty, mockOwner)).toBe(0);
      });
    });
  });

  describe('hasMonopoly', () => {
    const mockPlayers = [
      {
        userId: 'player1',
        properties: [
          { propertyId: 1 }, // Boulevard de Belleville (marron)
          { propertyId: 3 }  // Rue Lecourbe (marron)
        ]
      },
      {
        userId: 'player2',
        properties: [
          { propertyId: 6 }, // Rue de Vaugirard (bleu clair)
        ]
      }
    ];

    const mockBoard = [
      { id: 1, type: 'property', color: 'brown' },
      { id: 3, type: 'property', color: 'brown' },
      { id: 6, type: 'property', color: 'lightblue' },
      { id: 8, type: 'property', color: 'lightblue' },
      { id: 9, type: 'property', color: 'lightblue' }
    ];

    it('devrait détecter un monopole complet', () => {
      expect(hasMonopoly('player1', 'brown', mockPlayers, mockBoard)).toBe(true);
    });

    it('ne devrait pas détecter un monopole incomplet', () => {
      expect(hasMonopoly('player2', 'lightblue', mockPlayers, mockBoard)).toBe(false);
      expect(hasMonopoly('player1', 'lightblue', mockPlayers, mockBoard)).toBe(false);
    });

    it('devrait retourner false pour un joueur inexistant', () => {
      expect(hasMonopoly('inexistant', 'brown', mockPlayers, mockBoard)).toBe(false);
    });

    it('devrait retourner false pour une couleur inexistante', () => {
      expect(hasMonopoly('player1', 'nonexistent', mockPlayers, mockBoard)).toBe(false);
    });

    it('devrait gérer les ObjectId string et Object', () => {
      const playersWithObjectId = [
        {
          userId: { toString: () => 'player1' },
          properties: [
            { propertyId: 1 },
            { propertyId: 3 }
          ]
        }
      ];

      expect(hasMonopoly('player1', 'brown', playersWithObjectId, mockBoard)).toBe(true);
    });
  });

  describe('validateGameState', () => {
    const validGameState = {
      players: [
        { position: 0, money: 1500 },
        { position: 5, money: 1200 }
      ],
      currentPlayerIndex: 0
    };

    it('devrait valider un état de jeu correct', () => {
      const result = validateGameState(validGameState);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('Validation du nombre de joueurs', () => {
      it('devrait rejeter un jeu avec moins de 2 joueurs', () => {
        const invalidState = {
          ...validGameState,
          players: [{ position: 0, money: 1500 }]
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Il faut au moins 2 joueurs');
      });

      it('devrait rejeter un jeu avec plus de 8 joueurs', () => {
        const players = Array(9).fill().map(() => ({ position: 0, money: 1500 }));
        const invalidState = { ...validGameState, players };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Maximum 8 joueurs autorisés');
      });

      it('devrait accepter 2 à 8 joueurs', () => {
        for (let playerCount = 2; playerCount <= 8; playerCount++) {
          const players = Array(playerCount).fill().map(() => ({ position: 0, money: 1500 }));
          const state = { ...validGameState, players };
          
          const result = validateGameState(state);
          expect(result.isValid).toBe(true);
        }
      });
    });

    describe('Validation de l\'index du joueur actuel', () => {
      it('devrait rejeter un index négatif', () => {
        const invalidState = {
          ...validGameState,
          currentPlayerIndex: -1
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Index du joueur actuel invalide');
      });

      it('devrait rejeter un index supérieur au nombre de joueurs', () => {
        const invalidState = {
          ...validGameState,
          currentPlayerIndex: 2 // > nombre de joueurs (2)
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Index du joueur actuel invalide');
      });

      it('devrait accepter des index valides', () => {
        for (let i = 0; i < validGameState.players.length; i++) {
          const state = { ...validGameState, currentPlayerIndex: i };
          const result = validateGameState(state);
          expect(result.isValid).toBe(true);
        }
      });
    });

    describe('Validation des positions des joueurs', () => {
      it('devrait rejeter des positions négatives', () => {
        const invalidState = {
          ...validGameState,
          players: [
            { position: -1, money: 1500 },
            { position: 5, money: 1200 }
          ]
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Position invalide pour le joueur 1');
      });

      it('devrait rejeter des positions supérieures à 39', () => {
        const invalidState = {
          ...validGameState,
          players: [
            { position: 0, money: 1500 },
            { position: 40, money: 1200 }
          ]
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Position invalide pour le joueur 2');
      });

      it('devrait accepter les positions 0-39', () => {
        for (let pos = 0; pos <= 39; pos++) {
          const state = {
            ...validGameState,
            players: [
              { position: pos, money: 1500 },
              { position: 0, money: 1200 }
            ]
          };
          
          const result = validateGameState(state);
          expect(result.isValid).toBe(true);
        }
      });
    });

    describe('Validation de l\'argent des joueurs', () => {
      it('devrait rejeter l\'argent négatif', () => {
        const invalidState = {
          ...validGameState,
          players: [
            { position: 0, money: -100 },
            { position: 5, money: 1200 }
          ]
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Argent négatif pour le joueur 1');
      });

      it('devrait accepter l\'argent à zéro', () => {
        const state = {
          ...validGameState,
          players: [
            { position: 0, money: 0 },
            { position: 5, money: 1200 }
          ]
        };
        
        const result = validateGameState(state);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Validation multiple d\'erreurs', () => {
      it('devrait reporter toutes les erreurs trouvées', () => {
        const invalidState = {
          players: [{ position: -1, money: -100 }], // Moins de 2 joueurs, position et argent invalides
          currentPlayerIndex: 5 // Index invalide
        };
        
        const result = validateGameState(invalidState);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain('Il faut au moins 2 joueurs');
        expect(result.errors).toContain('Index du joueur actuel invalide');
        expect(result.errors).toContain('Position invalide pour le joueur 1');
        expect(result.errors).toContain('Argent négatif pour le joueur 1');
      });
    });

    describe('Cas limites', () => {
      it('devrait gérer un gameState undefined', () => {
        const result = validateGameState(undefined);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Il faut au moins 2 joueurs');
      });

      it('devrait gérer un gameState sans players', () => {
        const result = validateGameState({});
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Il faut au moins 2 joueurs');
      });

      it('devrait gérer players null', () => {
        const result = validateGameState({ players: null });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Il faut au moins 2 joueurs');
      });
    });
  });

  describe('formatMoney', () => {
    it('devrait formater l\'argent en euros français', () => {
      expect(formatMoney(1500)).toBe('1 500 €');
      expect(formatMoney(0)).toBe('0 €');
      expect(formatMoney(1000000)).toBe('1 000 000 €');
    });

    it('devrait gérer les nombres négatifs', () => {
      expect(formatMoney(-500)).toBe('-500 €');
      expect(formatMoney(-1500)).toBe('-1 500 €');
    });

    it('devrait ne pas afficher de décimales pour les entiers', () => {
      expect(formatMoney(100)).toBe('100 €');
      expect(formatMoney(1500)).toBe('1 500 €');
    });

    it('devrait gérer les décimales', () => {
      expect(formatMoney(1500.50)).toBe('1 500,50 €');
      expect(formatMoney(100.99)).toBe('100,99 €');
    });

    it('devrait utiliser les espaces comme séparateurs de milliers', () => {
      expect(formatMoney(1234567)).toBe('1 234 567 €');
      expect(formatMoney(12345)).toBe('12 345 €');
    });

    it('devrait gérer zéro et les nombres très petits', () => {
      expect(formatMoney(0)).toBe('0 €');
      expect(formatMoney(0.01)).toBe('0,01 €');
      expect(formatMoney(1)).toBe('1 €');
    });

    it('devrait gérer les très grands nombres', () => {
      expect(formatMoney(999999999)).toBe('999 999 999 €');
      expect(formatMoney(1000000000)).toBe('1 000 000 000 €');
    });
  });

  describe('generateGameStats', () => {
    const mockGame = {
      gameStats: {
        totalTurns: 50,
        totalTransactions: 25,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        endedAt: new Date('2024-01-01T11:30:00Z'),
        winnerId: 'player1'
      },
      players: [
        {
          userId: 'player1',
          username: 'Alice',
          money: 2000,
          position: 15,
          properties: [{ propertyId: 1 }, { propertyId: 3 }]
        },
        {
          userId: 'player2',
          username: 'Bob',
          money: 500,
          position: 20,
          properties: [{ propertyId: 6 }]
        }
      ],
      gameState: {
        board: [
          { id: 1, price: 100 },
          { id: 3, price: 120 },
          { id: 6, price: 200 }
        ]
      }
    };

    it('devrait générer des statistiques complètes', () => {
      const stats = generateGameStats(mockGame);
      
      expect(stats.duration).toBe(5400); // 1h30 en secondes
      expect(stats.totalTurns).toBe(50);
      expect(stats.totalTransactions).toBe(25);
      expect(stats.playerStats).toHaveLength(2);
    });

    it('devrait calculer les actifs totaux correctement', () => {
      const stats = generateGameStats(mockGame);
      
      const alice = stats.playerStats.find(p => p.username === 'Alice');
      const bob = stats.playerStats.find(p => p.username === 'Bob');
      
      expect(alice.totalAssets).toBe(2220); // 2000 + 100 + 120
      expect(alice.finalMoney).toBe(2000);
      expect(alice.propertiesOwned).toBe(2);
      
      expect(bob.totalAssets).toBe(700); // 500 + 200
      expect(bob.finalMoney).toBe(500);
      expect(bob.propertiesOwned).toBe(1);
    });

    it('devrait identifier le gagnant correctement', () => {
      const stats = generateGameStats(mockGame);
      
      const alice = stats.playerStats.find(p => p.username === 'Alice');
      const bob = stats.playerStats.find(p => p.username === 'Bob');
      
      expect(alice.isWinner).toBe(true);
      expect(bob.isWinner).toBe(false);
    });

    it('devrait trier les joueurs par actifs décroissants', () => {
      const stats = generateGameStats(mockGame);
      
      expect(stats.playerStats[0].username).toBe('Alice');
      expect(stats.playerStats[1].username).toBe('Bob');
      expect(stats.playerStats[0].totalAssets).toBeGreaterThan(stats.playerStats[1].totalAssets);
    });

    it('devrait gérer l\'absence de dates', () => {
      const gameWithoutDates = {
        ...mockGame,
        gameStats: {
          ...mockGame.gameStats,
          startedAt: null,
          endedAt: null
        }
      };
      
      const stats = generateGameStats(gameWithoutDates);
      expect(stats.duration).toBe(0);
    });

    it('devrait gérer l\'absence de propriétés', () => {
      const gameWithoutProperties = {
        ...mockGame,
        players: [
          {
            userId: 'player1',
            username: 'Alice',
            money: 2000,
            position: 15,
            properties: []
          }
        ]
      };
      
      const stats = generateGameStats(gameWithoutProperties);
      expect(stats.playerStats[0].totalAssets).toBe(2000);
      expect(stats.playerStats[0].propertiesOwned).toBe(0);
    });

    it('devrait gérer les propriétés sans prix', () => {
      const gameWithPricelessProperties = {
        ...mockGame,
        gameState: {
          board: [
            { id: 1 }, // Pas de prix
            { id: 3, price: 120 }
          ]
        }
      };
      
      const stats = generateGameStats(gameWithPricelessProperties);
      
      const alice = stats.playerStats.find(p => p.username === 'Alice');
      expect(alice.totalAssets).toBe(2120); // 2000 + 0 + 120
    });

    it('devrait gérer l\'absence de winner', () => {
      const gameWithoutWinner = {
        ...mockGame,
        gameStats: {
          ...mockGame.gameStats,
          winnerId: null
        }
      };
      
      const stats = generateGameStats(gameWithoutWinner);
      
      stats.playerStats.forEach(player => {
        expect(player.isWinner).toBe(false);
      });
    });

    it('devrait gérer des données partiellement manquantes', () => {
      const incompleteGame = {
        gameStats: {},
        players: [
          {
            userId: 'player1',
            username: 'Alice',
            money: 1500,
            position: 0,
            properties: []
          }
        ],
        gameState: {
          board: []
        }
      };
      
      const stats = generateGameStats(incompleteGame);
      
      expect(stats.duration).toBe(0);
      expect(stats.totalTurns).toBe(0);
      expect(stats.totalTransactions).toBe(0);
      expect(stats.playerStats).toHaveLength(1);
      expect(stats.playerStats[0].totalAssets).toBe(1500);
    });
  });
});