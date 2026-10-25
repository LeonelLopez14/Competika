-- COMPETIKA — Migración de una base anterior al esquema actual.
USE competika_db;
-- Cliente en UTF-8 (tildes y símbolos).
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

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
ON DUPLICATE KEY UPDATE clave = VALUES(clave), etiqueta = COALESCE(etiqueta, VALUES(etiqueta)), categoria = VALUES(categoria);

CREATE TABLE IF NOT EXISTS moneda (
    codigo CHAR(3) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    simbolo VARCHAR(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO moneda (codigo, nombre, simbolo) VALUES
    ('UYU', 'Peso uruguayo', '$'), ('USD', 'Dólar', 'US$'), ('ARS', 'Peso argentino', 'AR$'),
    ('BRL', 'Real', 'R$'), ('EUR', 'Euro', '€')
ON DUPLICATE KEY UPDATE codigo = codigo;

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

-- 4) Columnas que rompían la 3FN -> entidades.

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

-- 4d) contacto_nombre/telefono/email -> persona
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

-- 5) Tablas de juez, seguimiento de torneos, "Recordarme" y recuperación de contraseña

-- Solicitudes para ser juez.
CREATE TABLE IF NOT EXISTS solicitud_juez (
    solicitud_id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk         VARCHAR(20)  NOT NULL,
    certificado           BOOLEAN      NOT NULL DEFAULT FALSE,   -- mismo dato que juez.certificado
    deportes              VARCHAR(150) NULL,
    experiencia           VARCHAR(500) NULL,
    estado                ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
    fecha                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisada_por_admin_fk INT          NULL,
    fecha_revision        DATETIME     NULL,
    motivo_rechazo        VARCHAR(255) NULL,
    INDEX idx_solicitud_estado (estado),
    FOREIGN KEY (usuario_ci_fk)         REFERENCES usuario(ci) ON DELETE CASCADE,
    FOREIGN KEY (revisada_por_admin_fk) REFERENCES admin(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Torneos que sigue un usuario (rol observador): recibe sus novedades.
CREATE TABLE IF NOT EXISTS seguimiento (
    usuario_ci_fk  VARCHAR(20) NOT NULL,
    torneo_id_fk   INT         NOT NULL,
    fecha          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_ci_fk, torneo_id_fk),
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE,
    FOREIGN KEY (torneo_id_fk)  REFERENCES torneo(torneo_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tokens de "Recordarme" (hash del validador).
CREATE TABLE IF NOT EXISTS sesion_recordada (
    selector        CHAR(24)    PRIMARY KEY,
    validador_hash  CHAR(64)    NOT NULL,
    usuario_ci_fk   VARCHAR(20) NOT NULL,
    expira          DATETIME    NOT NULL,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enlaces de recuperación de contraseña (hash del token).
CREATE TABLE IF NOT EXISTS recuperacion_clave (
    token_hash     CHAR(64)    PRIMARY KEY,
    usuario_ci_fk  VARCHAR(20) NOT NULL,
    expira         DATETIME    NOT NULL,
    usado          BOOLEAN     NOT NULL DEFAULT FALSE,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) Competitivo, equipos, grupos, premios, llaves, contacto y bloqueo de cuentas
ALTER TABLE admin ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tipo_torneo ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE moneda ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE registro_de_actividad MODIFY admin_id_fk INT NULL;
ALTER TABLE registro_de_actividad
    ADD COLUMN IF NOT EXISTS usuario_ci_fk VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS actor VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) NOT NULL DEFAULT 'administracion';
UPDATE registro_de_actividad r JOIN admin a ON a.admin_id = r.admin_id_fk JOIN usuario u ON u.ci = a.usuario_ci_fk
    SET r.usuario_ci_fk = a.usuario_ci_fk, r.actor = CONCAT(u.nombre, ' ', u.apellido)
    WHERE r.usuario_ci_fk IS NULL;
ALTER TABLE torneo ADD COLUMN IF NOT EXISTS motivo_rechazo VARCHAR(255) NULL;
ALTER TABLE equipo ADD COLUMN IF NOT EXISTS abierto BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS motivo_bloqueo VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS intentos_fallidos TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bloqueo_hasta DATETIME NULL;

ALTER TABLE configuracion_torneo
    ADD COLUMN IF NOT EXISTS vidas TINYINT NULL AFTER competitivo,
    ADD COLUMN IF NOT EXISTS juez_principal_fk INT NULL AFTER contacto_persona_fk,
    ADD CONSTRAINT fk_config_juez FOREIGN KEY IF NOT EXISTS (juez_principal_fk) REFERENCES juez(juez_id);

CREATE TABLE IF NOT EXISTS grupo (
    grupo_id INT AUTO_INCREMENT PRIMARY KEY,
    torneo_id_fk INT NOT NULL,
    nombre VARCHAR(20) NOT NULL,
    UNIQUE KEY uq_grupo (torneo_id_fk, nombre),
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tabla_posiciones
    ADD COLUMN IF NOT EXISTS grupo_id_fk INT NULL,
    ADD CONSTRAINT fk_posiciones_grupo FOREIGN KEY IF NOT EXISTS (grupo_id_fk) REFERENCES grupo(grupo_id) ON DELETE SET NULL;

-- Premios por puesto de cada torneo.
CREATE TABLE IF NOT EXISTS premio (
    premio_id     INT AUTO_INCREMENT PRIMARY KEY,
    torneo_id_fk  INT          NOT NULL,
    puesto        TINYINT      NOT NULL,
    descripcion   VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_premio (torneo_id_fk, puesto),
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Avance en llaves de eliminación.
CREATE TABLE IF NOT EXISTS avance_llave (
    origen_fk   INT NOT NULL,
    resultado   ENUM('ganador','perdedor') NOT NULL,
    destino_fk  INT NOT NULL,
    lado        ENUM('local','visitante') NOT NULL,
    PRIMARY KEY (origen_fk, resultado),
    FOREIGN KEY (origen_fk)  REFERENCES enfrentamiento(enfrentamiento_id) ON DELETE CASCADE,
    FOREIGN KEY (destino_fk) REFERENCES enfrentamiento(enfrentamiento_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitaciones para sumarse a un equipo.
CREATE TABLE IF NOT EXISTS invitacion_equipo (
    invitacion_id       INT AUTO_INCREMENT PRIMARY KEY,
    equipo_id_fk        INT         NOT NULL,
    torneo_id_fk        INT         NOT NULL,
    invitado_ci_fk      VARCHAR(20) NOT NULL,
    invitado_por_ci_fk  VARCHAR(20) NOT NULL,
    estado              ENUM('pendiente','aceptada','rechazada','cancelada') NOT NULL DEFAULT 'pendiente',
    fecha               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invitacion_invitado (invitado_ci_fk, estado),
    FOREIGN KEY (equipo_id_fk)       REFERENCES equipo(equipo_id) ON DELETE CASCADE,
    FOREIGN KEY (torneo_id_fk)       REFERENCES torneo(torneo_id) ON DELETE CASCADE,
    FOREIGN KEY (invitado_ci_fk)     REFERENCES usuario(ci) ON DELETE CASCADE,
    FOREIGN KEY (invitado_por_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitud_equipo (
    solicitud_id    INT AUTO_INCREMENT PRIMARY KEY,
    equipo_id_fk    INT         NOT NULL,
    torneo_id_fk    INT         NOT NULL,
    usuario_ci_fk   VARCHAR(20) NOT NULL,
    estado          ENUM('pendiente','aceptada','rechazada','cancelada') NOT NULL DEFAULT 'pendiente',
    fecha           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_solicitud_equipo (equipo_id_fk, estado),
    INDEX idx_solicitud_usuario (usuario_ci_fk, torneo_id_fk, estado),
    FOREIGN KEY (equipo_id_fk)  REFERENCES equipo(equipo_id) ON DELETE CASCADE,
    FOREIGN KEY (torneo_id_fk)  REFERENCES torneo(torneo_id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mensajes del formulario de Contacto (los lee un administrador).
CREATE TABLE IF NOT EXISTS mensaje_contacto (
    mensaje_id     INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    asunto         VARCHAR(150) NOT NULL,
    mensaje        TEXT         NOT NULL,
    usuario_ci_fk  VARCHAR(20)  NULL,
    ip_hash        CHAR(64)     NULL,
    leido          BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mensaje_ip (ip_hash, fecha),
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cant_participante = jugadores por equipo (1 si guardaba el cupo)
UPDATE configuracion_torneo SET cant_participante = 1 WHERE cant_participante IS NULL OR cant_participante = cant_equipos;
UPDATE configuracion_torneo SET competitivo = 0 WHERE competitivo IS NULL OR juez_principal_fk IS NULL;

-- premios (texto, una línea por puesto: "1° Trofeo") -> tabla premio
SET @hay = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_torneo' AND COLUMN_NAME = 'premios');
SET @sql = IF(@hay > 0, 'INSERT IGNORE INTO premio (torneo_id_fk, puesto, descripcion)
    SELECT c.torneo_id_fk, n.puesto,
           TRIM(REGEXP_REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(c.premios, ''\n'', n.puesto), ''\n'', -1), ''^[0-9]+° *'', ''''))
    FROM configuracion_torneo c
    JOIN (SELECT 1 AS puesto UNION SELECT 2 UNION SELECT 3) n
      ON n.puesto <= 1 + LENGTH(c.premios) - LENGTH(REPLACE(c.premios, ''\n'', ''''))
    WHERE c.premios IS NOT NULL AND TRIM(c.premios) <> ''''', 'DO 0');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
ALTER TABLE configuracion_torneo DROP COLUMN IF EXISTS premios;

-- Partidos cargados antes de es_local: el equipo de menor id queda como local
UPDATE enfrentamiento_equipo ee
JOIN (SELECT enfrentamiento_id_fk, MIN(equipo_id_fk) AS local_id FROM enfrentamiento_equipo
      GROUP BY enfrentamiento_id_fk HAVING SUM(es_local) = 0 AND COUNT(*) = 2) x
  ON x.enfrentamiento_id_fk = ee.enfrentamiento_id_fk AND x.local_id = ee.equipo_id_fk
SET ee.es_local = 1;
