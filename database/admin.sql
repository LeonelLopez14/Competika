-- =====================================================
-- COMPETIKA — Dar rol de ADMINISTRADOR a una cuenta ya registrada.
-- Ejecutar como root (phpMyAdmin o consola), NO con competika_app:
-- la aplicación no puede crear administradores por sí sola.
--
-- 1. Registrate en el sitio con la cuenta que va a ser admin.
-- 2. Cambiá el correo de abajo y ejecutá este archivo.
-- 3. Cerrá sesión y volvé a entrar: aparece "Administración" en el menú.
-- =====================================================
USE competika_db;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @correo = 'll.lopezleonel99@gmail.com';      -- <<< CAMBIAR

INSERT INTO admin (usuario_ci_fk)
SELECT ci FROM usuario
WHERE email = @correo
  AND NOT EXISTS (SELECT 1 FROM admin a WHERE a.usuario_ci_fk = usuario.ci);
UPDATE admin a JOIN usuario u ON u.ci = a.usuario_ci_fk SET a.activo = 1 WHERE u.email = @correo;

UPDATE usuario SET rol_usuario = 'admin' WHERE email = @correo;

-- Comprobación: tiene que mostrar una fila
SELECT u.ci, u.nombre, u.apellido, u.email, a.admin_id
FROM usuario u JOIN admin a ON a.usuario_ci_fk = u.ci
WHERE u.email = @correo;
