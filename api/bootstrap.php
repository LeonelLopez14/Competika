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

// Protección CSRF adicional a SameSite=Lax: toda petición que modifica datos
// tiene que venir de este mismo sitio. Los navegadores mandan la cabecera
// Origin en los POST; si viene de otro sitio (o es "null"), se rechaza.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' && isset($_SERVER['HTTP_ORIGIN'])) {
    $o = parse_url($_SERVER['HTTP_ORIGIN']);
    $originHost = isset($o['host']) ? $o['host'] . (isset($o['port']) ? ':' . $o['port'] : '') : '';
    if ($originHost === '' || strcasecmp($originHost, $_SERVER['HTTP_HOST'] ?? '') !== 0) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Origen no permitido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

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

/** Roles del usuario según las tablas de especialización del esquema. */
function userRoles(PDO $pdo, string $ci): array {
    $roles = [];
    foreach (['admin', 'organizador', 'participante', 'juez', 'observador'] as $tabla) {
        $s = $pdo->prepare("SELECT 1 FROM $tabla WHERE usuario_ci_fk = ? LIMIT 1");
        $s->execute([$ci]);
        $roles[$tabla] = (bool)$s->fetchColumn();
    }
    return $roles;
}

/** Ruta pública de la foto de perfil (relativa a la raíz del sitio) o null. */
function fotoUrl(?string $archivo): ?string {
    return ($archivo !== null && preg_match('/^[a-f0-9]{32}\.(jpg|png)$/', $archivo))
        ? 'uploads/avatars/' . $archivo
        : null;
}

// =====================================================
// Notificaciones (tabla notificacion, ver database/ajustes.sql)
// =====================================================

/** Crea una notificación. Si falla (por ejemplo, falta la tabla) se registra
 *  en el log y NO interrumpe la acción principal. */
function notificar(PDO $pdo, string $ci, string $tipo, string $mensaje, ?int $torneoId = null, ?int $refId = null): void {
    try {
        $pdo->prepare("INSERT INTO notificacion (usuario_ci_fk, tipo, mensaje, torneo_id_fk, ref_id) VALUES (?, ?, ?, ?, ?)")
            ->execute([$ci, $tipo, mb_substr($mensaje, 0, 255), $torneoId, $refId]);
    } catch (Throwable $e) {
        error_log('[competika] notificación no guardada: ' . $e->getMessage());
    }
}

/** Cédulas de las personas que juegan en un equipo. */
function usuariosDeEquipo(PDO $pdo, ?int $equipoId): array {
    if ($equipoId === null) return [];
    $s = $pdo->prepare("SELECT DISTINCT p.usuario_ci_fk FROM equipo_participante ep
                        JOIN participante p ON p.participante_id = ep.participante_id_fk WHERE ep.equipo_id_fk = ?");
    $s->execute([$equipoId]);
    return $s->fetchAll(PDO::FETCH_COLUMN);
}

/** Cédulas de todas las personas inscriptas en un torneo. */
function usuariosDeTorneo(PDO $pdo, int $torneoId): array {
    $s = $pdo->prepare("SELECT DISTINCT p.usuario_ci_fk FROM tabla_posiciones tp
                        JOIN equipo_participante ep ON ep.equipo_id_fk = tp.equipo_id_fk
                        JOIN participante p ON p.participante_id = ep.participante_id_fk
                        WHERE tp.torneo_id_fk = ?");
    $s->execute([$torneoId]);
    return $s->fetchAll(PDO::FETCH_COLUMN);
}

function nombreTorneo(PDO $pdo, int $torneoId): string {
    $s = $pdo->prepare("SELECT nombre FROM torneo WHERE torneo_id = ?");
    $s->execute([$torneoId]);
    return (string)($s->fetchColumn() ?: 'el torneo');
}

function nombreEquipo(PDO $pdo, ?int $equipoId): string {
    if ($equipoId === null) return 'un rival por definir';
    $s = $pdo->prepare("SELECT nombre FROM equipo WHERE equipo_id = ?");
    $s->execute([$equipoId]);
    return (string)($s->fetchColumn() ?: 'un rival');
}

/** '2026-10-18 18:30:00' -> 'sáb 18/10 18:30 h' (sin hora si es 00:00). */
function fechaCorta(?string $dt): string {
    if (!$dt) return 'fecha a confirmar';
    $ts = strtotime($dt);
    $dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    $txt = $dias[(int)date('w', $ts)] . ' ' . date('d/m', $ts);
    $hora = date('H:i', $ts);
    return $hora === '00:00' ? $txt : "$txt $hora h";
}
