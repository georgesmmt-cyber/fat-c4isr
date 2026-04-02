-- =====================================================
-- FAT-C4ISR - INITIALISATION DE LA BASE DE DONNÉES
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLE UTILISATEURS
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'SUPERVISOR', 'OPERATOR', 'VISITOR')),
    full_name VARCHAR(100),
    avatar_url TEXT,
    email VARCHAR(100),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- 2. TABLE GILETS / UNITÉS
-- =====================================================
CREATE TABLE vests (
    id VARCHAR(50) PRIMARY KEY,
    soldier_name VARCHAR(100) NOT NULL,
    soldier_rank VARCHAR(50),
    status VARCHAR(20) DEFAULT 'offline',
    battery_level INTEGER,
    firmware_version VARCHAR(20),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLE DONNÉES CAPTEURS
-- =====================================================
CREATE TABLE sensor_data (
    id BIGSERIAL PRIMARY KEY,
    vest_id VARCHAR(50) REFERENCES vests(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB NOT NULL
);

-- =====================================================
-- 4. TABLE POSITIONS GPS (avec PostGIS)
-- =====================================================
CREATE TABLE positions (
    id BIGSERIAL PRIMARY KEY,
    vest_id VARCHAR(50) REFERENCES vests(id),
    position GEOGRAPHY(POINT, 4326) NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index géospatial pour recherches rapides
CREATE INDEX idx_positions_gist ON positions USING GIST (position);
CREATE INDEX idx_positions_vest_time ON positions(vest_id, timestamp DESC);

-- =====================================================
-- 5. TABLE MISSIONS
-- =====================================================
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    danger_level VARCHAR(20) CHECK (danger_level IN ('low', 'medium', 'high', 'critical')),
    zone GEOMETRY(POLYGON, 4326),
    status VARCHAR(20) DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLE ALERTES
-- =====================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vest_id VARCHAR(50) REFERENCES vests(id),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'danger', 'warning', 'info')),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false
);


-- =====================================================
-- 7. DONNÉES DE TEST
-- =====================================================

-- Utilisateurs de test (mots de passe: admin123, super123, operateur123)
INSERT INTO users (username, password_hash, role, full_name, avatar_url) VALUES
('GeorgesD', '$2a$12$dummyhashpourtest1', 'ADMIN', 'Georges Donnavan', '/assets/avatars/georges.png'),
('MarieC', '$2a$12$dummyhashpourtest2', 'SUPERVISOR', 'Marie Claire', '/assets/avatars/marie.png'),
('JeanP', '$2a$12$dummyhashpourtest3', 'OPERATOR', 'Jean Paul', '/assets/avatars/jean.png');

-- Gilets de test
INSERT INTO vests (id, soldier_name, soldier_rank, status, battery_level, firmware_version) VALUES
('VEST-001', 'Soldat Alpha', 'SGT', 'online', 85, '1.2.0'),
('VEST-002', 'Soldat Bravo', 'CPL', 'online', 72, '1.2.0'),
('VEST-003', 'Soldat Charlie', 'PVT', 'offline', 45, '1.1.0');

-- Positions de test (Kinshasa, RDC)
INSERT INTO positions (vest_id, position, altitude, accuracy) VALUES
('VEST-001', ST_GeogFromText('POINT(15.3 -4.3)'), 450, 2.5),
('VEST-002', ST_GeogFromText('POINT(15.32 -4.32)'), 452, 3.0);