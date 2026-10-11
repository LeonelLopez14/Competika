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
