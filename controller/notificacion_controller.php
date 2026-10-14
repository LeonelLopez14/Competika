<?php
require_once __DIR__ . '/../core/autoload.php';

/** Controlador de la campana de notificaciones (api/notifications.php). */
class NotificacionController {
    private ?NotificacionRepository $repo = null;

    /** Repositorio creado recién cuando se necesita (el stream maneja su propia conexión). */
    private function notificaciones(): NotificacionRepository {
        return $this->repo ??= new NotificacionRepository();
    }

    /** Últimas 30 + cantidad sin leer. También genera los recordatorios pendientes. */
    public function listar(): array {
        $ci = Auth::exigirLogin();
        (new Notificador($this->notificaciones()))->recordatorios($ci);
        return [
            'success' => true,
            'items'   => array_map(fn(Notificacion $n) => $n->toArray(), $this->notificaciones()->ultimas($ci)),
            'unread'  => $this->notificaciones()->noLeidas($ci),
        ];
    }

    public function leer(Request $req): array {
        $this->notificaciones()->marcarLeida((int)($req->json()['id'] ?? 0), Auth::exigirLogin());
        return ['success' => true];
    }

    public function leerTodas(): array {
        $this->notificaciones()->marcarTodasLeidas(Auth::exigirLogin());
        return ['success' => true];
    }

    /**
     * Tiempo real con Server-Sent Events. La conexión HTTP queda abierta ~25 s;
     * cada segundo se mira la señal de SenalNotificaciones (sin base de datos)
     * y solo si cambió se consulta MariaDB y se envían las nuevas. Después el
     * navegador se reconecta solo, mandando Last-Event-ID para no repetir.
     */
    public function stream(Request $req): void {
        $ci = Auth::exigirLogin();
        session_write_close();                       // no bloquear las demás peticiones de este usuario
        @ini_set('zlib.output_compression', '0');
        if (function_exists('apache_setenv')) @apache_setenv('no-gzip', '1');
        while (ob_get_level() > 0) ob_end_flush();
        set_time_limit(60);

        header('Content-Type: text/event-stream; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Accel-Buffering: no');

        $ultimo = max((int)($_SERVER['HTTP_LAST_EVENT_ID'] ?? 0), (int)$req->query('after', 0));
        echo "retry: 3000\n\n";
        flush();

        // Al conectar: recordatorios y lo que haya llegado mientras no estaba conectado
        (new Notificador($this->notificaciones()))->recordatorios($ci);
        $ultimo = $this->enviarNuevas($ci, $ultimo);
        $this->repo = null;
        Database::cerrar();                          // no ocupar una conexión mientras se espera

        $fin = time() + 25;
        for ($i = 1; time() < $fin && !connection_aborted(); $i++) {
            sleep(1);
            if (SenalNotificaciones::ultimo($ci) > $ultimo) {
                $ultimo = $this->enviarNuevas($ci, $ultimo);
                $this->repo = null;
                Database::cerrar();
            } elseif ($i % 10 === 0) {
                echo ": ping\n\n";                    // mantiene viva la conexión (proxies)
            }
            flush();
        }
        exit;
    }

    private function enviarNuevas(string $ci, int $ultimo): int {
        foreach ($this->notificaciones()->posteriores($ci, $ultimo) as $n) {
            $ultimo = $n->getId();
            echo "id: $ultimo\nevent: notif\ndata: " . json_encode($n->toArray(), JSON_UNESCAPED_UNICODE) . "\n\n";
        }
        flush();
        return $ultimo;
    }
}
