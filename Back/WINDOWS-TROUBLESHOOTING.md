# 🪟 Guide de Dépannage Windows - Tests MonoDrien

Ce guide résout les problèmes spécifiques à Windows lors de l'exécution des tests.

## 🚨 Problèmes Courants

### 1. Erreur : `'user'' n'est pas reconnu en tant que commande interne`

**Symptôme** :

```bash
> jest --testPathPattern='auth|user' --verbose
'user'' n'est pas reconnu en tant que commande interne
```

**Cause** : Les guillemets simples dans les scripts npm ne sont pas correctement interprétés par le shell Windows (cmd.exe).

**✅ Solution Appliquée** :

- Scripts npm corrigés avec des guillemets doubles échappés
- Patterns regex corrigés : `"(auth|user)"` au lieu de `'auth|user'`

### 2. Erreur : `Module jest-sonar-reporter in the testResultsProcessor option was not found`

**Symptôme** :

```bash
● Validation Error:
  Module jest-sonar-reporter in the testResultsProcessor option was not found.
```

**Cause** : Module optionnel `jest-sonar-reporter` référencé dans la config Jest mais pas installé.

**✅ Solution Appliquée** :

- Suppression de la référence `"testResultsProcessor": "jest-sonar-reporter"` dans `package.json`
- Configuration Jest allégée pour éviter les dépendances optionnelles

## 🔧 Solutions Alternatives

### Option 1 : Scripts Batch Windows

Si les scripts npm posent encore problème, utilise le fichier batch :

```bash
# Au lieu de : npm run test:auth
test-windows.bat auth

# Au lieu de : npm run test:full
test-windows.bat all

# Autres commandes disponibles
test-windows.bat game           # Tests utilitaires
test-windows.bat integration    # Tests d'intégration
test-windows.bat security       # Tests sécurité
test-windows.bat performance    # Tests performance
test-windows.bat coverage       # Avec couverture
```

### Option 2 : PowerShell

Si tu préfères PowerShell à cmd :

```powershell
# Tests d'authentification
npx jest --testPathPattern="auth" --testPathPattern="user" --verbose

# Tests de jeu
npx jest --testPathPattern="game" --verbose

# Tests avec couverture
npx jest --coverage --verbose
```

### Option 3 : Script Node.js (Recommandé)

Le script `run-all-tests.js` détecte automatiquement Windows :

```bash
# Utilise automatiquement les bonnes commandes sur Windows
node run-all-tests.js
node run-all-tests.js --coverage
```

## 🛠️ Configuration Environnement Windows

### Variables d'Environnement

Créer un fichier `.env.test` :

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
JWT_EXPIRE=1h
MONGODB_TEST_URI=mongodb://localhost:27017/monodrien-test
SILENT_TESTS=false
```

### MongoDB sur Windows

**Installation** :

1. Télécharger MongoDB Community : https://www.mongodb.com/try/download/community
2. Installer avec l'option "Service"
3. Vérifier : `mongod --version`

**Démarrage** :

```bash
# Via services Windows
net start MongoDB

# Ou manuellement
mongod --dbpath C:\data\db
```

### Node.js et npm

**Versions recommandées** :

- Node.js 16+ : https://nodejs.org
- npm mis à jour : `npm install -g npm@latest`

**Vérification** :

```bash
node --version    # doit être >= 16
npm --version     # doit être >= 8
```

## 🔍 Diagnostic des Problèmes

### Test de Connexion MongoDB

```bash
# Script automatique
npm run test:setup

# Ou test manuel
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/monodrien-test')
  .then(() => { console.log('✅ MongoDB OK'); process.exit(0); })
  .catch(err => { console.log('❌ MongoDB Error:', err.message); process.exit(1); });
"
```

### Vérification des Dépendances

```bash
# Réinstaller toutes les dépendances
rmdir /s node_modules
del package-lock.json
npm install

# Ou avec npm ci (plus propre)
npm ci
```

### Tests Individuels pour Debug

```bash
# Test d'un seul fichier
npx jest tests/user.model.test.js --verbose

# Test d'une fonction spécifique
npx jest --testNamePattern="devrait créer un utilisateur" --verbose

# Sans couverture (plus rapide)
npx jest --no-coverage
```

## 🚀 Commandes qui Marchent sur Windows

### Tests Rapides

```bash
npm test                        # Simple, sans pattern complexe
npx jest --verbose              # Direct via npx
node run-all-tests.js           # Script intelligent
test-windows.bat all            # Script batch dédié
```

### Tests Spécifiques

```bash
# Auth (alternative sûre)
npx jest tests/auth tests/user --verbose

# Jeu
npx jest tests/gameUtils.test.js --verbose

# Avec couverture
npx jest --coverage --collectCoverageFrom="src/**/*.js"
```

### Mode Debug

```bash
# Avec logs détaillés
set DEBUG_TESTS=true && npm test

# Avec timeout long
npx jest --testTimeout=60000 --verbose

# Forcer la fermeture
npx jest --forceExit --detectOpenHandles
```

## 📝 Configuration IDE Windows

### VS Code

Ajouter dans `settings.json` :

```json
{
  "terminal.integrated.shell.windows": "cmd.exe",
  "terminal.integrated.shellArgs.windows": ["/k"],
  "jest.jestCommandLine": "npx jest",
  "jest.rootPath": "./Back"
}
```

### Extension Jest Runner

Installer l'extension "Jest Runner" et utiliser les boutons dans l'éditeur au lieu des commandes terminal.

## 🆘 Support

Si les problèmes persistent :

1. **Vérifier les logs** : `npm test > test-output.log 2>&1`
2. **Tester avec Node.js pur** : `node tests/setup.js`
3. **Utiliser Git Bash** au lieu de cmd.exe
4. **WSL** : Utiliser Windows Subsystem for Linux

## ✅ Checklist de Vérification

- [ ] Node.js 16+ installé
- [ ] MongoDB démarré (`net start MongoDB`)
- [ ] Dépendances installées (`npm ci`)
- [ ] Variables d'environnement configurées (`.env.test`)
- [ ] Tests simples fonctionnent (`npm test`)
- [ ] Alternative batch testée (`test-windows.bat auth`)

---

**Ces corrections devraient résoudre tous les problèmes Windows !** 🎉
