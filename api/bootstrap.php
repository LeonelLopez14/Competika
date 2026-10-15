<?php
/** Arranque común de la API JSON: sesión, protección CSRF y autoload. */

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
