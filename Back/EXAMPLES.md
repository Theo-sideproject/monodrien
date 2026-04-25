# 🧪 Exemples d'Utilisation - API Monodrien

Guide pratique avec des exemples concrets d'utilisation de l'API.

## 🎯 Table des Matières

- [🚀 Démarrage Rapide](#-démarrage-rapide)
- [🔐 Authentification](#-authentification)
- [🎮 Cycle de Vie d'une Partie](#-cycle-de-vie-dune-partie)
- [⚡ Socket.io en Action](#-socketio-en-action)
- [📱 Intégration Frontend](#-intégration-frontend)
- [🧪 Tests Automatisés](#-tests-automatisés)

---

## 🚀 Démarrage Rapide

### Test rapide avec curl

```bash
#!/bin/bash
# test-api.sh - Script de test rapide

BASE_URL="http://localhost:5000/api"

echo "🏥 Test de santé du serveur..."
curl -s "$BASE_URL/health" | jq .

echo -e "\n🔐 Création d'un compte..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testeur123",
    "email": "test@monodrien.com",
    "password": "Test123!"
  }')

echo $RESPONSE | jq .

# Extraire le token
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

echo -e "\n🎮 Création d'une partie..."
GAME_RESPONSE=$(curl -s -X POST "$BASE_URL/games" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Partie Test",
    "gameMode": "classique",
    "visibility": "public",
    "maxPlayers": 4
  }')

echo $GAME_RESPONSE | jq .

GAME_ID=$(echo $GAME_RESPONSE | jq -r '.gameId')
echo "Game ID: $GAME_ID"

echo -e "\n✅ Test terminé avec succès !"
```

### Utilisation avec Node.js

```javascript
// test-api.js
const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testAPI() {
  try {
    // 1. Santé du serveur
    console.log("🏥 Test de santé...");
    const health = await axios.get(`${BASE_URL}/health`);
    console.log("Santé:", health.data);

    // 2. Inscription
    console.log("\n🔐 Inscription...");
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      username: "testnode",
      email: "testnode@example.com",
      password: "Test123!",
    });

    const token = registerResponse.data.token;
    console.log("Utilisateur créé:", registerResponse.data.user.username);

    // 3. Création de partie
    console.log("\n🎮 Création de partie...");
    const gameResponse = await axios.post(
      `${BASE_URL}/games`,
      {
        name: "Partie Node.js",
        gameMode: "classique",
        visibility: "public",
        maxPlayers: 4,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const gameId = gameResponse.data.gameId;
    console.log("Partie créée:", gameId);

    // 4. État de la partie
    console.log("\n📊 État de la partie...");
    const stateResponse = await axios.get(`${BASE_URL}/games/${gameId}/state`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Joueurs:", stateResponse.data.gameState.players.length);
    console.log("Statut:", stateResponse.data.gameState.status);

    console.log("\n✅ Test Node.js terminé !");
  } catch (error) {
    console.error("❌ Erreur:", error.response?.data || error.message);
  }
}

testAPI();
```

---

## 🔐 Authentification

### Exemple complet d'authentification

```javascript
// auth-example.js
class MonodrienAuth {
  constructor(baseUrl = "http://localhost:5000/api") {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("monodrien_token");
  }

  // Inscription
  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        localStorage.setItem("monodrien_token", this.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, errors: data.errors || [data.message] };
      }
    } catch (error) {
      return { success: false, errors: ["Erreur de connexion"] };
    }
  }

  // Connexion
  async login(login, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        localStorage.setItem("monodrien_token", this.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: "Erreur de connexion" };
    }
  }

  // Déconnexion
  logout() {
    this.token = null;
    localStorage.removeItem("monodrien_token");
  }

  // Vérifier si connecté
  isAuthenticated() {
    return !!this.token;
  }

  // Headers avec token
  getAuthHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  // Profil utilisateur
  async getProfile() {
    if (!this.token) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

// Utilisation
const auth = new MonodrienAuth();

// Inscription
const registerResult = await auth.register(
  "alice",
  "alice@example.com",
  "Alice123!"
);
if (registerResult.success) {
  console.log("Bienvenue", registerResult.user.username);
} else {
  console.log("Erreurs:", registerResult.errors);
}

// Connexion
const loginResult = await auth.login("alice@example.com", "Alice123!");
if (loginResult.success) {
  console.log("Connecté en tant que", loginResult.user.username);
}

// Profil
const profile = await auth.getProfile();
console.log("Profil:", profile);
```

---

## 🎮 Cycle de Vie d'une Partie

### Exemple complet : Créer et jouer une partie

```javascript
// game-lifecycle.js
class MonodrienGame {
  constructor(auth) {
    this.auth = auth;
    this.baseUrl = auth.baseUrl;
  }

  // Créer une partie
  async createGame(
    name,
    gameMode = "classique",
    visibility = "public",
    maxPlayers = 4
  ) {
    try {
      const response = await fetch(`${this.baseUrl}/games`, {
        method: "POST",
        headers: this.auth.getAuthHeaders(),
        body: JSON.stringify({ name, gameMode, visibility, maxPlayers }),
      });

      const data = await response.json();
      return response.ok
        ? { success: true, game: data.game, gameId: data.gameId }
        : { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: "Erreur de création" };
    }
  }

  // Rejoindre une partie
  async joinGame(gameId) {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/join`, {
        method: "POST",
        headers: this.auth.getAuthHeaders(),
      });

      const data = await response.json();
      return response.ok
        ? { success: true, game: data.game }
        : { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: "Erreur pour rejoindre" };
    }
  }

  // Démarrer une partie (hôte seulement)
  async startGame(gameId) {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/start`, {
        method: "POST",
        headers: this.auth.getAuthHeaders(),
      });

      const data = await response.json();
      return response.ok
        ? { success: true, game: data.game }
        : { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: "Erreur de démarrage" };
    }
  }

  // État de la partie
  async getGameState(gameId) {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/state`, {
        headers: this.auth.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        return data.gameState;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Lister les parties publiques
  async listPublicGames(status = "waiting", limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/games?status=${status}&limit=${limit}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.games;
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}

// Exemple d'utilisation complète
async function exemplePartieComplete() {
  const auth = new MonodrienAuth();
  const game = new MonodrienGame(auth);

  // 1. Créer deux comptes
  console.log("📝 Création des comptes...");
  await auth.register("alice", "alice@example.com", "Alice123!");
  const aliceToken = auth.token;

  const auth2 = new MonodrienAuth();
  await auth2.register("bob", "bob@example.com", "Bob123!");

  // 2. Alice crée une partie
  console.log("🎮 Alice crée une partie...");
  auth.token = aliceToken; // Revenir à Alice
  const createResult = await game.createGame(
    "Partie Test",
    "classique",
    "public",
    4
  );

  if (createResult.success) {
    const gameId = createResult.gameId;
    console.log(`✅ Partie créée: ${gameId}`);

    // 3. Bob rejoint la partie
    console.log("👥 Bob rejoint...");
    const game2 = new MonodrienGame(auth2);
    const joinResult = await game2.joinGame(gameId);

    if (joinResult.success) {
      console.log("✅ Bob a rejoint");

      // 4. Alice démarre la partie
      console.log("🚀 Alice démarre la partie...");
      const startResult = await game.startGame(gameId);

      if (startResult.success) {
        console.log("✅ Partie démarrée");

        // 5. État de la partie
        const state = await game.getGameState(gameId);
        console.log(`📊 Joueurs: ${state.players.length}`);
        console.log(
          `🎯 Tour de: ${state.players[state.currentPlayerIndex].username}`
        );
        console.log(`🎲 État: ${state.status}`);
      }
    }
  }
}

// Lancer l'exemple
exemplePartieComplete().catch(console.error);
```

---

## ⚡ Socket.io en Action

### Client Socket.io complet

```javascript
// socket-client.js
import io from "socket.io-client";

class MonodrienSocket {
  constructor(token, serverUrl = "http://localhost:5000") {
    this.token = token;
    this.serverUrl = serverUrl;
    this.socket = null;
    this.gameState = null;
    this.callbacks = {};
  }

  // Connexion
  connect() {
    this.socket = io(this.serverUrl, {
      auth: { token: this.token },
    });

    this.setupEventListeners();
    return new Promise((resolve, reject) => {
      this.socket.on("connect", () => {
        console.log("🔌 Connecté au serveur");
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("❌ Erreur de connexion:", error.message);
        reject(error);
      });
    });
  }

  // Configuration des écouteurs d'événements
  setupEventListeners() {
    // État du jeu
    this.socket.on("game:state", (data) => {
      console.log("📊 État du jeu reçu");
      this.gameState = data;
      this.emit("gameStateChanged", data);
    });

    // Dés lancés
    this.socket.on("dice:rolled", (data) => {
      console.log(
        `🎲 ${data.playerId} a lancé: ${data.dice[0]} + ${data.dice[1]} = ${data.total}`
      );
      this.emit("diceRolled", data);
    });

    // Joueur déplacé
    this.socket.on("player:moved", (data) => {
      console.log(
        `🚶 ${data.playerName} bouge de ${data.oldPosition} vers ${data.newPosition}`
      );
      this.emit("playerMoved", data);
    });

    // Propriété achetée
    this.socket.on("property:purchased", (data) => {
      console.log(
        `🏠 ${data.playerName} achète ${data.property.name} pour ${data.property.price}€`
      );
      this.emit("propertyPurchased", data);
    });

    // Tour changé
    this.socket.on("turn:changed", (data) => {
      console.log(`🔄 C'est au tour de ${data.currentPlayer.username}`);
      this.emit("turnChanged", data);
    });

    // Loyer payé
    this.socket.on("rent:paid", (data) => {
      console.log(
        `💰 ${data.payerName} paie ${data.amount}€ de loyer à ${data.ownerName}`
      );
      this.emit("rentPaid", data);
    });

    // Messages chat
    this.socket.on("chat:message", (data) => {
      console.log(`💬 ${data.playerName}: ${data.message}`);
      this.emit("chatMessage", data);
    });

    // Connexions/déconnexions
    this.socket.on("player:reconnected", (data) => {
      console.log(`🔌 ${data.username} s'est reconnecté`);
      this.emit("playerReconnected", data);
    });

    this.socket.on("player:disconnected", (data) => {
      console.log(`🔌 ${data.username} s'est déconnecté`);
      this.emit("playerDisconnected", data);
    });

    // Erreurs
    this.socket.on("error", (data) => {
      console.error("❌ Erreur Socket:", data.message);
      this.emit("socketError", data);
    });
  }

  // Rejoindre une partie
  joinGame(gameId) {
    console.log(`🎮 Tentative de rejoindre la partie ${gameId}`);
    this.socket.emit("game:join", { gameId });
  }

  // Quitter une partie
  leaveGame(gameId) {
    console.log(`🚪 Quitter la partie ${gameId}`);
    this.socket.emit("game:leave", { gameId });
  }

  // Lancer les dés
  rollDice(gameId) {
    console.log("🎲 Lancer les dés");
    this.socket.emit("game:roll_dice", { gameId });
  }

  // Terminer son tour
  endTurn(gameId) {
    console.log("⏭️ Terminer le tour");
    this.socket.emit("game:end_turn", { gameId });
  }

  // Acheter une propriété
  purchaseProperty(gameId, propertyId) {
    console.log(`🏠 Acheter la propriété ${propertyId}`);
    this.socket.emit("game:purchase_property", { gameId, propertyId });
  }

  // Refuser un achat
  declinePurchase(gameId, propertyId) {
    console.log(`❌ Refuser l'achat de la propriété ${propertyId}`);
    this.socket.emit("game:decline_purchase", { gameId, propertyId });
  }

  // Envoyer un message
  sendMessage(gameId, message) {
    console.log(`💬 Envoyer: ${message}`);
    this.socket.emit("chat:message", { gameId, message });
  }

  // Système d'événements personnalisé
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => callback(data));
    }
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log("🔌 Déconnecté du serveur");
    }
  }
}

// Exemple d'utilisation
async function exempleSocket() {
  // Supposons qu'on a déjà un token
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
  const socket = new MonodrienSocket(token);

  // Écouter les événements
  socket.on("gameStateChanged", (state) => {
    console.log(`🎮 État: ${state.status}, Joueurs: ${state.players.length}`);
  });

  socket.on("diceRolled", (data) => {
    console.log(
      `🎲 Résultat: ${data.total} ${data.isDouble ? "(Double!)" : ""}`
    );
  });

  socket.on("turnChanged", (data) => {
    console.log(
      `🔄 Tour ${data.currentPlayerIndex + 1}: ${data.currentPlayer.username}`
    );
  });

  // Connexion
  try {
    await socket.connect();

    // Rejoindre une partie
    socket.joinGame("ABC123");

    // Simuler quelques actions après un délai
    setTimeout(() => {
      socket.rollDice("ABC123");
    }, 2000);

    setTimeout(() => {
      socket.sendMessage("ABC123", "Salut tout le monde !");
    }, 4000);

    setTimeout(() => {
      socket.endTurn("ABC123");
    }, 6000);
  } catch (error) {
    console.error("Erreur de connexion:", error);
  }
}

// Lancer l'exemple
// exempleSocket();
```

---

## 📱 Intégration Frontend

### Hook React pour l'API

```javascript
// hooks/useMonodrienAPI.js
import { useState, useEffect, useCallback } from "react";

export function useMonodrienAPI(baseUrl = process.env.NEXT_PUBLIC_API_URL) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger le token du localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("monodrien_token");
    if (savedToken) {
      setToken(savedToken);
      loadProfile(savedToken);
    }
  }, []);

  // Headers avec authentification
  const getHeaders = useCallback(
    (withAuth = true) => {
      const headers = { "Content-Type": "application/json" };
      if (withAuth && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return headers;
    },
    [token]
  );

  // Requête générique
  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: getHeaders(options.auth !== false),
          ...options,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erreur API");
        }

        return data;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, getHeaders]
  );

  // Charger le profil
  const loadProfile = useCallback(
    async (authToken = token) => {
      if (!authToken) return;

      try {
        const data = await fetch(`${baseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }).then((res) => res.json());

        setUser(data.user);
      } catch (err) {
        console.error("Erreur de chargement du profil:", err);
      }
    },
    [baseUrl, token]
  );

  // Authentification
  const register = useCallback(
    async (username, email, password) => {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
        auth: false,
      });

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("monodrien_token", data.token);

      return data;
    },
    [apiRequest]
  );

  const login = useCallback(
    async (login, password) => {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
        auth: false,
      });

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("monodrien_token", data.token);

      return data;
    },
    [apiRequest]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("monodrien_token");
  }, []);

  // Gestion des parties
  const createGame = useCallback(
    async (name, gameMode, visibility, maxPlayers) => {
      return apiRequest("/games", {
        method: "POST",
        body: JSON.stringify({ name, gameMode, visibility, maxPlayers }),
      });
    },
    [apiRequest]
  );

  const joinGame = useCallback(
    async (gameId) => {
      return apiRequest(`/games/${gameId}/join`, { method: "POST" });
    },
    [apiRequest]
  );

  const startGame = useCallback(
    async (gameId) => {
      return apiRequest(`/games/${gameId}/start`, { method: "POST" });
    },
    [apiRequest]
  );

  const getGameState = useCallback(
    async (gameId) => {
      return apiRequest(`/games/${gameId}/state`);
    },
    [apiRequest]
  );

  const listGames = useCallback(
    async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiRequest(`/games?${queryString}`, { auth: false });
    },
    [apiRequest]
  );

  // Statistiques
  const getMyStats = useCallback(async () => {
    return apiRequest("/users/me/stats");
  }, [apiRequest]);

  const getLeaderboard = useCallback(
    async (sortBy = "winRate", limit = 10) => {
      return apiRequest(`/users/leaderboard?sortBy=${sortBy}&limit=${limit}`, {
        auth: false,
      });
    },
    [apiRequest]
  );

  return {
    // État
    token,
    user,
    loading,
    error,
    isAuthenticated: !!token,

    // Authentification
    register,
    login,
    logout,

    // Parties
    createGame,
    joinGame,
    startGame,
    getGameState,
    listGames,

    // Statistiques
    getMyStats,
    getLeaderboard,

    // Utilitaires
    apiRequest,
  };
}

// Composant d'exemple d'utilisation
function ExempleComponent() {
  const api = useMonodrienAPI();
  const [games, setGames] = useState([]);

  useEffect(() => {
    // Charger les parties publiques
    api
      .listGames({ status: "waiting" })
      .then((data) => setGames(data.games))
      .catch(console.error);
  }, []);

  const handleLogin = async () => {
    try {
      await api.login("alice@example.com", "Alice123!");
      console.log("Connecté !", api.user);
    } catch (error) {
      console.error("Erreur de connexion:", error);
    }
  };

  const handleCreateGame = async () => {
    try {
      const result = await api.createGame(
        "Ma Partie",
        "classique",
        "public",
        4
      );
      console.log("Partie créée:", result.gameId);
    } catch (error) {
      console.error("Erreur de création:", error);
    }
  };

  return (
    <div>
      <h1>Monodrien</h1>

      {api.loading && <p>Chargement...</p>}
      {api.error && <p style={{ color: "red" }}>Erreur: {api.error}</p>}

      {!api.isAuthenticated ? (
        <button onClick={handleLogin}>Se connecter</button>
      ) : (
        <div>
          <p>Bienvenue {api.user?.username} !</p>
          <button onClick={handleCreateGame}>Créer une partie</button>
          <button onClick={api.logout}>Déconnexion</button>
        </div>
      )}

      <h2>Parties disponibles ({games.length})</h2>
      {games.map((game) => (
        <div key={game.gameId}>
          <strong>{game.name}</strong> - {game.currentPlayers}/{game.maxPlayers}{" "}
          joueurs
        </div>
      ))}
    </div>
  );
}
```

---

## 🧪 Tests Automatisés

### Tests avec Jest

```javascript
// tests/api.test.js
const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

describe("Monodrien API Tests", () => {
  let token;
  let gameId;
  let userId;

  beforeAll(async () => {
    // Attendre que le serveur soit prêt
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe("🏥 Santé", () => {
    test("GET /health devrait retourner OK", async () => {
      const response = await axios.get(`${BASE_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data.status).toBe("OK");
      expect(response.data).toHaveProperty("timestamp");
      expect(response.data).toHaveProperty("uptime");
    });
  });

  describe("🔐 Authentification", () => {
    test("POST /auth/register devrait créer un utilisateur", async () => {
      const userData = {
        username: "testuser_" + Date.now(),
        email: `test_${Date.now()}@example.com`,
        password: "Test123!",
      };

      const response = await axios.post(`${BASE_URL}/auth/register`, userData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("token");
      expect(response.data).toHaveProperty("user");
      expect(response.data.user.username).toBe(userData.username);

      token = response.data.token;
      userId = response.data.user.id;
    });

    test("POST /auth/register devrait échouer avec des données invalides", async () => {
      const invalidData = {
        username: "ab", // Trop court
        email: "email-invalide",
        password: "123", // Trop faible
      };

      try {
        await axios.post(`${BASE_URL}/auth/register`, invalidData);
        fail("La requête aurait dû échouer");
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("errors");
      }
    });

    test("POST /auth/login devrait connecter l'utilisateur", async () => {
      // Créer d'abord un utilisateur
      const userData = {
        username: "logintest",
        email: "logintest@example.com",
        password: "Test123!",
      };

      await axios.post(`${BASE_URL}/auth/register`, userData);

      // Tenter de se connecter
      const loginData = {
        login: userData.email,
        password: userData.password,
      };

      const response = await axios.post(`${BASE_URL}/auth/login`, loginData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("token");
      expect(response.data.user.username).toBe(userData.username);
    });

    test("GET /auth/me devrait retourner le profil", async () => {
      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("user");
      expect(response.data.user.id).toBe(userId);
    });
  });

  describe("🎮 Parties", () => {
    test("POST /games devrait créer une partie", async () => {
      const gameData = {
        name: "Partie Test",
        gameMode: "classique",
        visibility: "public",
        maxPlayers: 4,
      };

      const response = await axios.post(`${BASE_URL}/games`, gameData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("gameId");
      expect(response.data.game.name).toBe(gameData.name);

      gameId = response.data.gameId;
    });

    test("GET /games devrait lister les parties", async () => {
      const response = await axios.get(`${BASE_URL}/games`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("games");
      expect(Array.isArray(response.data.games)).toBe(true);
    });

    test("GET /games/:gameId devrait retourner les détails", async () => {
      const response = await axios.get(`${BASE_URL}/games/${gameId}`);

      expect(response.status).toBe(200);
      expect(response.data.game.gameId).toBe(gameId);
    });

    test("GET /games/:gameId/state devrait retourner l'état", async () => {
      const response = await axios.get(`${BASE_URL}/games/${gameId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("gameState");
      expect(response.data.gameState.gameId).toBe(gameId);
    });
  });

  describe("👤 Utilisateurs", () => {
    test("GET /users/me/stats devrait retourner les statistiques", async () => {
      const response = await axios.get(`${BASE_URL}/users/me/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("stats");
      expect(response.data.stats).toHaveProperty("overview");
    });

    test("GET /users/leaderboard devrait retourner le classement", async () => {
      const response = await axios.get(`${BASE_URL}/users/leaderboard`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("leaderboard");
      expect(Array.isArray(response.data.leaderboard)).toBe(true);
    });
  });

  describe("❌ Gestion d'erreurs", () => {
    test("Token invalide devrait retourner 401", async () => {
      try {
        await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: "Bearer token_invalide" },
        });
        fail("La requête aurait dû échouer");
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    test("Partie inexistante devrait retourner 404", async () => {
      try {
        await axios.get(`${BASE_URL}/games/INEXISTANT`);
        fail("La requête aurait dû échouer");
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});

// Lancer les tests : npm test
```

### Script de test de performance

```bash
#!/bin/bash
# performance-test.sh

echo "🚀 Tests de performance Monodrien API"

# Variables
BASE_URL="http://localhost:5000/api"
CONCURRENT_USERS=10
REQUESTS_PER_USER=100

# Test de charge sur la santé
echo "📊 Test de charge sur /health..."
ab -n 1000 -c 50 "$BASE_URL/health"

# Test d'inscription en masse
echo "📊 Test d'inscription en masse..."
for i in {1..10}; do
  curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"user$i\",\"email\":\"user$i@test.com\",\"password\":\"Test123!\"}" &
done
wait

echo "✅ Tests de performance terminés"
```

---

## 🎯 Conclusion

Ces exemples couvrent tous les aspects principaux de l'API Monodrien :

- ✅ **Authentification complète** avec gestion des erreurs
- ✅ **Cycle de vie des parties** avec toutes les étapes
- ✅ **Socket.io temps réel** avec tous les événements
- ✅ **Intégration frontend** avec React/Next.js
- ✅ **Tests automatisés** complets

Utilisez ces exemples comme base pour votre développement ! 🎮
