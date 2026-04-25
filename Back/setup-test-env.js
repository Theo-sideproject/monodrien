#!/usr/bin/env node

/**
 * Script de configuration de l'environnement de test MonoDrien
 * 
 * Ce script vérifie et configure automatiquement l'environnement
 * nécessaire pour lancer les tests backend.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log(`
🔧 CONFIGURATION ENVIRONNEMENT DE TEST - MONODRIEN BACKEND
${'='.repeat(70)}
`);

// Vérifications des prérequis
const checks = [
  {
    name: 'Node.js version',
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return { success: major >= 16, message: `${version} ${major >= 16 ? '✅' : '❌ (requis: 16+)'}` };
    }
  },
  {
    name: 'npm disponible',
    check: () => {
      try {
        require('child_process').execSync('npm --version', { stdio: 'ignore' });
        return { success: true, message: '✅' };
      } catch {
        return { success: false, message: '❌ npm non trouvé' };
      }
    }
  },
  {
    name: 'MongoDB accessible',
    check: () => {
      try {
        const { MongoClient } = require('mongodb');
        return { success: true, message: '✅ Module MongoDB installé' };
      } catch {
        return { success: false, message: '❌ Module MongoDB manquant' };
      }
    }
  },
  {
    name: 'package.json',
    check: () => {
      const exists = fs.existsSync('package.json');
      return { success: exists, message: exists ? '✅' : '❌ package.json manquant' };
    }
  },
  {
    name: 'Fichiers de test',
    check: () => {
      const testFiles = [
        'tests/setup.js',
        'tests/user.model.test.js',
        'tests/auth.middleware.test.js',
        'tests/auth.routes.test.js',
        'tests/auth.integration.test.js',
        'tests/auth.security.test.js',
        'tests/auth.performance.test.js',
        'tests/gameUtils.test.js'
      ];
      
      const missing = testFiles.filter(file => !fs.existsSync(file));
      return { 
        success: missing.length === 0, 
        message: missing.length === 0 ? '✅ Tous présents' : `❌ ${missing.length} fichier(s) manquant(s)` 
      };
    }
  }
];

// Exécuter les vérifications
console.log('🔍 Vérification des prérequis:\n');
let allChecksPass = true;

for (const check of checks) {
  const result = check.check();
  console.log(`   ${check.name.padEnd(25)} ${result.message}`);
  if (!result.success) {
    allChecksPass = false;
  }
}

console.log('');

if (!allChecksPass) {
  console.log(`
❌ ERREUR: Certains prérequis ne sont pas satisfaits.

💡 Actions recommandées:
   • Installer Node.js 16+ : https://nodejs.org
   • Installer MongoDB : https://mongodb.com/try/download/community
   • Exécuter: npm install
   • Vérifier que tous les fichiers de test sont présents

🔗 Documentation: tests/README.md
`);
  process.exit(1);
}

// Créer le fichier .env pour les tests si il n'existe pas
const envTestPath = '.env.test';
const envTestContent = `# Configuration pour les tests
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only-change-in-production
JWT_EXPIRE=1h
MONGODB_TEST_URI=mongodb://localhost:27017/monodrien-test
SILENT_TESTS=false

# Pour les tests de performance
BCRYPT_ROUNDS=12

# Mode verbeux pour debug
DEBUG_TESTS=false
`;

if (!fs.existsSync(envTestPath)) {
  fs.writeFileSync(envTestPath, envTestContent);
  console.log(`✅ Fichier ${envTestPath} créé avec la configuration par défaut`);
} else {
  console.log(`✅ Fichier ${envTestPath} déjà présent`);
}

// Créer le dossier coverage s'il n'existe pas
if (!fs.existsSync('coverage')) {
  fs.mkdirSync('coverage');
  console.log('✅ Dossier coverage créé');
}

// Vérifier les dépendances npm
function checkDependencies() {
  return new Promise((resolve) => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDevDeps = ['jest', 'supertest', '@types/jest'];
    
    const missing = requiredDevDeps.filter(dep => !packageJson.devDependencies[dep]);
    
    if (missing.length > 0) {
      console.log(`\n⚠️  Dépendances manquantes détectées: ${missing.join(', ')}`);
      console.log('🔄 Installation des dépendances...\n');
      
      const child = spawn('npm', ['install'], { stdio: 'inherit' });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Dépendances installées avec succès');
          resolve(true);
        } else {
          console.log('\n❌ Erreur lors de l\'installation des dépendances');
          resolve(false);
        }
      });
    } else {
      console.log('✅ Toutes les dépendances sont installées');
      resolve(true);
    }
  });
}

// Test de connexion MongoDB
function testMongoConnection() {
  return new Promise((resolve) => {
    console.log('\n🔌 Test de connexion MongoDB...');
    
    try {
      const mongoose = require('mongoose');
      const testUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/monodrien-test';
      
      mongoose.connect(testUri, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      }).then(() => {
        console.log('✅ Connexion MongoDB réussie');
        mongoose.connection.close();
        resolve(true);
      }).catch((error) => {
        console.log(`❌ Connexion MongoDB échouée: ${error.message}`);
        console.log(`
💡 Solutions possibles:
   • Démarrer MongoDB: mongod
   • Vérifier l'URI: ${testUri}
   • Installer MongoDB Community: https://mongodb.com/try/download/community
        `);
        resolve(false);
      });
    } catch (error) {
      console.log(`❌ Module mongoose non disponible: ${error.message}`);
      resolve(false);
    }
  });
}

// Fonction principale
async function setupEnvironment() {
  console.log('\n🔧 Configuration de l\'environnement...\n');
  
  // Vérifier et installer les dépendances
  const depsOk = await checkDependencies();
  if (!depsOk) {
    console.log('\n❌ Impossible d\'installer les dépendances');
    process.exit(1);
  }
  
  // Tester la connexion MongoDB
  const mongoOk = await testMongoConnection();
  if (!mongoOk) {
    console.log('\n⚠️  MongoDB non accessible - les tests nécessitant la DB échoueront');
  }
  
  // Afficher le résumé
  console.log(`
${'='.repeat(70)}
🎉 ENVIRONNEMENT DE TEST CONFIGURÉ !
${'='.repeat(70)}

📁 Structure créée:
   • ${envTestPath} - Configuration des tests
   • coverage/ - Dossier pour les rapports de couverture
   • tests/ - ${checks.find(c => c.name === 'Fichiers de test').check().success ? '8 fichiers de test' : 'Fichiers partiels'}

🚀 Commandes disponibles:
   npm test                    # Tests rapides
   npm run test:coverage       # Avec couverture
   npm run test:auth          # Tests authentification
   npm run test:security      # Tests sécurité
   npm run test:performance   # Tests performance
   node run-all-tests.js      # Suite complète avec rapport

🧪 Types de tests inclus:
   • Tests Unitaires (5 fichiers)
   • Tests d'Intégration (API end-to-end)
   • Tests de Sécurité (Vulnérabilités)
   • Tests de Performance (Charge et optimisation)

📊 Couverture attendue:
   • Global: 80%+ lignes/fonctions
   • Modèles: 90%+ (critiques)
   • Auth: 95%+ (sécurité)

📖 Documentation: tests/README.md

🔥 Pour commencer:
   ${mongoOk ? 'npm test' : 'Démarrer MongoDB puis: npm test'}
${'='.repeat(70)}
`);

  process.exit(0);
}

// Lancement
setupEnvironment().catch(error => {
  console.error(`💥 Erreur lors de la configuration: ${error.message}`);
  process.exit(1);
});