-- =====================================================
-- COMPETIKA — Ajustes sobre schema.sql
-- Ejecutar DESPUÉS de schema.sql (y antes o después de usuarios.sql).
-- Se puede correr más de una vez (requiere MariaDB, que es lo que traen
-- XAMPP/LAMPP y la imagen de Docker).
-- =====================================================
USE competika_db;

-- 1) configuracion_torneo.admin_id_fk era NOT NULL: obligaba a que un
--    administrador existiera para que un ORGANIZADOR pudiera guardar la
--    configuración de su propio torneo. Ahora admite NULL.
ALTER TABLE configuracion_torneo MODIFY admin_id_fk INT NULL;

-- 2) Datos de perfil que se editan en "Configuración" y no existían en
--    el esquema: nombre de usuario, biografía y foto de perfil.
--    foto_perfil guarda solo el nombre del archivo (uploads/avatars/<archivo>);
--    el archivo lo genera el servidor, nunca el nombre que manda el usuario.
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS nombre_usuario VARCHAR(50)  NULL UNIQUE,
    ADD COLUMN IF NOT EXISTS biografia      VARCHAR(200) NULL,
    ADD COLUMN IF NOT EXISTS foto_perfil    VARCHAR(100) NULL;

-- 3) enfrentamiento_equipo no guardaba quién es local y quién visitante, así
--    que al editar un partido los equipos (y el marcador) podían aparecer
--    invertidos. es_local = 1 marca al local; puntaje_a es el del local.
ALTER TABLE enfrentamiento_equipo
    ADD COLUMN IF NOT EXISTS es_local TINYINT(1) NOT NULL DEFAULT 0;

-- 4) Datos del formulario de creación que pide la consigna y no tenían
--    columna: moneda, árbitro principal y contacto del organizador para el
--    torneo (el contacto se precarga con los datos de la cuenta, pero se
--    puede cambiar).
ALTER TABLE configuracion_torneo
    ADD COLUMN IF NOT EXISTS moneda             VARCHAR(10)  NULL,
    ADD COLUMN IF NOT EXISTS arbitro_nombre     VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS arbitro_telefono   VARCHAR(20)  NULL,
    ADD COLUMN IF NOT EXISTS arbitro_email      VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS contacto_nombre    VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS contacto_telefono  VARCHAR(20)  NULL,
    ADD COLUMN IF NOT EXISTS contacto_email     VARCHAR(150) NULL;

-- 5) Notificaciones (la campana del menú). Se generan cuando pasa algo que
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

-- 6) Honores (perfil → historial de partidos): un jugador le da "honor" al
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
