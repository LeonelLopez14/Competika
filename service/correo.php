<?php
/** Envío de correos por SMTP (SMTP_HOST) o con mail() de PHP, si MAIL_ENABLED=1. */
final class Correo {
    public static function habilitado(): bool {
        return env('MAIL_ENABLED', '0') === '1';
    }

    public static function enviar(string $para, string $asunto, string $texto): bool {
        if (!self::habilitado()) return false;
        $de = env('MAIL_FROM', 'no-responder@competika.local');
        $asuntoMime = '=?UTF-8?B?' . base64_encode($asunto) . '?=';
        try {
            if (env('SMTP_HOST')) {
                self::smtp($de, $para, $asuntoMime, $texto);
                return true;
            }
            $cabeceras = "From: Competika <$de>\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: Competika";
            if (@mail($para, $asuntoMime, $texto, $cabeceras)) return true;
            throw new RuntimeException('mail() devolvió false');
        } catch (Throwable $e) {
            error_log("[competika] no se pudo enviar el correo a $para: " . $e->getMessage());
            return false;
        }
    }

    /** SMTP con STARTTLS (587), TLS directo (465) o sin cifrado (SMTP_SECURE=none), y AUTH LOGIN. */
    private static function smtp(string $de, string $para, string $asunto, string $texto): void {
        $host = env('SMTP_HOST');
        $port = (int)env('SMTP_PORT', '587');
        $seguro = env('SMTP_SECURE', $port === 465 ? 'ssl' : 'tls');
        $ctx = stream_context_create(['ssl' => ['peer_name' => $host, 'verify_peer' => true, 'verify_peer_name' => true]]);
        $s = @stream_socket_client(($seguro === 'ssl' ? 'ssl://' : 'tcp://') . "$host:$port", $errno, $err, 15, STREAM_CLIENT_CONNECT, $ctx);
        if (!$s) throw new RuntimeException("sin conexión con $host:$port ($err)");
        stream_set_timeout($s, 15);

        $cmd = function (?string $linea, int $esperado) use ($s): void {
            if ($linea !== null) fwrite($s, $linea . "\r\n");
            $resp = '';
            while (($l = fgets($s, 1024)) !== false) {
                $resp .= $l;
                if (strlen($l) < 4 || $l[3] !== '-') break;
            }
            if ((int)substr($resp, 0, 3) !== $esperado) throw new RuntimeException('SMTP: ' . trim($resp));
        };
        $yo = rtrim((string)parse_url(self::urlSitio(), PHP_URL_HOST), '.') ?: 'localhost';

        $cmd(null, 220);
        $cmd("EHLO $yo", 250);
        if ($seguro === 'tls') {
            $cmd('STARTTLS', 220);
            if (!stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('no se pudo iniciar TLS');
            $cmd("EHLO $yo", 250);
        }
        if (env('SMTP_USER')) {
            $cmd('AUTH LOGIN', 334);
            $cmd(base64_encode(env('SMTP_USER')), 334);
            $cmd(base64_encode((string)env('SMTP_PASS')), 235);
        }
        $cmd("MAIL FROM:<$de>", 250);
        $cmd("RCPT TO:<$para>", 250);
        $cmd('DATA', 354);
        $cuerpo = preg_replace('/^\./m', '..', str_replace(["\r\n", "\r", "\n"], "\r\n", $texto));
        $mensaje = "From: Competika <$de>\r\nTo: <$para>\r\nSubject: $asunto\r\nDate: " . date('r') . "\r\n"
                 . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$cuerpo\r\n.";
        $cmd($mensaje, 250);
        $cmd('QUIT', 221);
        fclose($s);
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
