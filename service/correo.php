<?php
/**
 * Envío de correos (recuperación de contraseña).
 *
 * Se envía con mail() de PHP solo si MAIL_ENABLED=1 (el servidor tiene que
 * tener configurado sendmail/SMTP; XAMPP no lo trae configurado). Remitente:
 * MAIL_FROM. Si el envío está apagado, devuelve false y quien llama decide
 * (en desarrollo se muestra el enlace en pantalla para poder probar).
 */
final class Correo {
    public static function habilitado(): bool {
        return env('MAIL_ENABLED', '0') === '1';
    }

    public static function enviar(string $para, string $asunto, string $texto): bool {
        if (!self::habilitado()) return false;
        $de = env('MAIL_FROM', 'no-responder@competika.local');
        $cabeceras = "From: Competika <$de>\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: Competika";
        $ok = @mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $texto, $cabeceras);
        if (!$ok) error_log("[competika] no se pudo enviar el correo a $para (revisá sendmail/SMTP)");
        return $ok;
    }

    /** URL base del sitio para armar enlaces: APP_URL o, si no está, la del pedido actual. */
    public static function urlSitio(): string {
        $url = env('APP_URL');
        if ($url) return rtrim($url, '/');
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        $raiz = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
        return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $raiz;
    }
}
