-- =====================================================
-- COMPETIKA — Esquema de base de datos
-- =====================================================
 
CREATE DATABASE IF NOT EXISTS competika_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 
USE competika_db;
 
-- ── Torneos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150)   NOT NULL,
    sport            VARCHAR(100)   DEFAULT NULL,
    format_type_id   VARCHAR(50)    DEFAULT NULL,   -- ej: 'eliminacion'
    format_sub_id    VARCHAR(50)    DEFAULT NULL,   -- ej: 'eliminacion-simple'
    format_label     VARCHAR(150)   DEFAULT NULL,   -- ej: 'Eliminación simple'
    max_teams        INT UNSIGNED   NOT NULL DEFAULT 8,
    start_date       DATE           DEFAULT NULL,
    venue            VARCHAR(150)   DEFAULT NULL,
    status           ENUM('pending','active','finished') NOT NULL DEFAULT 'pending',
 
    entry_fee        DECIMAL(10,2)  DEFAULT 0,
    currency         VARCHAR(10)    DEFAULT NULL,
    field_cost       DECIMAL(10,2)  DEFAULT 0,
    referee_cost     DECIMAL(10,2)  DEFAULT 0,
 
    referee_name     VARCHAR(150)   DEFAULT NULL,
    referee_phone    VARCHAR(50)    DEFAULT NULL,
    referee_email    VARCHAR(150)   DEFAULT NULL,
 
    prizes_text      TEXT           DEFAULT NULL,
 
    organizer_name   VARCHAR(150)   DEFAULT NULL,
    organizer_phone  VARCHAR(50)    DEFAULT NULL,
    organizer_email  VARCHAR(150)   DEFAULT NULL,
 
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
 
-- ── Premios (1°, 2°, 3° lugar) ──────────────────────────
CREATE TABLE IF NOT EXISTS tournament_prizes (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id  INT UNSIGNED NOT NULL,
    place          TINYINT UNSIGNED NOT NULL,
    title          VARCHAR(150) DEFAULT NULL,
    detail         VARCHAR(150) DEFAULT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB;
 
-- ── Equipos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id  INT UNSIGNED NOT NULL,
    name           VARCHAR(150) NOT NULL,
    players        INT UNSIGNED DEFAULT 0,
    group_name     VARCHAR(10)  DEFAULT NULL,
    wins           INT UNSIGNED DEFAULT 0,
    losses         INT UNSIGNED DEFAULT 0,
    status         ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    emoji          VARCHAR(10)  DEFAULT '⚽',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB;
 
-- ── Partidos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id  INT UNSIGNED NOT NULL,
    home_team_id   INT UNSIGNED DEFAULT NULL,
    away_team_id   INT UNSIGNED DEFAULT NULL,
    home_score     INT DEFAULT NULL,
    away_score     INT DEFAULT NULL,
    match_date     DATE DEFAULT NULL,
    match_time     TIME DEFAULT NULL,
    venue          VARCHAR(150) DEFAULT NULL,
    phase          VARCHAR(100) DEFAULT 'Fase de Grupos',
    played         TINYINT(1) NOT NULL DEFAULT 0,
    referee        VARCHAR(150) DEFAULT NULL,
    ref_phone      VARCHAR(50)  DEFAULT NULL,
    ref_cost       DECIMAL(10,2) DEFAULT 0,
    venue_cost     DECIMAL(10,2) DEFAULT 0,
    notes          TEXT DEFAULT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (home_team_id)  REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (away_team_id)  REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB;
 
-- ── Permisos del usuario de la app ──────────────────────
-- (ajustá el host/usuario/clave según tu entorno real;
--  estos deben coincidir con config/Database.php)
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.* TO 'competika_app'@'localhost';
FLUSH PRIVILEGES;