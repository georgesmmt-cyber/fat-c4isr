// =====================================================
// server/utils/sql-analytics.js
// =====================================================
const postgres = require('../../src/main/database/postgres');

async function runAnalytics() {
    console.log('\n📊 ANALYSE AVANCÉE DES DONNÉES');
    console.log('=================================');
    
    try {
        // 1. Statistiques globales
        console.log('\n1️⃣ STATISTIQUES GLOBALES:');
        const global = await postgres.query(`
            SELECT 
                COUNT(DISTINCT vest_id) as total_vests,
                COUNT(*) as total_readings,
                MIN(time) as first_reading,
                MAX(time) as last_reading,
                ROUND(EXTRACT(EPOCH FROM (MAX(time) - MIN(time)))/3600) as hours_of_data
            FROM sensor_readings
        `);
        console.table(global.rows);

        // 2. Top 10 des anomalies
        console.log('\n2️⃣ TOP 10 DES ANOMALIES:');
        const anomalies = await postgres.query(`
            WITH stats AS (
                SELECT 
                    sensor_type,
                    AVG(value) as mean,
                    STDDEV(value) as std
                FROM sensor_readings
                WHERE time > NOW() - INTERVAL '7 days'
                GROUP BY sensor_type
            )
            SELECT 
                sr.time,
                sr.vest_id,
                sr.sensor_type,
                ROUND(sr.value::numeric, 2) as value,
                ROUND(stats.mean::numeric, 2) as mean,
                ROUND(((sr.value - stats.mean) / NULLIF(stats.std, 0))::numeric, 2) as z_score
            FROM sensor_readings sr
            JOIN stats ON sr.sensor_type = stats.sensor_type
            WHERE ABS((sr.value - stats.mean) / NULLIF(stats.std, 0)) > 3
              AND sr.time > NOW() - INTERVAL '7 days'
            ORDER BY ABS((sr.value - stats.mean) / NULLIF(stats.std, 0)) DESC
            LIMIT 10
        `);
        console.table(anomalies.rows);

        // 3. Corrélations entre capteurs
        console.log('\n3️⃣ CORRÉLATIONS:');
        const correlations = await postgres.query(`
            SELECT 
                v.id,
                ROUND(corr(t.value, h.value)::numeric, 3) as temp_heart_corr,
                COUNT(*) as samples
            FROM vests v
            LEFT JOIN sensor_readings t ON v.id = t.vest_id AND t.sensor_type = 'temperature'
            LEFT JOIN sensor_readings h ON v.id = h.vest_id AND h.sensor_type = 'heart_rate' 
                AND t.time = h.time
            WHERE t.time > NOW() - INTERVAL '7 days'
            GROUP BY v.id
            HAVING COUNT(*) > 10
        `);
        console.table(correlations.rows);

        // 4. Analyse par heure
        console.log('\n4️⃣ ANALYSE PAR HEURE:');
        const hourly = await postgres.query(`
            SELECT 
                EXTRACT(hour FROM time) as hour_of_day,
                sensor_type,
                ROUND(AVG(value)::numeric, 2) as avg_value,
                ROUND(MIN(value)::numeric, 2) as min_value,
                ROUND(MAX(value)::numeric, 2) as max_value,
                COUNT(*) as samples
            FROM sensor_readings
            WHERE time > NOW() - INTERVAL '7 days'
            GROUP BY hour_of_day, sensor_type
            ORDER BY hour_of_day, sensor_type
        `);
        console.log('Moyennes par heure:');
        hourly.rows.slice(0, 10).forEach(r => 
            console.log(`   ${r.hour_of_day}h: ${r.sensor_type} = ${r.avg_value} (${r.samples} échantillons)`)
        );

        // 5. Alertes non résolues
        console.log('\n5️⃣ ALERTES NON RÉSOLUES:');
        const alerts = await postgres.query(`
            SELECT 
                severity,
                COUNT(*) as count,
                ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - time))/3600)::numeric, 1) as avg_age_hours,
                MAX(time) as latest_alert
            FROM alerts
            WHERE NOT acknowledged
            GROUP BY severity
            ORDER BY 
                CASE severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'warning' THEN 2 
                    ELSE 3 
                END
        `);
        console.table(alerts.rows);

        // 6. Informations sur les hypertables
        console.log('\n6️⃣ INFORMATIONS SUR LES HYPERTABLES:');
        const hypertables = await postgres.query(`
            SELECT 
                hypertable_name,
                num_chunks,
                compression_enabled
            FROM timescaledb_information.hypertables
        `);
        console.table(hypertables.rows);

        // 7. Statistiques des chunks
        console.log('\n7️⃣ STATISTIQUES DES CHUNKS:');
        const chunks = await postgres.query(`
            SELECT 
                hypertable_name,
                COUNT(*) as chunk_count,
                MIN(range_start) as oldest_chunk,
                MAX(range_end) as newest_chunk
            FROM timescaledb_information.chunks
            GROUP BY hypertable_name
        `);
        console.table(chunks.rows);

        // 8. Répartition des lectures par unité
        console.log('\n8️⃣ ACTIVITÉ PAR UNITÉ (7 derniers jours):');
        const unitActivity = await postgres.query(`
            SELECT 
                vest_id,
                COUNT(*) as readings,
                COUNT(DISTINCT sensor_type) as sensor_types,
                MIN(time) as first_reading,
                MAX(time) as last_reading
            FROM sensor_readings
            WHERE time > NOW() - INTERVAL '7 days'
            GROUP BY vest_id
            ORDER BY readings DESC
        `);
        console.table(unitActivity.rows);

        // Retourner les résultats
        return {
            success: true,
            stats: global.rows[0],
            anomalies: anomalies.rows.length,
            correlations: correlations.rows,
            alerts: alerts.rows,
            hypertables: hypertables.rows.length,
            unitActivity: unitActivity.rows.length
        };

    } catch (error) {
        console.error('❌ Erreur analyse:', error.message);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

module.exports = { runAnalytics };