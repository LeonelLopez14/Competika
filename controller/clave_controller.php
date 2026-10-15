<?php
require_once __DIR__ . '/../core/autoload.php';

/**
 * Recuperación de contraseña (api/password.php).
 * 1. "Olvidé": se genera un enlace de un solo uso que vence en 1 hora.
 * 2. "Restablecer": con ese enlace se elige una contraseña nueva.
 * La respuesta del paso 1 es siempre la misma, exista o no la cuenta
 * (así nadie puede averiguar qué correos están registrados).
 */
class ClaveController {
    private const MINUTOS = 60;
    private const MENSAJE = 'Si ese correo está registrado, te enviamos un enlace para elegir una contraseña nueva. Vence en 1 hora.';

    public function olvide(Request $req): array {
        $email = mb_strtolower(trim((string)($req->json()['email'] ?? '')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiException('Ingresá un correo electrónico válido.');
        $respuesta = ['success' => true, 'message' => self::MENSAJE];

        $u = (new UsuarioRepository())->obtenerPorEmail($email);
        if ($u === null) return $respuesta;

        $token = bin2hex(random_bytes(32));
        (new TokenRepository())->guardarRecuperacion(hash('sha256', $token), $u['ci'], self::MINUTOS);
        $enlace = Correo::urlSitio() . '/frontend/paginas/recover/recover.html?token=' . $token;
        $enviado = Correo::enviar($email, 'Competika — Restablecer contraseña',
            "Hola {$u['nombre']}:\n\nPediste restablecer tu contraseña de Competika. Entrá a este enlace (vence en 1 hora):\n\n$enlace\n\n"
            . "Si no fuiste vos, ignorá este correo: tu contraseña no cambia.");

        if (!$enviado) {
            error_log("[competika] enlace de recuperación para $email: $enlace");
            // Modo prueba: sin servidor de correo, en desarrollo se muestra el enlace
            // y solo si se pide desde la misma máquina (nunca en un servidor expuesto)
            $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
            if ($local && env('APP_ENV', 'development') !== 'production') $respuesta['devLink'] = $enlace;
        }
        return $respuesta;
    }

    public function verificar(Request $req): array {
        $ci = (new TokenRepository())->ciDeRecuperacion(hash('sha256', (string)$req->query('token', '')));
        return ['success' => true, 'valid' => $ci !== null];
    }

    public function restablecer(Request $req): array {
        $d = $req->json();
        $hash = hash('sha256', (string)($d['token'] ?? ''));
        $tokens = new TokenRepository();
        $ci = $tokens->ciDeRecuperacion($hash);
        if ($ci === null) throw new ApiException('El enlace venció o ya se usó. Pedí uno nuevo.', 410);
        $nueva = (string)($d['password'] ?? '');
        Validar::password($nueva);
        if ($nueva !== (string)($d['confirm'] ?? '')) throw new ApiException('Las contraseñas no coinciden.');

        $usuarios = new UsuarioRepository();
        $usuarios->transaccion(function () use ($usuarios, $tokens, $ci, $nueva, $hash) {
            $usuarios->actualizarPassword($ci, $nueva);
            $tokens->marcarUsada($hash);
            $tokens->borrarRecordadasDe($ci);            // cierra los "Recordarme" de otros dispositivos
        });
        (new Notificador())->enviar($ci, 'seguridad', 'Tu contraseña se cambió con el enlace de recuperación. Si no fuiste vos, avisá a un administrador.');
        return ['success' => true, 'message' => 'Listo: ya podés iniciar sesión con tu contraseña nueva.'];
    }
}
