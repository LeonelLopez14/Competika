#!/bin/bash
# Crea el usuario de la aplicación para el contenedor (host %, clave de .env).
set -eo pipefail   # sin -u: si MariaDB "sourcea" el script, no rompe su entrypoint

: "${APP_DB_PASS:?Falta APP_DB_PASS}"
root=(mariadb --protocol=socket -uroot -p"${MARIADB_ROOT_PASSWORD}")

sed "s/'competika_app'@'localhost'/'competika_app'@'%'/g; /^SHOW GRANTS/d" /competika/usuarios.sql | "${root[@]}"

pw=${APP_DB_PASS//\\/\\\\}
pw=${pw//\'/\'\'}
"${root[@]}" -e "ALTER USER 'competika_app'@'%' IDENTIFIED BY '${pw}'; FLUSH PRIVILEGES;"
echo "competika: usuario de la aplicación creado con permisos mínimos"
