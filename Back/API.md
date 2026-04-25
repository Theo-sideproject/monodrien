# 📡 API Documentation - Monodrien Backend

Documentation complète des endpoints API avec exemples pratiques.

## 🎯 Base URL

```
http://localhost:5000/api
```

En production : `https://votre-domaine.com/api`

## 🔑 Authentification

L'API utilise **JWT (JSON Web Tokens)** pour l'authentification.

### Format du header :

```
Authorization: Bearer <votre_jwt_token>
```

## 📋 Table des Matières

- [🏥 Santé](#-santé)
- [🔐 Authentification](#-authentification)
- [🎮 Parties](#-parties)
- [👤 Utilisateurs](#-utilisateurs)
- [⚡ Socket.io Events](#-socketio-events)
- [❌ Codes d'Erreur](#-codes-derreur)

---

## 🏥 Santé

### GET /health

Vérifier l'état du serveur.

**Paramètres :** Aucun

**Exemple de requête :**

```bash
curl http://localhost:5000/api/health
```

**Réponse :**

```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.45
}
```

---

## 🔐 Authentification

### POST /auth/register

Créer un nouveau compte utilisateur.

**Paramètres :**

```json
{
  "username": "string (3-20 caractères, alphanumérique + _ -)",
  "email": "string (email valide)",
  "password": "string (6+ caractères, 1 maj, 1 min, 1 chiffre)"
}
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice_gaming",
    "email": "alice@example.com",
    "password": "Alice123!"
  }'
```

**Réponse de succès (201) :**

```json
{
  "message": "Utilisateur créé avec succès",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f123456789abcdef012345",
    "username": "alice_gaming",
    "email": "alice@example.com",
    "avatar": null,
    "stats": {
      "gamesPlayed": 0,
      "gamesWon": 0,
      "totalMoney": 0,
      "averageGameDuration": 0
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### POST /auth/login

Se connecter avec un compte existant.

**Paramètres :**

```json
{
  "login": "string (email ou nom d'utilisateur)",
  "password": "string"
}
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "alice@example.com",
    "password": "Alice123!"
  }'
```

**Réponse de succès (200) :**

```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f123456789abcdef012345",
    "username": "alice_gaming",
    "email": "alice@example.com",
    "avatar": null,
    "stats": {
      "gamesPlayed": 5,
      "gamesWon": 2,
      "totalMoney": 7500,
      "averageGameDuration": 1800
    },
    "isActive": true,
    "createdAt": "2024-01-10T08:00:00.000Z"
  }
}
```

### GET /auth/me

Récupérer les informations de l'utilisateur connecté.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Exemple de requête :**

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Réponse (200) :**

```json
{
  "user": {
    "id": "64f123456789abcdef012345",
    "username": "alice_gaming",
    "email": "alice@example.com",
    "avatar": null,
    "stats": {
      "gamesPlayed": 5,
      "gamesWon": 2,
      "totalMoney": 7500,
      "averageGameDuration": 1800
    },
    "isActive": true,
    "createdAt": "2024-01-10T08:00:00.000Z"
  }
}
```

### PUT /auth/profile

Mettre à jour le profil utilisateur.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Paramètres (tous optionnels) :**

```json
{
  "username": "string",
  "email": "string",
  "avatar": "string (URL)",
  "preferences": {
    "theme": "light|dark",
    "notifications": "boolean",
    "language": "string"
  }
}
```

**Exemple de requête :**

```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice_pro_gamer",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }'
```

### POST /auth/change-password

Changer le mot de passe.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Paramètres :**

```json
{
  "currentPassword": "string",
  "newPassword": "string (6+ caractères, 1 maj, 1 min, 1 chiffre)"
}
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Alice123!",
    "newPassword": "NewPass456!"
  }'
```

---

## 🎮 Parties

### GET /games

Lister les parties publiques.

**Query Parameters :**

- `status` : `waiting|playing|finished` (défaut: `waiting`)
- `gameMode` : `classique|blitz|chaos`
- `limit` : nombre max de résultats (défaut: 20)
- `page` : numéro de page (défaut: 1)

**Exemple de requête :**

```bash
curl "http://localhost:5000/api/games?status=waiting&limit=10"
```

**Réponse (200) :**

```json
{
  "games": [
    {
      "gameId": "ABC123",
      "name": "Partie du soir",
      "hostId": "64f123456789abcdef012345",
      "status": "waiting",
      "gameMode": "classique",
      "visibility": "public",
      "maxPlayers": 4,
      "currentPlayers": 2,
      "players": [
        {
          "userId": "64f123456789abcdef012345",
          "username": "alice_gaming",
          "color": "bg-monodrien-blue",
          "isConnected": true,
          "isActive": true
        }
      ],
      "createdAt": "2024-01-15T19:00:00.000Z",
      "settings": {
        "startingMoney": 1500,
        "salaryAmount": 200,
        "allowTrading": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### POST /games

Créer une nouvelle partie.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Paramètres :**

```json
{
  "name": "string (3-50 caractères)",
  "gameMode": "classique|blitz|chaos",
  "visibility": "public|private",
  "maxPlayers": "number (2-8)"
}
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/games \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ma super partie",
    "gameMode": "classique",
    "visibility": "public",
    "maxPlayers": 4
  }'
```

**Réponse de succès (201) :**

```json
{
  "message": "Partie créée avec succès",
  "game": {
    "gameId": "XYZ789",
    "name": "Ma super partie",
    "hostId": "64f123456789abcdef012345",
    "status": "waiting",
    "gameMode": "classique",
    "visibility": "public",
    "maxPlayers": 4,
    "currentPlayers": 1,
    "players": [
      {
        "userId": "64f123456789abcdef012345",
        "username": "alice_gaming",
        "color": "bg-monodrien-blue",
        "isConnected": true,
        "isActive": true
      }
    ],
    "createdAt": "2024-01-15T20:00:00.000Z"
  },
  "gameId": "XYZ789"
}
```

### GET /games/:gameId

Récupérer les détails d'une partie.

**Paramètres d'URL :**

- `gameId` : ID de la partie (6 caractères alphanumériques)

**Exemple de requête :**

```bash
curl http://localhost:5000/api/games/ABC123
```

**Réponse (200) :**

```json
{
  "game": {
    "gameId": "ABC123",
    "name": "Partie du soir",
    "hostId": {
      "username": "alice_gaming",
      "avatar": null
    },
    "status": "playing",
    "gameMode": "classique",
    "visibility": "public",
    "maxPlayers": 4,
    "currentPlayers": 3,
    "players": [
      {
        "userId": {
          "username": "alice_gaming",
          "avatar": null
        },
        "username": "alice_gaming",
        "color": "bg-monodrien-blue",
        "isConnected": true,
        "isActive": true
      }
    ],
    "createdAt": "2024-01-15T19:00:00.000Z",
    "settings": {
      "startingMoney": 1500,
      "salaryAmount": 200,
      "prisonFine": 50,
      "allowTrading": true
    }
  }
}
```

### POST /games/:gameId/join

Rejoindre une partie.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/games/ABC123/join \
  -H "Authorization: Bearer <token>"
```

**Réponse de succès (200) :**

```json
{
  "message": "Partie rejointe avec succès",
  "game": {
    "gameId": "ABC123",
    "name": "Partie du soir",
    "status": "waiting",
    "currentPlayers": 3,
    "players": [
      {
        "userId": "64f123456789abcdef012345",
        "username": "alice_gaming",
        "color": "bg-monodrien-blue"
      },
      {
        "userId": "64f987654321fedcba098765",
        "username": "bob_player",
        "color": "bg-monodrien-yellow"
      }
    ]
  }
}
```

### POST /games/:gameId/leave

Quitter une partie.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/games/ABC123/leave \
  -H "Authorization: Bearer <token>"
```

**Réponse (200) :**

```json
{
  "message": "Partie quittée avec succès"
}
```

### POST /games/:gameId/start

Démarrer une partie (hôte seulement).

**Headers requis :**

```
Authorization: Bearer <token>
```

**Exemple de requête :**

```bash
curl -X POST http://localhost:5000/api/games/ABC123/start \
  -H "Authorization: Bearer <token>"
```

**Réponse de succès (200) :**

```json
{
  "message": "Partie démarrée avec succès",
  "game": {
    "gameId": "ABC123",
    "status": "playing",
    "currentPlayerIndex": 0,
    "gameStats": {
      "startedAt": "2024-01-15T20:15:00.000Z",
      "totalTurns": 0
    }
  }
}
```

### GET /games/:gameId/state

Récupérer l'état complet du jeu (joueurs seulement).

**Headers requis :**

```
Authorization: Bearer <token>
```

**Exemple de requête :**

```bash
curl http://localhost:5000/api/games/ABC123/state \
  -H "Authorization: Bearer <token>"
```

**Réponse (200) :**

```json
{
  "gameState": {
    "gameId": "ABC123",
    "status": "playing",
    "currentPlayerIndex": 1,
    "players": [
      {
        "userId": "64f123456789abcdef012345",
        "username": "alice_gaming",
        "color": "bg-monodrien-blue",
        "position": 15,
        "money": 1350,
        "properties": [
          {
            "propertyId": 1,
            "houses": 0,
            "hasHotel": false,
            "mortgaged": false
          }
        ],
        "prisonState": {
          "isInJail": false,
          "turnsInJail": 0,
          "hasGetOutOfJailCard": false,
          "canPayFine": true
        },
        "getOutOfJailCards": 0,
        "isActive": true,
        "isConnected": true
      }
    ],
    "board": [
      {
        "id": 0,
        "name": "Départ",
        "type": "corner",
        "ownerId": null
      },
      {
        "id": 1,
        "name": "Boulevard de Belleville",
        "type": "property",
        "color": "brown",
        "price": 60,
        "rent": [2, 10, 30, 90, 160, 250],
        "ownerId": "64f123456789abcdef012345"
      }
    ],
    "dice": {
      "values": [4, 2],
      "isRolling": false
    },
    "gameLog": [
      "[20:15] La partie commence avec 3 joueurs !",
      "[20:15] C'est au tour de alice_gaming.",
      "[20:16] alice_gaming a lancé 4 + 2 = 6",
      "[20:16] alice_gaming se déplace vers \"Rue de Vaugirard\" (case 6)"
    ],
    "settings": {
      "startingMoney": 1500,
      "salaryAmount": 200,
      "prisonFine": 50
    },
    "gameStats": {
      "startedAt": "2024-01-15T20:15:00.000Z",
      "totalTurns": 5
    }
  }
}
```

---

## 👤 Utilisateurs

### GET /users/me

Profil de l'utilisateur connecté (identique à `/auth/me`).

### GET /users/me/games

Historique des parties de l'utilisateur.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Query Parameters :**

- `status` : `waiting|playing|finished|cancelled`
- `limit` : nombre max de résultats (défaut: 10)
- `page` : numéro de page (défaut: 1)

**Exemple de requête :**

```bash
curl "http://localhost:5000/api/users/me/games?status=finished&limit=5" \
  -H "Authorization: Bearer <token>"
```

**Réponse (200) :**

```json
{
  "games": [
    {
      "gameId": "DEF456",
      "name": "Partie rapide",
      "hostId": {
        "username": "bob_player",
        "avatar": null
      },
      "status": "finished",
      "gameMode": "blitz",
      "gameStats": {
        "startedAt": "2024-01-14T18:00:00.000Z",
        "endedAt": "2024-01-14T19:30:00.000Z",
        "duration": 5400,
        "winnerId": "64f123456789abcdef012345"
      },
      "userStats": {
        "finalPosition": 25,
        "finalMoney": 2340,
        "propertiesOwned": 4,
        "isWinner": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 12,
    "pages": 3
  }
}
```

### GET /users/me/stats

Statistiques détaillées de l'utilisateur.

**Headers requis :**

```
Authorization: Bearer <token>
```

**Exemple de requête :**

```bash
curl http://localhost:5000/api/users/me/stats \
  -H "Authorization: Bearer <token>"
```

**Réponse (200) :**

```json
{
  "stats": {
    "overview": {
      "gamesPlayed": 25,
      "gamesWon": 8,
      "winRate": 32.0,
      "averageGameDuration": 45,
      "totalMoney": 37500
    },
    "gamesByMode": {
      "classique": {
        "played": 20,
        "won": 7,
        "winRate": "35.0"
      },
      "blitz": {
        "played": 4,
        "won": 1,
        "winRate": "25.0"
      },
      "chaos": {
        "played": 1,
        "won": 0,
        "winRate": "0.0"
      }
    },
    "recentGames": [
      {
        "gameId": "ABC123",
        "name": "Partie du soir",
        "gameMode": "classique",
        "endedAt": "2024-01-15T22:30:00.000Z",
        "isWinner": false,
        "players": 4
      }
    ]
  }
}
```

### GET /users/:userId

Profil public d'un utilisateur.

**Paramètres d'URL :**

- `userId` : ID MongoDB de l'utilisateur

**Exemple de requête :**

```bash
curl http://localhost:5000/api/users/64f123456789abcdef012345
```

**Réponse (200) :**

```json
{
  "user": {
    "id": "64f123456789abcdef012345",
    "username": "alice_gaming",
    "avatar": null,
    "memberSince": "2024-01-10T08:00:00.000Z",
    "stats": {
      "gamesPlayed": 25,
      "gamesWon": 8,
      "winRate": 32.0
    }
  }
}
```

### GET /users/leaderboard

Classement des joueurs.

**Query Parameters :**

- `sortBy` : `winRate|gamesWon|gamesPlayed|totalMoney` (défaut: `winRate`)
- `limit` : nombre max de résultats (défaut: 100)

**Exemple de requête :**

```bash
curl "http://localhost:5000/api/users/leaderboard?sortBy=winRate&limit=10"
```

**Réponse (200) :**

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "_id": "64f123456789abcdef012345",
      "username": "alice_gaming",
      "avatar": null,
      "createdAt": "2024-01-10T08:00:00.000Z",
      "gamesPlayed": 25,
      "gamesWon": 12,
      "winRate": 48.0
    },
    {
      "rank": 2,
      "_id": "64f987654321fedcba098765",
      "username": "bob_player",
      "avatar": null,
      "createdAt": "2024-01-08T14:20:00.000Z",
      "gamesPlayed": 18,
      "gamesWon": 8,
      "winRate": 44.4
    }
  ]
}
```

---

## ⚡ Socket.io Events

### Connexion au Socket

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: "votre_jwt_token",
  },
});
```

### Événements Émis (Client → Serveur)

#### `game:join`

Rejoindre une partie via socket.

```javascript
socket.emit("game:join", { gameId: "ABC123" });
```

**Réponse :**

- `game:state` avec l'état complet
- `player:reconnected` pour les autres joueurs

#### `game:leave`

Quitter une partie.

```javascript
socket.emit("game:leave", { gameId: "ABC123" });
```

#### `game:roll_dice`

Lancer les dés.

```javascript
socket.emit("game:roll_dice", { gameId: "ABC123" });
```

**Réponse :**

- `dice:rolled` pour tous les joueurs
- `player:moved` après le déplacement

#### `game:end_turn`

Terminer son tour.

```javascript
socket.emit("game:end_turn", { gameId: "ABC123" });
```

**Réponse :**

- `turn:changed` pour tous les joueurs

#### `game:purchase_property`

Acheter une propriété.

```javascript
socket.emit("game:purchase_property", {
  gameId: "ABC123",
  propertyId: 1,
});
```

**Réponse :**

- `property:purchased` pour tous les joueurs

#### `game:decline_purchase`

Refuser l'achat d'une propriété.

```javascript
socket.emit("game:decline_purchase", {
  gameId: "ABC123",
  propertyId: 1,
});
```

#### `chat:message`

Envoyer un message dans le chat.

```javascript
socket.emit("chat:message", {
  gameId: "ABC123",
  message: "Salut tout le monde !",
});
```

### Événements Reçus (Serveur → Client)

#### `game:state`

État complet du jeu (reçu à la connexion).

```javascript
socket.on("game:state", (data) => {
  console.log("État du jeu:", data);
  // data contient: gameId, status, players, board, dice, etc.
});
```

#### `dice:rolled`

Résultat d'un lancer de dés.

```javascript
socket.on("dice:rolled", (data) => {
  console.log("Dés lancés:", data);
  // data: { playerId, dice: [4, 2], total: 6, isDouble: false }
});
```

#### `player:moved`

Un joueur s'est déplacé.

```javascript
socket.on("player:moved", (data) => {
  console.log("Joueur déplacé:", data);
  // data: { playerId, playerName, oldPosition, newPosition, playerMoney, square }
});
```

#### `property:purchased`

Une propriété a été achetée.

```javascript
socket.on("property:purchased", (data) => {
  console.log("Propriété achetée:", data);
  // data: { playerId, playerName, property, playerMoney }
});
```

#### `rent:paid`

Un loyer a été payé.

```javascript
socket.on("rent:paid", (data) => {
  console.log("Loyer payé:", data);
  // data: { payerId, payerName, ownerId, ownerName, amount, property }
});
```

#### `turn:changed`

Le tour a changé.

```javascript
socket.on("turn:changed", (data) => {
  console.log("Nouveau tour:", data);
  // data: { currentPlayerIndex, currentPlayer, gameLog }
});
```

#### `chat:message`

Message reçu dans le chat.

```javascript
socket.on("chat:message", (data) => {
  console.log("Message reçu:", data);
  // data: { playerId, playerName, message, timestamp }
});
```

#### `player:reconnected` / `player:disconnected`

État de connexion des joueurs.

```javascript
socket.on("player:reconnected", (data) => {
  console.log("Joueur reconnecté:", data.playerName);
});

socket.on("player:disconnected", (data) => {
  console.log("Joueur déconnecté:", data.playerName);
});
```

#### `error`

Erreur Socket.io.

```javascript
socket.on("error", (data) => {
  console.error("Erreur Socket:", data.message);
});
```

---

## ❌ Codes d'Erreur

### Codes HTTP

| Code | Signification         | Description           |
| ---- | --------------------- | --------------------- |
| 200  | OK                    | Requête réussie       |
| 201  | Created               | Ressource créée       |
| 400  | Bad Request           | Données invalides     |
| 401  | Unauthorized          | Non authentifié       |
| 403  | Forbidden             | Accès refusé          |
| 404  | Not Found             | Ressource non trouvée |
| 500  | Internal Server Error | Erreur serveur        |

### Exemples de Réponses d'Erreur

#### 400 - Données invalides

```json
{
  "message": "Données invalides",
  "errors": [
    "Le nom d'utilisateur doit faire entre 3 et 20 caractères",
    "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre"
  ]
}
```

#### 401 - Non authentifié

```json
{
  "message": "Token d'accès requis"
}
```

#### 403 - Accès refusé

```json
{
  "message": "Seul l'hôte peut démarrer la partie"
}
```

#### 404 - Ressource non trouvée

```json
{
  "message": "Partie non trouvée"
}
```

#### 500 - Erreur serveur

```json
{
  "message": "Erreur serveur interne"
}
```

---

## 🧪 Tests avec curl

### Script de test complet :

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"

# 1. Créer un compte
echo "=== Inscription ==="
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!"
  }')

echo $REGISTER_RESPONSE | jq .

# Extraire le token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')

echo "Token: $TOKEN"

# 2. Créer une partie
echo -e "\n=== Création de partie ==="
GAME_RESPONSE=$(curl -s -X POST $BASE_URL/games \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Partie de test",
    "gameMode": "classique",
    "visibility": "public",
    "maxPlayers": 4
  }')

echo $GAME_RESPONSE | jq .

# Extraire l'ID de la partie
GAME_ID=$(echo $GAME_RESPONSE | jq -r '.gameId')

echo "Game ID: $GAME_ID"

# 3. Récupérer l'état de la partie
echo -e "\n=== État de la partie ==="
curl -s $BASE_URL/games/$GAME_ID/state \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Statistiques utilisateur
echo -e "\n=== Statistiques ==="
curl -s $BASE_URL/users/me/stats \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📱 Exemple d'Intégration Frontend

### React/Next.js avec Socket.io

```javascript
// hooks/useSocket.js
import { useEffect, useState } from "react";
import io from "socket.io-client";

export function useSocket(token) {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token },
    });

    newSocket.on("game:state", setGameState);

    newSocket.on("dice:rolled", (data) => {
      console.log("Dés:", data.dice, "Total:", data.total);
    });

    newSocket.on("player:moved", (data) => {
      console.log(`${data.playerName} bouge vers ${data.newPosition}`);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  const joinGame = (gameId) => {
    socket?.emit("game:join", { gameId });
  };

  const rollDice = (gameId) => {
    socket?.emit("game:roll_dice", { gameId });
  };

  const purchaseProperty = (gameId, propertyId) => {
    socket?.emit("game:purchase_property", { gameId, propertyId });
  };

  return {
    socket,
    gameState,
    joinGame,
    rollDice,
    purchaseProperty,
  };
}
```

---

🎮 **Votre API Monodrien est prête !** Cette documentation couvre tous les endpoints et événements Socket.io disponibles.
