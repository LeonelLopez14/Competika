-- =====================================================
-- COMPETIKA — Ajuste mínimo sobre schema.sql
-- Ejecutar DESPUÉS de schema.sql (y antes o después de usuarios.sql).
--
-- configuracion_torneo.admin_id_fk era NOT NULL: eso obligaba a que un
-- administrador existiera y estuviera asociado para que un ORGANIZADOR
-- pudiera guardar la configuración de su propio torneo (cupo, precios,
-- premios). Se permite NULL: el admin puede asignarse después, si la
-- configuración la revisa o aprueba un administrador.
--
-- Es el único cambio a su esquema. Se puede correr más de una vez.
-- =====================================================
USE competika_db;

ALTER TABLE configuracion_torneo MODIFY admin_id_fk INT NULL;
