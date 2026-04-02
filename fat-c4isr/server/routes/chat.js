const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET tous les messages d'un canal
router.get('/messages/:channel', authenticateToken, async (req, res) => {
    try {
        const { channel } = req.params;
        const result = await pool.query(
            `SELECT * FROM chat_messages 
             WHERE channel = $1 
             ORDER BY created_at DESC 
             LIMIT 100`,
            [channel]
        );
        res.json(result.rows.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST envoyer un message
router.post('/messages', authenticateToken, async (req, res) => {
    try {
        const { sender_id, sender_name, message, channel, priority, recipients } = req.body;
        
        const result = await pool.query(
            `INSERT INTO chat_messages 
             (sender_id, sender_name, message, channel, priority, recipients) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [sender_id, sender_name, message, channel, priority || 'normal', recipients || ['all']]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;