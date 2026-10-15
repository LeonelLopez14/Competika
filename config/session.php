<?php
/** Sesión con cookie HttpOnly, SameSite=Lax y Secure bajo HTTPS. */
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

    // "Recordarme": sin sesión activa pero con la cookie, se restaura la sesión
    if (empty($_SESSION['usuario_ci']) && !empty($_COOKIE['competika_rec'])) {
        require_once __DIR__ . '/../core/autoload.php';
        Recordarme::restaurar();
    }
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

