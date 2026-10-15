<?php
/** Respuestas JSON de la API. */
class Response {
    public static function json($datos, int $status = 200): void {
        http_response_code($status);
        echo json_encode($datos, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $mensaje, int $status): void {
        self::json(['success' => false, 'error' => $mensaje], $status);
    }

    /** Error inesperado: se registra y al cliente solo se le muestra el detalle en desarrollo. */
    public static function errorInterno(Throwable $e): void {
        error_log('[competika] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        $prod = env('APP_ENV', 'development') === 'production';
        self::error($prod ? 'Error interno del servidor.' : 'Error: ' . $e->getMessage(), 500);
    }
}
