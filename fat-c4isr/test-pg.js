// test-pg.js
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'fat_c4isr',
    user: 'fat_admin',
    password: 'fat123'
});

async function testConnection() {
    console.log('🔍 Test de connexion PostgreSQL...');
    try {
        const res = await pool.query('SELECT 1 as test');
        console.log('✅ SUCCÈS! Connecté à PostgreSQL');
        console.log('📊 Résultat:', res.rows[0]);
        
        // Vérifier PostGIS
        const postgis = await pool.query(`
            SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') as has_postgis
        `);
        console.log('🗺️ PostGIS installé?', postgis.rows[0].has_postgis ? 'OUI ✅' : 'NON ❌');
        
    } catch (error) {
        console.error('❌ ÉCHEC de connexion!');
        console.error('Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

testConnection();