<?php
/**
 * Notificaciones de la cuenta logueada — Competika
 *
 *   GET  ?action=list              últimas 30 + cantidad sin leer
 *   GET  ?action=stream            tiempo real (Server-Sent Events): manda cada
 *                                  notificación nueva apenas se crea
 *   POST ?action=read   {id}       marcar una como leída
 *   POST ?action=read_all          marcar todas como leídas
 *
 * Además genera recordatorios de los partidos de las próximas 24 h (una sola
 * vez por partido), así no hace falta una tarea programada en el servidor.
 */

require_once __DIR__ . '/bootstrap.php';

const COLS = "notificacion_id, tipo, mensaje, torneo_id_fk, leida, TIMESTAMPDIFF(SECOND, fecha, NOW()) AS hace";

$pdo = db();
$action = $_GET['action'] ?? '';

try {
    $ci = requireLogin();
    switch ($action) {
        case 'list':
            generarRecordatorios($pdo, $ci);
            respond(['success' => true] + listar($pdo, $ci));

        case 'read':
            requireMethod('POST');
            $id = (int)(bodyJson()['id'] ?? 0);
            $pdo->prepare("UPDATE notificacion SET leida = 1 WHERE notificacion_id = ? AND usuario_ci_fk = ?")->execute([$id, $ci]);
            respond(['success' => true]);

        case 'read_all':
            requireMethod('POST');
            $pdo->prepare("UPDATE notificacion SET leida = 1 WHERE usuario_ci_fk = ? AND leida = 0")->execute([$ci]);
            respond(['success' => true]);

        case 'stream':
            stream($pdo, $ci);

        default:
            respond(['success' => false, 'error' => 'Acción no reconocida.'], 400);
    }
} catch (Throwable $e) {
    failInternal($e);
}

function fila(array $r): array {
    return [
        'id'        => (int)$r['notificacion_id'],
        'tipo'      => $r['tipo'],
        'mensaje'   => $r['mensaje'],
        'torneoId'  => $r['torneo_id_fk'] !== null ? (int)$r['torneo_id_fk'] : null,
        'leida'     => (bool)$r['leida'],
        'hace'      => max(0, (int)$r['hace']),          // segundos (calculados por la base, sin líos de zona horaria)
    ];
}

function listar(PDO $pdo, string $ci): array {
    $s = $pdo->prepare("SELECT " . COLS . " FROM notificacion WHERE usuario_ci_fk = ? ORDER BY notificacion_id DESC LIMIT 30");
    $s->execute([$ci]);
    $items = array_map('fila', $s->fetchAll());
    $n = $pdo->prepare("SELECT COUNT(*) FROM notificacion WHERE usuario_ci_fk = ? AND leida = 0");
    $n->execute([$ci]);
    return ['items' => $items, 'unread' => (int)$n->fetchColumn()];
}

/** Partidos de mis equipos en las próximas 24 h que todavía no tienen recordatorio. */
function generarRecordatorios(PDO $pdo, string $ci): void {
    try {
        $s = $pdo->prepare("
            SELECT e.enfrentamiento_id, e.fecha, e.ubicacion, e.torneo_id_fk, t.nombre AS torneo, ee.equipo_id_fk AS mio,
                   (SELECT x.equipo_id_fk FROM enfrentamiento_equipo x
                     WHERE x.enfrentamiento_id_fk = e.enfrentamiento_id AND x.equipo_id_fk <> ee.equipo_id_fk LIMIT 1) AS rival
            FROM participante p
            JOIN equipo_participante ep ON ep.participante_id_fk = p.participante_id
            JOIN enfrentamiento_equipo ee ON ee.equipo_id_fk = ep.equipo_id_fk
            JOIN enfrentamiento e ON e.enfrentamiento_id = ee.enfrentamiento_id_fk
            JOIN torneo t ON t.torneo_id = e.torneo_id_fk
            WHERE p.usuario_ci_fk = ?
              AND e.fecha BETWEEN NOW() AND NOW() + INTERVAL 24 HOUR
              AND NOT EXISTS (SELECT 1 FROM resultado r WHERE r.enfrentamiento_id_fk = e.enfrentamiento_id AND r.estado <> 'pendiente')
              AND NOT EXISTS (SELECT 1 FROM notificacion n WHERE n.usuario_ci_fk = p.usuario_ci_fk
                                AND n.tipo = 'recordatorio' AND n.ref_id = e.enfrentamiento_id)");
        $s->execute([$ci]);
        foreach ($s->fetchAll() as $r) {
            $rival = nombreEquipo($pdo, $r['rival'] !== null ? (int)$r['rival'] : null);
            $lugar = $r['ubicacion'] ? " en {$r['ubicacion']}" : '';
            notificar($pdo, $ci, 'recordatorio',
                "Recordatorio: jugás vs {$rival} el " . fechaCorta($r['fecha']) . "{$lugar} («{$r['torneo']}»).",
                (int)$r['torneo_id_fk'], (int)$r['enfrentamiento_id']);
        }
    } catch (Throwable $e) {
        error_log('[competika] recordatorios: ' . $e->getMessage());
    }
}

/**
 * Server-Sent Events: la conexión queda abierta ~25 s revisando cada 2 s si
 * hay notificaciones nuevas y las envía al instante. Después se cierra y el
 * navegador se reconecta solo (mandando Last-Event-ID para no repetir).
 */
function stream(PDO $pdo, string $ci): void {
    session_write_close();                       // no bloquear las demás peticiones de este usuario
    @ini_set('zlib.output_compression', '0');
    if (function_exists('apache_setenv')) @apache_setenv('no-gzip', '1');
    while (ob_get_level() > 0) ob_end_flush();
    set_time_limit(60);

    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Accel-Buffering: no');

    $last = max((int)($_SERVER['HTTP_LAST_EVENT_ID'] ?? 0), (int)($_GET['after'] ?? 0));
    echo "retry: 3000\n\n";
    flush();

    $q = $pdo->prepare("SELECT " . COLS . " FROM notificacion WHERE usuario_ci_fk = ? AND notificacion_id > ? ORDER BY notificacion_id LIMIT 20");
    $fin = time() + 25;
    for ($i = 0; time() < $fin && !connection_aborted(); $i++) {
        if ($i % 15 === 0) generarRecordatorios($pdo, $ci);
        $q->execute([$ci, $last]);
        $rows = $q->fetchAll();
        foreach ($rows as $r) {
            $last = (int)$r['notificacion_id'];
            echo "id: $last\nevent: notif\ndata: " . json_encode(fila($r), JSON_UNESCAPED_UNICODE) . "\n\n";
        }
        if (!$rows && $i % 5 === 4) echo ": ping\n\n";   // mantiene viva la conexión (proxies)
        flush();
        sleep(2);
    }
    exit;
}
