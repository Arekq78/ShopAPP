// --- SEKCJA IMPORTÓW ---
const db = require('./src/db');

// --- SEKCJA LOGIKI TESTOWEJ ---
async function testConnection() {
  try {
    console.log('⏳ Próba połączenia z bazą...');
    
    const categories = await db('categories').select('*');
    
    console.log('✅ SUKCES! Połączono z bazą.');
    console.log('Pobrane kategorie:', categories);
    
  } catch (error) {
    console.error('❌ BŁĄD POŁĄCZENIA:', error.message);
  } finally {
    db.destroy();
  }
}

// --- SEKCJA URUCHOMIENIA ---
testConnection();