// =====================================================
// ROUTES POUR LES POSITIONS
// =====================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/// Remplacer la requête qui utilise "position" par:
router.get('/latest', async (req, res) => {
    try {
        // Remplacer "position" par latitude, longitude
        const result = await pool.query(`
            SELECT DISTINCT ON (vest_id) 
                vest_id,
                latitude,
                longitude,
                timestamp
            FROM positions 
            ORDER BY vest_id, timestamp DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erreur positions:', error);
        res.status(500).json({ error: error.message });
    }
});