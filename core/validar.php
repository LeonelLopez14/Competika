<?php
/** Validaciones y normalizaciones de datos de entrada (lanzan ApiException). */
final class Validar {
    /** Texto recortado o null si está vacío; corta a $max caracteres. */
    public static function texto($v, int $max): ?string {
        $s = trim((string)($v ?? ''));
        return $s === '' ? null : mb_substr($s, 0, $max);
    }

    /** Texto obligatorio con largo máximo (sin cortar: si se pasa, es error). */
    public static function obligatorio($v, int $max, string $error): string {
        $s = trim((string)($v ?? ''));
        if ($s === '' || mb_strlen($s) > $max) throw new ApiException($error);
        return $s;
    }

    public static function fecha(?string $s, string $error = 'Fecha inválida.'): ?string {
        if ($s === null) return null;
        $d = DateTime::createFromFormat('Y-m-d', $s);
        if (!$d || $d->format('Y-m-d') !== $s) throw new ApiException($error);
        return $s;
    }

    public static function hora(?string $s): ?string {
        if ($s === null) return null;
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $s)) throw new ApiException('Hora inválida.');
        return $s;
    }

    public static function telefono($v, string $error = 'El teléfono no es válido.'): ?string {
        $t = self::texto($v, 20);
        if ($t !== null && !preg_match('/^[0-9+()\s-]{6,20}$/', $t)) throw new ApiException($error);
        return $t;
    }

    public static function email($v, string $error = 'El correo no es válido.'): ?string {
        $m = self::texto($v, 150);
        if ($m !== null && !filter_var($m, FILTER_VALIDATE_EMAIL)) throw new ApiException($error);
        return $m;
    }

    public static function dinero($v): float { return max(0, round((float)$v, 2)); }

    public static function enteroEntre($v, int $min, int $max, string $error): int {
        $n = (int)$v;
        if ($n < $min || $n > $max) throw new ApiException($error);
        return $n;
    }

    public static function password(string $p): void {
        if (strlen($p) < 8 || !preg_match('/[A-Za-z]/', $p) || !preg_match('/\d/', $p)) {
            throw new ApiException('La contraseña debe tener al menos 8 caracteres, con letras y números.');
        }
    }
}
