<?php
/** Usuario de la sesión actual. Una cuenta suspendida por un administrador pierde la sesión. */
class Auth {
    private static ?bool $verificada = null;

    public static function ci(): ?string {
        $ci = !empty($_SESSION['usuario_ci']) ? (string)$_SESSION['usuario_ci'] : null;
        if ($ci === null) return null;
        if (self::$verificada === null) {
            self::$verificada = !(new UsuarioRepository())->estaBloqueado($ci);
            if (!self::$verificada) {
                $_SESSION = [];
                if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
            }
        }
        return self::$verificada ? $ci : null;
    }

    /** Cédula del usuario logueado; si no hay sesión corta con 401. */
    public static function exigirLogin(): string {
        $ci = self::ci();
        if ($ci === null) throw new ApiException('Necesitás iniciar sesión.', 401);
        return $ci;
    }
}
