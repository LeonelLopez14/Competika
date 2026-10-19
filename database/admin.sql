-- COMPETIKA — Dar rol de administrador a cuentas ya registradas.
-- Para agregar otro admin: sumá una línea con su email a la lista de abajo.
USE competika_db;

CREATE TEMPORARY TABLE emails_admin (email VARCHAR(150) NOT NULL);
INSERT INTO emails_admin (email) VALUES
    ('ll.lopezleonel99@gmail.com'),
    ('giovana10lopez@gmail.com');

INSERT INTO admin (usuario_ci_fk)
SELECT u.ci FROM usuario u JOIN emails_admin e ON e.email = u.email
WHERE NOT EXISTS (SELECT 1 FROM admin a WHERE a.usuario_ci_fk = u.ci);

UPDATE admin a
JOIN usuario u ON u.ci = a.usuario_ci_fk
JOIN emails_admin e ON e.email = u.email
SET a.activo = 1, u.rol_usuario = 'admin';

SELECT u.ci, u.nombre, u.apellido, u.email, a.admin_id, a.activo
FROM usuario u
JOIN admin a ON a.usuario_ci_fk = u.ci
JOIN emails_admin e ON e.email = u.email;

DROP TEMPORARY TABLE emails_admin;