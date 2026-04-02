// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        // Si pas de token, on laisse passer (optionnel en DEV)
        if (!authHeader) {
            console.log('⚠️ Pas de token, mais passage autorisé (DEV)');
            req.userId = 'anonymous';
            return next();
        }
        
        // Extraire le token
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        
        // Vérifier le token (utiliser ta clé secrète)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
        req.userId = decoded.id || decoded.user_id;
        next();
        
    } catch (error) {
        console.log('⚠️ Erreur auth:', error.message, '(passage en mode DEV)');
        req.userId = 'dev-user'; // Permettre l'accès en DEV
        next();
    }
};

module.exports = authMiddleware;