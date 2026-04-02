// Remplacer "time" par "timestamp"
router.get('/readings/:vestId', async (req, res) => {
    try {
        const { vestId } = req.params;
        const { limit = 100 } = req.query;
        
        // Remplacer "time" par "timestamp"
        const result = await pool.query(`
            SELECT * FROM sensor_readings 
            WHERE vest_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2
        `, [vestId, limit]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erreur sensor readings:', error);
        res.status(500).json({ error: error.message });
    }
});