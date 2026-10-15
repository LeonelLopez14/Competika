<?php
/**
 * "Recordarme": mantiene la sesión iniciada 30 días aunque se cierre el
 * navegador. La cookie lleva selector:validador; en la base se guarda el
 * hash del validador. Cada vez que se usa, el token se cambia (rotación),
 * así una cookie robada deja de servir en cuanto el dueño vuelve a entrar.
 */
final class Recordarme {
    public const COOKIE = 'competika_rec';
    private const DIAS = 30;

    public static function crear(string $ci): void {
        $selector = bin2hex(random_bytes(12));
        $validador = bin2hex(random_bytes(32));
        (new TokenRepository())->guardarRecordada($selector, hash('sha256', $validador), $ci, self::DIAS);
        self::cookie("$selector:$validador", time() + self::DIAS * 86400);
    }

    /** Si no hay sesión pero sí cookie válida, inicia la sesión de esa cuenta. */
    public static function restaurar(): void {
        $valor = (string)($_COOKIE[self::COOKIE] ?? '');
        if (!preg_match('/^([a-f0-9]{24}):([a-f0-9]{64})$/', $valor, $m)) { self::borrarCookie(); return; }
        try {
            $tokens = new TokenRepository();
            $fila = $tokens->recordada($m[1]);
            if ($fila === null || !hash_equals($fila['validador_hash'], hash('sha256', $m[2]))) {
                if ($fila !== null) $tokens->borrarRecordada($m[1]);      // posible robo: se invalida
                self::borrarCookie();
                return;
            }
            $u = (new UsuarioRepository())->buscar($fila['usuario_ci_fk']);
            $tokens->borrarRecordada($m[1]);
            if ($u === null || (new UsuarioRepository())->estaBloqueado($u->getCi())) { self::borrarCookie(); return; }
            session_regenerate_id(true);
            $_SESSION['usuario_ci'] = $u->getCi();
            $_SESSION['usuario_nombre'] = $u->getNombre();
            $_SESSION['usuario_apellido'] = $u->getApellido();
            $_SESSION['usuario_email'] = $u->getEmail();
            $_SESSION['usuario_rol'] = $u->getRolUsuario();
            self::crear($u->getCi());                                      // rotación
        } catch (Throwable $e) {
            error_log('[competika] recordarme: ' . $e->getMessage());
        }
    }

    /** Al cerrar sesión: borra el token de este navegador. */
    public static function olvidar(): void {
        $valor = (string)($_COOKIE[self::COOKIE] ?? '');
        if (preg_match('/^([a-f0-9]{24}):/', $valor, $m)) {
            try { (new TokenRepository())->borrarRecordada($m[1]); } catch (Throwable $e) { /* sin base: igual se borra la cookie */ }
        }
        self::borrarCookie();
    }

    private static function cookie(string $valor, int $expira): void {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        setcookie(self::COOKIE, $valor, ['expires' => $expira, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
        $_COOKIE[self::COOKIE] = $valor;
    }

    private static function borrarCookie(): void {
        if (isset($_COOKIE[self::COOKIE])) self::cookie('', time() - 3600);
        unset($_COOKIE[self::COOKIE]);
    }
}
