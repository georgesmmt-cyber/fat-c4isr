// src/auth/AuthManager.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const postgres = require('../main/database/postgres');

class AuthManager {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
        this.tokenExpiry = '8h'; // 8 heures
        this.refreshTokenExpiry = '7d'; // 7 jours
    }

    /**
     * Hash un mot de passe avec bcrypt
     */
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(12);
        return await bcrypt.hash(password, salt);
    }
    /**
 * Vérifie un mot de passe avec bcrypt
 */
async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

    /**
     * Vérifie les identifiants et retourne un token JWT
     */
    async login(username, password, twoFactorCode = null) {
        try {
            // 1. Récupérer l'utilisateur depuis PostgreSQL
            const result = await postgres.query(
                'SELECT * FROM users WHERE username = $1 AND is_active = true',
                [username]
            );
            
            const user = result.rows[0];
            if (!user) {
                await this.logFailedAttempt(username, 'Utilisateur non trouvé');
                return { success: false, message: 'Identifiants incorrects' };
            }

            // 2. Vérifier le mot de passe avec bcrypt
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                await this.logFailedAttempt(username, 'Mot de passe incorrect');
                return { success: false, message: 'Identifiants incorrects' };
            }

            // 3. Vérifier le 2FA (simulé pour l'instant - à implémenter avec Google Authenticator)
            if (twoFactorCode && twoFactorCode !== '123456') { // Simulation
                await this.logFailedAttempt(username, 'Code 2FA invalide');
                return { success: false, message: 'Code 2FA invalide' };
            }

            // 4. Générer les tokens JWT
            const token = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            // 5. Logger la connexion réussie
            await this.logSuccessfulLogin(user.id, username);

            // 6. Retourner les informations
            return {
                success: true,
                token,
                refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    fullName: user.full_name,
                    avatar: user.avatar_url
                }
            };

        } catch (error) {
            console.error('❌ Erreur authentification:', error);
            return { success: false, message: 'Erreur serveur' };
        }
    }

    /**
     * Génère un token JWT
     */
    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            this.secretKey,
            { expiresIn: this.tokenExpiry }
        );
    }

    /**
     * Génère un refresh token
     */
    generateRefreshToken(user) {
        return jwt.sign(
            { userId: user.id },
            this.secretKey + '-refresh',
            { expiresIn: this.refreshTokenExpiry }
        );
    }

    /**
     * Vérifie un token JWT
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.secretKey);
        } catch (error) {
            return null;
        }
    }

    /**
     * Rafraîchit un token expiré
     */
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.secretKey + '-refresh');
            
            // Récupérer l'utilisateur
            const result = await postgres.query(
                'SELECT * FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );
            
            const user = result.rows[0];
            if (!user) return null;

            // Générer un nouveau token
            return this.generateToken(user);

        } catch (error) {
            return null;
        }
    }

    /**
     * Vérifie si un utilisateur a une permission
     */
    async checkPermission(userId, requiredRole) {
        const result = await postgres.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        const user = result.rows[0];
        if (!user) return false;

        const roles = {
            'ADMIN': 4,
            'SUPERVISOR': 3,
            'OPERATOR': 2,
            'VISITOR': 1
        };

        return roles[user.role] >= roles[requiredRole];
    }

    /**
     * Log une tentative échouée
     */
    async logFailedAttempt(username, reason) {
        await postgres.query(
            `INSERT INTO audit_log (user_id, action, details, ip_address) 
             VALUES (NULL, 'LOGIN_FAILED', $1::jsonb, $2)`,
            [JSON.stringify({ username, reason }), '0.0.0.0'] // IP à récupérer depuis la requête
        );
    }

    /**
     * Log une connexion réussie
     */
    async logSuccessfulLogin(userId, username) {
        await postgres.query(
            `INSERT INTO audit_log (user_id, action, details) 
             VALUES ($1, 'LOGIN_SUCCESS', $2::jsonb)`,
            [userId, JSON.stringify({ username })]
        );
    }

    /**
     * Log une déconnexion
     */
    async logLogout(userId) {
        await postgres.query(
            `INSERT INTO audit_log (user_id, action) 
             VALUES ($1, 'LOGOUT')`,
            [userId]
        );
    }

    /**
     * Crée un nouvel utilisateur (admin seulement)
     */
    async createUser(userData) {
        const hashedPassword = await this.hashPassword(userData.password);
        
        const result = await postgres.query(
            `INSERT INTO users (username, password_hash, role, full_name, avatar_url, email)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, username, role`,
            [
                userData.username,
                hashedPassword,
                userData.role || 'OPERATOR',
                userData.fullName,
                userData.avatarUrl || '/assets/avatars/default.png',
                userData.email
            ]
        );
        
        return result.rows[0];
    }
}

module.exports = new AuthManager();