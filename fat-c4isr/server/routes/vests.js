// =====================================================
// ROUTES POUR LES GILETS
// =====================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { broadcast } = require('../websocket');

// GET /api/vests - Tous les gilets
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vests ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/vests/:id - Un gilet spécifique
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vests WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gilet non trouvé' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/vests/:id/sensors - Ajouter des données capteurs
router.post('/:id/sensors', async (req, res) => {
    try {
        const result = await pool.query(
            'INSERT INTO sensor_data (vest_id, data) VALUES ($1, $2) RETURNING id',
            [req.params.id, req.body]
        );
        broadcast('sensor_data', { vest_id: req.params.id, data: req.body });
        res.json({ id: result.rows[0].id, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/vests/:id/sensors - Dernières données capteurs
router.get('/:id/sensors', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await pool.query(
            'SELECT * FROM sensor_data WHERE vest_id = $1 ORDER BY timestamp DESC LIMIT $2',
            [req.params.id, limit]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/vests/:id/position - Ajouter une position
router.post('/:id/position', async (req, res) => {
    try {
        const { lng, lat, altitude, accuracy } = req.body;
        const pointText = `POINT(${lng} ${lat})`;
        
        const result = await pool.query(
            `INSERT INTO positions (vest_id, position, altitude, accuracy)
             VALUES ($1, ST_GeogFromText($2), $3, $4) RETURNING id`,
            [req.params.id, pointText, altitude, accuracy]
        );
        
        broadcast('position_update', { vest_id: req.params.id, lng, lat, altitude });
        res.json({ id: result.rows[0].id, success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;