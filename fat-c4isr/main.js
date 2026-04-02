// =====================================================
// main.js - FAT-C4ISR BACKEND UNIQUEMENT
// Version 2.2.0
// =====================================================

console.log('✅ FAT-C4ISR Backend chargé');

// =====================================================
// IMPORT DES MODULES
// =====================================================
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// =====================================================
// CONFIGURATION
// =====================================================
dotenv.config();
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// SERVIR LES FICHIERS STATIQUES
// =====================================================
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// ROUTES API
// =====================================================

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'FAT-C4ISR API fonctionne',
        timestamp: new Date().toISOString()
    });
});

// Route de statut
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        server: 'FAT-C4ISR Backend',
        version: '2.2.0',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// ROUTES POUR LES DIFFÉRENTS MODULES
// =====================================================

// Gestion des erreurs 404 pour les routes API non trouvées
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API route not found',
        path: req.originalUrl
    });
});

// =====================================================
// SERVIR L'APPLICATION FRONTEND
// =====================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================================================
// GESTION DES ERREURS SERVEUR
// =====================================================
process.on('uncaughtException', (err) => {
    console.error('❌ Erreur non catchée:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesse rejetée non gérée:', reason);
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================
server.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 FAT-C4ISR BACKEND');
    console.log('=================================');
    console.log(`📡 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Frontend servi depuis: ${path.join(__dirname, 'public')}`);
    console.log(`🔌 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log('=================================\n');
});

// =====================================================
// EXPORT POUR LES TESTS
// =====================================================
module.exports = {
    app,
    server,
    PORT
};