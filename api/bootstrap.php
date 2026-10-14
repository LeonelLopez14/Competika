<?php
/**
 * Arranque común de la API JSON. No se llama por HTTP (.htaccess lo bloquea).
 *
 * Arquitectura (MVC + Repository):
 *   api/*.php        -> solo rutas: asocian ?action= con un método del controlador
 *   controller/      -> TorneoController, PerfilController, ... (permisos y validación)
 *   service/         -> reglas compartidas (Notificador, TablaPosiciones, Avatar)
 *   repository/      -> todo el SQL (PDO + sentencias preparadas)
 *   model/           -> entidades (Torneo, Equipo, Partido, Resultado, Persona, ...)
 *   core/            -> Request, Response, Router, Auth, Validar
 *
 * Seguridad:
 * - Sin cabeceras CORS: front y API salen del mismo origen.
 * - Protección CSRF además de SameSite=Lax: todo POST tiene que venir de
 *   este mismo sitio (cabecera Origin); si no, 403.
 * - En producción (APP_ENV=production) los errores internos no se muestran.
 */

require_once __DIR__ . '/../core/autoload.php';
require_once __DIR__ . '/../config/session.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' && isset($_SERVER['HTTP_ORIGIN'])) {
    $o = parse_url($_SERVER['HTTP_ORIGIN']);
    $origen = isset($o['host']) ? $o['host'] . (isset($o['port']) ? ':' . $o['port'] : '') : '';
    if ($origen === '' || strcasecmp($origen, $_SERVER['HTTP_HOST'] ?? '') !== 0) {
        Response::error('Origen no permitido.', 403);
    }
}
