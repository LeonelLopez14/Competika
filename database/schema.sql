CREATE DATABASE IF NOT EXISTS competika_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE competika_db;

CREATE TABLE IF NOT EXISTS usuario (
    ci VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(150),
    fecha_nac DATE,
    email VARCHAR(150) NOT NULL UNIQUE,
    contrasenia VARCHAR(255) NOT NULL,
    rol_usuario ENUM('admin','observador','organizador','juez','participante') NOT NULL
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

CREATE TABLE IF NOT EXISTS torneo (
    torneo_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    deporte VARCHAR(100),
    tipo_torneo VARCHAR(100),
    fecha_inicio DATE,
    fecha_fin DATE,
    direccion VARCHAR(150),
    departamento VARCHAR(100),
    estado VARCHAR(50),
    organizador_id_fk INT NOT NULL,
    FOREIGN KEY (organizador_id_fk) REFERENCES organizador(organizador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tipo_torneo (
    tipo_torneo_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tipo_torneo (nombre) VALUES
    ('liga_t_vs_t'), ('liga_doble_vuelta'), ('eliminacion_simple'), ('doble_eliminacion'),
    ('sistema_puntos'), ('vidas'), ('sistema_suizo'), ('grupos_eliminacion'),
    ('torneo_relampago'), ('gran_premio'), ('copa_desafio');

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
    torneo_id_fk INT NOT NULL,
    admin_id_fk INT NOT NULL,
    FOREIGN KEY (torneo_id_fk) REFERENCES torneo(torneo_id),
    FOREIGN KEY (admin_id_fk) REFERENCES admin(admin_id)
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
