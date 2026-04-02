// =====================================================
// ROUTES POUR LES ALERTES
// =====================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { broadcast } = require('../websocket');

// Remplacer "time" par "timestamp"
router.get('/pending', async (req, res) => {
    try {
       const result = await pool.query(`
            SELECT * FROM alerts 
            WHERE acknowledged = false 
            ORDER BY timestamp DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erreur alerts:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/alerts - Créer une alerte
router.post('/', async (req, res) => {
    try {
        const { vest_id, type, severity, message } = req.body;
        
        const result = await pool.query(
            `INSERT INTO alerts (vest_id, type, severity, message)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [vest_id, type, severity, message]
        );
        
        // Récupérer l'alerte complète
        const alertResult = await pool.query(`
            SELECT a.*, v.soldier_name 
            FROM alerts a
            LEFT JOIN vests v ON a.vest_id = v.id
            WHERE a.id = $1
        `, [result.rows[0].id]);
        
        broadcast('new_alert', alertResult.rows[0]);
        res.json({ id: result.rows[0].id, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/alerts/:id/acknowledge - Acquitter une alerte
router.put('/:id/acknowledge', async (req, res) => {
    try {
        await pool.query('UPDATE alerts SET acknowledged = true WHERE id = $1', [req.params.id]);
        broadcast('alert_acknowledged', { id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;