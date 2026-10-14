-- =====================================================
-- COMPETIKA — Migración de bases creadas con versiones anteriores
--
-- Si creaste la base con el schema.sql actual NO hace falta: ya tiene todo.
-- Si tu base es anterior (o le corriste un ajustes.sql viejo), ejecutá este
-- archivo una vez y después usuarios.sql. Deja la base igual que schema.sql
-- sin perder datos. Se puede correr más de una vez.
-- Requiere MariaDB 10.2+ (XAMPP/LAMPP y la imagen de Docker lo cumplen).
-- =====================================================
USE competika_db;
-- Los datos de este archivo (tildes, €) están en UTF-8: que el cliente los lea así
SET NAMES utf8mb4;

-- 1) Columnas agregadas al esquema original
ALTER TABLE configuracion_torneo MODIFY admin_id_fk INT NULL;

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(50)  NULL UNIQUE,
    ADD COLUMN IF NOT EXISTS biografia      VARCHAR(200) NULL,
    ADD COLUMN IF NOT EXISTS foto_perfil    VARCHAR(100) NULL;

ALTER TABLE enfrentamiento_equipo
    ADD COLUMN IF NOT EXISTS es_local TINYINT(1) NOT NULL DEFAULT 0;

-- 2) Catálogos y entidades nuevas
ALTER TABLE tipo_torneo
    ADD COLUMN IF NOT EXISTS clave     VARCHAR(50)  NULL UNIQUE,
    ADD COLUMN IF NOT EXISTS etiqueta  VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(30)  NULL;

INSERT INTO tipo_torneo (nombre, clave, etiqueta, categoria) VALUES
    ('liga_t_vs_t',        'liga-simple',        'Liga todos vs todos',    'liga'),
    ('liga_doble_vuelta',  'liga-doble',         'Liga doble vuelta',      'liga'),
    ('eliminacion_simple', 'eliminacion-simple', 'Eliminación simple',     'eliminacion'),
    ('doble_eliminacion',  'eliminacion-doble',  'Doble eliminación',      'eliminacion'),
    ('sistema_puntos',     'sistema-puntos',     'Sistema de puntos',      'puntos'),
    ('vidas',              'vidas',              'Vidas / continuaciones', 'puntos'),
    ('sistema_suizo',      'suizo',              'Sistema suizo',          'mixto'),
    ('grupos_eliminacion', 'grupos',             'Grupos + eliminación',   'mixto'),
    ('torneo_relampago',   'blitz',              'Torneo relámpago',       'especial'),
    ('gran_premio',        'gran-premio',        'Gran premio',            'especial'),
    ('copa_desafio',       'copa-desafio',       'Copa desafío',           'especial')
ON DUPLICATE KEY UPDATE clave = VALUES(clave), etiqueta = VALUES(etiqueta), categoria = VALUES(categoria);

CREATE TABLE IF NOT EXISTS moneda (
    codigo CHAR(3) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    simbolo VARCHAR(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO moneda (codigo, nombre, simbolo) VALUES
    ('UYU', 'Peso uruguayo', '$'), ('USD', 'Dólar', 'US$'), ('ARS', 'Peso argentino', 'AR$'),
    ('BRL', 'Real', 'R$'), ('EUR', 'Euro', '€')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), simbolo = VALUES(simbolo);

CREATE TABLE IF NOT EXISTS persona (
    persona_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    INDEX idx_persona_datos (nombre, telefono, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificacion (
    notificacion_id  INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk    VARCHAR(20)  NOT NULL,
    tipo             VARCHAR(30)  NOT NULL,
    mensaje          VARCHAR(255) NOT NULL,
    torneo_id_fk     INT          NULL,
    ref_id           INT          NULL,
    leida            BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notificacion_usuario (usuario_ci_fk, notificacion_id),
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE,
    FOREIGN KEY (torneo_id_fk)  REFERENCES torneo(torneo_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS honor (
    honor_id              INT AUTO_INCREMENT PRIMARY KEY,
    enfrentamiento_id_fk  INT          NOT NULL,
    de_usuario_ci_fk      VARCHAR(20)  NOT NULL,
    a_equipo_id_fk        INT          NOT NULL,
    fecha                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_honor (enfrentamiento_id_fk, de_usuario_ci_fk),
    INDEX idx_honor_equipo (a_equipo_id_fk),
    FOREIGN KEY (enfrentamiento_id_fk) REFERENCES enfrentamiento(enfrentamiento_id) ON DELETE CASCADE,
    FOREIGN KEY (de_usuario_ci_fk)     REFERENCES usuario(ci) ON DELETE CASCADE,
    FOREIGN KEY (a_equipo_id_fk)       REFERENCES equipo(equipo_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Claves foráneas nuevas
ALTER TABLE torneo
    ADD COLUMN IF NOT EXISTS tipo_torneo_id_fk INT NULL AFTER deporte,
    ADD CONSTRAINT fk_torneo_tipo FOREIGN KEY IF NOT EXISTS (tipo_torneo_id_fk) REFERENCES tipo_torneo(tipo_torneo_id);

ALTER TABLE configuracion_torneo
    ADD COLUMN IF NOT EXISTS moneda_codigo_fk    CHAR(3) NULL AFTER precio_juez,
    ADD COLUMN IF NOT EXISTS arbitro_persona_fk  INT NULL AFTER moneda_codigo_fk,
    ADD COLUMN IF NOT EXISTS contacto_persona_fk INT NULL AFTER arbitro_persona_fk,
    ADD CONSTRAINT fk_config_moneda   FOREIGN KEY IF NOT EXISTS (moneda_codigo_fk)    REFERENCES moneda(codigo),
    ADD CONSTRAINT fk_config_arbitro  FOREIGN KEY IF NOT EXISTS (arbitro_persona_fk)  REFERENCES persona(persona_id),
    ADD CONSTRAINT fk_config_contacto FOREIGN KEY IF NOT EXISTS (contacto_persona_fk) REFERENCES persona(persona_id);

-- 4) Pasar los datos de las columnas viejas a las entidades nuevas y
--    borrar esas columnas (eran las que rompían la 3FN).
--    Sin procedimientos almacenados (funciona aunque las tablas de sistema de
--    XAMPP estén desactualizadas): cada paso se arma como texto y solo se
--    ejecuta si la columna vieja existe; si no, se ejecuta "DO 0" (no hace nada).

-- 4a) torneo.tipo_torneo (texto) -> torneo.tipo_torneo_id_fk
SET @hay = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'torneo' AND COLUMN_NAME = 'tipo_torneo');
SET @sql = IF(@hay > 0, 'UPDATE torneo t JOIN tipo_torneo tt ON tt.nombre = t.tipo_torneo
                         SET t.tipo_torneo_id_fk = tt.tipo_torneo_id WHERE t.tipo_torneo_id_fk IS NULL', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
ALTER TABLE torneo DROP COLUMN IF EXISTS tipo_torneo;

-- 4b) configuracion_torneo.moneda (texto) -> moneda_codigo_fk
SET @hay = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_torneo' AND COLUMN_NAME = 'moneda');
SET @sql = IF(@hay > 0, 'UPDATE configuracion_torneo c JOIN moneda m ON m.codigo = c.moneda
                         SET c.moneda_codigo_fk = m.codigo WHERE c.moneda_codigo_fk IS NULL', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
ALTER TABLE configuracion_torneo DROP COLUMN IF EXISTS moneda;

-- 4c) arbitro_nombre/telefono/email -> persona
--     (_cfg es una columna auxiliar para enganchar cada persona con su configuración)
ALTER TABLE persona ADD COLUMN IF NOT EXISTS _cfg INT NULL;
SET @hay = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_torneo' AND COLUMN_NAME = 'arbitro_nombre');
SET @sql = IF(@hay > 0, 'INSERT INTO persona (nombre, telefono, email, _cfg)
                         SELECT arbitro_nombre, arbitro_telefono, arbitro_email, configuracion_id
                         FROM configuracion_torneo WHERE arbitro_nombre IS NOT NULL AND arbitro_persona_fk IS NULL', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
UPDATE configuracion_torneo c JOIN persona p ON p._cfg = c.configuracion_id SET c.arbitro_persona_fk = p.persona_id;
UPDATE persona SET _cfg = NULL;
ALTER TABLE configuracion_torneo
    DROP COLUMN IF EXISTS arbitro_nombre, DROP COLUMN IF EXISTS arbitro_telefono, DROP COLUMN IF EXISTS arbitro_email;

-- 4d) contacto_nombre/telefono/email -> persona, solo si es distinto de la
--     cuenta del organizador (si es igual queda NULL = datos de la cuenta)
SET @hay = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_torneo' AND COLUMN_NAME = 'contacto_nombre');
SET @sql = IF(@hay > 0, 'INSERT INTO persona (nombre, telefono, email, _cfg)
                         SELECT c.contacto_nombre, c.contacto_telefono, c.contacto_email, c.configuracion_id
                         FROM configuracion_torneo c
                         JOIN torneo t ON t.torneo_id = c.torneo_id_fk
                         JOIN organizador o ON o.organizador_id = t.organizador_id_fk
                         JOIN usuario u ON u.ci = o.usuario_ci_fk
                         WHERE c.contacto_nombre IS NOT NULL AND c.contacto_persona_fk IS NULL
                           AND NOT (c.contacto_nombre <=> CONCAT(u.nombre, '' '', u.apellido)
                                AND c.contacto_telefono <=> u.telefono AND c.contacto_email <=> u.email)', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
UPDATE configuracion_torneo c JOIN persona p ON p._cfg = c.configuracion_id SET c.contacto_persona_fk = p.persona_id;
ALTER TABLE persona DROP COLUMN IF EXISTS _cfg;
ALTER TABLE configuracion_torneo
    DROP COLUMN IF EXISTS contacto_nombre, DROP COLUMN IF EXISTS contacto_telefono, DROP COLUMN IF EXISTS contacto_email;
