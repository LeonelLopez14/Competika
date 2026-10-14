<?php
/** Usuario de la sesión actual (la sesión la inician controller/login.php y registrar.php). */
class Auth {
    public static function ci(): ?string {
        return !empty($_SESSION['usuario_ci']) ? (string)$_SESSION['usuario_ci'] : null;
    }

    /** Cédula del usuario logueado; si no hay sesión corta con 401. */
    public static function exigirLogin(): string {
        $ci = self::ci();
        if ($ci === null) throw new ApiException('Necesitás iniciar sesión.', 401);
        return $ci;
    }
}
