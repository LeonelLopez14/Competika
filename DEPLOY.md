# Competika — Despliegue

Arquitectura: navegador → Apache + PHP (`frontend/` + `api/` + `controller/`) → MariaDB.
La base se crea con tres archivos, siempre en este orden:

1. `database/schema.sql`
2. `database/ajustes.sql` (único cambio al esquema: `configuracion_torneo.admin_id_fk` admite NULL)
3. `database/usuarios.sql` (usuario `competika_app` con permisos mínimos)

La app lee la conexión de variables de entorno (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `APP_ENV`).
Sin ellas usa los valores locales de `config/database.php`. Con `APP_ENV=production` los errores internos no se muestran al usuario.

## Local (XAMPP / LAMPP)

1. Iniciar Apache y MySQL.
2. phpMyAdmin → pestaña SQL: ejecutar los tres archivos de arriba, en orden (eliminar antes una `competika_db` vieja si existe).
3. Apache necesita `mod_rewrite` y `AllowOverride All` en la carpeta del proyecto (lo usa `.htaccess`).
4. Probar la conexión por consola: `php test_conexion.php` (por navegador da 403 a propósito).
5. Entrar SIEMPRE por `http://localhost/<carpeta>/frontend/index.html`, nunca con doble clic (`file://`).

## Servidor Linux con Apache (sin Docker)

```bash
sudo apt install -y apache2 php libapache2-mod-php php-mysql php-mbstring mariadb-server git
sudo a2enmod rewrite headers
sudo git clone https://github.com/LeonelLopez14/competika /var/www/competika && cd /var/www/competika
sudo mysql < database/schema.sql && sudo mysql < database/ajustes.sql && sudo mysql < database/usuarios.sql
sudo mysql -e "ALTER USER 'competika_app'@'localhost' IDENTIFIED BY 'UNA_CLAVE_LARGA';"
sed 's#/var/www/html#/var/www/competika#g' docker/apache.conf | sudo tee /etc/apache2/sites-available/competika.conf
sudo a2dissite 000-default && sudo a2ensite competika
printf 'SetEnv APP_ENV production\nSetEnv DB_PASS UNA_CLAVE_LARGA\n' | sudo tee /etc/apache2/conf-available/competika-env.conf
sudo chmod 640 /etc/apache2/conf-available/competika-env.conf && sudo a2enconf competika-env
sudo apache2ctl configtest && sudo systemctl reload apache2
```

## Docker

```bash
cp .env.example .env          # completar APP_DB_PASS y DB_ROOT_PASS (obligatorias)
docker compose up -d --build  # http://localhost:8080
```

- La base se inicializa sola la primera vez: `schema.sql`, `ajustes.sql` y `docker/db-init.sh`
  (los permisos de `usuarios.sql` para el host `'%'`, con la clave de `.env`).
- La base no publica puertos; solo el contenedor `web` llega a ella.
- Recrear la base desde cero (borra datos): `docker compose down -v && docker compose up -d`.
- phpMyAdmin solo en desarrollo: `docker compose --profile dev up -d` → `http://localhost:8081`.
- Backup: `docker compose exec db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" competika_db' > backup.sql`.

## Proxmox (resumen)

1. Crear una **VM** (no LXC) con Ubuntu Server 24.04: 2 núcleos, 4 GB RAM, 32 GB, red `vmbr0`, Qemu Agent.
2. IP fija; instalar Docker (`curl -fsSL https://get.docker.com | sudo sh`), clonar el repo y seguir la sección Docker.
3. Firewall de Proxmox (Docker saltea `ufw`): permitir 8006 y 22 desde la red ANTES de activarlo en Datacenter;
   en la VM, entrada 22/80/443 y política DROP. Nunca publicar el 3306.
4. HTTPS: Caddy en la VM con `reverse_proxy 127.0.0.1:8080` y el puerto de `web` en `"127.0.0.1:8080:80"`.
5. Respaldos: Datacenter → Backup programado de la VM + `mariadb-dump` diario fuera de la VM.

## Limitaciones del esquema actual

- Los equipos de un torneo son las filas de `tabla_posiciones` con `equipo_id_fk`.
- `enfrentamiento_equipo` no tiene orden: `puntaje_a` corresponde siempre al equipo de menor id.
- La app no tiene `DELETE` sobre `resultado`: no se borran partidos/equipos/torneos con resultados.
- No hay columnas para moneda, árbitro de contacto, costos/notas por partido, grupos ni aprobación de inscripciones.
