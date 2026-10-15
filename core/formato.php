<?php
/** Formatos de salida reutilizados por modelos y notificaciones. */
final class Formato {
    /** DOUBLE de la base -> entero si no tiene decimales. */
    public static function numero($v) {
        if ($v === null) return null;
        $f = (float)$v;
        return floor($f) == $f ? (int)$f : $f;
    }

    public static function marcador(float $n): string {
        return floor($n) == $n ? (string)(int)$n : rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
    }

    /** '2026-10-18 18:30:00' -> 'sáb 18/10 18:30 h' (sin hora si es 00:00). */
    public static function fechaCorta(?string $dt): string {
        if (!$dt) return 'fecha a confirmar';
        $ts = strtotime($dt);
        $dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        $txt = $dias[(int)date('w', $ts)] . ' ' . date('d/m', $ts);
        $hora = date('H:i', $ts);
        return $hora === '00:00' ? $txt : "$txt $hora h";
    }

    /** Ruta pública de la foto de perfil o null (solo nombres generados por el servidor). */
    public static function fotoUrl(?string $archivo): ?string {
        return ($archivo !== null && preg_match('/^[a-f0-9]{32}\.(jpg|png)$/', $archivo))
            ? 'uploads/avatars/' . $archivo : null;
    }
}
