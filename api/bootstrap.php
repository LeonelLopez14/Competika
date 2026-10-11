<?php
/**
 * Código común de las APIs JSON. No se llama por HTTP (.htaccess lo bloquea).
 *
 * - Sin cabeceras CORS: front y API salen del mismo origen; ningún otro
 *   sitio puede leer las respuestas.
 * - En producción (APP_ENV=production) los errores internos no se muestran
 *   al cliente: se registran en el log del servidor.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function bodyJson(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function requireMethod(string $method): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        respond(['success' => false, 'error' => "Método no permitido, se esperaba $method"], 405);
    }
}

function failInternal(Throwable $e): void {
    error_log('[competika] ' . get_class($e) . ': ' . $e->getMessage());
    $prod = env('APP_ENV', 'development') === 'production';
    respond(['success' => false, 'error' => $prod ? 'Error interno del servidor.' : 'Error: ' . $e->getMessage()], 500);
}

function db(): PDO {
    try {
        return Database::getInstance();
    } catch (Throwable $e) {
        failInternal($e);
    }
}

/** Cédula del usuario logueado (la guarda controller/login.php y registrar.php). */
function currentCi(): ?string {
    return !empty($_SESSION['usuario_ci']) ? (string)$_SESSION['usuario_ci'] : null;
}

function requireLogin(): string {
    $ci = currentCi();
    if ($ci === null) respond(['success' => false, 'error' => 'Necesitás iniciar sesión.'], 401);
    return $ci;
}
