USE competika_db;

CREATE USER IF NOT EXISTS 'competika_app'@'localhost' IDENTIFIED BY 'Jacaranda';

-- Límites de recursos de la cuenta de la aplicación.
ALTER USER 'competika_app'@'localhost' WITH
    MAX_QUERIES_PER_HOUR 100000
    MAX_UPDATES_PER_HOUR 20000
    MAX_CONNECTIONS_PER_HOUR 20000
    MAX_USER_CONNECTIONS 40;

REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'competika_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.usuario                      TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.admin                        TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.juez                         TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.participante                 TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.observador                   TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.organizador                  TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.torneo                       TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.configuracion_torneo         TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.equipo                       TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.equipo_participante          TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.ronda                        TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.enfrentamiento               TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.enfrentamiento_participante  TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.enfrentamiento_equipo        TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.enfrentamiento_juez          TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.resultado                    TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.tabla_posiciones             TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.registro_de_actividad        TO 'competika_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.notificacion                 TO 'competika_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.persona                      TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE         ON competika_db.solicitud_juez               TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, DELETE         ON competika_db.seguimiento                  TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.sesion_recordada             TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.recuperacion_clave           TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.premio                       TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.grupo                        TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.avance_llave                 TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE         ON competika_db.invitacion_equipo            TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE         ON competika_db.solicitud_equipo             TO 'competika_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON competika_db.mensaje_contacto             TO 'competika_app'@'localhost';

-- Catálogos: monedas sin DELETE; de los formatos solo se edita la etiqueta y si está activo
GRANT SELECT, INSERT, UPDATE          ON competika_db.moneda      TO 'competika_app'@'localhost';
GRANT SELECT, UPDATE (etiqueta, activo) ON competika_db.tipo_torneo TO 'competika_app'@'localhost';

REVOKE UPDATE, DELETE ON competika_db.registro_de_actividad FROM 'competika_app'@'localhost';
REVOKE DELETE ON competika_db.resultado FROM 'competika_app'@'localhost';

FLUSH PRIVILEGES;

SHOW GRANTS FOR 'competika_app'@'localhost';
