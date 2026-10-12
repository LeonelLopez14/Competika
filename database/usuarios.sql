USE competika_db;

CREATE USER IF NOT EXISTS 'competika_app'@'localhost' IDENTIFIED BY 'Jacaranda';

ALTER USER 'competika_app'@'localhost' WITH
    MAX_QUERIES_PER_HOUR 5000
    MAX_CONNECTIONS_PER_HOUR 200
    MAX_USER_CONNECTIONS 10;

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
GRANT SELECT, INSERT                 ON competika_db.honor                       TO 'competika_app'@'localhost';

GRANT SELECT ON competika_db.tipo_torneo TO 'competika_app'@'localhost';

REVOKE UPDATE, DELETE ON competika_db.registro_de_actividad FROM 'competika_app'@'localhost';
REVOKE DELETE ON competika_db.resultado FROM 'competika_app'@'localhost';

FLUSH PRIVILEGES;

SHOW GRANTS FOR 'competika_app'@'localhost';
