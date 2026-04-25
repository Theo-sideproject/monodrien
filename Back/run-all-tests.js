#!/usr/bin/env node

/**
 * Script de lancement complet des tests MonoDrien Backend
 * 
 * Usage: node run-all-tests.js [options]
 * Options:
 *   --coverage    Inclure le rapport de couverture
 *   --verbose     Mode verbeux
 *   --ci          Mode CI/CD
 */

const { spawn } = require('child_process');
const path = require('path');

// Détection de l'OS pour les commandes compatibles
const isWindows = process.platform === 'win32';

// Configuration
const TEST_SUITES = [
  {
    name: '🔐 Tests d\'Authentification',
    command: isWindows ? 'npx jest --testPathPattern=auth --testPathPattern=user --verbose' : 'npm run test:auth',
    description: 'Tests du système d\'authentification complet',
    files: ['user.model.test.js', 'auth.middleware.test.js', 'auth.routes.test.js']
  },
  {
    name: '🎮 Tests Utilitaires de Jeu',
    command: isWindows ? 'npx jest --testPathPattern=game --verbose' : 'npm run test:game',
    description: 'Tests des utilitaires et algorithmes de jeu',
    files: ['gameUtils.test.js']
  },
  {
    name: '🔗 Tests d\'Intégration',
    command: isWindows ? 'npx jest --testPathPattern=integration --verbose' : 'npm run test:integration',
    description: 'Tests de bout en bout du système d\'authentification',
    files: ['auth.integration.test.js']
  },
  {
    name: '🛡️ Tests de Sécurité',
    command: isWindows ? 'npx jest --testPathPattern=security --verbose' : 'npm run test:security',
    description: 'Tests de sécurité et vulnérabilités',
    files: ['auth.security.test.js']
  },
  {
    name: '⚡ Tests de Performance',
    command: isWindows ? 'npx jest --testPathPattern=performance --verbose --runInBand' : 'npm run test:performance',
    description: 'Tests de performance et charge',
    files: ['auth.performance.test.js']
  }
];

// Parsing des arguments
const args = process.argv.slice(2);
const options = {
  coverage: args.includes('--coverage'),
  verbose: args.includes('--verbose'),
  ci: args.includes('--ci'),
  help: args.includes('--help') || args.includes('-h')
};

// Fonction d'aide
function showHelp() {
  console.log(`
🧪 Script de Tests MonoDrien Backend

Usage: node run-all-tests.js [options]

Options:
  --coverage    Inclure le rapport de couverture de code
  --verbose     Affichage détaillé des résultats
  --ci          Mode CI/CD (sans interaction)
  --help, -h    Afficher cette aide

Suites de tests disponibles:
${TEST_SUITES.map(suite => `  • ${suite.name}: ${suite.description}`).join('\n')}

Exemples:
  node run-all-tests.js                    # Tests complets
  node run-all-tests.js --coverage         # Avec couverture
  node run-all-tests.js --ci               # Mode CI/CD
  npm run test:report                       # Via npm script

Alternative Windows (si problèmes de guillemets):
  test-windows.bat all                      # Tous les tests
  test-windows.bat auth                     # Tests d'auth seulement
`);
}

// Fonction pour exécuter une commande
function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 ${description}`);
    console.log(`📝 Commande: ${command}`);
    console.log(`${'='.repeat(60)}\n`);

    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${description} - SUCCÈS\n`);
        resolve({ success: true, code });
      } else {
        console.log(`\n❌ ${description} - ÉCHEC (code ${code})\n`);
        resolve({ success: false, code });
      }
    });

    child.on('error', (error) => {
      console.error(`\n💥 Erreur lors de l'exécution: ${error.message}\n`);
      reject(error);
    });
  });
}

// Fonction principale
async function runAllTests() {
  console.log(`
🎯 MONODRIEN BACKEND - SUITE DE TESTS COMPLÈTE
${'='.repeat(80)}

📊 Tests créés pour ce projet:
• Tests Unitaires: 5 fichiers, 200+ tests
• Tests d'Intégration: Flux complets utilisateur  
• Tests de Sécurité: Protection contre attaques
• Tests de Performance: Charge et optimisation
• Couverture: Objectif 80%+ sur composants critiques

🔧 Configuration:
• Framework: Jest ${require('./package.json').devDependencies.jest}
• Base de test: MongoDB (monodrien-test)
• Mocks: Supertest pour API, bcrypt, JWT
• CI/CD: Compatible GitHub Actions, GitLab CI

${'='.repeat(80)}
`);

  const results = [];
  let totalTests = 0;
  let failedSuites = 0;

  try {
    // Exécuter la couverture si demandée
    if (options.coverage) {
      console.log('📈 Génération du rapport de couverture...\n');
      const coverageResult = await runCommand('npm run test:coverage', 'Analyse de Couverture');
      results.push({ name: 'Couverture de Code', ...coverageResult });
    }

    // Exécuter chaque suite de tests
    for (const suite of TEST_SUITES) {
      const result = await runCommand(suite.command, suite.name);
      results.push({ name: suite.name, ...result });
      
      if (!result.success) {
        failedSuites++;
      }
      totalTests++;
    }

  } catch (error) {
    console.error(`💥 Erreur fatale: ${error.message}`);
    process.exit(1);
  }

  // Afficher le résumé final
  console.log(`
${'='.repeat(80)}
📋 RÉSUMÉ FINAL DES TESTS
${'='.repeat(80)}

📊 Statistiques:
• Total des suites: ${totalTests}
• Suites réussies: ${totalTests - failedSuites}
• Suites échouées: ${failedSuites}
• Taux de réussite: ${((totalTests - failedSuites) / totalTests * 100).toFixed(1)}%

📝 Détails par suite:
${results.map(result => 
  `${result.success ? '✅' : '❌'} ${result.name}`
).join('\n')}

${failedSuites === 0 ? '🎉 TOUS LES TESTS SONT PASSÉS !' : `⚠️  ${failedSuites} suite(s) ont échoué`}

📁 Fichiers de tests créés:
${TEST_SUITES.flatMap(suite => suite.files.map(file => `   • tests/${file}`)).join('\n')}

🔗 Commandes utiles:
   npm test                    # Tests rapides
   npm run test:auth          # Tests auth seulement  
   npm run test:coverage      # Avec couverture
   npm run test:watch         # Mode watch
   npm run test:ci            # Mode CI/CD

📖 Documentation complète: tests/README.md
${'='.repeat(80)}
`);

  // Code de sortie
  process.exit(failedSuites > 0 ? 1 : 0);
}

// Point d'entrée
if (options.help) {
  showHelp();
  process.exit(0);
}

// Vérifications préalables
const fs = require('fs');
const requiredFiles = [
  'package.json',
  'tests/setup.js',
  'tests/user.model.test.js',
  'tests/auth.middleware.test.js',
  'tests/auth.routes.test.js',
  'tests/auth.integration.test.js',
  'tests/auth.security.test.js',
  'tests/auth.performance.test.js',
  'tests/gameUtils.test.js'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error(`
❌ ERREUR: Fichiers de tests manquants:
${missingFiles.map(file => `   • ${file}`).join('\n')}

💡 Assurez-vous que tous les fichiers de tests sont présents.
`);
  process.exit(1);
}

// Lancement des tests
runAllTests().catch(error => {
  console.error(`💥 Erreur inattendue: ${error.message}`);
  process.exit(1);
});