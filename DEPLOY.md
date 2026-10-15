# Competika — Despliegue

Arquitectura: navegador → Apache (`.htaccess` + VirtualHost de `apache/`) → PHP → MariaDB.

```
frontend/      HTML, CSS y JS (sin lógica de datos: todo sale de la API)
api/*.php      rutas de la API JSON: asocian ?action= con un método del controlador
controller/    TorneoController, PerfilController, NotificacionController, SesionController,
               CuentaController (login/registro/logout de los formularios)
service/       reglas compartidas: Notificador, TablaPosiciones, Avatar
repository/    TODO el SQL (PDO, sentencias preparadas): TorneoRepository, EquipoRepository, ...
model/         entidades: Torneo, ConfiguracionTorneo, Equipo, Partido, Resultado, Persona,
               Moneda, TipoTorneo, Notificacion, Usuario
core/          Request, Response, Router, Auth, Validar, Formato, autoload
config/        conexión (Database, singleton) y sesión
```

## Base de datos

- **Base nueva:** `database/schema.sql` y después `database/usuarios.sql`.
- **Base creada con una versión anterior:** `database/ajustes.sql` (la migra sin perder datos) y después `database/usuarios.sql`.
  Se pueden correr más de una vez.

El esquema está en 3FN: el árbitro principal y el contacto de un torneo son filas de `persona`
(referenciadas por FK desde `configuracion_torneo`), la moneda es FK a `moneda` y el formato es FK a
`tipo_torneo`. Si el contacto es el mismo que el de la cuenta del organizador no se guarda: se toma de `usuario`.

**Primer administrador:** registrate en el sitio, cambiá el correo dentro de `database/admin.sql` y
ejecutalo como root (phpMyAdmin). Al volver a entrar aparece "Administración" en el menú.

`usuarios.sql` crea `competika_app` con GRANT por tabla, REVOKE explícitos y límites de recursos.
Los límites cuentan para todo el sitio (todos los visitantes usan esa cuenta y cada pedido a la API
abre una conexión): si el sitio crece, subirlos.

Las notificaciones de la campana llegan en tiempo real con Server-Sent Events (`api/notifications.php?action=stream`).
Si hay un proxy delante (Nginx, Proxmox con reverse proxy), tiene que dejar pasar la respuesta sin buffer
(`proxy_buffering off;`) y sin comprimirla. Si no, el sitio cae solo a consultar cada 30 s.
Mientras espera, el stream NO ocupa una conexión de MariaDB: revisa un archivo de señal en el
directorio temporal de PHP y solo consulta la base cuando llegó algo nuevo.

Las fotos de perfil se guardan en `uploads/avatars/`. Apache tiene que poder escribir ahí
y PHP necesita la extensión **GD** (XAMPP la trae; en Ubuntu: `php-gd`) y
`upload_max_filesize` de al menos 5M.

La app lee la configuración de variables de entorno (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `APP_ENV`,
y para los correos `MAIL_ENABLED`, `MAIL_FROM`, `APP_URL`).
Sin ellas usa los valores locales de `config/database.php`. Con `APP_ENV=production` los errores internos no se muestran al usuario.

## Local (XAMPP / LAMPP)

1. Iniciar Apache y MySQL.
2. phpMyAdmin → pestaña SQL: ejecutar `schema.sql` y `usuarios.sql` (o `ajustes.sql` + `usuarios.sql` si ya tenías la base).
3. Apache necesita `mod_rewrite`, `mod_headers` y `AllowOverride All` en la carpeta del proyecto.
   Opcional: VirtualHost `competika.local` con `apache/competika-xampp.conf` (instrucciones adentro).
4. Permiso de escritura para las fotos (LAMPP corre Apache como usuario `daemon`):
   `sudo chgrp daemon uploads/avatars && chmod 775 uploads/avatars`
5. Probar la conexión por consola: `php test_conexion.php` (por navegador da 403 a propósito).
6. Entrar por `http://localhost/<carpeta>/` (o `http://competika.local`), nunca con doble clic (`file://`).

## URLs amigables (`.htaccess`)

| URL | Va a |
|---|---|
| `/torneos`, `/torneos/5` | búsqueda, página pública del torneo 5 |
| `/crear-torneo`, `/dashboard`, `/perfil`, `/configuracion`, `/login`, `/registro` | la página correspondiente |
| `GET /api/torneos`, `/api/torneos/5`, `/api/notificaciones`, `/api/sesion` | la API (reescritura interna) |

Funcionan igual si el sitio está en la raíz o en una subcarpeta (`localhost/Competika`).
Las carpetas `config/ core/ model/ repository/ service/ database/ apache/ docker/` y las clases
`controller/*_controller.php` devuelven 403.

## Servidor Linux con Apache (sin Docker)

```bash
sudo apt install -y apache2 php libapache2-mod-php php-mysql php-mbstring php-gd mariadb-server git
sudo a2enmod rewrite headers
sudo git clone https://github.com/LeonelLopez14/competika /var/www/competika && cd /var/www/competika
sudo mysql < database/schema.sql && sudo mysql < database/ajustes.sql && sudo mysql < database/usuarios.sql
sudo mysql -e "ALTER USER 'competika_app'@'localhost' IDENTIFIED BY 'UNA_CLAVE_LARGA';"
sudo a2enmod ssl
sudo cp apache/competika.conf /etc/apache2/sites-available/competika.conf   # editar ServerName y certificados
sudo a2dissite 000-default && sudo a2ensite competika
printf 'SetEnv APP_ENV production\nSetEnv DB_PASS UNA_CLAVE_LARGA\n' | sudo tee /etc/apache2/conf-available/competika-env.conf
sudo chmod 640 /etc/apache2/conf-available/competika-env.conf && sudo a2enconf competika-env
sudo chown www-data uploads/avatars
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
- Las fotos de perfil quedan en el volumen `avatars` (sobreviven a un `--build`).
- Si la base ya existía antes de esta versión, migrala a mano (y volvé a aplicar los permisos):
  `docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"' < database/ajustes.sql`
  `sed "s/'competika_app'@'localhost'/'competika_app'@'%'/g" database/usuarios.sql | docker compose exec -T db sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'`
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
- `enfrentamiento_equipo.es_local` marca al local; `puntaje_a` es el del local.
- La app no tiene `DELETE` sobre `resultado`: no se borran partidos/equipos/torneos con resultados.
- Grupos (`grupo`), premios por puesto (`premio`) y el avance en llaves de eliminación (`avance_llave`) son tablas propias.
- No hay columnas para costos/notas por partido ni aprobación de inscripciones.

## Torneos competitivos, equipos y administración

- **Competitivo:** exige un juez principal (de los jueces aprobados) que queda asignado a todos los
  partidos; el resultado solo lo carga el juez (o un administrador) y los jugadores necesitan el
  carné de deportista (se marca al registrarse o en Configuración).
- **Equipos:** quien se inscribe es el capitán e invita por correo hasta completar "jugadores por equipo".
- **Fixture automático:** todos los formatos. Suizo, vidas, copa desafío y grupos + eliminación se
  generan por rondas desde el Calendario del dashboard.
- **Panel de administración:** solicitudes de juez, usuarios (roles, suspender, eliminar), torneos
  (estado, transferir, eliminar, editar desde el dashboard), mensajes de Contacto y anuncios.
- **Redes del pie de página:** se configuran en `frontend/js/navbar-user.js` (objeto `REDES`);
  las que quedan vacías no se muestran.

## Correos (recuperar contraseña)

- `MAIL_ENABLED=1` activa el envío con `mail()` de PHP; el servidor necesita sendmail/SMTP configurado
  (en Ubuntu, por ejemplo, `msmtp-mta` con una cuenta SMTP). `MAIL_FROM` es el remitente y `APP_URL`
  la dirección pública del sitio (ej. `https://competika.ejemplo.uy`) para armar el enlace.
- Sin correo configurado (XAMPP), en desarrollo y **solo desde la misma máquina** la página muestra el
  enlace en pantalla ("modo prueba"); siempre queda también en el log de errores de PHP.
- En producción (`APP_ENV=production`) el enlace nunca se muestra en pantalla.
