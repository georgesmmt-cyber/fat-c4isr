// =====================================================
// server/utils/timescale-optimize.js
// =====================================================
const postgres = require('../../src/main/database/postgres');

async function optimizeTimescaleDB() {
    console.log('\n🔧 OPTIMISATION TIMESCALEDB');
    console.log('=================================');
    
    try {
        // 1. Vérifier l'état actuel
        console.log('📊 État actuel des hypertables:');
        const hypertables = await postgres.query(`
            SELECT * FROM timescaledb_information.hypertables
        `);
        hypertables.rows.forEach(ht => {
            console.log(`   - ${ht.hypertable_name}: ${ht.num_chunks} chunks`);
        });

        // 2. Activer la compression
        console.log('\n🔒 Activation de la compression...');
        
        await postgres.query(`
            ALTER TABLE sensor_readings SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'vest_id, sensor_type',
                timescaledb.compress_orderby = 'time DESC'
            )
        `);
        console.log('   ✅ sensor_readings');

        await postgres.query(`
            ALTER TABLE gps_positions SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'vest_id',
                timescaledb.compress_orderby = 'time DESC'
            )
        `);
        console.log('   ✅ gps_positions');

        await postgres.query(`
            ALTER TABLE alerts SET (
                timescaledb.compress,
                timescaledb.compress_orderby = 'time DESC'
            )
        `);
        console.log('   ✅ alerts');

        // 3. Politiques de compression
        console.log('\n⏰ Ajout des politiques...');
        
        await postgres.query(`
            SELECT add_compression_policy('sensor_readings', INTERVAL '1 day')
        `).catch(() => console.log('   ⚠️  Politique déjà existante'));
        
        await postgres.query(`
            SELECT add_compression_policy('gps_positions', INTERVAL '1 day')
        `).catch(() => console.log('   ⚠️  Politique déjà existante'));

        // 4. Créer des index
        console.log('\n📇 Création des index...');
        
        await postgres.query(`
            CREATE INDEX IF NOT EXISTS idx_sensor_vest_time 
            ON sensor_readings(vest_id, time DESC)
        `);
        
        await postgres.query(`
            CREATE INDEX IF NOT EXISTS idx_sensor_type_time 
            ON sensor_readings(sensor_type, time DESC)
        `);
        
        console.log('   ✅ Index créés');

        console.log('\n✅ OPTIMISATION TERMINÉE');
        return true;

    } catch (error) {
        console.error('❌ Erreur optimisation:', error.message);
        return false;
    }
}

module.exports = { optimizeTimescaleDB };