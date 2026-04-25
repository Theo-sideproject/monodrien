# Tests Backend - MonoDrien

Ce dossier contient une suite complète de tests pour le backend MonoDrien, focalisés sur le système d'authentification et les utilitaires de jeu.

## 📋 Structure des Tests

### Tests d'Authentification

- `user.model.test.js` - Tests du modèle User (validation, hachage, méthodes)
- `auth.middleware.test.js` - Tests du middleware d'authentification JWT
- `auth.routes.test.js` - Tests des routes d'authentification (register, login, profil)
- `auth.integration.test.js` - Tests d'intégration du système complet d'auth
- `auth.security.test.js` - Tests de sécurité avancés et audit

### Tests Utilitaires

- `gameUtils.test.js` - Tests des utilitaires de jeu (génération ID, calculs, validation)

### Configuration

- `setup.js` - Configuration globale et utilitaires pour les tests

## 🚀 Commandes de Test

### Tests Généraux

```bash
npm test                    # Tous les tests
npm run test:coverage       # Tests avec couverture de code
npm run test:watch         # Mode watch (redémarre automatiquement)
npm run test:ci            # Mode CI/CD (sans watch, avec coverage)
```

### 🪟 Alternative Windows

Si problèmes de guillemets sur Windows :

```bash
test-windows.bat all        # Tous les tests (script batch dédié)
test-windows.bat auth       # Tests d'auth seulement
node run-all-tests.js       # Script intelligent multi-OS
```

### Tests Spécialisés

```bash
npm run test:auth          # Tests d'authentification uniquement
npm run test:auth:watch    # Tests d'auth en mode watch
npm run test:game          # Tests des utilitaires de jeu
npm run test:integration   # Tests d'intégration
npm run test:security      # Tests de sécurité
npm run test:unit          # Tests unitaires seulement
npm run test:all           # Séquence complète de tous les tests
```

## 🔧 Configuration Requise

### Base de Données de Test

Les tests utilisent une base MongoDB séparée :

```bash
# Par défaut
mongodb://localhost:27017/monodrien-test

# Ou via variable d'environnement
export MONGODB_TEST_URI="mongodb://localhost:27017/monodrien-test"
```

### Variables d'Environnement

```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
JWT_EXPIRE=1h
MONGODB_TEST_URI=mongodb://localhost:27017/monodrien-test
SILENT_TESTS=true  # Pour masquer les logs pendant les tests
```

### Dépendances

```bash
npm install  # Installe toutes les dépendances incluant les dev dependencies
```

## 📊 Couverture de Code

### Seuils de Couverture

- **Global** : 70% branches, 80% fonctions/lignes/statements
- **Modèles** : 85% branches, 90% fonctions/lignes/statements
- **Middleware** : 85% branches, 90% fonctions/lignes/statements
- **Routes Auth** : 90% branches, 95% fonctions/lignes/statements

### Rapports Générés

- Console (text)
- HTML : `coverage/lcov-report/index.html`
- LCOV : `coverage/lcov.info`
- JSON : `coverage/coverage-final.json`

## 🧪 Types de Tests

### 1. Tests Unitaires

- **user.model.test.js** : Validation schema, hachage mot de passe, méthodes
- **auth.middleware.test.js** : Validation JWT, gestion erreurs, sécurité
- **gameUtils.test.js** : Algorithmes de jeu, calculs, génération ID

### 2. Tests d'Intégration

- **auth.routes.test.js** : Endpoints API, validation données, réponses
- **auth.integration.test.js** : Flux complets utilisateur, persistance données

### 3. Tests de Sécurité

- **auth.security.test.js** : Injection, XSS, manipulation tokens, audit

## 🔍 Fonctionnalités Testées

### Système d'Authentification

- ✅ Inscription utilisateur avec validation complète
- ✅ Connexion par email/username
- ✅ Génération et validation JWT
- ✅ Middleware d'authentification et autorisation
- ✅ Gestion profil utilisateur
- ✅ Changement mot de passe sécurisé
- ✅ Hachage bcrypt avec salt
- ✅ Protection contre injection NoSQL/XSS
- ✅ Gestion sessions multiples
- ✅ Validation données entrée
- ✅ Messages d'erreur sécurisés

### Utilitaires de Jeu

- ✅ Génération ID parties uniques
- ✅ Mélange cartes (Fisher-Yates)
- ✅ Calculs distances plateau
- ✅ Détection passage case Départ
- ✅ Calcul loyers propriétés/gares/services
- ✅ Détection monopoles
- ✅ Validation état partie
- ✅ Formatage monétaire
- ✅ Génération statistiques partie

## 🚨 Tests de Sécurité

### Vulnérabilités Testées

- **Injection NoSQL** : Tentatives d'injection dans les requêtes MongoDB
- **XSS** : Échappement caractères dangereux dans les inputs
- **JWT Security** : Manipulation signatures, payloads, algorithmes
- **Password Security** : Hachage, timing attacks, complexité
- **Session Security** : Fixation, concurrent sessions
- **Information Disclosure** : Fuites données sensibles, stack traces
- **Input Validation** : Taille, caractères contrôle, sanitisation

### Bonnes Pratiques Vérifiées

- Mots de passe jamais stockés en plain text
- Tokens JWT signés et vérifiés
- Validation stricte des entrées utilisateur
- Messages d'erreur homogènes
- Logs sécurisés (pas de données sensibles)
- Timeouts appropriés pour prévenir attaques

## 📈 Métriques et Monitoring

### Tests de Performance

- Gestion charge (inscriptions/connexions simultanées)
- Temps réponse endpoints critiques
- Résistance aux attaques par timing

### Audit et Conformité

- Traçabilité actions sensibles
- Logs tentatives connexion suspectes
- Monitoring changements critiques
- Validation conformité RGPD (données publiques seulement)

## 🛠️ Développement et Débogage

### Mode Debug

```bash
# Afficher tous les logs
SILENT_TESTS=false npm test

# Tests spécifiques avec debug
npm run test:auth -- --verbose --detectOpenHandles
```

### Ajout de Nouveaux Tests

1. Créer le fichier dans `/tests/`
2. Suivre la convention `*.test.js`
3. Utiliser les utilitaires dans `setup.js`
4. Ajouter la couverture appropriée
5. Documenter les cas testés

### Utilitaires Disponibles

```javascript
// Dans setup.js
cleanupDatabase(); // Nettoie la base de test
createTestUser(userData); // Crée un utilisateur de test
generateTestToken(userId); // Génère un JWT de test
```

### Debugging Tests Échoués

```bash
# Un seul test
npm test -- --testNamePattern="devrait valider un utilisateur"

# Un seul fichier
npm test auth.routes.test.js

# Avec plus de détails
npm test -- --verbose --no-coverage
```

## 📝 Conventions

### Nomenclature

- `describe()` : Nom du module/fonction testé
- `it()` : Comportement attendu en français
- Variables : `mock*`, `test*`, `expected*`

### Structure des Tests

```javascript
describe("Module", () => {
  beforeEach(() => {
    // Setup avant chaque test
  });

  describe("Fonction spécifique", () => {
    it("devrait faire quelque chose avec des données valides", () => {
      // Test du cas nominal
    });

    it("devrait rejeter des données invalides", () => {
      // Test des cas d'erreur
    });
  });
});
```

### Assertions

- Privilégier `expect()` avec matchers spécifiques
- Tester les cas limites et erreurs
- Vérifier les effets de bord (base, logs, etc.)
- Utiliser des données réalistes

## 🚦 CI/CD Integration

### GitHub Actions / GitLab CI

```yaml
test:
  script:
    - npm ci
    - npm run test:ci
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

### Pre-commit Hooks

```bash
# Dans package.json
"husky": {
  "hooks": {
    "pre-commit": "npm run test:auth && npm run test:security"
  }
}
```

## 📚 Ressources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/ladjs/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- **[🪟 Guide Windows](../WINDOWS-TROUBLESHOOTING.md)** - Dépannage spécifique Windows

### Standards de Sécurité

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

Ces tests garantissent la robustesse, la sécurité et la fiabilité du système d'authentification MonoDrien. Ils couvrent les cas nominaux, les erreurs, et les tentatives d'attaque, assurant une protection complète des données utilisateur.
