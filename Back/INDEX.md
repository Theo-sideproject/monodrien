# 📚 Documentation Monodrien Backend - Index

Documentation complète du backend avec toutes les routes, exemples et guides pratiques.

## 📋 Fichiers de Documentation

### 🎯 Guides Principaux

- **[README.md](./README.md)** - Vue d'ensemble, architecture et fonctionnalités
- **[INSTALLATION.md](./INSTALLATION.md)** - Guide d'installation pas à pas
- **[API.md](./API.md)** - Documentation complète des routes avec exemples
- **[EXAMPLES.md](./EXAMPLES.md)** - Exemples pratiques d'utilisation

### 🛠️ Outils de Test

- **[POSTMAN.json](./POSTMAN.json)** - Collection Postman complète pour tester l'API
- **package.json** - Configuration des dépendances Node.js

### 📁 Code Source

- **[src/](./src/)** - Code source complet du backend

---

## 🚀 Démarrage Rapide

### 1. Installation

```bash
cd Back
npm install
cp .env.example .env
# Configurer .env avec vos valeurs
```

### 2. Démarrer le serveur

```bash
npm run dev
```

### 3. Tester l'API

- **Santé du serveur :** http://localhost:5000/api/health
- **Importer POSTMAN.json** dans Postman pour tester toutes les routes
- **Suivre EXAMPLES.md** pour des cas d'usage complets

---

## 📡 Routes API Principales

### 🔐 Authentification

```
POST /api/auth/register    # Inscription
POST /api/auth/login       # Connexion
GET  /api/auth/me          # Profil utilisateur
PUT  /api/auth/profile     # Modifier profil
POST /api/auth/change-password  # Changer mot de passe
```

### 🎮 Parties

```
GET  /api/games           # Lister parties publiques
POST /api/games           # Créer une partie
GET  /api/games/:id       # Détails d'une partie
POST /api/games/:id/join  # Rejoindre
POST /api/games/:id/start # Démarrer (hôte)
GET  /api/games/:id/state # État complet du jeu
```

### 👤 Utilisateurs

```
GET /api/users/me/games   # Historique des parties
GET /api/users/me/stats   # Statistiques personnelles
GET /api/users/:id        # Profil public
GET /api/users/leaderboard # Classement
```

---

## ⚡ Événements Socket.io

### Émis par le client

```javascript
socket.emit("game:join", { gameId });
socket.emit("game:roll_dice", { gameId });
socket.emit("game:purchase_property", { gameId, propertyId });
socket.emit("game:end_turn", { gameId });
socket.emit("chat:message", { gameId, message });
```

### Reçus du serveur

```javascript
socket.on("game:state", (data) => {
  /* État complet */
});
socket.on("dice:rolled", (data) => {
  /* Résultat dés */
});
socket.on("player:moved", (data) => {
  /* Joueur déplacé */
});
socket.on("property:purchased", (data) => {
  /* Propriété achetée */
});
socket.on("turn:changed", (data) => {
  /* Changement de tour */
});
```

---

## 🧪 Tests et Exemples

### Collection Postman

1. Importer `POSTMAN.json` dans Postman
2. Les tokens sont automatiquement sauvegardés
3. Tests d'API complets avec scénarios

### Scripts bash

```bash
# Test de santé rapide
curl http://localhost:5000/api/health

# Inscription complète
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!"}'
```

### Intégration JavaScript/Node.js

Voir `EXAMPLES.md` pour :

- Classe d'authentification complète
- Client Socket.io avec tous les événements
- Hook React pour l'API
- Tests automatisés avec Jest

---

## 🎮 Logique de Jeu Implémentée

### ✅ Fonctionnalités Disponibles

- **Plateau complet** : 40 cases authentiques du Monopoly français
- **Lancer de dés** : Animation et gestion des doubles
- **Déplacement** : Case par case avec animations
- **Propriétés** : Achat, loyers, gestion des monopoles
- **Cartes** : Chance et Caisse de Communauté (32 cartes)
- **Prison** : Entrée, sortie, amendes
- **Cases spéciales** : Impôts, case Départ (+200€)
- **Temps réel** : Synchronisation via Socket.io
- **Chat** : Communication entre joueurs

### 🔄 Cycle d'une Partie

1. **Création** par l'hôte
2. **Attente** de joueurs (2-8)
3. **Démarrage** par l'hôte
4. **Jeu** : Tours, dés, déplacements, achats
5. **Fin** : Faillite ou abandon

---

## 🔒 Sécurité

### Mesures Implémentées

- **JWT** avec expiration (7 jours par défaut)
- **Bcrypt** pour les mots de passe (salt 12)
- **Rate limiting** : 100 req/15min par IP
- **CORS** configuré pour le frontend
- **Helmet** pour les headers de sécurité
- **Validation** complète des données d'entrée

### Configuration Production

```env
NODE_ENV=production
JWT_SECRET=clé_ultra_sécurisée_64_caractères_minimum
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://votre-domaine.com
```

---

## 🗄️ Base de Données

### Collections MongoDB

- **users** : Comptes utilisateurs avec stats
- **games** : Parties avec état complet du jeu

### Index Optimisés

- `users`: email, username (uniques)
- `games`: gameId, hostId, status, lastActivity

### Modèles Complets

- **User** : Profil, statistiques, préférences
- **Game** : État complet avec joueurs, plateau, logs

---

## 📊 Monitoring

### Logs Automatiques

- Connexions/déconnexions Socket.io
- Erreurs avec stack traces
- Actions importantes de jeu
- Tentatives d'authentification

### Métriques Disponibles

- Nombre de parties actives
- Utilisateurs connectés
- Temps de réponse API
- Erreurs par endpoint

---

## 🚧 Roadmap Phase 2

### Fonctionnalités Prévues

- [ ] Système d'enchères
- [ ] Construction (maisons/hôtels)
- [ ] Hypothèques de propriétés
- [ ] Échanges entre joueurs
- [ ] Mode Blitz (parties rapides)
- [ ] Mode Chaos (événements aléatoires)
- [ ] Spectateurs de parties
- [ ] Tournois et classements avancés
- [ ] Parties privées avec mot de passe
- [ ] Replay de parties

---

## 🆘 Support

### En cas de problème

1. **Vérifier** : Serveur, MongoDB, variables d'environnement
2. **Logs** : `npm run dev` pour voir les erreurs
3. **Tests** : Utiliser Postman ou curl pour isoler
4. **Documentation** : Consulter API.md et EXAMPLES.md

### Tests Rapides

```bash
# Santé du serveur
curl http://localhost:5000/api/health

# MongoDB connecté ?
grep "MongoDB connecté" logs

# Port libre ?
lsof -i :5000
```

---

## 🎯 Résumé

Votre backend Monodrien est **complet et prêt** avec :

✅ **API REST** complète (15+ endpoints)  
✅ **Socket.io** temps réel (10+ événements)  
✅ **Authentification** JWT sécurisée  
✅ **Base de données** MongoDB optimisée  
✅ **Logique Monopoly** authentique  
✅ **Documentation** exhaustive  
✅ **Tests** et exemples pratiques  
✅ **Sécurité** production-ready

**Prêt pour l'intégration avec votre frontend Next.js ! 🚀**
