const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Test du backend MonoDrien\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Test health check...');
    const health = await fetch(`${API_BASE}/health`);
    const healthData = await health.json();
    console.log('✅ Health:', healthData);

    // Test 2: Auth me sans token
    console.log('\n2️⃣ Test /auth/me sans token...');
    try {
      const noAuth = await fetch(`${API_BASE}/auth/me`);
      const noAuthData = await noAuth.json();
      console.log('❌ Devrait échouer:', noAuthData);
    } catch (e) {
      console.log('✅ Erreur attendue (pas de token)');
    }

    // Test 3: Auth me avec token valide
    console.log('\n3️⃣ Test /auth/me avec token1...');
    const withAuth = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': 'Bearer token1' }
    });
    const authData = await withAuth.json();
    console.log('✅ Utilisateur:', authData.user.username);

    // Test 4: Auth me avec différents tokens
    console.log('\n4️⃣ Test des différents tokens...');
    const tokens = ['token1', 'token2', 'admin', 'player'];
    
    for (const token of tokens) {
      const resp = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      console.log(`  ${token} -> ${data.user.username} (${data.user.email})`);
    }

    // Test 5: Création de partie
    console.log('\n5️⃣ Test création de partie...');
    const createGame = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer admin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Partie de test',
        gameMode: 'classique',
        maxPlayers: 4
      })
    });
    const gameData = await createGame.json();
    console.log('✅ Partie créée:', gameData.gameId);

    // Test 6: Liste des parties
    console.log('\n6️⃣ Test liste des parties...');
    const listGames = await fetch(`${API_BASE}/games`);
    const gamesData = await listGames.json();
    console.log('✅ Parties:', gamesData.games.length);

    console.log('\n🎉 Tous les tests sont passés !');

  } catch (error) {
    console.error('💥 Erreur lors des tests:', error.message);
  }
}

// Exécuter les tests si c'est le script principal
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 