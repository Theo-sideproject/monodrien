# Monodrien Backend

Backend Node.js pour la plateforme Monopoly Monodrien. Fournit une API REST et des communications temps réel via Socket.io.

## 🚀 Technologies

- **Node.js** avec Express.js
- **MongoDB** avec Mongoose ODM
- **Socket.io** pour les communications temps réel
- **JWT** pour l'authentification
- **bcryptjs** pour le hachage des mots de passe

## 📦 Installation

1. **Cloner le repository et naviguer vers le dossier backend:**

```bash
cd Back
```

2. **Installer les dépendances:**

```bash
npm install
```

3. **Configurer les variables d'environnement:**

```bash
cp .env.example .env
```

Modifier le fichier `.env` avec vos valeurs :

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/monodrien
JWT_SECRET=votre_clé_secrète_très_sécurisée
FRONTEND_URL=http://localhost:3000
```

4. **Démarrer MongoDB** (si local)

5. **Lancer le serveur:**

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 🏗️ Architecture

```
src/
├── config/
│   └── database.js          # Configuration MongoDB
├── data/
│   ├── boardData.js         # Données du plateau Monopoly
│   └── cards.js             # Cartes Chance et Caisse de Communauté
├── middleware/
│   ├── auth.js              # Middleware d'authentification JWT
│   └── errorHandler.js      # Gestionnaire d'erreurs global
├── models/
│   ├── User.js              # Modèle utilisateur
│   └── Game.js              # Modèle de partie
├── routes/
│   ├── auth.js              # Routes d'authentification
│   ├── games.js             # Routes de gestion des parties
│   └── users.js             # Routes utilisateurs
├── socket/
│   └── socketHandlers.js    # Gestionnaires Socket.io
├── utils/
│   └── gameUtils.js         # Utilitaires de jeu
└── server.js                # Point d'entrée principal
```

## 🔌 API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `PUT /api/auth/profile` - Modifier le profil
- `POST /api/auth/change-password` - Changer le mot de passe

### Parties

- `GET /api/games` - Lister les parties publiques
- `POST /api/games` - Créer une partie
- `GET /api/games/:gameId` - Détails d'une partie
- `POST /api/games/:gameId/join` - Rejoindre une partie
- `POST /api/games/:gameId/leave` - Quitter une partie
- `POST /api/games/:gameId/start` - Démarrer une partie (hôte)
- `GET /api/games/:gameId/state` - État complet du jeu

### Utilisateurs

- `GET /api/users/me` - Profil personnel
- `GET /api/users/me/games` - Historique des parties
- `GET /api/users/me/stats` - Statistiques personnelles
- `GET /api/users/:userId` - Profil public
- `GET /api/users/leaderboard` - Classement

## ⚡ Événements Socket.io

### Connexion

- `game:join` - Rejoindre une partie
- `game:leave` - Quitter une partie

### Jeu

- `game:roll_dice` - Lancer les dés
- `game:end_turn` - Terminer son tour
- `game:purchase_property` - Acheter une propriété
- `game:decline_purchase` - Refuser un achat

### Communication

- `chat:message` - Envoyer un message

### Événements reçus

- `game:state` - État du jeu
- `dice:rolled` - Résultat des dés
- `player:moved` - Déplacement d'un joueur
- `property:purchased` - Propriété achetée
- `turn:changed` - Changement de tour
- `chat:message` - Message reçu

## 🎮 Logique de Jeu

### Structure d'une Partie

```javascript
{
  gameId: "ABC123",           // ID unique 6 caractères
  name: "Ma partie",          // Nom de la partie
  status: "playing",          // waiting, playing, finished, cancelled
  players: [...],             // Liste des joueurs
  currentPlayerIndex: 0,      // Index du joueur actuel
  gameState: {
    board: [...],             // État du plateau
    dice: { values: [1,1] },  // Derniers dés lancés
    // ... autres données
  }
}
```

### Joueur

```javascript
{
  userId: ObjectId,           // ID utilisateur
  username: "Alice",          // Nom d'utilisateur
  color: "bg-blue-500",       // Couleur du pion
  position: 0,                // Position sur le plateau (0-39)
  money: 1500,                // Argent en main
  properties: [...],          // Propriétés possédées
  prisonState: {...},         // État prison
  isConnected: true           // Statut de connexion
}
```

## 🔒 Sécurité

- **JWT** avec expiration configurable
- **Validation** des données d'entrée
- **Rate limiting** (100 req/15min par IP)
- **CORS** configuré pour le frontend
- **Helmet** pour les en-têtes de sécurité
- **Mots de passe** hachés avec bcrypt (salt 12)

## 🎯 Fonctionnalités Implémentées

### ✅ Phase 1 - Core

- [x] Authentification complète (register/login/JWT)
- [x] Création et gestion des parties
- [x] Système de lobby avec codes de partie
- [x] Communication temps réel via Socket.io
- [x] Logique de base du Monopoly :
  - [x] Lancer de dés et déplacement
  - [x] Achat de propriétés
  - [x] Paiement de loyers
  - [x] Passage par la case Départ
  - [x] Cartes Chance et Caisse de Communauté
  - [x] Système de prison
  - [x] Cases d'impôts

### 🚧 Phase 2 - Avancé (À venir)

- [ ] Système d'enchères
- [ ] Construction (maisons/hôtels)
- [ ] Hypothèques
- [ ] Échanges entre joueurs
- [ ] Modes de jeu spéciaux (Blitz, Chaos)
- [ ] Système de classement avancé
- [ ] Spectateurs
- [ ] Parties privées avec mot de passe

## 🔧 Développement

### Scripts disponibles

```bash
npm run dev      # Développement avec nodemon
npm start        # Production
npm test         # Tests (à implémenter)
```

### Structure de la base de données

**Collections:**

- `users` - Utilisateurs avec stats et préférences
- `games` - Parties avec état complet du jeu

**Index créés automatiquement:**

- `users`: email, username
- `games`: gameId, hostId, status, lastActivity

## 🐛 Debug

Le serveur log automatiquement :

- Connexions/déconnexions Socket.io
- Erreurs et événements importants
- Requêtes API en développement

Variables d'environnement utiles :

```env
NODE_ENV=development    # Active les logs détaillés
LOG_LEVEL=debug        # Niveau de log
```

## 📝 TODO

- [ ] Tests unitaires et d'intégration
- [ ] Documentation API avec Swagger
- [ ] Système de sauvegarde/reprise de partie
- [ ] Métriques et monitoring
- [ ] Cache Redis pour les sessions
- [ ] Limites de débit plus fines
- [ ] Système de rapports d'abus
