// =====================================================
// patch.js - À EXÉCUTER AVANT TOUT
// =====================================================
const pathToRegexp = require('path-to-regexp/dist/index.js');

// Sauvegarder la fonction originale
const originalName = pathToRegexp.name;

// Remplacer par une version qui ignore /api/*
pathToRegexp.name = function(str) {
    if (str && str.includes && str.includes('/api/*')) {
        console.log('🛡️ Bloqué: /api/* → /api/(.*)');
        return { name: 'wildcard', prefix: '/', suffix: '' };
    }
    return originalName.call(this, str);
};

console.log('🔧 Patch global appliqué à path-to-regexp');