<?php
/** Señal de notificaciones nuevas por usuario (sin consultar la base). */
final class SenalNotificaciones {
    private static function archivo(string $ci): string {
        $dir = sys_get_temp_dir() . '/competika_notif';
        if (!is_dir($dir)) @mkdir($dir, 0700, true);
        return $dir . '/' . hash('sha256', $ci);          // la cédula no queda en el nombre del archivo
    }

    public static function avisar(string $ci, int $ultimoId): void {
        @file_put_contents(self::archivo($ci), (string)$ultimoId, LOCK_EX);
    }

    /** Último id avisado para el usuario (0 si nunca hubo). */
    public static function ultimo(string $ci): int {
        $f = self::archivo($ci);
        clearstatcache(true, $f);
        return is_file($f) ? (int)@file_get_contents($f) : 0;
    }
}
