// =====================================================
// CONNEXION POSTGRESQL - SUPABASE
// =====================================================
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// URL de connexion Supabase (format: postgresql://postgres.project:password@host:5432/postgres)
const supabaseUrl = process.env.DATABASE_URL || "postgresql://postgres.uyfgxxhgplmtmsmhbmwu:YOUR_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

const pool = new Pool({
    connectionString: supabaseUrl,
    ssl: {
        rejectUnauthorized: false // Requis pour Supabase
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Test de connexion au démarrage
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur de connexion PostgreSQL:', err.message);
        console.log('📌 Vérifie que:');
        console.log('   1. Le mot de passe est correct dans .env');
        console.log('   2. L\'URL Supabase est valide');
        console.log('   3. Ton IP est autorisée dans Supabase');
    } else {
        console.log('✅ Connecté à Supabase PostgreSQL');
        release();
    }
});

pool.on('error', (err) => {
    console.error('❌ Erreur PostgreSQL:', err.message);
});

module.exports = pool;