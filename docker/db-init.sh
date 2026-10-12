#!/bin/bash
# Se ejecuta UNA vez, cuando el volumen de MariaDB está vacío (después de
# 01-schema.sql y 02-ajustes.sql). Crea el usuario de la aplicación con los
# MISMOS permisos de database/usuarios.sql, pero:
#   - para el host '%' (el contenedor web se conecta por red, no por localhost)
#   - con la contraseña de APP_DB_PASS (del archivo .env), no la del repositorio
set -eo pipefail   # sin -u: si MariaDB "sourcea" el script, no rompe su entrypoint

: "${APP_DB_PASS:?Falta APP_DB_PASS}"
root=(mariadb --protocol=socket -uroot -p"${MARIADB_ROOT_PASSWORD}")

sed "s/'competika_app'@'localhost'/'competika_app'@'%'/g; /^SHOW GRANTS/d" /competika/usuarios.sql | "${root[@]}"

pw=${APP_DB_PASS//\\/\\\\}
pw=${pw//\'/\'\'}
"${root[@]}" -e "ALTER USER 'competika_app'@'%' IDENTIFIED BY '${pw}'; FLUSH PRIVILEGES;"
echo "competika: usuario de la aplicación creado con permisos mínimos"
