# 🚀 Installation du Backend Monodrien

Guide d'installation pas à pas pour le serveur backend.

## ⚠️ Prérequis

- **Node.js** version 18+ ([télécharger](https://nodejs.org/))
- **MongoDB** version 5+ ([télécharger](https://www.mongodb.com/try/download/community)) ou compte MongoDB Atlas
- **Git** ([télécharger](https://git-scm.com/))

## 📝 Installation

### 1. Naviguer vers le dossier backend

```bash
cd Back
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration des variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Ou sur Windows
copy .env.example .env
```

Modifier le fichier `.env` avec vos valeurs :

```env
# Port du serveur (défaut: 5000)
PORT=5000
NODE_ENV=development

# URL du frontend pour CORS
FRONTEND_URL=http://localhost:3000

# Base de données MongoDB
MONGODB_URI=mongodb://localhost:27017/monodrien

# JWT - IMPORTANT: Changez cette clé en production !
JWT_SECRET=votre_clé_secrète_très_sécurisée_ici_changez_la_en_production
JWT_EXPIRE=7d

# Logs
LOG_LEVEL=info
```

### 4. Configurer MongoDB

#### Option A: MongoDB Local

1. Installer MongoDB Community Edition
2. Démarrer le service MongoDB :

   ```bash
   # Sur macOS avec Homebrew
   brew services start mongodb-community

   # Sur Ubuntu/Debian
   sudo systemctl start mongod

   # Sur Windows
   net start MongoDB
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. Créer un cluster gratuit
3. Récupérer l'URI de connexion
4. Modifier le `.env` :
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/monodrien
   ```

### 5. Générer une clé JWT sécurisée

```bash
# Générer une clé aléatoire de 64 caractères
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copier le résultat dans `JWT_SECRET` dans votre fichier `.env`.

### 6. Démarrer le serveur

#### Mode développement (avec rechargement automatique)

```bash
npm run dev
```

#### Mode production

```bash
npm start
```

### 7. Vérifier que tout fonctionne

Ouvrir [http://localhost:5000/api/health](http://localhost:5000/api/health)

Vous devriez voir :

```json
{
  "status": "OK",
  "timestamp": "2024-...",
  "uptime": 12.345
}
```

## 🔧 Scripts disponibles

```bash
# Développement avec rechargement automatique
npm run dev

# Production
npm start

# Tests (à implémenter)
npm test
```

## 🐛 Dépannage

### Le serveur ne démarre pas

**Erreur : `EADDRINUSE`**

```bash
# Le port 5000 est déjà utilisé, changer le port dans .env
PORT=5001
```

**Erreur : `MongoServerError: Authentication failed`**

- Vérifier l'URI MongoDB dans `.env`
- Vérifier que les identifiants sont corrects
- S'assurer que l'IP est autorisée (Atlas)

**Erreur : `JWT_SECRET is required`**

- Vérifier que `JWT_SECRET` est défini dans `.env`
- Générer une nouvelle clé sécurisée

### Base de données

**MongoDB local ne démarre pas :**

```bash
# Vérifier le statut
sudo systemctl status mongod

# Vérifier les logs
sudo journalctl -u mongod

# Redémarrer
sudo systemctl restart mongod
```

**Problème de connexion Atlas :**

- Vérifier que votre IP est dans la liste blanche
- Vérifier que l'utilisateur DB a les bonnes permissions
- Tester la connexion avec MongoDB Compass

### CORS

**Erreur CORS du frontend :**

- Vérifier que `FRONTEND_URL` correspond à l'URL de votre frontend
- Par défaut : `http://localhost:3000`

## 🌍 Déploiement

### Variables d'environnement production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=votre_clé_ultra_sécurisée_64_caractères_minimum
FRONTEND_URL=https://votre-domaine.com
```

### Services recommandés

- **Hébergement :** Railway, Render, Heroku, DigitalOcean
- **Base de données :** MongoDB Atlas
- **Monitoring :** Sentry, LogRocket
- **SSL :** Automatique avec la plupart des plateformes

## 📊 Monitoring

Le serveur log automatiquement :

- Connexions/déconnexions Socket.io
- Erreurs et stack traces
- Requêtes API importantes

### Logs utiles

```bash
# Voir les logs en temps réel (développement)
npm run dev

# Voir les logs de production (si pm2)
pm2 logs monodrien-backend
```

## 🔒 Sécurité

### Checklist de sécurité

- [x] **JWT_SECRET** : Clé de 64+ caractères
- [x] **HTTPS** : Activé en production
- [x] **Rate limiting** : 100 req/15min par défaut
- [x] **CORS** : Configuré pour le frontend uniquement
- [x] **Helmet** : Headers de sécurité
- [x] **Validation** : Toutes les entrées utilisateurs
- [x] **Mots de passe** : Hachage bcrypt avec salt

### Recommandations supplémentaires

- Utiliser un pare-feu
- Monitorer les tentatives d'intrusion
- Mettre à jour régulièrement les dépendances
- Sauvegarder la base de données

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifier les logs du serveur
2. Consulter la documentation MongoDB
3. Vérifier que toutes les variables d'environnement sont correctes
4. Tester les endpoints avec Postman ou curl

### Test rapide avec curl

```bash
# Tester la santé du serveur
curl http://localhost:5000/api/health

# Tester l'inscription (remplacer les données)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!"}'
```

---

✅ **Installation réussie !** Votre backend Monodrien est prêt à accueillir des parties de Monopoly épiques ! 🎮
