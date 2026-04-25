#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Lancement des tests automatisés pour MonoDrien');
console.log('='.repeat(60));

// Configuration des tests
const testSuites = [
  {
    name: '🔙 Backend Tests',
    cwd: path.join(__dirname, 'Back'),
    command: 'npm',
    args: ['test'],
    description: 'Tests des routes API, authentification et système de lobby'
  },
  {
    name: '🖥️ Frontend Tests', 
    cwd: path.join(__dirname, 'MonoFront'),
    command: 'npm',
    args: ['test', '--', '--passWithNoTests'],
    description: 'Tests des hooks, services et composants React'
  }
];

async function runTests() {
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of testSuites) {
    console.log(`\n${suite.name}`);
    console.log(`📝 ${suite.description}`);
    console.log('-'.repeat(40));

    try {
      const result = await runTestSuite(suite);
      if (result.success) {
        console.log(`✅ ${suite.name} - RÉUSSIS`);
        totalPassed++;
      } else {
        console.log(`❌ ${suite.name} - ÉCHECS`);
        totalFailed++;
      }
    } catch (error) {
      console.error(`💥 ${suite.name} - ERREUR:`, error.message);
      totalFailed++;
    }
  }

  // Résumé final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));
  console.log(`✅ Suites réussies: ${totalPassed}`);
  console.log(`❌ Suites échouées: ${totalFailed}`);
  console.log(`📈 Total: ${totalPassed + totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT RÉUSSIS !');
    console.log('🚀 Le système de lobby est prêt pour la production');
  } else {
    console.log('\n⚠️  Certains tests ont échoué');
    console.log('🔧 Veuillez corriger les erreurs avant le déploiement');
    process.exit(1);
  }
}

function runTestSuite(suite) {
  return new Promise((resolve, reject) => {
    const child = spawn(suite.command, suite.args, {
      cwd: suite.cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      resolve({ success: code === 0 });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Gestion des signaux pour nettoyage
process.on('SIGINT', () => {
  console.log('\n🛑 Tests interrompus par l\'utilisateur');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Tests terminés par le système');
  process.exit(0);
});

// Lancer les tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { runTests }; 