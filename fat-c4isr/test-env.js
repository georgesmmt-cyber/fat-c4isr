// test-env.js
require('dotenv').config();
console.log('=== VARIABLES D\'ENVIRONNEMENT ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ définie' : '❌ manquante');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ définie' : '❌ manquante');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);