// =====================================================
// Configuration Swagger pour FAT-C4ISR
// =====================================================
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FAT-C4ISR API',
      version: '2.3.0',
      description: `
# API du système de commandement militaire

## Authentification
La plupart des routes nécessitent un token JWT. 
Pour vous authentifier :
1. Utilisez la route \`/api/auth/login\`
2. Récupérez le token
3. Cliquez sur "Authorize" en haut et entrez votre token

## Rôles
- **ADMIN** : Accès total
- **SUPERVISOR** : Gestion des alertes
- **OPERATOR** : Visualisation des données
- **VISITOR** : Accès limité
      `,
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Serveur de développement',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
     schemas: {
  Vest: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'VEST-001' },
      soldier_name: { type: 'string', example: 'ALPHA' },
      soldier_rank: { type: 'string', example: 'Sergent' },
      status: { type: 'string', enum: ['online', 'offline', 'warning'], example: 'online' },
      battery_level: { type: 'integer', example: 85 },
      last_seen: { type: 'string', format: 'date-time' }
    },
    example: {
      id: 'VEST-001',
      soldier_name: 'ALPHA',
      soldier_rank: 'Sergent',
      status: 'online',
      battery_level: 85,
      last_seen: '2026-02-26T15:30:00Z'
    }
  },
  Position: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'VEST-001' },
      latitude: { type: 'number', example: -4.3 },
      longitude: { type: 'number', example: 15.3 },
      altitude: { type: 'number', example: 450 },
      timestamp: { type: 'string', format: 'date-time' }
    },
    example: {
      id: 'VEST-001',
      latitude: -4.3,
      longitude: 15.3,
      altitude: 450,
      timestamp: '2026-02-26T15:30:00Z'
    }
  },
  Alert: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      vest_id: { type: 'string', example: 'VEST-001' },
      type: { type: 'string', example: 'temperature' },
      severity: { type: 'string', enum: ['critical', 'danger', 'warning', 'info'] },
      message: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
      acknowledged: { type: 'boolean' }
    },
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      vest_id: 'VEST-001',
      type: 'temperature',
      severity: 'warning',
      message: 'Température élevée: 38.5°C',
      timestamp: '2026-02-26T15:30:00Z',
      acknowledged: false
    }
  },
  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'GeorgesD' },
      password: { type: 'string', format: 'password', example: 'admin12345' },
      twoFactorCode: { type: 'string', example: '123456' }
    },
    example: {
      username: 'GeorgesD',
      password: 'admin12345',
      twoFactorCode: '123456'
    }
  },
  LoginResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      user: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          role: { type: 'string' },
          full_name: { type: 'string' }
        }
      },
      token: { type: 'string' }
    },
    example: {
      success: true,
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'GeorgesD',
        role: 'ADMIN',
        full_name: 'Georges Donnavan'
      },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
}
    },
    security: [{
      bearerAuth: []
    }],
    tags: [
      { name: 'Authentification', description: 'Gestion des utilisateurs' },
      { name: 'Unités', description: 'Gestion des vestes' },
      { name: 'Positions', description: 'Suivi GPS' },
      { name: 'Capteurs', description: 'Données des capteurs' },
      { name: 'Alertes', description: 'Gestion des alertes' },
      { name: 'Simulation', description: 'Simulation de données' },
      { name: 'Dashboard', description: 'Tableau de bord' }
    ]
  },
  apis: [
    './server/dev-server.js',
    './server/routes/*.js'
  ],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
description: `
# 🚀 FAT-C4ISR - Système de Commandement Militaire

## 📋 Présentation
API complète pour le système de commandement FAT-C4ISR, permettant :
- Gestion des unités et vestes
- Suivi GPS en temps réel
- Monitoring des capteurs biométriques
- Gestion des alertes et missions
- Communication hybride

## 🔐 Authentification
Pour utiliser l'API :
1. **POST** \`/api/auth/login\` avec vos identifiants
2. Copiez le token reçu
3. Cliquez sur **Authorize** (🔓) en haut à droite
4. Entrez : \`Bearer <votre_token>\`

## 👑 Rôles et Permissions
| Rôle | Description |
|------|-------------|
| **ADMIN** | Accès total au système |
| **SUPERVISOR** | Gestion des alertes et missions |
| **OPERATOR** | Visualisation des données |
| **VISITOR** | Consultation uniquement |

## 🛠️ Tests
Vous pouvez tester toutes les routes directement depuis cette interface !
`

