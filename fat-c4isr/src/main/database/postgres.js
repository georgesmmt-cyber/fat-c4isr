/**
 * Module de connexion PostgreSQL pour FAT-C4ISR
 * Utilise un pool de connexions pour gérer plusieurs requêtes simultanées
 */

const { Pool } = require('pg');
require('dotenv').config(); // Charger les variables d'environnement depuis .env

class PostgresManager {
    constructor() {
        // PRIORITÉ 1: Utiliser SUPABASE_DATABASE_URL si définie (recommandé)
if (process.env.SUPABASE_DATABASE_URL) {
    this.pool = new Pool({
        connectionString: process.env.SUPABASE_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });
    console.log('🔌 Connexion Supabase via URL directe');
}
// PRIORITÉ 2: Connexion Supabase avec paramètres séparés
else if (process.env.SUPABASE_HOST) {
    this.pool = new Pool({
        host: process.env.SUPABASE_HOST,
        port: process.env.SUPABASE_PORT || 5432,
        database: process.env.SUPABASE_DATABASE || 'postgres',
        user: process.env.SUPABASE_USER || 'postgres',
        password: process.env.SUPABASE_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });
    console.log('🔌 Configuration Supabase détectée');
}
// PRIORITÉ 3: Connexion locale (fallback)
else {
    this.pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE || 'fat_c4isr',
        user: process.env.PGUSER || 'fat_admin',
        password: process.env.PGPASSWORD || 'fat123',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
    console.log('🔌 Configuration locale détectée');
}
    }

    /**
     * Initialise la connexion et vérifie que tout fonctionne
     */
    async initialize() {
        try {
            // Tester la connexion
            const res = await this.pool.query('SELECT version()');
            console.log('✅ Connecté à PostgreSQL');
            console.log(`   Version: ${res.rows[0].version.substring(0, 50)}...`);
            
            // Déterminer le type de connexion
            if (res.rows[0].version.includes('Supabase')) {
                this.connectionType = 'supabase';
                console.log('☁️ Connexion Supabase établie');
            } else {
                this.connectionType = 'local';
                console.log('💻 Connexion locale établie');
            }
            
            // Vérifier que PostGIS est installé
            try {
                const postgis = await this.pool.query(`
                    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')
                `);
                
                if (postgis.rows[0].exists) {
                    console.log('🗺️ PostGIS installé et prêt');
                } else {
                    console.warn('⚠️ PostGIS non installé');
                }
            } catch (e) {
                console.warn('⚠️ Impossible de vérifier PostGIS');
            }
            
            this.connected = true;
            return true;
        } catch (error) {
            console.error('❌ Erreur de connexion PostgreSQL:', error.message);
            this.connected = false;
            return false;
        }
    }

    /**
     * Exécute une requête SQL
     * @param {string} text - La requête SQL
     * @param {Array} params - Les paramètres de la requête
     * @returns {Promise<Object>} - Le résultat de la requête
     */
    async query(text, params = []) {
        if (!this.connected) {
            throw new Error('Base de données non connectée');
        }

        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            // Log des requêtes lentes (> 100ms) pour déboguer
            if (duration > 100) {
                console.log(`⚠️ Requête lente (${duration}ms): ${text.substring(0, 100)}...`);
            }
            
            return res;
        } catch (error) {
            console.error('❌ Erreur SQL:', error.message);
            throw error;
        }
    }

    // =====================================================
    // MÉTHODES POUR LES UNITÉS (VESTS)
    // =====================================================

    /**
     * Récupère toutes les unités
     */
    async getAllVests() {
        const res = await this.query('SELECT * FROM vests ORDER BY id');
        return res.rows;
    }

    /**
     * Récupère les unités actives (en ligne)
     */
    async getActiveVests() {
        const res = await this.query(
            'SELECT * FROM vests WHERE status = $1 ORDER BY id',
            ['online']
        );
        return res.rows;
    }

    /**
     * Récupère une unité par son ID
     */
    async getVestById(id) {
        const res = await this.query('SELECT * FROM vests WHERE id = $1', [id]);
        return res.rows[0];
    }

    /**
     * Met à jour le statut d'une unité
     */
    async updateVestStatus(id, status, batteryLevel = null) {
        if (batteryLevel !== null) {
            await this.query(
                'UPDATE vests SET status = $1, battery_level = $2, last_seen = NOW() WHERE id = $3',
                [status, batteryLevel, id]
            );
        } else {
            await this.query(
                'UPDATE vests SET status = $1, last_seen = NOW() WHERE id = $2',
                [status, id]
            );
        }
    }

    // =====================================================
    // MÉTHODES POUR LES DONNÉES CAPTEURS
    // =====================================================

    /**
     * Stocke des données capteurs
     */
    async storeSensorData(vestId, sensorData) {
        const res = await this.query(
            'INSERT INTO sensor_data (vest_id, data) VALUES ($1, $2) RETURNING id',
            [vestId, sensorData]
        );
        return res.rows[0].id;
    }

    /**
     * Récupère les dernières données d'un capteur
     */
    async getLatestSensorData(vestId, limit = 100) {
        const res = await this.query(
            'SELECT * FROM sensor_data WHERE vest_id = $1 ORDER BY timestamp DESC LIMIT $2',
            [vestId, limit]
        );
        return res.rows;
    }

    // =====================================================
    // MÉTHODES POUR LES POSITIONS GPS
    // =====================================================

    /**
     * Met à jour la position d'une unité
     */
    async updatePosition(vestId, lat, lng, altitude = null, accuracy = null) {
        // Utiliser ST_GeogFromText pour créer un point géographique
        const pointText = `POINT(${lng} ${lat})`;
        
        await this.query(
            `INSERT INTO positions (vest_id, position, altitude, accuracy) 
             VALUES ($1, ST_GeogFromText($2), $3, $4)`,
            [vestId, pointText, altitude, accuracy]
        );
    }

    /**
     * Récupère la dernière position de chaque unité
     */
   async getLatestPositions() {
    try {
        const result = await this.query(`
            SELECT DISTINCT ON (vest_id) 
                vest_id,
                latitude,
                longitude,
                timestamp
            FROM positions 
            ORDER BY vest_id, timestamp DESC
        `);
        return result.rows;
    } catch (error) {
        console.log('⚠️ Erreur positions, tentative avec gps_positions...');
        
        try {
            const result = await this.query(`
                SELECT DISTINCT ON (vest_id) 
                    vest_id,
                    latitude,
                    longitude,
                    timestamp
                FROM gps_positions 
                ORDER BY vest_id, timestamp DESC
            `);
            return result.rows;
        } catch (error2) {
            console.log('⚠️ Aucune table de positions disponible');
            return [];
        }
    }
}

    /**
     * Trouve les unités à proximité d'un point (requête PostGIS)
     */
    async findNearbyUnits(lat, lng, radiusMeters = 1000) {
        const pointText = `POINT(${lng} ${lat})`;
        
        const res = await this.query(`
            SELECT 
                v.id,
                v.soldier_name,
                v.status,
                ST_Distance(p.position, ST_GeogFromText($1)) as distance,
                ST_X(p.position::geometry) as longitude,
                ST_Y(p.position::geometry) as latitude
            FROM vests v
            JOIN positions p ON v.id = p.vest_id
            WHERE ST_DWithin(p.position, ST_GeogFromText($1), $2)
            ORDER BY distance
        `, [pointText, radiusMeters]);
        
        return res.rows;
    }

    // =====================================================
    // MÉTHODES POUR LES ALERTES
    // =====================================================

    /**
     * Crée une nouvelle alerte
     */
    async createAlert(vestId, type, severity, message) {
        const res = await this.query(
            `INSERT INTO alerts (vest_id, type, severity, message) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [vestId, type, severity, message]
        );
        return res.rows[0].id;
    }

    /**
     * Récupère les alertes non acquittées
     */
    async getPendingAlerts() {
        const res = await this.query(`
            SELECT * FROM alerts 
            WHERE acknowledged = false 
            ORDER BY severity, timestamp DESC
        `);
        return res.rows;
    }

    /**
     * Acquitte une alerte
     */
    async acknowledgeAlert(alertId) {
        await this.query(
            'UPDATE alerts SET acknowledged = true WHERE id = $1',
            [alertId]
        );
    }

    // =====================================================
    // MÉTHODES POUR TIMESCALEDB
    // =====================================================

    // Insérer une lecture capteur
    async insertSensorReading(vestId, sensorType, value, unit, health = 'normal') {
        const query = `
            INSERT INTO sensor_readings 
            (vest_id, sensor_type, value, unit, health, battery_level, signal_strength)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        // Simuler battery et signal (à remplacer par vraies valeurs)
        const battery = Math.floor(Math.random() * 100);
        const signal = Math.floor(Math.random() * 100);
        
        const result = await this.query(query, [
            vestId, sensorType, value, unit, health, battery, signal
        ]);
        
        return result.rows[0];
    }

    // Récupérer les dernières lectures
    async getLatestReadings(vestId, limit = 20) {
        const query = `
           SELECT * FROM alerts 
    WHERE vest_id = $1 
    ORDER BY timestamp DESC 
    LIMIT $2
        `;
        
        const result = await this.query(query, [vestId, limit]);
        return result.rows;
    }

    // Récupérer les statistiques agrégées
    async getSensorStats(vestId, timeRange = '1 hour') {
        const query = `
            SELECT * FROM sensor_stats_minute
            WHERE vest_id = $1 
            AND bucket > NOW() - $2::interval
            ORDER BY bucket DESC
        `;
        
        const result = await this.query(query, [vestId, timeRange]);
        return result.rows;
    }

    // Insérer une position GPS
    async insertGpsPosition(vestId, lat, lng, altitude = null, accuracy = null) {
        const query = `
            INSERT INTO gps_positions 
            (vest_id, latitude, longitude, altitude, accuracy)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await this.query(query, [vestId, lat, lng, altitude, accuracy]);
        return result.rows[0];
    }

    // Récupérer la dernière position d'une unité
    async getLatestPosition(vestId) {
        const query = `
            SELECT * FROM gps_positions
            WHERE vest_id = $1
           ORDER BY timestamp DESC
            LIMIT 1
        `;
        
        const result = await this.query(query, [vestId]);
        return result.rows[0];
    }

    // Insérer une alerte
    async insertAlert(vestId, alertType, severity, message) {
        const query = `
            INSERT INTO alerts 
            (vest_id, alert_type, severity, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await this.query(query, [vestId, alertType, severity, message]);
        return result.rows[0];
    }

    // Récupérer les alertes non acquittées
    async getPendingAlerts() {
        const query = `
            SELECT * FROM alerts
            WHERE acknowledged = false
            ORDER BY severity, time DESC
        `;
        
        const result = await this.query(query);
        return result.rows;
    }

    // =====================================================
    // NETTOYAGE
    // =====================================================

    /**
     * Ferme proprement la connexion
     */
    async close() {
        await this.pool.end();
        console.log('👋 Connexion PostgreSQL fermée');
    }
}

// Exporter une instance unique (singleton)
// Comme ça, on réutilise la même connexion partout
const postgresManager = new PostgresManager();
module.exports = postgresManager;