-- COMPETIKA — Dar rol de administrador a una cuenta ya registrada.
USE competika_db;

SET @ci = (SELECT ci FROM usuario WHERE email = 'll.lopezleonel99@gmail.com' LIMIT 1);

INSERT INTO admin (usuario_ci_fk)
SELECT @ci FROM DUAL
WHERE @ci IS NOT NULL AND NOT EXISTS (SELECT 1 FROM admin WHERE usuario_ci_fk = @ci);

UPDATE admin SET activo = 1 WHERE usuario_ci_fk = @ci;
UPDATE usuario SET rol_usuario = 'admin' WHERE ci = @ci;

SELECT u.ci, u.nombre, u.apellido, u.email, a.admin_id, a.activo
FROM usuario u JOIN admin a ON a.usuario_ci_fk = u.ci
WHERE u.ci = @ci;