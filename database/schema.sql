-- =====================================================
-- COMPETIKA — Esquema completo (3FN)
-- Base nueva: ejecutar este archivo y después usuarios.sql.
-- Base creada con una versión anterior: ejecutar ajustes.sql (la migra).
--
-- Entidades de catálogo (moneda, tipo_torneo) y de personas externas
-- (persona: árbitros y contactos sin cuenta) se referencian por FK en
-- lugar de repetir sus datos en cada torneo.
-- =====================================================
CREATE DATABASE IF NOT EXISTS competika_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE competika_db;
-- Los datos de este archivo (tildes, €) están en UTF-8: que el cliente los lea así
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuario (
    ci VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(150),
    fecha_nac DATE,
    email VARCHAR(150) NOT NULL UNIQUE,
    contrasenia VARCHAR(255) NOT NULL,
    rol_usuario ENUM('admin','observador','organizador','juez','participante') NOT NULL,
    nombre_usuario VARCHAR(50) NULL UNIQUE,
    biografia VARCHAR(200) NULL,
    foto_perfil VARCHAR(100) NULL          -- solo el nombre del archivo en uploads/avatars/
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS juez (
    juez_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk VARCHAR(20) NOT NULL,
    certificado BOOLEAN,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS participante (
    participante_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk VARCHAR(20) NOT NULL,
    carne_deportista BOOLEAN,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS observador (
    observador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizador (
    organizador_id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo de formatos. clave = id que usa el frontend (main.js).
CREATE TABLE IF NOT EXISTS tipo_torneo (
    tipo_torneo_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    clave VARCHAR(50) NULL UNIQUE,
    etiqueta VARCHAR(100) NULL,
    categoria VARCHAR(30) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Catálogo de monedas (ISO 4217).
CREATE TABLE IF NOT EXISTS moneda (
    codigo CHAR(3) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    simbolo VARCHAR(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO moneda (codigo, nombre, simbolo) VALUES
    ('UYU', 'Peso uruguayo', '$'), ('USD', 'Dólar', 'US$'), ('ARS', 'Peso argentino', 'AR$'),
    ('BRL', 'Real', 'R$'), ('EUR', 'Euro', '€')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), simbolo = VALUES(simbolo);

-- Personas externas sin cuenta en el sitio: árbitros principales y
-- contactos de torneo. Un torneo las referencia por FK (no copia sus datos).
CREATE TABLE IF NOT EXISTS persona (
    persona_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    INDEX idx_persona_datos (nombre, telefono, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS torneo (
    torneo_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    deporte VARCHAR(100),
    tipo_torneo_id_fk INT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    direccion VARCHAR(150),
    departamento VARCHAR(100),
    estado VARCHAR(50),
    organizador_id_fk INT NOT NULL,
    FOREIGN KEY (organizador_id_fk) REFERENCES organizador(organizador_id),
    FOREIGN KEY (tipo_torneo_id_fk) REFERENCES tipo_torneo(tipo_torneo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_torneo (
    configuracion_id INT AUTO_INCREMENT PRIMARY KEY,
    precio_participacion DOUBLE,
    cant_participante INT,
    cant_equipos INT,
    cant_grupos INT,
    cant_partidos INT,
    premios VARCHAR(255),
    competitivo BOOLEAN,
    alquiler_lugar DOUBLE,
    precio_juez DOUBLE,
    moneda_codigo_fk CHAR(3) NULL,
    arbitro_persona_fk INT NULL,            -- árbitro principal
    contacto_persona_fk INT NULL,           -- NULL = se usan los datos de la cuenta del organizador
    torneo_id_fk INT NOT NULL,
    admin_id_fk INT NULL,                   -- solo si lo configuró un administrador
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id),
    FOREIGN KEY (admin_id_fk) REFERENCES admin(admin_id),
    FOREIGN KEY (moneda_codigo_fk) REFERENCES moneda(codigo),
    FOREIGN KEY (arbitro_persona_fk) REFERENCES persona(persona_id),
    FOREIGN KEY (contacto_persona_fk) REFERENCES persona(persona_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipo (
    equipo_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tamanio INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipo_participante (
    equipo_id_fk INT NOT NULL,
    participante_id_fk INT NOT NULL,
    PRIMARY KEY (equipo_id_fk, participante_id_fk),
    FOREIGN KEY (equipo_id_fk) REFERENCES equipo(equipo_id),
    FOREIGN KEY (participante_id_fk) REFERENCES participante(participante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ronda (
    ronda_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    torneo_id_fk INT NOT NULL,
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enfrentamiento (
    enfrentamiento_id INT AUTO_INCREMENT PRIMARY KEY,
    ubicacion VARCHAR(150),
    fecha DATETIME,
    torneo_id_fk INT NOT NULL,
    ronda_id_fk INT NOT NULL,
    organizador_id_fk INT NOT NULL,
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id),
    FOREIGN KEY (ronda_id_fk) REFERENCES ronda(ronda_id),
    FOREIGN KEY (organizador_id_fk) REFERENCES organizador(organizador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enfrentamiento_participante (
    enfrentamiento_id_fk INT NOT NULL,
    participante_id_fk INT NOT NULL,
    PRIMARY KEY (enfrentamiento_id_fk, participante_id_fk),
    FOREIGN KEY (enfrentamiento_id_fk) REFERENCES enfrentamiento(enfrentamiento_id),
    FOREIGN KEY (participante_id_fk) REFERENCES participante(participante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enfrentamiento_equipo (
    enfrentamiento_id_fk INT NOT NULL,
    equipo_id_fk INT NOT NULL,
    es_local TINYINT(1) NOT NULL DEFAULT 0,  -- 1 = local (puntaje_a del resultado)
    PRIMARY KEY (enfrentamiento_id_fk, equipo_id_fk),
    FOREIGN KEY (enfrentamiento_id_fk) REFERENCES enfrentamiento(enfrentamiento_id),
    FOREIGN KEY (equipo_id_fk) REFERENCES equipo(equipo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enfrentamiento_juez (
    enfrentamiento_id_fk INT NOT NULL,
    juez_id_fk INT NOT NULL,
    PRIMARY KEY (enfrentamiento_id_fk, juez_id_fk),
    FOREIGN KEY (enfrentamiento_id_fk) REFERENCES enfrentamiento(enfrentamiento_id),
    FOREIGN KEY (juez_id_fk) REFERENCES juez(juez_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resultado (
    resultado_id INT AUTO_INCREMENT PRIMARY KEY,
    enfrentamiento_id_fk INT NOT NULL,
    puntaje_a DOUBLE,
    puntaje_b DOUBLE,
    estado ENUM('pendiente', 'finalizado', 'empate') NOT NULL DEFAULT 'pendiente',
    ganador_equipo_fk INT NULL,
    ganador_participante_fk INT NULL,
    FOREIGN KEY (enfrentamiento_id_fk) REFERENCES enfrentamiento(enfrentamiento_id),
    FOREIGN KEY (ganador_equipo_fk) REFERENCES equipo(equipo_id),
    FOREIGN KEY (ganador_participante_fk) REFERENCES participante(participante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tabla_posiciones (
    posiciones_id INT AUTO_INCREMENT PRIMARY KEY,
    torneo_id_fk INT NOT NULL,
    equipo_id_fk INT NULL,
    participante_id_fk INT NULL,
    puntos INT DEFAULT 0,
    partidos_jugados INT DEFAULT 0,
    partidos_ganados INT DEFAULT 0,
    partidos_empatados INT DEFAULT 0,
    partidos_perdidos INT DEFAULT 0,
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id),
    FOREIGN KEY (equipo_id_fk) REFERENCES equipo(equipo_id),
    FOREIGN KEY (participante_id_fk) REFERENCES participante(participante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registro_de_actividad (
    registro_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id_fk INT NOT NULL,
    nombre VARCHAR(150),
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    FOREIGN KEY (admin_id_fk) REFERENCES admin(admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notificaciones (la campana del menú). Se generan cuando pasa algo que
--    le importa al usuario: alguien se inscribe en su torneo, le programan
--    o le cargan el resultado de un partido, el torneo empieza o termina, etc.
CREATE TABLE IF NOT EXISTS notificacion (
    notificacion_id  INT AUTO_INCREMENT PRIMARY KEY,
    usuario_ci_fk    VARCHAR(20)  NOT NULL,
    tipo             VARCHAR(30)  NOT NULL,
    mensaje          VARCHAR(255) NOT NULL,
    torneo_id_fk     INT          NULL,
    ref_id           INT          NULL,            -- ej.: partido del recordatorio
    leida            BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notificacion_usuario (usuario_ci_fk, notificacion_id),
    FOREIGN KEY (usuario_ci_fk) REFERENCES usuario(ci) ON DELETE CASCADE,
    FOREIGN KEY (torneo_id_fk)  REFERENCES torneo(torneo_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Honores (perfil → historial de partidos): un jugador le da "honor" al
--    equipo rival después de un partido jugado. Uno por persona y partido.
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
