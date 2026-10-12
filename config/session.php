<?php
/**
 * Arranque de sesión común a controladores y API.
 * Cookie HttpOnly (JS no puede leerla), SameSite=Lax (mitiga CSRF)
 * y Secure cuando el sitio se sirve por HTTPS (también detrás de un proxy).
 */
if (session_status() === PHP_SESSION_NONE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/** En un POST, corta si la petición viene de otro sitio (protección CSRF). */
function rechazarOrigenAjeno(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' || !isset($_SERVER['HTTP_ORIGIN'])) return;
    $o = parse_url($_SERVER['HTTP_ORIGIN']);
    $host = isset($o['host']) ? $o['host'] . (isset($o['port']) ? ':' . $o['port'] : '') : '';
    if ($host === '' || strcasecmp($host, $_SERVER['HTTP_HOST'] ?? '') !== 0) {
        http_response_code(403);
        exit('Origen no permitido.');
    }
}

