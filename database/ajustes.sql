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

