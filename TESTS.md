# 🧪 Tests Automatisés MonoDrien

Guide complet pour comprendre et utiliser les tests automatisés du système de lobby multijoueur.

## 📋 Vue d'ensemble

Notre suite de tests couvre :

- **Backend** : Routes API, authentification, système de lobby
- **Frontend** : Hooks React, services, interactions utilisateur
- **Intégration** : Communication frontend-backend

## 🚀 Lancement des tests

### Tous les tests

```bash
# Depuis la racine du projet
node run-tests.js
```

### Tests backend uniquement

```bash
cd Back
npm test
```

### Tests frontend uniquement

```bash
cd MonoFront
npm test
```

### Mode watch (développement)

```bash
# Backend
cd Back && npm run test:watch

# Frontend
cd MonoFront && npm run test:watch
```

## 🏗️ Structure des tests

```
📁 Back/tests/
├── auth.test.js          # Tests d'authentification
└── lobby.test.js         # Tests du système de lobby

📁 MonoFront/__tests__/
├── hooks/
│   └── use-user-profile.test.ts
└── lib/
    └── lobby-service.test.ts
```

## 🔙 Tests Backend

### Authentification (`auth.test.js`)

- ✅ Inscription utilisateur
- ✅ Connexion (username/email)
- ✅ Récupération profil
- ✅ Support tokens JWT (migration)
- ✅ Middleware de sécurité

### Système de Lobby (`lobby.test.js`)

- ✅ Création de lobby
- ✅ Rejoindre/quitter lobby
- ✅ Promotion nouvel hôte
- ✅ Démarrage de partie
- ✅ Liste des lobbies publics

## 🖥️ Tests Frontend

### Hooks (`use-user-profile.test.ts`)

- ✅ Cache utilisateur intelligent
- ✅ Gestion d'erreurs
- ✅ Synchronisation multi-instances
- ✅ Prévention appels concurrents

### Services (`lobby-service.test.ts`)

- ✅ Service de lobby complet
- ✅ Polling automatique
- ✅ Gestion d'états
- ✅ Refresh manuel

## 🔧 Configuration

### Backend (Jest + Supertest)

```json
{
  "testEnvironment": "node",
  "testMatch": ["**/tests/**/*.test.js"],
  "collectCoverageFrom": ["src/**/*.js", "!src/server.js"]
}
```

### Frontend (Jest + React Testing Library)

```json
{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "testMatch": ["**/__tests__/**/*.(ts|tsx|js)"]
}
```

## 📊 Couverture de code

### Générer le rapport

```bash
# Backend
cd Back && npm run test:coverage

# Frontend
cd MonoFront && npm run test:coverage
```

### Objectifs de couverture

- **Fonctions critiques** : 100% (auth, lobby)
- **Routes API** : 95%
- **Hooks React** : 90%
- **Services** : 85%

## 🎯 Exemples de tests

### Test d'API Backend

```javascript
it("✅ devrait créer un lobby avec succès", async () => {
  const response = await request(app)
    .post("/api/lobby/create")
    .set("Authorization", "Bearer token1")
    .expect(201);

  expect(response.body.lobby.host).toBe(1);
  expect(response.body.lobby.players).toHaveLength(1);
});
```

### Test de Hook React

```typescript
it("✅ devrait charger le profil utilisateur", async () => {
  const { result } = renderHook(() => useUserProfile());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.user).toBeTruthy();
});
```

## 🚨 Tests en échec

### Debugging

1. **Lire le message d'erreur** complet
2. **Vérifier les mocks** (localStorage, API)
3. **Tester individuellement** le composant
4. **Utiliser les outils de debug** Jest

### Erreurs communes

- ❌ **Mock non configuré** → Vérifier jest.setup.js
- ❌ **Timeout** → Augmenter le délai ou optimiser
- ❌ **État asynchrone** → Utiliser waitFor()

## 🔄 Intégration continue

### GitHub Actions (exemple)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node run-tests.js
```

## 📝 Bonnes pratiques

### Nommage

- ✅ **Descriptif** : "devrait créer un lobby avec succès"
- ✅ **Émojis** : ✅ succès, ❌ erreur, 🔄 reload
- ✅ **Groupement** : describe() pour organiser

### Structure

```javascript
describe("🏠 Système de lobby", () => {
  beforeEach(() => {
    // Setup avant chaque test
  });

  it("✅ devrait faire quelque chose", async () => {
    // Arrange - Préparer
    // Act - Exécuter
    // Assert - Vérifier
  });
});
```

### Mocking

- 🎯 **Minimal** : Mocker uniquement le nécessaire
- 🔄 **Reset** : Nettoyer entre les tests
- 📝 **Explicite** : Documenter les mocks complexes

## 🎉 Résultats attendus

```
🧪 Lancement des tests automatisés pour MonoDrien
============================================================

🔙 Backend Tests
📝 Tests des routes API, authentification et système de lobby
----------------------------------------
✅ 🔐 Tests d'authentification
✅ 🏠 Tests du système de lobby
✅ 🏗️ Tests de la classe Lobby

🖥️ Frontend Tests
📝 Tests des hooks, services et composants React
----------------------------------------
✅ 🪝 useUserProfile Hook
✅ 🏠 LobbyService
✅ 🪝 useLobbyPolling Hook

============================================================
📊 RÉSUMÉ DES TESTS
============================================================
✅ Suites réussies: 2
❌ Suites échouées: 0
📈 Total: 2

🎉 TOUS LES TESTS SONT RÉUSSIS !
🚀 Le système de lobby est prêt pour la production
```

## 🤝 Contribution

Avant de contribuer :

1. **Lancer les tests** : `node run-tests.js`
2. **Ajouter des tests** pour les nouvelles fonctionnalités
3. **Maintenir la couverture** au niveau requis
4. **Documenter** les tests complexes

---

💡 **Astuce** : Utilise `npm run test:watch` pendant le développement pour un feedback instantané !
