<?php
require_once __DIR__ . '/../core/autoload.php';

/** Formulario de Contacto (api/contact.php): el mensaje llega al panel de administración. */
class ContactoController {
    private const MAX_POR_HORA = 3;

    public function enviar(Request $req): array {
        $d = $req->json();
        if (!empty($d['website'])) return ['success' => true];             // campo trampa: lo completan solo los bots

        $nombre  = Validar::obligatorio($d['nombre'] ?? null, 100, 'Escribí tu nombre (máx. 100 caracteres).');
        $email   = Validar::email($d['email'] ?? null, 'Ingresá un correo electrónico válido.');
        if ($email === null) throw new ApiException('Ingresá un correo electrónico válido.');
        $asunto  = Validar::obligatorio($d['asunto'] ?? null, 150, 'Escribí el asunto (máx. 150 caracteres).');
        $mensaje = Validar::obligatorio($d['mensaje'] ?? null, 3000, 'Escribí tu mensaje (máx. 3000 caracteres).');
        if (mb_strlen($mensaje) < 10) throw new ApiException('El mensaje es muy corto.');

        $repo = new ContactoRepository();
        $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'competika');
        if ($repo->recientesDesde($ip) >= self::MAX_POR_HORA) throw new ApiException('Enviaste varios mensajes seguidos. Probá de nuevo más tarde.', 429);

        $repo->crear($nombre, $email, $asunto, $mensaje, Auth::ci(), $ip);
        $avisos = new Notificador();
        foreach ((new AdminRepository())->cisAdmins() as $admin) {
            $avisos->enviar($admin, 'contacto', "Nuevo mensaje de contacto de {$nombre}: «{$asunto}».");
        }
        return ['success' => true, 'message' => '¡Gracias! Recibimos tu mensaje y te respondemos por correo.'];
    }
}
