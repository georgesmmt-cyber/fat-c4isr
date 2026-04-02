// test-db.js
require('dotenv').config();
const pool = require('./server/config/database');

async function testConnection() {
    try {
        // Test simple
        const res = await pool.query('SELECT NOW() as time');
        console.log('✅ Connexion réussie!');
        console.log('🕒 Heure serveur:', res.rows[0].time);
        
        // Lister les tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('\n📊 Tables disponibles:');
        tables.rows.forEach((t, i) => {
            console.log(`   ${i+1}. ${t.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

testConnection();